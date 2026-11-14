// Tareas reales de ARQIVEN. Comprobaciones fijadas antes de medir.
const filler = [
  ["¿Me recomiendas algún libro sobre productividad? Algo práctico y no muy largo, por favor.", "Te recomiendo «Hábitos atómicos» de James Clear: es práctico, se lee rápido y propone cambios pequeños y medibles."],
  ["¿Y alguna aplicación para organizar tareas en equipo que sea gratuita?", "Trello y Notion tienen planes gratuitos. Trello es más sencillo para tableros; Notion sirve también como wiki del equipo."],
  ["¿Cuál de las dos es mejor para un equipo de cinco personas que empieza?", "Para empezar, Trello: se configura en minutos y el plan gratis cubre de sobra a cinco personas."],
  ["Vale. ¿Cómo organizo las columnas del tablero?", "Una propuesta simple: Pendiente, En curso, En revisión y Hecho. Añade una columna Bloqueado si suele haber dependencias."],
  ["Perfecto, gracias. Otra cosa: ¿cada cuánto deberíamos hacer reuniones de seguimiento?", "Una reunión breve de 15 minutos dos o tres veces por semana suele bastar, más una revisión semanal de 30 minutos."],
];
const longDoc = (fact, pos) => {
  const base = "El equipo revisó el calendario del trimestre, las tareas pendientes del almacén y los turnos de atención al cliente. Se acordó mantener el horario actual y revisar los indicadores cada lunes. ";
  let t = ""; while (t.length < 3200) t += base;
  return t.slice(0, pos) + " " + fact + " " + t.slice(pos);
};
const NOSE = /no (lo )?s[eé]|no (tengo|dispongo|puedo (saber|predecir|conocer|prever)|es posible (saber|predecir))|no (hay|existen|consta)|no puedo|imposible (de )?(saber|predecir)|desconozco|no se puede (saber|predecir)|aleatori|al azar/i;
export const TASKS = [
  { id: "ctx-cerca", cat: "contexto", lang: "es", turns: [["Mi empresa se llama Velatia y vendemos software de logística.", "Entendido: tu empresa es Velatia y vende software de logística."], filler[0]], ask: "¿Cómo se llama mi empresa y a qué se dedica?", must: [/velatia/i, /log[ií]stic/i] },
  { id: "ctx-lejos", cat: "contexto", lang: "es", turns: [["Mi empresa se llama Velatia y vendemos software de logística.", "Entendido."], ...filler], ask: "Volviendo al principio: ¿cómo se llama mi empresa y a qué se dedica?", must: [/velatia/i, /log[ií]stic/i] },
  { id: "ctx-lejos-en", cat: "contexto", lang: "en", turns: [["My company is called Velatia and we sell logistics software.", "Got it."], ["Any book on productivity?", "Try Atomic Habits by James Clear: short and practical."], ["And a free task app for teams?", "Trello and Notion both have free plans."], ["Which one for five people?", "Trello: it takes minutes to set up."], ["How should I set up the columns?", "To do, Doing, Review and Done."], ["How often should we meet?", "A 15-minute check-in two or three times a week."]], ask: "Back to the start: what is my company called and what does it do?", must: [/velatia/i, /logistic/i] },
  { id: "correccion", cat: "correccion", lang: "es", turns: [["Mi presupuesto para el portátil es de 500 €.", "Anotado: 500 €."], ["Perdona, me equivoqué: el presupuesto es de 800 €, no de 500.", "Corregido: tu presupuesto es de 800 €."]], ask: "Con mi presupuesto, ¿me alcanza para un portátil de 650 €? Responde sí o no y por qué.", must: [/(^|[^\p{L}])s[ií]([^\p{L}]|$)/iu, /800/], mustNot: [/^\s*no\b/i] },
  { id: "correccion-lejos", cat: "correccion", lang: "es", turns: [["Mi presupuesto para el portátil es de 500 €.", "Anotado."], ["Perdona, me equivoqué: son 800 €, no 500.", "Corregido."], ...filler.slice(0, 3)], ask: "Con el presupuesto que te dije, ¿me alcanza para un portátil de 650 €? Responde sí o no y por qué.", must: [/(^|[^\p{L}])s[ií]([^\p{L}]|$)/iu, /800/], mustNot: [/^\s*no\b/i] },
  { id: "correccion-pt", cat: "correccion", lang: "pt-BR", turns: [["Meu orçamento é 500 reais.", "Anotado: 500 reais."], ["Desculpa, errei: são 800 reais.", "Corrigido: 800 reais."]], ask: "Com o meu orçamento, dá para um fone de 650 reais? Responda sim ou não e por quê.", must: [/\bsim\b/i, /800/] },
  { id: "instr-persistente", cat: "instrucciones", lang: "es", turns: [["A partir de ahora responde siempre en una sola frase, sin listas.", "De acuerdo, responderé en una sola frase."], filler[0], filler[1]], ask: "Explica qué es la inflación.", maxSentences: 2, must: [/inflaci/i] },
  { id: "formato-3", cat: "instrucciones", lang: "es", turns: [], ask: "Dame exactamente 3 ventajas del teletrabajo, en una lista con viñetas y sin introducción.", bullets: 3 },
  { id: "incert-1", cat: "incertidumbre", lang: "es", turns: [], ask: "¿Cuántos empleados tenía la panadería de mi barrio en 2019?", must: [NOSE] },
  { id: "incert-2", cat: "incertidumbre", lang: "es", turns: [], ask: "¿Qué número va a ganar el Gordo de la lotería de Navidad de 2026?", must: [NOSE] },
  { id: "ambigua", cat: "aclaracion", lang: "es", turns: [], ask: "Acórtalo.", must: [/\?/] },
  { id: "calculo-1", cat: "razonamiento", lang: "es", turns: [], ask: "Un lápiz cuesta 3 €. Compro 4 y pago con un billete de 20 €. ¿Cuánto me devuelven?", must: [/\b8\b/] },
  { id: "calculo-2", cat: "razonamiento", lang: "es", turns: [], ask: "Tengo 120 € y gasto el 25 %. ¿Cuánto dinero me queda?", must: [/\b90\b/] },
  { id: "intencion-correo", cat: "comprension", lang: "es", turns: [], ask: "Escribe un correo breve a mi jefe pidiendo el viernes libre por una cita médica.", must: [/viernes/i, /m[eé]dic/i], minChars: 150, complete: true },
  { id: "detalle-entrevista", cat: "comprension", lang: "es", turns: [], ask: "Explica con pasos cómo preparar una entrevista de trabajo.", minChars: 300, complete: true },
  { id: "doc-lejos", cat: "documento", lang: "es", turns: [], attachment: longDoc("El código interno del proyecto es KX-4471.", 2600), ask: "¿Cuál es el código interno del proyecto según el documento adjunto?", must: [/KX-?4471/i] },
  { id: "doc-cerca", cat: "documento", lang: "es", turns: [], attachment: longDoc("El código interno del proyecto es KX-4471.", 200), ask: "¿Cuál es el código interno del proyecto según el documento adjunto?", must: [/KX-?4471/i] },
  { id: "fuente-orvupi", cat: "fuentes", lang: "es", turns: [], ask: "¿Qué es Sonar en ORVUPI?", must: [/sonar/i], minChars: 60 },
  { id: "fuente-general", cat: "fuentes", lang: "es", turns: [], ask: "¿Qué es la fotosíntesis?", must: [/luz|energ/i, /planta|clorof[ií]l|organism/i] },
  { id: "seguimiento", cat: "contexto", lang: "es", turns: [["¿Qué es la fotosíntesis?", "La fotosíntesis es el proceso por el que las plantas usan la luz para convertir agua y CO2 en glucosa y oxígeno."]], ask: "¿Y en qué parte de la planta ocurre?", must: [/cloroplast|hoja/i] },
  { id: "historial-sucio", cat: "contexto", lang: "es", turns: [["Necesito ideas de nombre para una cafetería de barrio.", "El modelo de terceros se repitió o no se apoyó en las fuentes. Esto es un extracto citado, no su redacción. Según las fuentes citadas: Una cafetería es un establecimiento donde se sirve café."]], ask: "¿Me das tres ideas entonces?", must: [/caf/i], bulletsMin: 3 },
];
