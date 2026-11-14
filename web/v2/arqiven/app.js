import { arqivenEngine } from "/shared/ia/engine-client.mjs";
import { canUseModel, defaultModel, downloadProgress, modelById, modelForDevice, stepDown, THIRD_PARTY_MODELS } from "/shared/ia/models.mjs";
import { createRequest, honestResult } from "/shared/ia/contract.mjs";
import { saveWorkBytes, loadWorkBytes } from "/studio/lib/work-store.mjs";
import { sanitizePlain } from "/shared/ia/plain.mjs";
import { buildIndex } from "/shared/ia/retrieve.mjs";
import { excerptAnswer, finishModelAnswer, isFollowUp, planTurn } from "/shared/ia/turn.mjs";
import { citedExcerpt, extractiveFromSources } from "/shared/ia/quality.mjs";
import { exportPayload, listVotes, openFeedbackDb, saveVote } from "/shared/ia/feedback.mjs";
import { clipHistory } from "/shared/ia/history.mjs";
void clipHistory;
import { dateGroup, deleteConversation, deleteImage, deleteProject, listConversations, listImages, listProjects, matchesQuery, openChatDb, openPrefDb, readConversation, readSetting, saveConversation, saveImage, saveProject, saveSetting } from "/shared/ia/chats.mjs";

const root = document.querySelector(".arq-app");
if (!root) throw new Error("ARQIVEN");

const declared = (document.documentElement.lang || root.getAttribute("data-lang") || "es").trim();
const lang = declared === "pt" ? "pt-BR" : declared;
const honest = (document.documentElement.lang || "es") === "es"
  ? (root.getAttribute("data-honest") || honestResult(createRequest({ source: "central" }), "es").text)
  : honestResult(createRequest({ source: "central" }), lang).text;
const uiLang = lang === "en" ? "en" : lang === "pt" || lang === "pt-BR" ? "pt" : lang === "ja" ? "ja" : lang === "ko" ? "ko" : "es";
const UI = {
  es: {
    prepare: "Reintentar",
    ready: "Modelo de terceros listo",
    again: "Usar este modelo",
    cancel: "Cancelar",
    stop: "Detener",
    stopped: "Detenido.",
    preparing: "Descargando un modelo de terceros. Puedes seguir escribiendo.",
    checking: "Comprobando que el modelo de terceros responde en este navegador.",
    idle: "IA de ORVUPI",
    who: "ARQIVEN es la IA de ORVUPI. Si descargas un modelo para que responda, es de terceros y se nombra aparte.",
    queued: "Preparando modelo de terceros… Puedes seguir escribiendo. Este aviso se sustituye cuando haya texto.",
    cancelled: "Cancelado. No hay respuesta generada.",
    error: "El modelo de terceros no se ha preparado.",
    emptyModel: "El modelo de terceros no escribió un texto usable.",
    busy: "Ya hay una respuesta en curso.",
    editor: "Editor",
    editorTitle: "Texto de esta pestaña",
    editorNote: "Texto local de esta pestaña. El modelo, si responde, corre en este navegador. No es un documento de Work hasta que pulses Guardar.",
    closeEditor: "Volver al chat",
    edit: "Editar",
    where: "Guardar crea una nota nueva en IndexedDB orvupi-work de este dispositivo. No sale a un servidor. No hay OCR. Aquí solo se leen TXT y MD. El texto no se ejecuta.",
    third: "tercero",
    task: "Tarea",
    shortcut: "Atajo de tarea. No ejecuta un modelo ni promete esa capacidad.",
    notBuilt: "Programar no está implementado. El chip no crea un programa.",
    retries: "Se ha reintentado tres veces. No hay otra descarga automática.",
    fallbackLoad: "Qwen3.5-0.8B no se ha podido cargar. En su lugar se usa SmolLM2, que es más pequeño.",
    fallbackMemory: "Este navegador tiene poca memoria para Qwen3.5-0.8B. Se usa SmolLM2, que es más pequeño.",
    excerptBadge: "extracto de la fuente · no es el modelo",
    usesSources: "usa fuentes y las cita",
    sourcesLabel: "Fuentes",
    useful: "Útil",
    notUseful: "No útil",
    exportVotes: "Exportar votos de este dispositivo",
    wikiDisclosure: "ARQIVEN es la IA de ORVUPI y no tiene un modelo propio. El modelo de terceros que elijas responde en este navegador. Las páginas de ORVUPI (MIT) se consultan aquí. Si la pregunta no está cubierta, se consulta Wikipedia en tu idioma (CC BY-SA): esa consulta envía solo la pregunta, nunca un documento de Work.",
  },
  en: {
    prepare: "Retry",
    ready: "Third-party model ready",
    again: "Use this model",
    cancel: "Cancel",
    stop: "Stop",
    stopped: "Stopped.",
    preparing: "Downloading a third-party model. You can keep typing.",
    checking: "Checking that the third-party model answers in this browser.",
    idle: "ORVUPI AI",
    who: "ARQIVEN is ORVUPI's AI. If you download a model so it can answer, that model belongs to someone else and is named separately.",
    queued: "Preparing a third-party model… You can keep typing. This notice is replaced when there is text.",
    cancelled: "Cancelled. There is no generated answer.",
    error: "The third-party model was not prepared.",
    emptyModel: "The third-party model did not write usable text.",
    busy: "A reply is already in progress.",
    editor: "Editor",
    editorTitle: "Text in this tab",
    editorNote: "Local text in this tab. If a model answers, it runs in this browser. It is not a Work document until you press Save.",
    closeEditor: "Back to chat",
    edit: "Edit",
    where: "Save creates a new note in this device's orvupi-work IndexedDB. It is not sent to a server. There is no OCR. Only TXT and MD are read here. The text is not executed.",
    third: "third party",
    task: "Task",
    shortcut: "Task shortcut. It does not run a model or promise that ability.",
    notBuilt: "Coding is not implemented. This chip does not create a program.",
    retries: "Retried three times. There is no further automatic download.",
    fallbackLoad: "Qwen3.5-0.8B could not be loaded. SmolLM2 is used instead. It is smaller.",
    fallbackMemory: "This browser does not have enough memory for Qwen3.5-0.8B. SmolLM2 is used instead. It is smaller.",
    excerptBadge: "source excerpt · not the model",
    usesSources: "uses sources and cites them",
    sourcesLabel: "Sources",
    useful: "Useful",
    notUseful: "Not useful",
    exportVotes: "Export votes from this device",
    wikiDisclosure: "ARQIVEN is ORVUPI's AI and has no model of its own. The third-party model you choose answers in this browser. ORVUPI pages (MIT) are searched here. If the question is not covered, Wikipedia is queried in your language (CC BY-SA): that query sends only the question, never a Work document.",
  },
  pt: {
    prepare: "Tentar de novo",
    ready: "Modelo de terceiros pronto",
    again: "Usar este modelo",
    cancel: "Cancelar",
    stop: "Parar",
    stopped: "Interrompido.",
    who: "ARQIVEN é a IA da ORVUPI. Se você baixar um modelo para ele responder, esse modelo é de terceiros e aparece com o nome dele.",
    preparing: "Baixando um modelo de terceiros. Você pode continuar escrevendo.",
    checking: "Conferindo se o modelo de terceiros responde neste navegador.",
    idle: "IA da ORVUPI",
    queued: "Preparando modelo de terceiros… Você pode continuar escrevendo. Este aviso é trocado quando houver texto.",
    cancelled: "Cancelado. Não há resposta gerada.",
    error: "O modelo de terceiros não foi preparado.",
    emptyModel: "O modelo de terceiros não escreveu um texto usável.",
    busy: "Já há uma resposta em curso.",
    editor: "Editor",
    editorTitle: "Texto desta aba",
    editorNote: "Texto local desta aba. Se um modelo responder, ele roda neste navegador. Não é um documento do Work até você tocar em Guardar.",
    closeEditor: "Voltar ao chat",
    edit: "Editar",
    where: "Guardar cria uma nota nova no IndexedDB orvupi-work deste dispositivo. Não vai a um servidor. Não há OCR. Aqui só se leem TXT e MD. O texto não é executado.",
    third: "terceiro",
    task: "Tarefa",
    shortcut: "Atalho de tarefa. Não executa um modelo nem promete essa capacidade.",
    notBuilt: "Programar não está implementado. O atalho não cria um programa.",
    retries: "Houve três tentativas. Não há outra descarga automática.",
    fallbackLoad: "Não foi possível carregar o Qwen3.5-0.8B. No lugar dele usa-se o SmolLM2, que é menor.",
    fallbackMemory: "Este navegador tem pouca memória para o Qwen3.5-0.8B. Usa-se o SmolLM2, que é menor.",
    excerptBadge: "trecho da fonte · não é o modelo",
    usesSources: "usa fontes e cita",
    sourcesLabel: "Fontes",
    useful: "Útil",
    notUseful: "Não útil",
    exportVotes: "Exportar votos deste dispositivo",
    wikiDisclosure: "ARQIVEN é a IA da ORVUPI e não tem um modelo próprio. O modelo de terceiros que você escolher responde neste navegador. As páginas da ORVUPI (MIT) são consultadas aqui. Se a pergunta não estiver coberta, consulta-se a Wikipedia no seu idioma (CC BY-SA): essa consulta envia só a pergunta, nunca um documento do Work.",
  },
  ja: {
    prepare: "再試行",
    ready: "第三者モデルの準備ができました",
    again: "このモデルを使う",
    cancel: "キャンセル",
    stop: "停止",
    stopped: "停止しました。",
    who: "ARQIVEN は ORVUPI の AI です。応答させるためにモデルをダウンロードする場合、それは第三者のもので、名前は別に示します。",
    preparing: "第三者モデルをダウンロードしています。入力は続けられます。",
    checking: "このブラウザで第三者モデルが応答するか確認しています。",
    idle: "ORVUPIのAI",
    queued: "第三者モデルを準備しています… 入力は続けられます。テキストができたらこの表示を置き換えます。",
    cancelled: "キャンセルしました。生成された回答はありません。",
    error: "第三者モデルを準備できませんでした。",
    emptyModel: "第三者モデルは使えるテキストを書きませんでした。",
    busy: "応答の処理中です。",
    editor: "エディタ",
    editorTitle: "このタブのテキスト",
    editorNote: "このタブのローカルなテキストです。モデルが答える場合もこのブラウザの中です。保存するまで Work の文書ではありません。",
    closeEditor: "チャットに戻る",
    edit: "編集",
    where: "保存すると、この端末の IndexedDB orvupi-work に新しいノートができます。サーバーには送られません。OCR はありません。ここでは TXT と MD だけを読みます。テキストは実行されません。",
    third: "第三者",
    task: "タスク",
    shortcut: "タスクの近道です。モデルは実行せず、その能力も約束しません。",
    notBuilt: "プログラミングは未実装です。このチップはプログラムを作りません。",
    retries: "3回試しました。これ以上は自動では受けません。",
    fallbackLoad: "Qwen3.5-0.8B を読み込めませんでした。代わりに、より小さい SmolLM2 を使います。",
    fallbackMemory: "このブラウザのメモリでは Qwen3.5-0.8B が入りません。より小さい SmolLM2 を使います。",
    excerptBadge: "出典の抜粋 · モデルの文章ではない",
    usesSources: "出典を使い、出典を示します",
    sourcesLabel: "出典",
    useful: "役に立った",
    notUseful: "役に立たなかった",
    exportVotes: "この端末の投票を書き出す",
    wikiDisclosure: "ARQIVEN は ORVUPI の AI で、独自モデルはありません。選んだ第三者モデルがこのブラウザで答えます。ORVUPI のページ（MIT）はここで検索します。質問がページにないときだけ、あなたの言語の Wikipedia（CC BY-SA）に問い合わせます。送るのは質問だけで、Work の文書は送りません。",
  },
  ko: {
    prepare: "다시 시도",
    ready: "제3자 모델이 준비되었습니다",
    again: "이 모델 사용",
    cancel: "취소",
    stop: "중지",
    stopped: "중지했습니다.",
    who: "ARQIVEN은 ORVUPI의 AI입니다. 답을 받으려고 모델을 받으면 그 모델은 제3자이고, 이름은 따로 표시합니다.",
    preparing: "제3자 모델을 받는 중입니다. 계속 입력할 수 있습니다.",
    checking: "이 브라우저에서 제3자 모델이 응답하는지 확인하는 중입니다.",
    idle: "ORVUPI AI",
    queued: "제3자 모델을 준비하는 중… 계속 입력할 수 있습니다. 텍스트가 생기면 이 안내를 바꿉니다.",
    cancelled: "취소했습니다. 생성된 답은 없습니다.",
    error: "제3자 모델을 준비하지 못했습니다.",
    emptyModel: "제3자 모델이 쓸 수 있는 글을 쓰지 않았습니다.",
    busy: "응답이 이미 진행 중입니다.",
    editor: "편집기",
    editorTitle: "이 탭의 텍스트",
    editorNote: "이 탭의 로컬 텍스트입니다. 모델이 답해도 이 브라우저 안에서입니다. 저장하기 전에는 Work 문서가 아닙니다.",
    closeEditor: "채팅으로 돌아가기",
    edit: "편집",
    where: "저장하면 이 기기의 IndexedDB orvupi-work에 새 노트가 생깁니다. 서버로 보내지 않습니다. OCR은 없습니다. 여기서는 TXT와 MD만 읽습니다. 텍스트는 실행되지 않습니다.",
    third: "제3자",
    task: "작업",
    shortcut: "작업 바로가기입니다. 모델을 실행하지 않고, 그 능력을 약속하지도 않습니다.",
    notBuilt: "프로그래밍은 구현되지 않았습니다. 이 칩은 프로그램을 만들지 않습니다.",
    retries: "세 번 시도했습니다. 더 이상 자동으로 받지 않습니다.",
    fallbackLoad: "Qwen3.5-0.8B를 불러오지 못했습니다. 더 작은 SmolLM2를 대신 사용합니다.",
    fallbackMemory: "이 브라우저에는 Qwen3.5-0.8B를 위한 메모리가 부족합니다. 더 작은 SmolLM2를 사용합니다.",
    excerptBadge: "출처 발췌 · 모델의 글이 아님",
    usesSources: "출처를 쓰고 출처를 밝힙니다",
    sourcesLabel: "출처",
    useful: "도움 됨",
    notUseful: "도움 안 됨",
    exportVotes: "이 기기의 투표 내보내기",
    wikiDisclosure: "ARQIVEN은 ORVUPI의 AI이고 자체 모델은 없습니다. 고른 제3자 모델이 이 브라우저에서 답합니다. ORVUPI 페이지(MIT)는 여기서 찾습니다. 질문이 페이지에 없을 때만 당신 언어의 Wikipedia(CC BY-SA)에 묻습니다. 질문만 보내고 Work 문서는 보내지 않습니다.",
  },
};
const ui = UI[uiLang];
const CHROME = {
  es: { newChat: "Nuevo chat", settings: "Ajustes", conversations: "Chats", recent: "Recientes", emptyChats: "Todavía no hay chats.", emptyProjects: "Todavía no hay proyectos.", projectOne: "1 proyecto", projectMany: "{n} proyectos", emptyLibrary: "Todavía no hay imágenes.", attachImage: "Adjuntar imagen", allImages: "Todas", imageOne: "1 imagen", imageMany: "{n} imágenes", filterBy: "Filtrar", search: "Buscar", welcome: "¿En qué puedo ayudarte?", note: "ARQIVEN es la IA de ORVUPI y funciona con modelos de terceros. Puede cometer errores; revisa la información importante. Lo que escribes se guarda en este navegador.", generating: "Generando", waiting: "En espera", done: "Listo", failed: "Error", copy: "Copiar", copied: "Copiado en este navegador.", copyFail: "No se pudo copiar.", againReply: "Volver a preguntar", attach: "Adjuntar", more: "Más", details: "Detalles", today: "Hoy", yesterday: "Ayer", week: "7 días", older: "Anteriores", projects: "Proyectos", projectHint: "Si eliminas un proyecto, sus chats vuelven al historial general.", library: "Biblioteca", create: "Crear", rename: "Renombrar", move: "Mover a proyecto", remove: "Eliminar", cancel: "Cancelar", confirm: "Confirmar", general: "Historial general", fav: "Favoritas", download: "Descargar", close: "Cerrar", openChat: "Abrir chat", savedImage: "Imagen guardada en la biblioteca de este navegador.", imageBig: "La imagen pasa de 4 MB. No se ha guardado.", deleteChat: "¿Eliminar este chat de este navegador?", deleteProject: "¿Eliminar este proyecto? Sus chats vuelven al historial general.", deleteImage: "¿Eliminar esta imagen de este navegador?", projectName: "Nombre del proyecto", chatName: "Nombre del chat", imageOff: "La generación de imágenes llegará pronto. Por ahora puedes guardar aquí las imágenes que adjuntes en tus chats.", originRules: "Esta respuesta sale de las reglas de ARQIVEN, sin un modelo.", originExtract: "Es un extracto de las fuentes citadas. No lo escribió el modelo.", originModel: "Lo escribió un modelo de terceros" },
  en: { newChat: "New chat", settings: "Settings", conversations: "Chats", recent: "Recent", emptyChats: "No chats yet.", emptyProjects: "No projects yet.", projectOne: "1 project", projectMany: "{n} projects", emptyLibrary: "No images yet.", attachImage: "Attach an image", allImages: "All", imageOne: "1 image", imageMany: "{n} images", filterBy: "Filter", search: "Search", welcome: "How can I help?", note: "ARQIVEN is ORVUPI's AI and runs on third-party models. It can make mistakes; check anything that matters. What you write stays in this browser.", generating: "Generating", waiting: "Waiting", done: "Done", failed: "Error", copy: "Copy", copied: "Copied on this device.", copyFail: "Could not copy.", againReply: "Ask again", attach: "Attach", more: "More", details: "Details", today: "Today", yesterday: "Yesterday", week: "7 days", older: "Older", projects: "Projects", projectHint: "Deleting a project returns its chats to the general history.", library: "Library", create: "Create", rename: "Rename", move: "Move to project", remove: "Delete", cancel: "Cancel", confirm: "Confirm", general: "General history", fav: "Favorites", download: "Download", close: "Close", openChat: "Open chat", savedImage: "Image saved in this browser's library.", imageBig: "The image is over 4 MB. It was not saved.", deleteChat: "Delete this chat from this browser?", deleteProject: "Delete this project? Its chats return to the general history.", deleteImage: "Delete this image from this browser?", projectName: "Project name", chatName: "Chat name", imageOff: "Image generation is coming soon. For now you can keep the images you attach in your chats here.", originRules: "This answer comes from ARQIVEN's rules, without a model.", originExtract: "This is an excerpt from the cited sources. The model did not write it.", originModel: "A third-party model wrote this" },
  pt: { newChat: "Novo chat", settings: "Ajustes", conversations: "Chats", recent: "Recentes", emptyChats: "Ainda não há chats.", emptyProjects: "Ainda não há projetos.", projectOne: "1 projeto", projectMany: "{n} projetos", emptyLibrary: "Ainda não há imagens.", attachImage: "Anexar imagem", allImages: "Todas", imageOne: "1 imagem", imageMany: "{n} imagens", filterBy: "Filtrar", search: "Buscar", welcome: "Como posso ajudar?", note: "ARQIVEN é a IA da ORVUPI e funciona com modelos de terceiros. Pode errar; confira a informação importante. O que você escreve fica neste navegador.", generating: "Gerando", waiting: "Em espera", done: "Pronto", failed: "Erro", copy: "Copiar", copied: "Copiado neste navegador.", copyFail: "Não foi possível copiar.", againReply: "Perguntar de novo", attach: "Anexar", more: "Mais", details: "Detalhes", today: "Hoje", yesterday: "Ontem", week: "7 dias", older: "Anteriores", projects: "Projetos", projectHint: "Se excluir um projeto, os chats voltam ao histórico geral.", library: "Biblioteca", create: "Criar", rename: "Renomear", move: "Mover para projeto", remove: "Excluir", cancel: "Cancelar", confirm: "Confirmar", general: "Histórico geral", fav: "Favoritas", download: "Baixar", close: "Fechar", openChat: "Abrir chat", savedImage: "Imagem guardada na biblioteca deste navegador.", imageBig: "A imagem passa de 4 MB. Não foi guardada.", deleteChat: "Excluir este chat deste navegador?", deleteProject: "Excluir este projeto? Os chats voltam ao histórico geral.", deleteImage: "Excluir esta imagem deste navegador?", projectName: "Nome do projeto", chatName: "Nome do chat", imageOff: "A geração de imagens chega em breve. Por enquanto você pode guardar aqui as imagens que anexar nos seus chats.", originRules: "Esta resposta vem das regras da ARQIVEN, sem um modelo.", originExtract: "É um trecho das fontes citadas. O modelo não escreveu.", originModel: "Um modelo de terceiros escreveu isto" },
  ja: { newChat: "新しいチャット", settings: "設定", conversations: "チャット", recent: "最近", emptyChats: "まだチャットがありません。", emptyProjects: "まだプロジェクトがありません。", projectOne: "1 件", projectMany: "{n} 件", emptyLibrary: "まだ画像がありません。", attachImage: "画像を添付", allImages: "すべて", imageOne: "1 枚", imageMany: "{n} 枚", filterBy: "絞り込み", search: "検索", welcome: "何をお手伝いしましょうか。", note: "ARQIVEN は ORVUPI の AI で、第三者モデルで動きます。間違えることがあります。重要な情報は確認してください。書いた内容はこのブラウザに保存されます。", generating: "生成中", waiting: "待機", done: "完了", failed: "エラー", copy: "コピー", copied: "このブラウザにコピーしました。", copyFail: "コピーできませんでした。", againReply: "もう一度聞く", attach: "添付", more: "その他", details: "詳細", today: "今日", yesterday: "昨日", week: "7日", older: "それ以前", projects: "プロジェクト", projectHint: "プロジェクトを削除すると、そのチャットは全体の履歴に戻ります。", library: "ライブラリ", create: "作成", rename: "名前を変更", move: "プロジェクトへ移動", remove: "削除", cancel: "キャンセル", confirm: "確認", general: "全体の履歴", fav: "お気に入り", download: "ダウンロード", close: "閉じる", openChat: "チャットを開く", savedImage: "画像をこのブラウザのライブラリに保存しました。", imageBig: "画像が 4 MB を超えています。保存していません。", deleteChat: "このチャットをこのブラウザから削除しますか？", deleteProject: "このプロジェクトを削除しますか？チャットは全体の履歴に戻ります。", deleteImage: "この画像をこのブラウザから削除しますか？", projectName: "プロジェクト名", chatName: "チャット名", imageOff: "画像の生成はもうすぐです。今はチャットに添付した画像をここに保存できます。", originRules: "この回答は ARQIVEN のルールによるもので、モデルは使っていません。", originExtract: "引用した出典からの抜粋です。モデルが書いた文章ではありません。", originModel: "第三者が作ったモデルが書きました" },
  ko: { newChat: "새 채팅", settings: "설정", conversations: "채팅", recent: "최근", emptyChats: "아직 채팅이 없습니다.", emptyProjects: "아직 프로젝트가 없습니다.", projectOne: "1개", projectMany: "{n}개", emptyLibrary: "아직 이미지가 없습니다.", attachImage: "이미지 첨부", allImages: "전체", imageOne: "1장", imageMany: "{n}장", filterBy: "필터", search: "검색", welcome: "무엇을 도와드릴까요?", note: "ARQIVEN은 ORVUPI의 AI이고 제3자 모델로 동작합니다. 틀릴 수 있으니 중요한 정보는 확인하세요. 쓴 내용은 이 브라우저에 저장됩니다.", generating: "생성 중", waiting: "대기", done: "완료", failed: "오류", copy: "복사", copied: "이 브라우저에 복사했습니다.", copyFail: "복사하지 못했습니다.", againReply: "다시 묻기", attach: "첨부", more: "더보기", details: "세부 정보", today: "오늘", yesterday: "어제", week: "7일", older: "이전", projects: "프로젝트", projectHint: "프로젝트를 삭제하면 채팅은 일반 기록으로 돌아갑니다.", library: "라이브러리", create: "만들기", rename: "이름 바꾸기", move: "프로젝트로 옮기기", remove: "삭제", cancel: "취소", confirm: "확인", general: "일반 기록", fav: "즐겨찾기", download: "다운로드", close: "닫기", openChat: "채팅 열기", savedImage: "이미지를 이 브라우저의 라이브러리에 저장했습니다.", imageBig: "이미지가 4 MB를 넘습니다. 저장하지 않았습니다.", deleteChat: "이 채팅을 이 브라우저에서 삭제할까요?", deleteProject: "이 프로젝트를 삭제할까요? 채팅은 일반 기록으로 돌아갑니다.", deleteImage: "이 이미지를 이 브라우저에서 삭제할까요?", projectName: "프로젝트 이름", chatName: "채팅 이름", imageOff: "이미지 생성은 곧 제공됩니다. 지금은 채팅에 첨부한 이미지를 여기에 보관할 수 있습니다.", originRules: "이 답은 ARQIVEN의 규칙에서 나왔고, 모델은 쓰지 않았습니다.", originExtract: "인용한 출처의 발췌입니다. 모델이 쓴 글이 아닙니다.", originModel: "제3자 모델이 썼습니다" },
};
const chrome = CHROME[uiLang];
const copy = {
  voice: root.getAttribute("data-voice") || "",
  fileRead: root.getAttribute("data-file-read") || "",
  fileBad: root.getAttribute("data-file-bad") || "",
  saved: root.getAttribute("data-saved") || "",
  saveFail: root.getAttribute("data-save-fail") || "",
  empty: root.getAttribute("data-empty") || "",
  projects: root.getAttribute("data-projects") || "",
  docs: root.getAttribute("data-docs") || "",
};

const state = {
  tool: "chat",
  view: "chat",
  messages: [],
  attachment: null,
  localText: "",
  conversationId: "",
  conversations: [],
  projects: [],
  images: [],
  activeProject: "",
  chatProject: "",
  chatTitle: "",
  chatRenamed: false,
  favOnly: false,
  imageFilter: "",
  imagesOn: false,
  chatDb: null,
  contextRefs: [],
  prepareFailures: 0,
  fallbackNote: "",
  prefDb: null,
  snap: { phase: "idle", ready: false, modelId: "", modelVersion: "", progress: { loaded: 0, total: 0, file: "" }, error: "" },
  queue: [],
  painting: 0,
  knowledge: null,
  webgpu: false,
};

const app = document.getElementById("app");
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("backdrop");
const menu = document.getElementById("menu");
const prompt = document.getElementById("prompt");
const stop = document.createElement("button");
stop.type = "button";
stop.id = "stop";
stop.className = "stop";
stop.hidden = true;
stop.textContent = ui.stop;
stop.setAttribute("aria-label", ui.stop);
document.getElementById("send")?.before(stop);
let turnEpoch = 0;
const messages = document.getElementById("messages");
const welcome = document.getElementById("welcome");
const view = document.getElementById("chat-view");
const recent = document.getElementById("recent");
const chatMenu = document.createElement("div");
chatMenu.className = "row-menu";
chatMenu.hidden = true;
chatMenu.setAttribute("role", "menu");
document.body.append(chatMenu);
let listHold = 0;
let listSig = "";
const search = document.getElementById("search");
const status = document.getElementById("status");
const selected = document.getElementById("selected-tool");
const fileInput = document.getElementById("file-input");
const save = document.getElementById("save-work");
const pill = document.querySelector(".workspace .pill");
const engine = arqivenEngine();

const engineBar = document.createElement("div");
engineBar.className = "engine-bar";
const modelPick = document.createElement("select");
modelPick.id = "model-pick";
modelPick.setAttribute("aria-label", ui.third);
for (const item of THIRD_PARTY_MODELS) {
  if (item.listed === false) continue;
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = `${item.version} · ${ui.third} · ${item.device} · ${item.sizeMb} MB`;
  if (item.id === defaultModel().id) option.selected = true;
  modelPick.append(option);
}
const prepare = document.createElement("button");
prepare.type = "button";
prepare.id = "prepare";
prepare.className = "prepare";
prepare.textContent = ui.prepare;
const cancel = document.createElement("button");
cancel.type = "button";
cancel.id = "cancel-engine";
cancel.className = "cancel";
cancel.textContent = ui.cancel;
cancel.hidden = true;
const progress = document.createElement("p");
progress.id = "engine-progress";
progress.className = "engine-progress";
progress.setAttribute("role", "status");
const meter = document.createElement("span");
meter.className = "engine-meter";
meter.hidden = true;
meter.append(document.createElement("i"));
engineBar.append(modelPick, prepare, cancel, meter, progress);
const indicator = document.createElement("p");
indicator.id = "model-indicator";
indicator.className = "model-indicator";
const sourceNote = document.createElement("p");
sourceNote.id = "source-note";
sourceNote.className = "source-note";
sourceNote.textContent = ui.wikiDisclosure;
const exportVotes = document.createElement("button");
exportVotes.type = "button";
exportVotes.id = "export-feedback";
exportVotes.className = "prepare";
exportVotes.textContent = ui.exportVotes;
engineBar.append(indicator, sourceNote, exportVotes);
document.getElementById("engine-slot")?.append(engineBar);
applyChrome();

const editorToggle = document.createElement("button");
editorToggle.type = "button";
editorToggle.id = "editor-toggle";
editorToggle.className = "editor-toggle";
editorToggle.textContent = ui.editor;
editorToggle.setAttribute("aria-pressed", "false");
document.getElementById("more-pop")?.append(editorToggle);

const editor = document.createElement("aside");
editor.id = "local-editor";
editor.className = "local-editor";
editor.hidden = true;
editor.setAttribute("aria-labelledby", "editor-title");
const editorHead = document.createElement("div");
editorHead.className = "editor-head";
const editorTitle = document.createElement("h2");
editorTitle.id = "editor-title";
editorTitle.textContent = ui.editorTitle;
const editorClose = document.createElement("button");
editorClose.type = "button";
editorClose.id = "editor-close";
editorClose.className = "ghost";
editorClose.textContent = ui.closeEditor;
editorHead.append(editorTitle, editorClose);
const editorNote = document.createElement("p");
editorNote.className = "editor-note";
editorNote.textContent = ui.editorNote;
const paper = document.createElement("div");
paper.className = "editor-paper";
const editorText = document.createElement("textarea");
editorText.id = "editor-text";
editorText.maxLength = 8000;
paper.append(editorText);
const editorFoot = document.createElement("p");
editorFoot.className = "editor-foot";
editorFoot.textContent = ui.where;
editor.append(editorHead, editorNote, paper, editorFoot);
app?.append(editor);

const CHIP_TASK = ["generate", "analyze", "explain", null];

function applyChrome() {
  const welcomeTitle = document.querySelector("#welcome h2");
  if (welcomeTitle) welcomeTitle.textContent = chrome.welcome;
  const note = document.querySelector(".composer-area .note");
  if (note) note.textContent = chrome.note;
  const fresh = document.querySelector("#new-chat-side .hide-collapsed");
  if (fresh) fresh.textContent = chrome.newChat;
  document.getElementById("new-chat")?.setAttribute("aria-label", chrome.newChat);
  document.getElementById("more-toggle")?.setAttribute("aria-label", chrome.more);
  const settingsButton = document.getElementById("open-settings");
  const settingsLabel = settingsButton?.querySelector("span");
  if (settingsLabel) settingsLabel.textContent = chrome.settings;
  settingsButton?.setAttribute("aria-label", chrome.settings);
  const navChat = document.querySelector("[data-nav='chat'] .hide-collapsed");
  if (navChat) navChat.textContent = chrome.conversations;
  const hist = document.getElementById("hist-label");
  if (hist) hist.textContent = state.activeProject ? (state.projects.find((item) => item.id === state.activeProject)?.name || chrome.projects) : chrome.recent;
  const libraryAttach = document.getElementById("library-attach");
  if (libraryAttach) libraryAttach.textContent = chrome.attachImage;
  const libraryEmpty = document.getElementById("library-empty-text");
  if (libraryEmpty) libraryEmpty.textContent = chrome.emptyLibrary;
  document.querySelector("[data-nav='projects'] .hide-collapsed").textContent = chrome.projects;
  document.querySelector("[data-nav='library'] .hide-collapsed").textContent = chrome.library;
  const projectTitle = document.getElementById("project-title");
  if (projectTitle) projectTitle.textContent = chrome.projects;
  const libraryTitle = document.getElementById("library-title");
  if (libraryTitle) libraryTitle.textContent = chrome.library;
  const create = document.getElementById("project-create");
  if (create) create.textContent = chrome.create;
  const imageFav = document.getElementById("image-fav");
  if (imageFav) imageFav.textContent = chrome.fav;
  const projectName = document.getElementById("project-name");
  if (projectName) projectName.setAttribute("aria-label", chrome.projectName);
  if (search instanceof HTMLInputElement) search.placeholder = chrome.search;
  const attachLabel = document.querySelector("#attach span");
  if (attachLabel) attachLabel.textContent = chrome.attach;
  const settingsTitle = document.getElementById("settings-title");
  if (settingsTitle) settingsTitle.textContent = chrome.settings;
}

function newId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `c-${Date.now()}`;
}

function hashId() {
  const match = location.hash.match(/^#c\/([A-Za-z0-9-]{8,80})$/);
  return match ? match[1] : "";
}

function setHash(id) {
  const next = `#c/${id}`;
  if (location.hash !== next) history.replaceState(null, "", `${location.pathname}${location.search}${next}`);
}

function slimMessage(item) {
  return {
    id: item.id,
    role: item.role,
    content: item.content,
    mode: item.mode,
    modelContent: item.modelContent,
    provider: item.provider,
    modelId: item.modelId,
    modelVersion: item.modelVersion,
    sources: item.sources,
  };
}

let saveTimer = 0;
const removedIds = new Set();
function remember() {
  if (!state.messages.length || !state.chatDb) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void persist(); }, 180);
}

function liveTitle() {
  if (state.chatRenamed && state.chatTitle) return state.chatTitle;
  return currentTitle();
}

async function persist() {
  if (!state.chatDb || !state.messages.some((item) => item.content)) return;
  const title = liveTitle() || chrome.newChat;
  const savedId = state.conversationId;
  await saveConversation(state.chatDb, {
    id: savedId,
    title,
    renamed: state.chatRenamed,
    projectId: state.chatProject,
    messages: state.messages.map(slimMessage),
  });
  if (removedIds.has(savedId)) {
    await deleteConversation(state.chatDb, savedId);
    removedIds.delete(savedId);
  }
  state.conversations = await listConversations(state.chatDb);
  paintList();
  const heading = document.getElementById("thread-title");
  if (heading && state.view === "chat") heading.textContent = title;
  document.title = `${title} · ARQIVEN`;
}

async function openConversation(id) {
  if (!state.chatDb || !id || id === state.conversationId) return;
  stopGeneration(true);
  await persist();
  const row = await readConversation(state.chatDb, id);
  state.conversationId = id;
  state.messages = row?.messages ? row.messages.map((item) => ({ ...item })) : [];
  state.chatProject = row?.projectId || "";
  state.chatRenamed = row?.renamed === true;
  state.chatTitle = row?.renamed ? row.title : "";
  state.view = "chat";
  state.queue = [];
  setHash(id);
  paint();
  openMenu(false);
}

function fitViewport() {
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const offset = viewport?.offsetTop || 0;
  document.documentElement.style.setProperty("--vv-height", `${Math.round(height)}px`);
  document.documentElement.style.setProperty("--vv-offset", `${Math.round(offset)}px`);
}

function addText(parent, value) {
  const paragraph = document.createElement("p");
  paragraph.textContent = value;
  parent.append(paragraph);
}

function addCode(parent, value) {
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = value.replace(/\n$/, "");
  pre.append(code);
  parent.append(pre);
}

function addTable(parent, rows) {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  rows.forEach((row, index) => {
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    if (!cells.length || cells.every((cell) => /^:?-+:?$/.test(cell))) return;
    const line = document.createElement("tr");
    for (const cell of cells) {
      const node = document.createElement(index === 0 ? "th" : "td");
      node.textContent = cell;
      line.append(node);
    }
    table.append(line);
  });
  wrap.append(table);
  parent.append(wrap);
}

function renderRich(parent, text) {
  const chunks = String(text || "").split(/```/);
  chunks.forEach((chunk, index) => {
    if (index % 2 === 1) {
      addCode(parent, chunk.replace(/^[^\n]*\n/, ""));
      return;
    }
    const lines = chunk.split("\n");
    let buffer = [];
    let table = [];
    const flushText = () => {
      const value = buffer.join("\n").trim();
      buffer = [];
      if (value) addText(parent, value);
    };
    const flushTable = () => {
      if (table.length) addTable(parent, table);
      table = [];
    };
    for (const line of lines) {
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        flushText();
        table.push(line.trim());
      } else {
        flushTable();
        buffer.push(line);
      }
    }
    flushTable();
    flushText();
  });
}

function originLine(item) {
  if (item.mode === "extractive") return chrome.originExtract;
  if (item.provider === "third-party" && item.mode === "model") {
    return item.modelVersion ? `${chrome.originModel}: ${item.modelVersion}.` : `${chrome.originModel}.`;
  }
  return chrome.originRules;
}

function provenance(item) {
  const details = document.createElement("details");
  details.className = "provenance";
  const summary = document.createElement("summary");
  summary.textContent = chrome.details;
  const note = document.createElement("p");
  note.textContent = originLine(item);
  details.append(summary, note);
  return details;
}

function sourceList(sources) {
  const list = document.createElement("ul");
  list.className = "sources";
  const caption = document.createElement("li");
  caption.className = "sources-label";
  caption.textContent = ui.sourcesLabel;
  list.append(caption);
  for (const source of sources) {
    if (!source?.url) continue;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    const origin = source.origin === "wikipedia" ? "Wikipedia" : "ORVUPI";
    link.textContent = `${source.title || source.url} · ${origin} · ${source.license || ""}`.trim();
    if (/^https?:/i.test(source.url)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    item.append(link);
    list.append(item);
  }
  return list;
}

function voteButton(item, vote) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "vote";
  button.dataset.vote = vote;
  button.setAttribute("aria-pressed", item.vote === vote ? "true" : "false");
  button.setAttribute("aria-label", vote === "up" ? ui.useful : ui.notUseful);
  button.textContent = vote === "up" ? "👍" : "👎";
  button.addEventListener("click", () => { void rememberVote(item, vote, button); });
  return button;
}

async function rememberVote(item, vote, button) {
  item.vote = vote;
  const db = await openFeedbackDb();
  await saveVote(db, {
    id: `${item.id}:${vote}`,
    vote,
    lang,
    modelId: item.modelId,
    modelVersion: item.modelVersion,
    task: state.tool,
    sourceCount: item.sources?.length || 0,
  });
  button.setAttribute("aria-pressed", "true");
  const sibling = button.parentElement?.querySelector(`[data-vote="${vote === "up" ? "down" : "up"}"]`);
  sibling?.setAttribute("aria-pressed", "false");
}

async function downloadVotes() {
  const db = await openFeedbackDb();
  const votes = await listVotes(db);
  const blob = new Blob([exportPayload(votes)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "arqiven-votos.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function knowledgeIndex() {
  if (state.knowledge) return state.knowledge;
  const response = await fetch("/arqiven/knowledge-index.json");
  if (!response.ok) return null;
  const payload = await response.json();
  state.knowledge = buildIndex(payload.chunks || []);
  return state.knowledge;
}

function startPrepare(modelId) {
  if (state.prepareFailures >= 3) {
    setStatus(ui.retries);
    return;
  }
  if (state.snap.phase === "preparing") return;
  engine.prepare(modelId || defaultModel().id);
}

function selectTool(button) {
  state.tool = button.getAttribute("data-tool") || "chat";
  document.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
  if (selected) selected.textContent = `${ui.task}: ${button.textContent || ""}`;
  const tools = document.getElementById("tools");
  if (tools instanceof HTMLDetailsElement) tools.open = false;
}

function setStatus(text) {
  if (status) status.textContent = text;
}

function openMenu(open) {
  sidebar?.classList.toggle("open", open);
  backdrop?.classList.toggle("open", open);
  if (menu) menu.setAttribute("aria-expanded", open ? "true" : "false");
}

function openEditorWith(text, explicit) {
  const clean = sanitizePlain(text);
  const wide = window.matchMedia("(min-width: 1101px)").matches;
  if (!explicit && state.localText.trim() && state.localText !== clean) return;
  if (!explicit && !wide) return;
  state.localText = clean;
  editorText.value = clean;
  setEditor(true);
}

function setEditor(open) {
  editor.hidden = !open;
  root.classList.toggle("has-editor", open);
  editorToggle.setAttribute("aria-pressed", open ? "true" : "false");
  if (open) editorText.value = state.localText;
}

let engineStatus = "";

function showEngineStatus(line) {
  const current = status?.textContent || "";
  if (line === engineStatus) return;
  if (engineStatus && current && current !== engineStatus) {
    engineStatus = line;
    return;
  }
  engineStatus = line;
  setStatus(line);
}

function updateEngineUi() {
  const snap = state.snap;
  const meterState = downloadProgress(snap.progress);
  const pct = meterState.pct;
  if (pill) pill.textContent = ui.idle;
  prepare.textContent = snap.phase === "ready" ? ui.again : ui.prepare;
  prepare.disabled = snap.phase === "preparing" || snap.phase === "ready" && modelPick.value === snap.modelId;
  cancel.hidden = snap.phase !== "preparing" && !state.queue.some((item) => item.running);
  meter.hidden = snap.phase !== "preparing";
  meter.classList.toggle("is-known", meterState.known);
  meter.querySelector("i").style.width = meterState.known ? `${Math.max(pct, 4)}%` : "";
  let line = "";
  if (snap.phase === "preparing") {
    const file = snap.progress.file ? ` ${snap.progress.file}` : "";
    const ratio = meterState.known ? ` ${pct}%` : " …";
    line = `${snap.probe ? ui.checking : ui.preparing}${ratio}${file}`;
  } else if (snap.phase === "error") line = ui.error;
  else if (snap.phase === "ready") line = `${ui.ready} · ${snap.modelId} · ${snap.modelVersion}`;
  if (state.fallbackNote) line = line ? `${line} ${state.fallbackNote}` : state.fallbackNote;
  progress.textContent = line;
  if (line && (snap.phase === "preparing" || state.fallbackNote)) showEngineStatus(line);
  const chosen = modelById(modelPick.value) || defaultModel();
  indicator.textContent = `${chosen.version} · ${ui.third} · ${ui.usesSources}`;
}

function paintSoon() {
  if (state.painting) return;
  state.painting = requestAnimationFrame(() => {
    state.painting = 0;
    paint();
  });
}

function currentTitle() {
  return state.messages.find((item) => item.role === "user")?.content.replace(/\s+/g, " ").trim().slice(0, 80) || "";
}

function scopedChats() {
  const query = search instanceof HTMLInputElement ? search.value : "";
  const merged = new Map(state.conversations.map((item) => [item.id, item]));
  const title = liveTitle();
  if (title && state.conversationId) {
    const prev = merged.get(state.conversationId);
    merged.set(state.conversationId, {
      id: state.conversationId,
      title,
      renamed: state.chatRenamed,
      projectId: state.chatProject,
      updated: prev?.updated || new Date().toISOString(),
      messages: state.messages.length ? state.messages : (prev?.messages || []),
    });
  }
  return [...merged.values()]
    .filter((item) => (state.activeProject ? item.projectId === state.activeProject : !item.projectId))
    .filter((item) => matchesQuery(item, query))
    .sort((a, b) => (a.updated < b.updated ? 1 : -1));
}

function chatRow(item) {
  const row = document.createElement("div");
  row.className = "recent-row";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "recent-open";
  button.textContent = item.title || chrome.newChat;
  button.title = item.title || chrome.newChat;
  if (item.id === state.conversationId) button.setAttribute("aria-current", "true");
  button.addEventListener("click", () => { void openConversation(item.id); });
  const more = document.createElement("button");
  more.type = "button";
  more.className = "iconbtn recent-more";
  more.textContent = "⋯";
  more.setAttribute("aria-label", chrome.more);
  more.setAttribute("aria-expanded", "false");
  more.setAttribute("aria-haspopup", "menu");
  more.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleChatMenu(item, more);
  });
  row.append(button, more);
  return row;
}

function toggleChatMenu(item, anchor) {
  const same = !chatMenu.hidden && chatMenu.dataset.chat === item.id;
  closeRowMenus();
  if (same) return;
  chatMenu.dataset.chat = item.id;
  chatMenu.replaceChildren();
  for (const [key, label] of [["rename", chrome.rename], ["move", chrome.move], ["remove", chrome.remove]]) {
    const action = document.createElement("button");
    action.type = "button";
    action.setAttribute("role", "menuitem");
    action.textContent = label;
    action.addEventListener("click", (event) => {
      event.stopPropagation();
      void chatAction(key, item);
    });
    chatMenu.append(action);
  }
  const box = anchor.getBoundingClientRect();
  const width = 208;
  chatMenu.style.top = `${Math.round(box.bottom + 4)}px`;
  chatMenu.style.left = `${Math.round(Math.max(8, Math.min(box.right - width, window.innerWidth - width - 8)))}px`;
  chatMenu.hidden = false;
  anchor.setAttribute("aria-expanded", "true");
}

async function chatAction(action, item) {
  if (!state.chatDb) return;
  if (action === "rename") {
    const name = await askUser(chrome.chatName, item.title);
    if (!name) return;
    const row = state.conversations.find((chat) => chat.id === item.id) || item;
    if (item.id === state.conversationId) {
      state.chatRenamed = true;
      state.chatTitle = name;
      await persist();
    } else {
      await saveConversation(state.chatDb, { ...row, title: name, renamed: true });
    }
  }
  if (action === "move") {
    const choice = await askUser(`${chrome.move}\n${chrome.general}`, item.projectId || "");
    if (choice == null) return;
    const projectId = state.projects.some((project) => project.id === choice || project.name === choice) ? (state.projects.find((project) => project.id === choice || project.name === choice)?.id || "") : "";
    const row = state.conversations.find((chat) => chat.id === item.id) || item;
    if (item.id === state.conversationId) {
      state.chatProject = projectId;
      await persist();
    } else {
      await saveConversation(state.chatDb, { ...row, projectId });
    }
  }
  if (action === "remove") {
    const ok = await askUser(chrome.deleteChat, "", chrome.remove);
    if (ok == null) return;
    removedIds.add(item.id);
    await deleteConversation(state.chatDb, item.id);
    if (item.id === state.conversationId) {
      state.messages = [];
      state.conversationId = newId();
      state.chatProject = state.activeProject;
      state.chatRenamed = false;
      state.chatTitle = "";
      setHash(state.conversationId);
    }
  }
  closeRowMenus();
  state.conversations = await listConversations(state.chatDb);
  paint();
}

function closeRowMenus() {
  chatMenu.hidden = true;
  delete chatMenu.dataset.chat;
  document.querySelectorAll(".recent-more").forEach((node) => node.setAttribute("aria-expanded", "false"));
}

function listLocked() {
  return listHold > 0 || !chatMenu.hidden;
}

function paintList() {
  if (!recent || listLocked()) return;
  const list = scopedChats();
  const sig = `${state.conversationId}\n${state.activeProject}\n` + list.map((item) => `${item.id}\t${item.title}\t${item.projectId}`).join("\n");
  if (sig === listSig) return;
  listSig = sig;
  recent.replaceChildren();
  if (!list.length) {
    const note = document.createElement("p");
    note.textContent = chrome.emptyChats;
    recent.append(note);
    return;
  }
  const labels = { today: chrome.today, yesterday: chrome.yesterday, week: chrome.week, older: chrome.older };
  for (const key of ["today", "yesterday", "week", "older"]) {
    const group = list.filter((item) => dateGroup(item.updated) === key);
    if (!group.length) continue;
    const heading = document.createElement("h3");
    heading.textContent = labels[key];
    recent.append(heading);
    for (const item of group) recent.append(chatRow(item));
  }
}

function paint() {
  paintList();
  const generating = state.messages.some((item) => item.running);
  const running = generating || state.messages.some((item) => item.pending);
  stop.hidden = !generating;
  stop.textContent = ui.stop;
  const failed = state.messages.some((item) => item.failed);
  root.dataset.state = running ? "generating" : failed ? "error" : state.messages.length ? "done" : "ready";
  if (messages) {
    messages.replaceChildren();
    for (const item of state.messages) {
      const node = document.createElement("article");
      node.id = item.id;
      node.className = item.role === "user" ? "user" : "assistant";
      if (item.genTokens) {
        node.dataset.genTokens = String(item.genTokens);
        node.dataset.genMs = String(item.genMs || 0);
        node.dataset.genThreads = String(item.genThreads || 1);
      }
      if (item.role === "assistant") {
        const avatar = document.createElement("span");
        avatar.className = "avatar crop crop-icon";
        avatar.setAttribute("aria-hidden", "true");
        const mark = document.createElement("img");
        mark.src = "/assets/arqiven/logo-oficial.png";
        mark.alt = "";
        avatar.append(mark);
        const column = document.createElement("div");
        column.className = "body";
        const meta = document.createElement("p");
        meta.className = "meta";
        const who = document.createElement("span");
        who.className = "who";
        who.textContent = "ARQIVEN";
        meta.append(avatar, who);
        if (item.failed) {
          const badge = document.createElement("span");
          badge.className = "badge is-error";
          badge.textContent = chrome.failed;
          meta.append(badge);
        }
        column.append(meta);
        renderRich(column, item.content);
        if (!item.running && item.content) column.append(provenance(item));
        if (item.sources?.length) column.append(sourceList(item.sources));
        if (item.content && !item.running) {
          const actions = document.createElement("div");
          actions.className = "answer-actions";
          const edit = document.createElement("button");
          edit.type = "button";
          edit.textContent = ui.edit;
          edit.addEventListener("click", () => openEditorWith(item.content, true));
          const copyButton = document.createElement("button");
          copyButton.type = "button";
          copyButton.textContent = chrome.copy;
          copyButton.addEventListener("click", () => {
            const done = navigator.clipboard?.writeText(item.content);
            if (!done) { setStatus(chrome.copyFail); return; }
            void done.then(() => setStatus(chrome.copied)).catch(() => setStatus(chrome.copyFail));
          });
          const up = voteButton(item, "up");
          const down = voteButton(item, "down");
          actions.append(copyButton, edit, up, down);
          if (!item.running) {
            const again = document.createElement("button");
            again.type = "button";
            again.textContent = chrome.againReply;
            again.addEventListener("click", () => {
              const index = state.messages.indexOf(item);
              const prior = [...state.messages.slice(0, index)].reverse().find((entry) => entry.role === "user");
              if (prior && prompt instanceof HTMLTextAreaElement) {
                prompt.value = prior.content;
                void send();
              }
            });
            actions.append(again);
          }
          column.append(actions);
        }
        node.append(column);
      } else {
        node.textContent = item.content;
      }
      messages.append(node);
    }
    messages.scrollTop = messages.scrollHeight;
  }
  const threaded = state.messages.length > 0 && state.view === "chat";
  welcome?.toggleAttribute("hidden", state.view !== "chat" || state.messages.length > 0);
  view?.classList.toggle("is-thread", threaded);
  const chatting = state.view === "chat";
  view?.classList.toggle("is-welcome", chatting && state.messages.length === 0);
  if (welcome) welcome.hidden = !chatting || state.messages.length > 0;
  if (messages) messages.hidden = !chatting;
  const composer = document.querySelector(".composer-area");
  if (composer) composer.hidden = !chatting;
  const projectsPanel = document.getElementById("project-view");
  if (projectsPanel) projectsPanel.hidden = state.view !== "projects";
  const libraryPanel = document.getElementById("library-view");
  if (libraryPanel) libraryPanel.hidden = state.view !== "library";
  if (view) view.hidden = state.view === "settings";
  const settings = document.getElementById("settings");
  if (settings) settings.hidden = state.view !== "settings";
  if (state.view === "projects") paintProjects();
  if (save) save.hidden = state.messages.length === 0 && !state.localText.trim();
  if (status && (running || status.textContent === ui.queued || status.textContent === chrome.generating)) {
    status.textContent = running ? (state.messages.some((item) => item.running) ? chrome.generating : ui.queued) : "";
  }
  const heading = document.getElementById("thread-title");
  const title = liveTitle();
  const projectLabel = state.projects.find((item) => item.id === state.activeProject)?.name || "";
  const hist = document.getElementById("hist-label");
  if (hist) hist.textContent = projectLabel || chrome.recent;
  if (heading && state.view === "chat") heading.textContent = title || projectLabel || "ARQIVEN";
  if (title) document.title = `${title} · ARQIVEN`;
  remember();
  document.querySelectorAll("[data-nav]").forEach((button) => {
    const on = button.getAttribute("data-nav") === state.view;
    if (on) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  updateEngineUi();
}

function showView(name) {
  if (name === "chat") state.activeProject = "";
  state.view = name === "settings" || name === "projects" || name === "library" ? name : "chat";
  paint();
  if (name === "library") void paintLibrary();
  openMenu(false);
}

function assistant(partial) {
  const item = {
    id: `m-${state.messages.length}-a`,
    role: "assistant",
    content: "",
    mode: "rules",
    provider: "none",
    modelId: "none",
    modelVersion: "",
    ...partial,
  };
  state.messages.push(item);
  return item;
}

function markCancelled() {
  for (const item of state.messages) {
    if (!item.pending) continue;
    item.pending = false;
    item.content = ui.cancelled;
    item.mode = "rules";
    item.provider = "none";
    item.modelId = "none";
    item.modelVersion = "";
  }
  state.queue = [];
}

function stopGeneration(dropQueue = false) {
  turnEpoch += 1;
  engine.interrupt();
  for (const item of state.messages) {
    if (!item.running && !item.pending) continue;
    const wasRunning = item.running;
    item.running = false;
    item.pending = false;
    item.request = null;
    if (wasRunning && !String(item.content || "").trim()) {
      item.content = ui.stopped;
      item.mode = "rules";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
    }
  }
  if (dropQueue) state.queue = [];
  paint();
}

async function streamInto(item, request) {
  const epoch = turnEpoch;
  const reply = item.replyLang || lang;
  item.pending = false;
  item.mode = "model";
  item.provider = "third-party";
  item.modelId = state.snap.modelId;
  item.modelVersion = state.snap.modelVersion;
  item.content = "";
  item.running = true;
  if (!state.queue.includes(item)) state.queue.push(item);
  paint();
  try {
    const result = await engine.run(request, (token) => {
      if (epoch !== turnEpoch) return;
      item.content += token;
      paintSoon();
    }, reply, item.promptSources || []);
    if (epoch !== turnEpoch) return;
    item.genMs = result.genMs || 0;
    item.genTokens = result.genTokens || 0;
    item.genThreads = result.genThreads || 1;
    const prior = state.messages.filter((entry) => entry !== item).map((entry) => ({ role: entry.role, content: entry.content, mode: entry.mode }));
    const guarded = finishModelAnswer(result.text, reply, item.sources, item.question, prior);
    const followUp = isFollowUp(item.question, prior);
    if (guarded.blocked) {
      item.running = false;
      state.queue = state.queue.filter((entry) => entry !== item);
      item.content = guarded.text;
      item.mode = "rules";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
      item.blocked = guarded.blocked;
      paint();
      return;
    }
    item.running = false;
    state.queue = state.queue.filter((entry) => entry !== item);
    const usable = String(guarded.text || result.text || "").trim();
    if (!followUp && (guarded.extractive || usable.length < 24 || result.provider !== "third-party")) {
      const excerpt = guarded.extractive && guarded.text.trim().length >= 24
        ? guarded.text
        : (extractiveFromSources(reply, item.sources, item.question) || citedExcerpt(reply, item.sources, item.question));
      item.content = result.provider === "third-party" ? (excerpt || ui.emptyModel) : (result.text || honest);
      if (excerpt && result.provider === "third-party") {
        item.mode = "extractive";
        item.provider = "none";
        item.modelId = "none";
        item.modelVersion = "";
      } else {
      item.mode = result.mode;
      item.provider = result.provider;
      item.modelId = result.modelId;
      item.modelVersion = result.modelVersion || "";
      }
    } else {
      item.content = sanitizePlain(usable);
      item.mode = result.mode;
      item.provider = result.provider;
      item.modelId = result.modelId;
      item.modelVersion = result.modelVersion || "";
    }
  } catch (error) {
    if (epoch !== turnEpoch) return;
    item.running = false;
    state.queue = state.queue.filter((entry) => entry !== item);
    const message = error instanceof Error ? error.message : "";
    if (message === "cancelled") {
      item.content = item.content || ui.stopped;
      if (!item.content || item.content === ui.stopped) {
        item.mode = "rules";
        item.provider = "none";
        item.modelId = "none";
        item.modelVersion = "";
      }
    } else {
      item.content = `${ui.error} ${message}`.trim();
      item.failed = true;
      item.mode = "rules";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
    }
  }
  if (epoch !== turnEpoch) return;
  paint();
}

function failQueue(message) {
  for (const item of state.messages) {
    if (!item.pending) continue;
    item.pending = false;
    item.request = null;
    const excerpt = citedExcerpt(lang, item.sources, item.question) || (item.sources?.[0] ? excerptAnswer(lang, item.sources[0], item.question) : "");
    if (excerpt) {
      item.content = excerpt;
      item.mode = "extractive";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
    } else {
      item.content = `${ui.error} ${message || ""}`.trim();
      item.mode = "rules";
      item.provider = "none";
      item.modelId = "none";
      item.modelVersion = "";
    }
  }
  state.queue = state.queue.filter((item) => item.running);
}

async function flushQueue() {
  const next = state.queue.find((item) => item.pending && item.request);
  if (!next || !state.snap.ready) return;
  const request = next.request;
  next.request = null;
  await streamInto(next, request);
  if (state.queue.some((item) => item.pending)) await flushQueue();
}

async function send() {
  const field = prompt instanceof HTMLTextAreaElement ? prompt : null;
  const text = (field?.value || "").trim();
  const local = state.localText.trim();
  if (!text && !state.attachment && !local) return;
  if (state.messages.some((item) => item.running)) stopGeneration(true);
  const visible = [text, state.attachment ? state.attachment.name : "", local && !state.attachment ? ui.editorTitle : ""].filter(Boolean).join("\n");
  const modelText = [text, state.attachment?.text || "", local].filter(Boolean).join("\n\n").slice(0, 8000);
  const index = await knowledgeIndex().catch(() => null);
  const plan = await planTurn({
    question: text,
    lang,
    index,
    history: state.messages.map((item) => ({ role: item.role, content: item.content, mode: item.mode })),
    attachment: Boolean(state.attachment || local),
    model: modelById(modelPick.value) || defaultModel(),
    fetchImpl: text && !state.attachment ? globalThis.fetch.bind(globalThis) : null,
  });
  const user = { id: `m-${state.messages.length}-u`, role: "user", content: visible, modelContent: modelText, mode: "model" };
  state.messages.push(user);
  const request = createRequest({
    source: "central",
    task: state.tool,
    conversationId: state.conversationId,
    contextRefs: state.contextRefs,
    messages: state.messages.filter((item) => item.role === "user" || item.role === "assistant").map((item) => ({
      role: item.role,
      content: item.modelContent || item.content,
      modelContent: item.modelContent,
      mode: item.mode,
    })),
  });
  if (field) field.value = "";
  state.attachment = null;
  const chip = document.getElementById("file-chip");
  if (chip) chip.textContent = "";
  if (plan.skipModel) {
    assistant({ content: plan.text, mode: "rules", provider: "none", modelId: "none", sources: plan.sources });
    paint();
    field?.focus();
    return;
  }
  const excerpt = citedExcerpt(lang, plan.sources, text);
  if (!state.snap.ready) {
    if (state.snap.phase !== "preparing") startPrepare(modelPick.value || defaultModel().id);
    const item = assistant({
      content: excerpt,
      pending: true,
      mode: excerpt ? "extractive" : "rules",
      request,
      sources: plan.sources,
      promptSources: plan.promptSources,
      question: text,
    });
    setStatus(ui.queued);
    state.queue.push(item);
    paint();
    field?.focus();
    return;
  }
  const item = assistant({ sources: plan.sources, promptSources: plan.promptSources, question: text, replyLang: plan.replyLang });
  await streamInto(item, request);
  field?.focus();
}

engine.subscribe((snap) => {
  const was = state.snap.phase;
  state.snap = snap;
  if (snap.phase === "idle" && was === "preparing") markCancelled();
  if (snap.phase === "error" && was !== "error") {
    const next = stepDown(modelPick.value, state.webgpu);
    if (next && state.prepareFailures < 2) {
      state.prepareFailures += 1;
      if (next === "smol135-cpu") state.fallbackNote = ui.fallbackLoad;
      modelPick.value = next;
      startPrepare(next);
      paint();
      return;
    }
    state.prepareFailures += 1;
    failQueue(snap.error);
    if (state.prepareFailures >= 3) setStatus(ui.retries);
  }
  paint();
  if (snap.phase === "ready") void flushQueue();
});

document.querySelectorAll("#new-chat, #new-chat-side").forEach((button) => button.addEventListener("click", async () => {
  stopGeneration(true);
  await persist();
  state.messages = [];
  state.attachment = null;
  state.localText = "";
  state.queue = [];
  state.view = "chat";
  state.chatProject = state.activeProject;
  state.chatRenamed = false;
  state.chatTitle = "";
  state.conversationId = newId();
  setHash(state.conversationId);
  if (prompt instanceof HTMLTextAreaElement) prompt.value = "";
  editorText.value = "";
  setStatus("");
  document.title = "ARQIVEN";
  paint();
}));

document.getElementById("collapse")?.addEventListener("click", () => {
  const collapsed = app?.classList.toggle("is-collapsed");
  document.getElementById("collapse")?.setAttribute("aria-pressed", collapsed ? "true" : "false");
});

menu?.addEventListener("click", () => openMenu(!sidebar?.classList.contains("open")));
document.getElementById("more-toggle")?.addEventListener("click", () => {
  const pop = document.getElementById("more-pop");
  const open = pop?.classList.toggle("is-open");
  document.getElementById("more-toggle")?.setAttribute("aria-expanded", open ? "true" : "false");
});
backdrop?.addEventListener("click", () => openMenu(false));

document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => showView(button.getAttribute("data-nav") || "chat"));
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => selectTool(button));
});

const toolsMenu = document.getElementById("tools");
toolsMenu?.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent)) return;
  const buttons = [...toolsMenu.querySelectorAll("[data-tool]")];
  const current = Math.max(0, buttons.findIndex((item) => item === document.activeElement || item.getAttribute("aria-pressed") === "true"));
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  if (toolsMenu instanceof HTMLDetailsElement) toolsMenu.open = true;
  const step = event.key === "ArrowDown" ? 1 : -1;
  const next = buttons[(current + step + buttons.length) % buttons.length];
  next?.focus();
});

document.querySelectorAll("[data-chip]").forEach((button, index) => {
  button.addEventListener("click", () => {
    if (!(prompt instanceof HTMLTextAreaElement)) return;
    const task = CHIP_TASK[index] ?? null;
    if (!task) {
      state.tool = "chat";
      document.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", item.getAttribute("data-tool") === "chat" ? "true" : "false"));
      if (selected) selected.textContent = `${ui.task}: ${button.textContent || ""}`;
      prompt.value = "";
      setStatus(ui.notBuilt);
      prompt.focus();
      return;
    }
    state.tool = task;
    document.querySelectorAll("[data-tool]").forEach((item) => item.setAttribute("aria-pressed", item.getAttribute("data-tool") === task ? "true" : "false"));
    if (selected) selected.textContent = `${ui.task}: ${button.textContent || ""}`;
    const current = prompt.value.trim();
    if (!current) prompt.value = button.getAttribute("data-chip") || button.textContent || "";
    setStatus(ui.shortcut);
    prompt.focus();
  });
});

document.getElementById("send")?.addEventListener("click", () => { void send(); });
stop.addEventListener("click", () => stopGeneration(true));
prompt?.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent) || event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  void send();
});

recent?.addEventListener("pointerdown", () => { listHold += 1; });
recent?.addEventListener("pointerup", () => {
  setTimeout(() => {
    listHold = Math.max(0, listHold - 1);
    if (!listLocked()) paintList();
  }, 0);
});
recent?.addEventListener("pointercancel", () => {
  listHold = Math.max(0, listHold - 1);
});
document.addEventListener("click", (event) => {
  if (chatMenu.hidden) return;
  const target = event.target;
  if (target instanceof Element && (chatMenu.contains(target) || target.closest(".recent-more"))) return;
  closeRowMenus();
  paintList();
});

document.addEventListener("keydown", (event) => {
  if (!(event instanceof KeyboardEvent) || event.key !== "Escape") return;
  if (!chatMenu.hidden) {
    closeRowMenus();
    paintList();
    return;
  }
  if (toolsMenu instanceof HTMLDetailsElement && toolsMenu.open) {
    toolsMenu.open = false;
    return;
  }
  openMenu(false);
  setEditor(false);
});

document.getElementById("voice")?.addEventListener("click", () => setStatus(copy.voice));
prepare.addEventListener("click", () => { startPrepare(modelPick.value || defaultModel().id); });
modelPick.addEventListener("change", () => {
  state.fallbackNote = "";
  void rememberModel(modelPick.value);
  paint();
});
exportVotes.addEventListener("click", () => { void downloadVotes(); });
cancel.addEventListener("click", () => { engine.cancel(); });
editorToggle.addEventListener("click", () => setEditor(editor.hidden));
editorClose.addEventListener("click", () => setEditor(false));
editorText.addEventListener("input", () => { state.localText = editorText.value; });

document.getElementById("project-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("project-name");
  const name = input instanceof HTMLInputElement ? input.value.trim() : "";
  if (!name || !state.chatDb) return;
  await saveProject(state.chatDb, { id: newId(), name });
  input.value = "";
  state.projects = await listProjects(state.chatDb);
  paint();
});
document.getElementById("library-attach")?.addEventListener("click", () => fileInput?.click());
document.getElementById("attach")?.addEventListener("click", () => fileInput?.click());
fileInput?.addEventListener("change", () => {
  const input = fileInput instanceof HTMLInputElement ? fileInput : null;
  const file = input?.files?.[0];
  if (!file) return;
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
    void storeAttachedImage(file).finally(() => { if (input) input.value = ""; });
    return;
  }
  const allowed = /\.(txt|md)$/i.test(file.name) || file.type.startsWith("text/");
  if (!allowed) {
    setStatus(copy.fileBad);
    if (input) input.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const text = sanitizePlain(typeof reader.result === "string" ? reader.result : "");
    state.attachment = { name: file.name.slice(0, 120), text };
    state.localText = text;
    editorText.value = text;
    const chip = document.getElementById("file-chip");
    if (chip) chip.textContent = file.name;
    setStatus(`${copy.fileRead} ${file.name}`);
    if (window.matchMedia("(min-width: 1101px)").matches) setEditor(true);
  };
  reader.readAsText(file);
  if (input) input.value = "";
});

save?.addEventListener("click", () => {
  const transcript = state.messages.map((item) => `${item.role}: ${sanitizePlain(item.content, 4000)}`).join("\n\n");
  const body = sanitizePlain(state.localText.trim() || transcript, 4000);
  if (!body) return;
  const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : "";
  if (!id) {
    setStatus(copy.saveFail);
    return;
  }
  const note = {
    format: "orvupi-note",
    version: 1,
    id,
    title: "ARQIVEN",
    body,
    pinned: false,
    color: "#fff8ec",
    checks: [],
    label: "",
    archived: false,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(note));
  void saveWorkBytes({
    id,
    name: "ARQIVEN",
    kind: "note",
    mime: "application/vnd.orvupi.note+json",
    bytes,
    snippet: body.slice(0, 240),
  }).then(async (saved) => {
    if (!saved?.ok || saved.id !== id) {
      setStatus(copy.saveFail);
      return;
    }
    const loaded = await loadWorkBytes(saved.id);
    const back = loaded ? JSON.parse(new TextDecoder().decode(loaded.bytes)) : null;
    if (!back || back.id !== id || back.format !== "orvupi-note" || back.body !== body) {
      setStatus(copy.saveFail);
      return;
    }
    state.contextRefs = [saved.id];
    setStatus(`${copy.saved} ${saved.id}`);
  }).catch(() => setStatus(copy.saveFail));
});

search?.addEventListener("input", () => paint());
if (selected) selected.textContent = `${ui.task}: ${selected.textContent || ""}`;
fitViewport();
window.visualViewport?.addEventListener("resize", fitViewport);
window.visualViewport?.addEventListener("scroll", fitViewport);
window.addEventListener("resize", fitViewport);
window.addEventListener("hashchange", () => {
  const id = hashId();
  if (id && id !== state.conversationId) void openConversation(id);
});

function askUser(text, value = "", okLabel = chrome.confirm) {
  const dialog = document.getElementById("ask-dialog");
  if (!(dialog instanceof HTMLDialogElement)) return Promise.resolve(null);
  const input = document.getElementById("ask-input");
  document.getElementById("ask-text").textContent = text;
  if (input instanceof HTMLInputElement) {
    input.hidden = value === "" && okLabel === chrome.remove;
    input.value = value;
    input.placeholder = text;
  }
  document.getElementById("ask-ok").textContent = okLabel;
  document.getElementById("ask-cancel").textContent = chrome.cancel;
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "ok" ? (input instanceof HTMLInputElement ? input.value.trim() : "ok") : null);
    }, { once: true });
  });
}

function paintProjects() {
  const list = document.getElementById("project-list");
  const note = document.getElementById("project-note");
  const count = document.getElementById("project-count");
  const empty = document.getElementById("project-empty");
  if (note) note.textContent = state.projects.length ? chrome.projectHint : "";
  if (count) count.textContent = state.projects.length === 0 ? "" : state.projects.length === 1 ? chrome.projectOne : chrome.projectMany.replace("{n}", String(state.projects.length));
  if (empty) {
    empty.hidden = state.projects.length > 0;
    empty.textContent = chrome.emptyProjects;
  }
  if (!list) return;
  list.replaceChildren();
  for (const project of state.projects) {
    const row = document.createElement("div");
    row.className = "project-row";
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = project.name;
    if (project.id === state.activeProject) open.setAttribute("aria-current", "true");
    open.addEventListener("click", async () => {
      if (state.chatProject !== project.id) {
        await persist();
        state.messages = [];
        state.conversationId = newId();
        state.chatProject = project.id;
        state.chatRenamed = false;
        state.chatTitle = "";
        setHash(state.conversationId);
      }
      state.activeProject = project.id;
      state.view = "chat";
      paint();
    });
    const rename = document.createElement("button");
    rename.type = "button";
    rename.textContent = chrome.rename;
    rename.addEventListener("click", async () => {
      const name = await askUser(chrome.projectName, project.name);
      if (!name || !state.chatDb) return;
      await saveProject(state.chatDb, { ...project, name });
      state.projects = await listProjects(state.chatDb);
      paint();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = chrome.remove;
    remove.addEventListener("click", async () => {
      const ok = await askUser(chrome.deleteProject, "", chrome.remove);
      if (ok == null || !state.chatDb) return;
      await deleteProject(state.chatDb, project.id);
      if (state.activeProject === project.id) state.activeProject = "";
      if (state.chatProject === project.id) state.chatProject = "";
      state.projects = await listProjects(state.chatDb);
      state.conversations = await listConversations(state.chatDb);
      paint();
    });
    row.append(open, rename, remove);
    list.append(row);
  }
}

function revokeImages() {
  for (const url of state.imageUrls || []) URL.revokeObjectURL(url);
  state.imageUrls = [];
}

function imageMatches(item) {
  if (state.favOnly && item.favorite !== true) return false;
  const group = state.imageFilter;
  if (!group) return true;
  if (group.startsWith("project:")) return item.projectId === group.slice(8);
  if (group.startsWith("chat:")) return item.chatId === group.slice(5);
  return dateGroup(item.created) === group;
}

function chatTitleFor(id) {
  return state.conversations.find((chat) => chat.id === id)?.title || "";
}

function shortDate(iso) {
  const date = new Date(iso || 0);
  if (Number.isNaN(date.getTime())) return "";
  const lang = document.documentElement.lang || "es";
  return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(date);
}

function filterChip(label, pressed, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.setAttribute("aria-pressed", pressed ? "true" : "false");
  button.addEventListener("click", onClick);
  return button;
}

async function paintLibrary() {
  const grid = document.getElementById("library-grid");
  const note = document.getElementById("library-note");
  const count = document.getElementById("library-count");
  const filters = document.getElementById("library-filters");
  const empty = document.getElementById("library-empty");
  if (!grid || !state.chatDb) return;
  state.images = await listImages(state.chatDb);
  const total = state.images.length;
  if (note) note.textContent = total || state.imagesOn ? "" : chrome.imageOff;
  if (count) count.textContent = total === 0 ? "" : total === 1 ? chrome.imageOne : chrome.imageMany.replace("{n}", String(total));
  if (filters) {
    filters.replaceChildren();
    filters.hidden = total === 0;
    const dates = [["", chrome.allImages], ["today", chrome.today], ["yesterday", chrome.yesterday], ["week", chrome.week], ["older", chrome.older]];
    for (const [value, label] of dates) {
      filters.append(filterChip(label, state.imageFilter === value, () => { state.imageFilter = value; void paintLibrary(); }));
    }
    filters.append(filterChip(chrome.fav, state.favOnly, () => { state.favOnly = !state.favOnly; void paintLibrary(); }));
    const choices = [
      ...state.projects.map((project) => [`project:${project.id}`, project.name]),
      ...state.conversations.filter((chat) => chat.title).map((chat) => [`chat:${chat.id}`, chat.title]),
    ];
    if (choices.length) {
      const menu = document.createElement("details");
      menu.className = "chip-menu";
      const summary = document.createElement("summary");
      const current = choices.find(([value]) => value === state.imageFilter);
      summary.textContent = current ? current[1] : chrome.filterBy;
      const pop = document.createElement("div");
      pop.className = "menu-pop";
      for (const [value, label] of choices) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        if (value === state.imageFilter) button.setAttribute("aria-current", "true");
        button.addEventListener("click", () => { state.imageFilter = value; menu.open = false; void paintLibrary(); });
        pop.append(button);
      }
      menu.append(summary, pop);
      filters.append(menu);
    }
  }
  revokeImages();
  grid.replaceChildren();
  const rows = state.images.filter(imageMatches);
  if (empty) empty.hidden = total > 0;
  grid.hidden = rows.length === 0;
  for (const item of rows) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-card";
    const img = document.createElement("img");
    const blob = item.bytes instanceof Blob ? item.bytes : new Blob([item.bytes], { type: item.mime || "image/png" });
    const url = URL.createObjectURL(blob);
    state.imageUrls.push(url);
    img.src = url;
    const name = chatTitleFor(item.chatId) || item.name || chrome.library;
    img.alt = name;
    const meta = document.createElement("span");
    meta.className = "library-meta";
    const title = document.createElement("span");
    title.className = "library-name";
    title.textContent = name;
    const when = document.createElement("span");
    when.className = "library-date";
    when.textContent = shortDate(item.created);
    meta.append(title, when);
    button.append(img, meta);
    button.addEventListener("click", () => openViewer(item, url));
    grid.append(button);
  }
}

function openViewer(item, url) {
  const dialog = document.getElementById("viewer");
  const img = document.getElementById("viewer-img");
  const download = document.getElementById("viewer-download");
  const open = document.getElementById("viewer-open");
  if (!(dialog instanceof HTMLDialogElement) || !(img instanceof HTMLImageElement)) return;
  img.src = url;
  img.alt = chatTitleFor(item.chatId) || item.name || chrome.library;
  const caption = document.getElementById("viewer-caption");
  if (caption) caption.textContent = [chatTitleFor(item.chatId) || item.name || "", shortDate(item.created)].filter(Boolean).join(" · ");
  if (download instanceof HTMLAnchorElement) {
    download.href = url;
    download.download = item.name || "arqiven.png";
    download.textContent = chrome.download;
  }
  if (open instanceof HTMLAnchorElement) {
    open.href = item.chatId ? `#c/${item.chatId}` : "/arqiven/";
    open.textContent = chrome.openChat;
  }
  document.getElementById("viewer-delete").textContent = chrome.remove;
  let favBtn = document.getElementById("viewer-fav");
  if (!favBtn) {
    favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.id = "viewer-fav";
    document.getElementById("viewer-delete")?.before(favBtn);
  }
  favBtn.textContent = chrome.fav;
  favBtn.setAttribute("aria-pressed", item.favorite === true ? "true" : "false");
  favBtn.onclick = async () => {
    item.favorite = item.favorite !== true;
    if (state.chatDb) await saveImage(state.chatDb, item);
    favBtn.setAttribute("aria-pressed", item.favorite === true ? "true" : "false");
  };
  document.getElementById("viewer-delete").onclick = async () => {
    const ok = await askUser(chrome.deleteImage, "", chrome.remove);
    if (ok == null || !state.chatDb) return;
    await deleteImage(state.chatDb, item.id);
    dialog.close();
    void paintLibrary();
  };
  dialog.showModal();
}

async function storeAttachedImage(file) {
  if (!state.chatDb) return;
  if (file.size > 4000000) {
    setStatus(chrome.imageBig);
    return;
  }
  const bytes = await file.arrayBuffer();
  await saveImage(state.chatDb, {
    id: newId(),
    name: file.name,
    mime: file.type || "image/png",
    bytes,
    chatId: state.conversationId,
    projectId: state.chatProject,
  });
  const chip = document.getElementById("file-chip");
  if (chip) chip.textContent = file.name;
  setStatus(chrome.savedImage);
}

async function bootChats() {
  state.conversationId = hashId() || newId();
  state.chatProject = state.activeProject;
  setHash(state.conversationId);
  try {
    state.chatDb = await openChatDb();
    state.conversations = await listConversations(state.chatDb);
    state.projects = await listProjects(state.chatDb);
    const saved = await readConversation(state.chatDb, state.conversationId);
    if (saved?.messages?.length) {
      state.messages = saved.messages.map((item) => ({ ...item }));
      state.chatProject = saved.projectId || "";
      state.chatRenamed = saved.renamed === true;
      state.chatTitle = saved.renamed ? saved.title : "";
    }
  } catch {
    state.chatDb = null;
  }
  try {
    const response = await fetch("/api/arqiven/image");
    const payload = response.ok ? await response.json() : { enabled: false };
    state.imagesOn = payload.enabled === true;
  } catch {
    state.imagesOn = false;
  }
  paint();
}

async function rememberModel(id) {
  const model = modelById(id);
  if (!model || model.listed === false) return;
  try {
    if (!state.prefDb) state.prefDb = await openPrefDb();
    await saveSetting(state.prefDb, "model", model.id);
  } catch {
    /* La elección sigue valiendo en esta visita. */
  }
}

async function savedModelId() {
  try {
    if (!state.prefDb) state.prefDb = await openPrefDb();
    return await readSetting(state.prefDb, "model");
  } catch {
    return "";
  }
}

async function bootModel() {
  try {
    const adapter = navigator.gpu?.requestAdapter
      ? await Promise.race([
        navigator.gpu.requestAdapter(),
        new Promise((resolve) => setTimeout(() => resolve(null), 800)),
      ])
      : null;
    state.webgpu = Boolean(adapter);
  } catch {
    state.webgpu = false;
  }
  const hints = {
    webgpu: state.webgpu,
    memory: Number(navigator.deviceMemory) || 0,
    wide: window.matchMedia("(min-width: 1100px)").matches,
  };
  const saved = await savedModelId();
  const remembered = modelById(saved);
  let chosen = modelForDevice(hints);
  if (remembered && canUseModel(remembered, hints)) chosen = remembered;
  else if (remembered) state.fallbackNote = ui.fallbackMemory;
  else if (!hints.webgpu && chosen.id === "smol135-cpu") state.fallbackNote = ui.fallbackMemory;
  modelPick.value = chosen.id;
  if (chosen.id === defaultModel().id) startPrepare(defaultModel().id);
  else startPrepare(chosen.id);
}
void bootChats().then(() => bootModel());
