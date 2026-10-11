#!/usr/bin/env python3
"""Genera la vista previa web/v2. No publica nada."""

from __future__ import annotations

import html
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]

def aviso_guardar() -> dict[str, str]:
    """El texto vive solo en web/v2/shared/aviso-guardar.js."""
    raw = subprocess.check_output(
        [
            "node",
            "--input-type=module",
            "-e",
            "import { AVISO_GUARDAR } from './web/v2/shared/aviso-guardar.js'; process.stdout.write(JSON.stringify(AVISO_GUARDAR));",
        ],
        cwd=REPO,
        text=True,
    )
    data = json.loads(raw)
    if "[" in data["es"] or "[" in data["en"] or "PROVEEDOR" in data["es"] or "PROVIDER" in data["en"]:
        raise SystemExit("el aviso de Guardar todavía tiene un marcador")
    return data

AVISO = aviso_guardar()

def apply_aviso(text: str) -> str:
    return text.replace("__AVISO_ES__", AVISO["es"]).replace("__AVISO_EN__", AVISO["en"])

def aviso_html() -> str:
    return (
        '<p id="aviso-guardar" class="aviso-fijo privacidad">'
        f'<span class="lang es" lang="es">{html.escape(AVISO["es"])}</span>'
        f'<span class="lang en" lang="en">{html.escape(AVISO["en"])}</span>'
        "</p>"
    )
CA = "TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump"
CREATOR = "77RKUqMprQHDSkhFBpC1REU1kE9aM1uw189orHo7wypD"
PERSONAL = "2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX"
PROJECT = "GtYJuVhP1Xk5BWY7YXXwiwGFEknPqzyxzwpotfQZoutA"
CURVE = "3shQFExQ3rpFL6GaXPRQNTMYazVHmTvRfuazfv62toAE"
MICA_ES = (
    "Esta comunicación publicitaria de criptoactivos no ha sido revisada ni aprobada "
    "por ninguna autoridad competente de ningún Estado miembro de la Unión Europea. "
    "El oferente del criptoactivo es el único responsable del contenido de esta "
    "comunicación publicitaria de criptoactivos."
)
MICA_EN = (
    "This crypto-asset marketing communication has not been reviewed or approved by "
    "any competent authority in any Member State of the European Union. The offeror "
    "of the crypto-asset is solely responsible for the content of this crypto-asset "
    "marketing communication."
)
RISK_ES = (
    "STUBX es un criptoactivo experimental de alto riesgo. No tiene valor garantizado, "
    "no da derechos de ningún tipo (propiedad, voto, dividendos, reembolso ni reparto "
    "de ingresos) y no se promete ninguna rentabilidad. Puede perder todo su valor: "
    "puedes perder todo lo que aportes. Hoy (comprobado el 2026-10-03) STUBX se negocia "
    "en la curva de Pump.fun: el propio contrato compra y vende sin necesitar a otra "
    "persona, pero cada venta baja el precio y las ventas grandes reciben peor precio. "
    "Si el precio cae, vender puede devolverte muy poco o casi nada. Si el token completa "
    "la curva, pasa de forma automática e irreversible a un pool de liquidez de PumpSwap, "
    "con otras comisiones y el mismo riesgo de caída. Pump.fun o la red Solana pueden "
    "fallar, saturarse o limitar el acceso según el país, así que no siempre podrás vender "
    "cuando quieras. No está cubierto por fondos de garantía de depósitos ni de "
    "indemnización de inversores. Lo que publicamos en esta web y en @stubxai no es "
    "asesoramiento de inversión ni una recomendación personalizada, y no lo ha revisado "
    "ni aprobado la CNMV ni ninguna otra autoridad."
)
RISK_EN = (
    "STUBX is an experimental high-risk crypto-asset. It has no guaranteed value, it "
    "grants no rights of any kind (ownership, voting, dividends, reimbursement, or a "
    "share of revenue), and no return is promised. It can lose all of its value: you "
    "could lose everything you put in. As checked on 2026-10-03, STUBX trades on the "
    "Pump.fun curve: the contract itself buys and sells without needing another person, "
    "but every sale lowers the price and large sales receive a worse price. If the price "
    "falls, selling can return very little or almost nothing. If the token completes the "
    "curve, it moves automatically and irreversibly to a PumpSwap liquidity pool, with "
    "different fees and the same risk of a fall. Pump.fun or the Solana network can fail, "
    "become congested, or limit access depending on the country, so you will not always "
    "be able to sell when you want. It is not covered by deposit-guarantee or investor-"
    "compensation schemes. What we publish on this website and on @stubxai is not "
    "investment advice or a personal recommendation, and it has not been reviewed or "
    "approved by the CNMV or any other authority."
)
CLONE_ES = (
    "Han aparecido tokens en Pump.fun llamados «Comunidad STUBX» o «Comunidad STUBX · "
    "Creador» (símbolo COMUNIDAD) que no son de STUBX. La única CA es "
    f"{CA}. Ni @stubxai ni el creador han lanzado otro token. Comprueba la CA en esta "
    "web. No interactúes con esos tokens."
)
CLONE_EN = (
    "Tokens have appeared on Pump.fun named “Comunidad STUBX” or “Comunidad STUBX · "
    "Creador” (symbol COMUNIDAD) that are not STUBX. The only CA is "
    f"{CA}. Neither @stubxai nor the creator has launched another token. Check the CA "
    "on this website. Do not interact with those tokens."
)
CLONE_MORE_ES = (
    "Revisión del 2026-10-09, además del aviso del 2026-10-05. Hay copias en Solana con el nombre STUBX: "
    "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump y FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump. "
    "Hay dos ejemplos en otras redes, no verificados en la cadena, tomados de search-v2 de Pump.fun el 2026-10-08 a las 09:14 (Madrid): "
    "0xC99056C762F0802e4154E6322bd71ae928857777 en eip155:56 y "
    "0xAEE5212f20cc95370cb3556c4493CFD07721a5a3 en eip155:5042 (esa red no está identificada con certeza). "
    "No son la CA oficial. El STUBX oficial solo existe en Solana."
)
CLONE_MORE_EN = (
    "Review of 2026-10-09, in addition to the 2026-10-05 notice. There are Solana copies named STUBX: "
    "ERYyyaE2Y2GuKB28YbC2w1nCuQ5ENQ89LR44kicvpump and FMNb4CR8ksibmgY7Ztei6BWcZXi3WHcVeJhYb9TNpump. "
    "There are two examples on other networks, not verified on-chain, taken from Pump.fun search-v2 on 2026-10-08 at 09:14 (Madrid): "
    "0xC99056C762F0802e4154E6322bd71ae928857777 on eip155:56 and "
    "0xAEE5212f20cc95370cb3556c4493CFD07721a5a3 on eip155:5042 (that network is not identified with certainty). "
    "They are not the official CA. The official STUBX exists only on Solana."
)
HOSTING_ES = (
    "www.stubxai.com lo sirve Cloudflare Pages. El apex stubxai.com pasa por el proxy de Cloudflare. "
    "Netlify solo responde en superb-horse-9036f5.netlify.app: esa dirección, grabada en los metadatos on-chain, "
    "redirige con 301 a https://stubxai.com/ y conserva la ruta. Sigue siendo de STUBX."
)
HOSTING_EN = (
    "Cloudflare Pages serves www.stubxai.com. The apex stubxai.com goes through the Cloudflare proxy. "
    "Netlify only answers on superb-horse-9036f5.netlify.app: that address, recorded in the on-chain metadata, "
    "redirects with a 301 to https://stubxai.com/ and keeps the path. It still belongs to STUBX."
)
ORIGIN = "https://stubxai.com"
OG_IMAGE = f"{ORIGIN}/assets/og-stubx-2026-10b-1200x630.jpg"
OG_ALT = (
    "STUBX: Agente Talón, mascota rosa con forma de ticket, sostiene un recibo junto a un globo terráqueo. "
    "Texto: «Un meme que pide pruebas. Qué es, qué funciona hoy y qué falta. CA oficial y pruebas en stubxai.com»."
    " / STUBX: Agente Talón, a pink ticket-shaped mascot, holds a receipt next to a globe. "
    "Text: “A meme that asks for proof. What it is, what works today, and what is missing. Official CA and proofs at stubxai.com”."
)
DRAFT_ES = "Borrador del repositorio. No publicado en stubxai.com."
DRAFT_EN = "Repository draft. Not published on stubxai.com."
PUBLISH = False


def publish_mode() -> bool:
    """La misma bandera que la PR 14: hacen falta STUBX_PUBLISH=1 y --publish a la vez."""
    requested = "--publish" in sys.argv
    confirmed = os.environ.get("STUBX_PUBLISH") == "1"
    if requested != confirmed:
        sys.stderr.write(
            "El modo publicación solo se activa con STUBX_PUBLISH=1 y --publish. El borrador no cambia.\n"
        )
        raise SystemExit(1)
    return requested and confirmed


def draft_html(publish: bool) -> str:
    if publish:
        return ""
    return f'<p class="draft" role="note">{t(DRAFT_ES, DRAFT_EN)}</p>'

PRIMARY = [
    ("home", "index.html", "Inicio", "Home"),
    ("verify", "verify/index.html", "Verificar", "Verify"),
    ("lab", "lab/index.html", "Lab", "Lab"),
    ("tablero", "tablero/index.html", "Tablero", "Board"),
    ("studio", "studio/index.html", "Studio", "Studio"),
    ("pares", "pares/index.html", "Curva", "Curve"),
    ("comparar", "comparar/index.html", "Ejemplo de curva", "Curve example"),
    ("contribuir", "contribuir/index.html", "Contribuir", "Contribute"),
]
MORE = [
    ("methodology", "methodology/index.html", "Metodología", "Methodology"),
    ("security", "security/index.html", "Seguridad", "Security"),
    ("risks", "risks/index.html", "Riesgos", "Risks"),
    ("legal", "legal/index.html", "Legal", "Legal"),
    ("proofs", "proofs/index.html", "Pruebas", "Proofs"),
    ("status", "status/index.html", "Estado", "Status"),
    ("tokenomics", "tokenomics/index.html", "Reparto", "Supply"),
    ("community", "community/index.html", "Canales", "Channels"),
    ("marca", "marca/index.html", "Marca", "Brand"),
    ("build", "build/index.html", "Versiones", "Versions"),
    ("aprender", "aprender/index.html", "Aprender", "Learn"),
    ("avances", "avances/index.html", "Avances", "Progress"),
    ("studio", "studio/index.html", "Studio", "Studio"),
    ("pares", "pares/index.html", "Curva", "Curve"),
    ("comparar", "comparar/index.html", "Ejemplo de curva", "Curve example"),
    ("cuaderno", "cuaderno/index.html", "Cuaderno", "Notebook"),
    ("contribuir", "contribuir/index.html", "Contribuir", "Contribute"),
]


def t(es: str, en: str) -> str:
    return f'<span class="lang es" lang="es">{es}</span><span class="lang en" lang="en">{en}</span>'


def rel_href(frm: str, to: str) -> str:
    start = os.path.dirname(frm) or "."
    return os.path.relpath(to, start=start)


def clean_path(to: str) -> str:
    """URLs que Cloudflare Pages sirve: sin .html. Un index.html vive en /ruta/."""
    if to in ("index.html", "/", ""):
        return "/"
    if to in ("archivo.html", "archivo"):
        return "/archivo"
    if to.endswith("/index.html"):
        return "/" + to[: -len("index.html")]
    if to.endswith(".html"):
        return "/" + to[: -len(".html")]
    if not to.startswith("/"):
        return "/" + to
    return to


def page_href(frm: str, to: str, absolute: bool = False) -> str:
    return clean_path(to)


def public_url(frm: str) -> str:
    return ORIGIN + clean_path(frm)


def nav(frm: str, current: str, absolute: bool = False) -> str:
    def items(rows: list[tuple[str, str, str, str]]) -> str:
        out = []
        for pid, dest, es, en in rows:
            href = page_href(frm, dest, absolute)
            current_attr = ' aria-current="page"' if pid == current else ""
            out.append(f'<li><a href="{href}"{current_attr}>{t(es, en)}</a></li>')
        return "".join(out)

    return (
        f'<nav class="site" aria-label="Principal / Main"><ul>{items(PRIMARY)}</ul></nav>'
        f'<details class="mapa"><summary>{t("Mapa del sitio", "Site map")}</summary>'
        f'<nav aria-label="{html.escape("Mapa del sitio / Site map")}"><ul>{items(MORE)}</ul></nav></details>'
    )


NOINDEX_PAGES = {"404.html"}


def rpc_origins() -> list[str]:
    limits = json.loads((REPO / "verify" / "policy" / "limits.json").read_text(encoding="utf-8"))
    origins: list[str] = []
    for key in ("defaultRpcUrl", "fallbackRpcUrl"):
        raw = str(limits[key])
        parsed = urllib.parse.urlsplit(raw)
        if parsed.scheme != "https" or not parsed.netloc:
            raise SystemExit(f"RPC no válido en limits.json: {key}")
        origin = f"https://{parsed.netloc}"
        if origin not in origins:
            origins.append(origin)
    return origins


def connect_src(include_rpc: bool) -> str:
    if not include_rpc:
        return "'self'"
    return "'self' " + " ".join(rpc_origins())


def shell(frm: str, current: str, title_es: str, title_en: str, desc_es: str, desc_en: str, body: str, scripts: list[str], narrow: bool, worker: bool = False, absolute: bool = False, connect: str | None = None, modules: list[str] | None = None) -> str:
    prefix = "/" if absolute else "../" * frm.count("/")
    wrap = "wrap estrecha" if narrow else "wrap"
    script_tags = "\n".join(f'<script src="{prefix}{src}"></script>' for src in scripts)
    module_tags = "\n".join(f'<script type="module" src="{prefix}{src}"></script>' for src in (modules or []))
    worker_src = "'self'" if worker else "'none'"
    url = public_url(frm)
    banner = draft_html(PUBLISH)
    # Indexable desde 2026-10-09. Fuera del índice solo queda el 404. Studio también se indexa.
    robots_meta = '<meta name="robots" content="noindex, nofollow">\n' if frm in NOINDEX_PAGES else ""
    return f"""<!DOCTYPE html>
<html lang="es" data-lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
{robots_meta}<meta name="description" content="{html.escape(desc_es + " / " + desc_en)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="STUBX">
<meta property="og:locale" content="es_ES">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{html.escape(title_es + " / " + title_en)}">
<meta property="og:description" content="{html.escape(desc_es + " / " + desc_en)}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{html.escape(OG_ALT)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@stubxai">
<meta name="twitter:title" content="{html.escape(title_es + " / " + title_en)}">
<meta name="twitter:description" content="{html.escape(desc_es + " / " + desc_en)}">
<meta name="twitter:image" content="{OG_IMAGE}">
<meta name="twitter:image:alt" content="{html.escape(OG_ALT)}">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src {connect or "'self'"}; manifest-src 'self'; media-src 'none'; frame-src 'none'; worker-src {worker_src}; object-src 'none'; base-uri 'self'; form-action 'none'">
<title data-title-es="{html.escape(title_es)}" data-title-en="{html.escape(title_en)}">{html.escape(title_es)}</title>
<meta name="theme-color" content="#071422">
<link rel="icon" href="{prefix}favicon.ico" sizes="any">
<link rel="icon" href="{prefix}favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="{prefix}apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="{prefix}site.webmanifest">
<link rel="stylesheet" href="{prefix}assets/site.css">
<script src="{prefix}assets/shell.js"></script>
</head>
<body>
<a class="skip lang es" href="#contenido">Saltar al contenido</a>
<a class="skip lang en" href="#contenido">Skip to content</a>
<header class="site"><div class="wrap">
<div class="topbar">
<a class="brand" href="{page_href(frm, "index.html", absolute)}">
<img src="{prefix}assets/talon-avatar-96.webp" width="40" height="40" alt="">
<strong>STUBX</strong>
</a>
<div class="langs" role="group" aria-label="Idioma / Language">
<button type="button" data-set-lang="es" lang="es" aria-pressed="true">Español</button>
<button type="button" data-set-lang="en" lang="en" aria-pressed="false">English</button>
</div>
</div>
{nav(frm, current, absolute)}
</div></header>
<main id="contenido" class="{wrap}">
{banner}
{body}
</main>
<footer class="site"><div class="wrap">
<p class="mica"><strong>{t("Aviso MiCA (art. 7.1.e):", "MiCA notice (art. 7.1.e):")}</strong> {t(MICA_ES, MICA_EN)}</p>
<p>{t("CA oficial y única:", "Official and only CA:")} <code>{CA}</code></p>
<p>{t("Canales oficiales:", "Official channels:")} <a href="https://x.com/stubxai">@stubxai</a> · <a href="https://github.com/stubxai/stubx-agent">github.com/stubxai/stubx-agent</a> · <a href="mailto:stubxai.hq@gmail.com">stubxai.hq@gmail.com</a> · <a href="https://t.me/stubxai">t.me/stubxai</a> · <a href="https://farcaster.xyz/stubxai">Farcaster</a> · <a href="https://www.tiktok.com/@stubxai">TikTok</a></p>
<p>{t("Sin cookies ni rastreadores. El idioma y el progreso de Lab, si se usa, se quedan en este navegador. El service worker solo se registra en Lab y no guarda la portada ni los avisos.", "No cookies and no trackers. Language and Lab progress, if used, stay in this browser. The service worker registers only on Lab and does not store the home page or the notices.")}</p>
<p>STUBX · 2026 · {t("Código MIT · Kit con licencia propia", "MIT code · Kit under its own license")}</p>
</div></footer>
{script_tags}
{module_tags}
</body>
</html>
"""


def keep_committed_aprender_spacing(text: str) -> str:
    """La página de main deja un renglón vacío entre </main> y el pie, y otro antes del script."""
    text = text.replace("</main>\n<footer", "</main>\n\n<footer", 1)
    old = '</div></footer>\n<script src="../assets/draft-address.js"></script>\n\n</body>'
    new = '</div></footer>\n\n<script src="../assets/draft-address.js"></script>\n</body>'
    if old not in text:
        raise SystemExit("aprender: el cierre no coincide con la página de main")
    return text.replace(old, new, 1)


def write_page(rel: str, current: str, title_es: str, title_en: str, desc_es: str, desc_en: str, body: str, scripts: list[str] | None = None, narrow: bool = False, worker: bool = False, absolute: bool = False, connect: str | None = None, modules: list[str] | None = None) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    text = apply_aviso(shell(rel, current, title_es, title_en, desc_es, desc_en, body, scripts or [], narrow, worker, absolute, connect, modules))
    if rel == "aprender/index.html":
        text = keep_committed_aprender_spacing(text)
    path.write_text(text, encoding="utf-8")


def source(es: str, en: str) -> str:
    return f'<p class="source">{t(es, en)}</p>'


def home() -> str:
    return f"""
<section class="hero">
<div>
<p class="kicker">{t("Solana · Pump.fun · Prototipo", "Solana · Pump.fun · Prototype")}</p>
<p class="motto">{t("No stub, no story", "No stub, no story")}</p>
<h1>{t("Contrasta la dirección antes de creer el nombre.", "Check the address before you trust the name.")}</h1>
<div class="hero-actions">
<a class="primary" href="/verify/">{t("Verificar un token", "Verify a token")}</a>
<a class="primary cta-gem" href="/studio/">{t("Crear en Studio", "Create in Studio")}</a>
<a href="/verify/">{t("Analizar token", "Analyze token")}</a>
<a href="/methodology/">{t("Ver la metodología", "Read the methodology")}</a>
</div>
<p class="lede">{t("STUBX Verify lee en directo, y solo en lectura, cualquier token SPL o Token-2022. También compara con fichas de ejemplo: la oficial está releída el 2026-10-09, con el saldo de la curva y el de la creadora. No pide una cuenta y no dice qué comprar.", "STUBX Verify reads any SPL or Token-2022 token live, and read-only. It also compares with example cards: the official one was read again on 2026-10-09, with the curve balance and the creator balance. It does not ask for an account and it does not say what to buy.")}</p>
<p class="source">{t("La acción abre Verify: lectura en vivo y solo lectura, más las fichas fechadas del 2026-10-09 (commit 86df576). No es una puntuación. La PR 14 se fusionó en main el 2026-10-09.", "The action opens Verify: a live read-only reading, plus the dated cards of 2026-10-09 (commit 86df576). It is not a score. PR 14 was merged into main on 2026-10-09.")}</p>
<p class="lede">{t("Agente Talón es la guía de estas páginas. Acompaña la lectura y no es un sello de aprobación.", "Agente Talón is the guide for these pages. It stays with the reading and it is not a seal of approval.")}</p>
</div>
<figure>
<picture>
<source media="(min-width: 900px)" srcset="assets/hero-talon-1000.webp" type="image/webp">
<img src="assets/hero-talon-movil-800.webp" width="800" height="750" alt="{html.escape("Agente Talón, personaje de STUBX: ticket rosa con una gema verde. / Agente Talón, the STUBX character: a pink ticket with a green gem.")}">
</picture>
<figcaption>{t("Agente Talón. No es un sello de aprobación.", "Agente Talón. It is not a seal of approval.")}</figcaption>
</figure>
</section>
<section id="que-puedes">
<h2>{t("Qué puedes hacer aquí", "What you can do here")}</h2>
<p>{t("Sin cuenta, sin cartera y sin decirte qué hacer con un token.", "No account, no wallet, and no instruction about what to do with a token.")}</p>
<div class="grid-3">
<article class="paso"><h3>{t("Consultar un token de Solana", "Look up a Solana token")}</h3><p>{t("Pega una dirección en Verify. La página lee permisos y suministro, solo en lectura.", "Paste an address in Verify. The page reads permissions and supply, read-only.")}</p></article>
<article class="paso"><h3>{t("Entender los permisos", "Understand the permissions")}</h3><p>{t("Un permiso de emisión activo puede ser habitual en una moneda estable. Importa si el proyecto prometió un suministro fijo. La lectura no acusa.", "An active mint authority can be common on a stablecoin. It matters if the project promised a fixed supply. The reading does not accuse.")}</p></article>
<article class="paso"><h3>{t("Guardar y comparar", "Save and compare")}</h3><p>{t("El cuaderno guarda la lectura en este navegador. Comparar consultas muestra qué cambió y qué no se pudo determinar.", "The notebook saves the reading in this browser. Compare queries shows what changed and what could not be determined.")}</p></article>
</div>
<p>{t("Dos lecturas reales, como ejemplo y no como aval. Al abrirlas, la dirección va en el fragmento y la página la quita del historial.", "Two real readings, as an example and not as an endorsement. When they open, the address is in the fragment and the page removes it from the history.")}</p>
<p><a class="primary" href="/verify/#a={CA}">{t("Leer la CA oficial de STUBX", "Read the official STUBX CA")}</a></p>
<p><a href="/verify/#a=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">{t("Leer USDC, un ejemplo público de otra dirección. No es STUBX.", "Read USDC, a public example of another address. It is not STUBX.")}</a></p>
</section>
<section class="ca-panel" id="contrato" aria-labelledby="ca-title">
<h2 id="ca-title">{t("Contrato oficial", "Official contract")}</h2>
<p id="ca-label">{t("CA oficial del token, dirección del mint. Única.", "The official token CA (the mint address). There is only one.")}</p>
<p class="ca-value" aria-labelledby="ca-label">{CA}</p>
<div class="ca-actions">
<button type="button" class="primary" data-copy="{CA}" aria-describedby="ca-label"><span data-copy-label>{t("Copiar contrato", "Copy contract")}</span></button>
<span class="sr-only" role="status" aria-live="polite" data-copy-status></span>
<a href="https://solscan.io/token/{CA}">{t("Abrir en Solscan", "Open on Solscan")}</a>
<a href="token.json">token.json</a>
</div>
<p>{t(f"Compárala entera con la de la cuenta oficial en X: @stubxai. Cualquier otra CA con el nombre STUBX no es oficial. Fuente: token.json, campo mint, actualizado el 2026-10-05.", f"Compare the full address with the one posted by the official X account, @stubxai. Any other CA using the name STUBX is not official. Source: token.json, mint field, updated 2026-10-05.")}</p>
</section>
<div class="grid-3" id="proyecto">
<article class="card"><h2>{t("Un personaje", "A character")}</h2><p>{t("Agente Talón pide pruebas antes de creer una promesa. El lema es «No stub, no story».", "Agente Talón asks for proof before believing a promise. The motto is “No stub, no story”.")}</p></article>
<article class="card"><h2>{t("Un token", "A token")}</h2><p>{t("Creado el 2026-09-23 en Pump.fun. Sin autoridad de emisión ni de congelación. No da derechos. La descripción grabada dice «AI-native» y ya no se puede cambiar: hoy no hay un agente autónomo.", "Created on 2026-09-23 on Pump.fun. No mint authority and no freeze authority. It grants no rights. The on-chain description says “AI-native” and can no longer be changed: there is no autonomous agent today.")}</p></article>
<article class="card" id="repo"><h2>{t("Un prototipo", "A prototype")}</h2><p>{t("El repositorio github.com/stubxai/stubx-agent no tiene wallet ni claves, no firma y no envía transacciones. Licencia MIT.", "The repository github.com/stubxai/stubx-agent has no wallet and no keys, it does not sign, and it does not send transactions. MIT license.")}</p></article>
</div>
<h2>{t("Herramientas de esta misma web", "Tools on this website")}</h2>
<p>{t("Misma navegación, mismos estilos y el mismo selector de idioma. Lo que no está construido no tiene un botón que finja funcionar.", "Same navigation, same styles, and the same language switch. What is not built has no button pretending to work.")}</p>
<div class="grid-3 tool-grid">
<article class="card"><p class="estado-pill">{t("Lectura en vivo + fichas del 2026-10-09", "Live reading + cards of 2026-10-09")}</p><h3>Verify</h3><p>{t("Pega la dirección de un token SPL o Token-2022. La página lee la cadena en directo y solo en lectura, y la compara con las fichas fechadas. No es una puntuación.", "Paste the address of an SPL or Token-2022 token. The page reads the chain live and read-only, and compares it with the dated cards. It is not a score.")}</p><p><a class="primary" href="/verify/">{t("Analizar token", "Analyze token")}</a></p></article>
<article class="card"><p class="estado-pill">{t("Demo fechada · 2026-10-09", "Dated demo · 2026-10-09")}</p><h3>Lab</h3><p>{t("Una misión de cinco pasos para distinguir el mint del registro de un clon. El progreso se queda en este navegador.", "A five-step mission to tell the registry mint from a clone. Progress stays in this browser.")}</p><p><a href="/lab/">{t("Hacer la misión", "Start the mission")}</a></p></article>
<article class="card"><p class="estado-pill">{t("Registro · 2026-10-10", "Record · 2026-10-10")}</p><h3>{t("Tablero", "Board")}</h3><p>{t("Qué está en idea, qué está en el repositorio y qué está en stubxai.com. Hay una plantilla vacía para copiar. No avala otros tokens ni promete fechas.", "What is an idea, what is in the repository, and what is on stubxai.com. There is an empty template to copy. It does not endorse other tokens and it promises no dates.")}</p><p><a href="/tablero/">{t("Abrir el tablero", "Open the board")}</a></p></article>
</div>
<div class="grid-3 tool-grid">
<article class="card"><p class="estado-pill">{t("En este navegador · 2026-10-09", "In this browser · 2026-10-09")}</p><h3>Studio</h3><p>{t("Crea una imagen para tu token, sin cuenta. Los recursos de STUBX vienen por defecto. El nombre, el logo y la exportación se quedan en este navegador.", "Create an image for your token, without an account. STUBX assets start as the default. The name, the logo, and the export stay in this browser.")}</p><p><a href="/studio/">{t("Abrir Studio", "Open Studio")}</a></p></article>
<article class="card"><p class="estado-pill">{t("Solo lectura · 2026-10-09", "Read-only · 2026-10-09")}</p><h3>{t("Cuaderno", "Notebook")}</h3><p>{t("Guarda en este navegador la lectura de cualquier token de Solana, con una nota aparte. No conecta una cartera.", "It saves a reading of any Solana token in this browser, with a separate note. It does not connect a wallet.")}</p><p><a href="/cuaderno/">{t("Abrir el cuaderno", "Open the notebook")}</a></p></article>
<article class="card"><p class="estado-pill">{t("Canal · 2026-10-10", "Channel · 2026-10-10")}</p><h3>{t("Contribuir", "Contribute")}</h3><p>{t("Informa un fallo o una mejora de estas herramientas. Cualquier token de Solana puede ser el ejemplo. No hay formulario, ni cuenta, ni datos personales: el informe se abre en GitHub.", "Report a bug or an improvement to these tools. Any Solana token can be the example. There is no form, no account, and no personal data: the report opens on GitHub.")}</p><p><a href="/contribuir/">{t("Abrir contribuciones", "Open contributions")}</a></p></article>
</div>
<div class="grid-3 tool-grid">
<article class="card"><p class="estado-pill">{t("Lectura · 2026-10-10", "Reading · 2026-10-10")}</p><h3>{t("Curva", "Curve")}</h3><p>{t("Pega cualquier dirección de Solana. La página dice la moneda base y el estado de la curva, tal como están en la cadena. Exporta una instantánea. Escribir una dirección no avala ese token.", "Paste any Solana address. The page states the base currency and the curve state, as they are on chain. It exports a snapshot. Writing an address does not endorse that token.")}</p><p><a href="/pares/">{t("Abrir la curva", "Open the curve")}</a></p></article>
</div>
<div class="grid-3 tool-grid">
<article class="card"><p class="estado-pill">{t("Ejemplo · 2026-10-10", "Example · 2026-10-10")}</p><h3>{t("Ejemplo de curva", "Curve example")}</h3><p>{t("Ejemplo educativo fijo de cómo se lee una curva. No usa una dirección. Legal ya lo revisó. Cualquier versión con datos reales necesitará una revisión nueva.", "Fixed educational example of how a curve is read. It does not use an address. Legal has already reviewed it. Any version with real data will need a new review.")}</p><p><a href="/comparar/">{t("Ver el ejemplo", "See the example")}</a></p></article>
</div>
<section id="transparencia">
<h2>{t("Transparencia", "Transparency")}</h2>
<p>{t("Pump.fun paga al creador una comisión por las operaciones del token. Cobros hasta el 2026-10-03: uno, de 0,0316 SOL, el 2026-09-23 (transacción 3rDQEqHoTQFVgkiAmtBX3sRia9sScEs3K5rcEaDu9riYSNMBrQ3uLQbu9aSBB3zNnCisafbMQo7puURyGF5FtLmH). Uso: la comisión pasó, junto con el resto del SOL de la wallet creadora, a wallets personales del creador (transacciones 2BsW5YrvJTWuyUaA9jTZCmbk9Wiz68cpa2EwMMNmXh1DgiG7mK5Mr97JAqwqEZyAxrpp8J8YAX3jaumHBE8iEFNN y 3oxwGw2dBphbT4fvMjpJVyEnTQr5ATsbzF6ZCHdU9wyXcRPkncfvi5HRa8dnDDEcv9Zr8J7EyJzSTJEAEuJbDge7) y se mezcló con su dinero; no se usó por separado para el proyecto. Es un ingreso del creador: no se reparte entre las cuentas con tokens ni con nadie. El 2026-10-04 el creador reintegró ese importe, 0,031554107 SOL, desde su wallet personal a la wallet pública del proyecto, dentro de un envío de 0,033020866 SOL (transacción 4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy). Cada nuevo cobro de la comisión pasará a esa wallet en un máximo de 7 días y se publicará aquí con las dos transacciones.", "Pump.fun pays the creator a fee on the token’s trades. Fees collected through 2026-10-03: one payment of 0.0316 SOL, on 2026-09-23 (transaction 3rDQEqHoTQFVgkiAmtBX3sRia9sScEs3K5rcEaDu9riYSNMBrQ3uLQbu9aSBB3zNnCisafbMQo7puURyGF5FtLmH). Use: the fee, together with the rest of the SOL in the creator wallet, moved to the creator’s personal wallets (transactions 2BsW5YrvJTWuyUaA9jTZCmbk9Wiz68cpa2EwMMNmXh1DgiG7mK5Mr97JAqwqEZyAxrpp8J8YAX3jaumHBE8iEFNN and 3oxwGw2dBphbT4fvMjpJVyEnTQr5ATsbzF6ZCHdU9wyXcRPkncfvi5HRa8dnDDEcv9Zr8J7EyJzSTJEAEuJbDge7) and was mixed with their money; it was not used separately for the project. It is the creator’s income: it is not shared with token accounts or with anyone else. On 2026-10-04 the creator reimbursed that amount, 0.031554107 SOL, from their personal wallet to the public project wallet, inside a transfer of 0.033020866 SOL (transaction 4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy). Each new fee collection will move to that wallet within 7 days and will be published here with both transactions.")}</p>
<p>{t("El creador de STUBX cobra una comisión por cada operación. Pump.fun tiene sus propias condiciones, como la edad mínima de 18 años y países excluidos.", "The creator of STUBX collects a fee on every trade. Pump.fun has its own terms, such as a minimum age of 18 and excluded countries.")}</p>
<div id="wallets">
<h3>{t("Wallet pública del proyecto", "Public project wallet")}</h3>
<p><code>{PROJECT}</code></p>
<p>{t(f"Cada movimiento se publica en https://stubxai.com/#wallets en un máximo de 7 días, con fecha, importe, motivo y transacción. Es una wallet normal, no multifirma. La controla el creador. No acepta aportaciones ni donaciones. 0 STUBX el 2026-10-04 a las 12:24 (Madrid).", f"Each movement is published at https://stubxai.com/#wallets within 7 days, with the date, the amount, the reason, and the transaction. It is a normal wallet, not a multisig. The creator controls it. It does not accept contributions or donations. 0 STUBX on 2026-10-04 at 12:24 (Madrid).")}</p>
</div>
<p><a href="/tokenomics/#transparencia">{t("Detalle del reparto y de la comisión", "Supply and fee detail")}</a></p>
</section>
<section id="reparto">
<h2>{t("Reparto", "Supply")}</h2>
<p>{t(f"A 2026-10-03 14:19 (Madrid): curva {CURVE} 986.122.445,10 STUBX (98,61 %); wallet creadora 5.272.727,23 (0,53 %); wallet personal 8.604.827,67 (0,86 %). Suman 1.000.000.000. Las dos wallets del creador suman 1,39 %.", f"As of 2026-10-03 14:19 (Madrid): curve {CURVE} 986,122,445.10 STUBX (98.61%); creator wallet 5,272,727.23 (0.53%); personal wallet 8,604,827.67 (0.86%). They sum to 1,000,000,000. The creator’s two wallets add up to 1.39%.")}</p>
<p><a href="/tokenomics/#reparto">{t("Tabla completa", "Full table")}</a></p>
</section>
<section id="estado">
<h2>{t("Estado", "Status")}</h2>
<div id="ppm">
<p>{t("Prueba pública mínima a 2026-10-05: 3 de 4 marcadas y 1 que no aplica (la wallet del agente). No es un 3/3. Marcada no significa auditada.", "Minimum public proof as of 2026-10-05: 3 of 4 checked and 1 not applicable (the agent wallet). It is not 3/3. Checked does not mean audited.")}</p>
</div>
<p><a href="/status/#ppm">{t("Ver las casillas", "See the checklist")}</a></p>
</section>
<section id="pruebas">
<h2>{t("Pruebas", "Proofs")}</h2>
<p>{t("Siete pruebas con fecha, y el archivo histórico de los 18 posts en /archivo.", "Seven dated proofs, and the historical archive of the 18 posts at /archivo.")}</p>
<p><a href="/proofs/">{t("Abrir las pruebas", "Open the proofs")}</a> · <a href="/archivo">{t("Abrir el archivo", "Open the archive")}</a></p>
</section>
<section id="roadmap">
<h2>{t("Versiones", "Versions")}</h2>
<p>{t("Lo hecho lleva fecha. Lo que sigue es un objetivo, no una promesa.", "What is done has a date. What follows is a target, not a promise.")}</p>
<p><a href="/build/">{t("Ver la lista", "See the list")}</a></p>
</section>
<section class="risk-block" id="riesgos">
<h2>{t("Léelo antes de nada", "Read this before anything else")}</h2>
<p>{t("STUBX es un criptoactivo experimental de alto riesgo. Puedes perder todo lo que aportes. No es asesoramiento ni una recomendación, y no lo ha aprobado la CNMV ni ninguna otra autoridad.", "STUBX is an experimental high-risk crypto-asset. You could lose everything you put in. It is not advice or a recommendation, and it has not been approved by the CNMV or any other authority.")}</p>
<p><a href="/risks/">{t("El aviso completo, con MiCA", "The full notice, including MiCA")}</a> · <a href="/security/">{t("Canales y aviso de clones", "Channels and clone notice")}</a></p>
</section>
<section id="contacto">
<h2>{t("Contacto", "Contact")}</h2>
<p><a href="mailto:stubxai.hq@gmail.com">stubxai.hq@gmail.com</a>. {t("Un solo correo. No pedimos semilla, claves ni dinero.", "One email address. We do not ask for a seed, keys, or money.")}</p>
</section>
"""


def prepare_tool(name: str) -> str:
    raw = (ROOT / "content" / "tools" / f"{name}.html").read_text(encoding="utf-8")
    raw = re.sub(r"^<main[^>]*>", "", raw)
    raw = re.sub(r"</main>\s*$", "", raw)
    raw = raw.replace('<section id="resultado"', '<section id="resultado" tabindex="-1"', 1)
    if name == "verify":
        raw = re.sub(
            r'\s*<p(?: id="aviso-guardar")? class="aviso-fijo privacidad">.*?</p>',
            "",
            raw,
            count=1,
            flags=re.S,
        )
        raw = raw.replace("</form>", aviso_html() + "\n</form>", 1)
        extra = (
            '<p><button type="button" id="ver-lectura-caida">'
            + t(
                "Mostrar el aviso de lectura no disponible",
                "Show the reading-unavailable notice",
            )
            + "</button></p><p class=\"source\">"
            + t(
                "Ese botón no hace una consulta nueva. Enseña el aviso de lectura no disponible. La dirección escrita se queda en el campo y ese botón no la guarda.",
                "That button does not make a new query. It shows the reading-unavailable notice. The address you typed stays in the field and that button does not save it.",
            )
            + "</p>"
        )
        raw = raw.replace("</form>", "</form>\n" + extra, 1)
        links = [
            ("/aprender/#direccion", "Qué es una dirección", "What an address is"),
            ("/aprender/#autoridad-emision", "Permiso de emisión", "Mint authority"),
            ("/aprender/#curva-pump", "Curva", "Curve"),
            ("/aprender/#guia-identificar", "Guía para identificar un token", "Guide to identifying a token"),
        ]
        library = (
            '<nav class="ayuda-terminos" aria-label="Ayuda / Help">\n'
            + "\n".join(f'<a href="{href}">{t(es, en)}</a>' for href, es, en in links)
            + "\n</nav>\n"
            + '<p class="muted">'
            + t(
                "Abrir la biblioteca no borra la dirección escrita. Al volver, el campo sigue igual.",
                "Opening the library does not clear the address you typed. When you come back, the field is still the same.",
            )
            + "</p>\n"
        )
        raw = raw.replace('<p class="aviso-fijo">', library + '<p class="aviso-fijo">', 1)
    return fold_aviso(raw)


def fold_aviso(raw: str) -> str:
    """La primera línea visible queda fuera del desplegable. El resto no cambia de texto."""
    marker = '<div class="aviso" data-disclaimer="si">'
    start = raw.find(marker)
    if start < 0:
        return raw
    end = raw.find("</div>", start)
    if end < 0:
        return raw
    block = raw[start:end]
    first_end = block.find("</p>")
    if first_end < 0:
        return raw
    if 'class="aviso-mas"' in block:
        return raw
    open_end = block.find(">") + 1
    lead = (
        "<p>"
        + t(
            "Lectura informativa y solo lectura. No es una auditoría, ni un aval, ni una recomendación.",
            "Informational, read-only view. It is not an audit, an endorsement, or a recommendation.",
        )
        + "</p>"
    )
    head = block[:open_end] + lead + block[open_end : first_end + 4]
    rest = block[first_end + 4 :]
    if not rest.strip():
        return raw[:start] + head + raw[end:]
    summary = (
        '<details class="aviso-mas"><summary>'
        + t("Leer el aviso completo", "Read the full notice")
        + "</summary>"
        + rest
        + "</details>"
    )
    return raw[:start] + head + summary + raw[end:]


def methodology() -> str:
    return f"""
<h1>{t("Metodología", "Methodology")}</h1>
<p class="lede">{t("De dónde sale cada dato de esta vista previa, qué se calculó y qué no se rellena cuando falta.", "Where each figure in this preview comes from, what was calculated, and what is not filled in when something is missing.")}</p>
{source("Textos de la web en producción revisados hasta el 2026-10-05. Fichas de Verify: ejemplos del 2026-10-08 y la tanda del 2026-10-09, commit 86df576 del 2026-10-09. Registro del tablero de ese mismo commit. Esta página no vuelve a consultar la red.", "Production website texts reviewed through 2026-10-05. Verify cards: examples from 2026-10-08 and the 2026-10-09 batch, commit 86df576 of 2026-10-09. Board record from that same commit. This page does not query the network again.")}
<h2>{t("Qué hace Verify aquí", "What Verify does here")}</h2>
<ul class="clean">
<li>{t("Acepta una dirección y comprueba el formato. El nombre del token no sirve.", "It accepts an address and checks the format. The token name is not enough.")}</li>
<li>{t("Si la dirección es de Solana, la lee en directo y solo en lectura. __AVISO_ES__ Las fichas fechadas siguen: la oficial releída el 2026-10-09, con la cuenta personal publicada 2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX, los clones ERYyy y FMNb de ese día, los tres clones y el contraste USDC del 2026-10-08, y dos ejemplos 0x sin verificar en la cadena. Commit 86df576 del 2026-10-09. La PR 14 se fusionó en main el 2026-10-09.", "If the address is on Solana, it reads it live and read-only. __AVISO_EN__ The dated cards remain: the official one read again on 2026-10-09, including the published personal account 2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX, the ERYyy and FMNb clones from that day, the three clones and the USDC contrast from 2026-10-08, and two 0x examples that are not verified on-chain. Commit 86df576 of 2026-10-09. PR 14 was merged into main on 2026-10-09.")}</li>
<li>{t("Si el servicio no responde, lo dice y no inventa un resultado. Una dirección 0x no se lee como mint de Solana.", "If the service does not respond, it says so and does not invent a result. A 0x address is not read as a Solana mint.")}</li>
<li>{t("«Esta dirección es la del registro de STUBX» significa que la dirección coincide con el registro. No es una garantía permanente ni una auditoría.", "“This address is the one in the STUBX registry” means the address matches the registry. It is not a permanent guarantee or an audit.")}</li>
<li>{t("«Se parece a STUBX, pero no es la CA oficial» dice que el nombre o el símbolo se parece y el mint es otro. No dice quién lo hizo ni con qué intención.", "“Looks like STUBX, but it is not the official CA” says the name or the symbol looks similar and the mint is a different one. It does not say who did it or why.")}</li>
</ul>
<h2>{t("Desconocido no es comprobado", "Unknown is not verified")}</h2>
<p>{t("No disponible significa que esa llamada no dejó un dato usable. Desconocido es lo que no se leyó. Ninguno de los dos se convierte en cero, en autoridad revocada ni en metadatos inmutables.", "Unavailable means that call did not leave a usable fact. Unknown is what was not read. Neither one becomes zero, a revoked authority, or immutable metadata.")}</p>
<p>{t("La ficha oficial del 2026-10-09 lee el saldo de la curva, el de la creadora y el de la cuenta personal publicada 2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX. El resto respecto al suministro es 0.0000 %. No es un censo. Los tres clones del 2026-10-08 y USDC siguen con la muestra no disponible: en esa tanda getTokenLargestAccounts respondió HTTP 429. ERYyy y FMNb traen saldos de curva y creadora, también sin ser un censo. Una cuenta puede ser de un custodio. No disponible no es concentración cero.", "The official card of 2026-10-09 reads the curve balance, the creator balance, and the published personal account 2fS12sTD4TNEEE9MoCEt19brV41UjGdAnaNaxWcmiWvX. The rest of the supply is 0.0000%. It is not a census. The three clones from 2026-10-08 and USDC still have an unavailable sample: in that batch getTokenLargestAccounts returned HTTP 429. ERYyy and FMNb carry curve and creator balances, also without being a census. An account can belong to a custodian. Unavailable is not zero concentration.")}</p>
<h2>{t("Curva", "Curve")}</h2>
<p>{t("Si la cuenta derivada es del programa de la curva, la ficha lo dice. El avance clásico es un cálculo inferido con la cantidad real inicial pública documentada de la curva (Pump.fun lo llama ‘reserves’) (793100000000000), truncado a 2 decimales hacia cero. No es un campo de la cuenta. Si no hay curva, el avance queda en no aplica y no se rellenan con cero las cantidades de la curva.", "If the derived account belongs to the curve program, the card says so. Classic progress is an inferred calculation using the documented public initial real curve amount (Pump.fun calls these ‘reserves’) (793100000000000), truncated to 2 decimals toward zero. It is not a field of the account. If there is no curve, progress stays not applicable and the curve amounts are not filled in with zero.")}</p>
<p>{t("En la ficha del mint del registro, el 2026-10-08 a las 07:41:29 UTC, el avance inferido es 1.74. Los tres clones de esa tanda tienen 0.00 inferido. USDC no es una curva.", "On the registry mint card, 2026-10-08 at 07:41:29 UTC, inferred progress is 1.74. The three clones in that batch have inferred 0.00. USDC is not a curve.")}</p>
<h2>{t("Prueba pública mínima", "Minimum public proof")}</h2>
<p>{t("Cuatro casillas: wallet, logs, límites y kill-switch. A 2026-10-05 hay 3 marcadas y 1 que no aplica. No es un 3/3. Marcada no significa auditada. El detalle y las ejecuciones están en Estado.", "Four checks: wallet, logs, limits, and kill-switch. As of 2026-10-05, 3 are checked and 1 does not apply. It is not 3/3. Checked does not mean audited. The detail and the runs are on Status.")}</p>
<p><a href="/status/">{t("Ver las casillas", "See the checklist")}</a> · <a href="/proofs/">{t("Ver las pruebas, una a una", "See the proofs, one by one")}</a></p>
"""


def security() -> str:
    return f"""
<h1>{t("Seguridad y canales", "Security and channels")}</h1>
<p class="lede">{t("Lista cerrada. Si una cuenta, una web o una CA no está aquí, trátala como no oficial hasta comprobarla en @stubxai y en esta web.", "Closed list. If an account, a website, or a CA is not here, treat it as unofficial until you check it on @stubxai and on this website.")}</p>
{source("Aviso de clones del 2026-10-05, token.json securityNotice, más la revisión del 2026-10-09 (ERYyy, FMNb y dos ejemplos EVM no verificados en la cadena). Canales de token.json official, última actualización del archivo 2026-10-05. token.json no se ha reescrito: su securityNotice sigue siendo el del 2026-10-05.", "Clone notice of 2026-10-05, token.json securityNotice, plus the 2026-10-09 review (ERYyy, FMNb, and two EVM examples not verified on-chain). Channels from token.json official, file last update 2026-10-05. token.json has not been rewritten: its securityNotice is still the 2026-10-05 text.")}
<div class="risk-block"><h2>{t("Aviso de clones · 2026-10-05 y revisión 2026-10-09", "Clone notice · 2026-10-05 and 2026-10-09 review")}</h2><p>{t(CLONE_ES, CLONE_EN)}</p>
<p>{t("Enlazan a esta web y a la cuenta personal del creador para parecer oficiales. No abras esos tokens, no conectes tu wallet y no interactúes con ellos. Cualquier otra CA con el ticker STUBX es una copia o una estafa.", "They link to this website and to the creator’s personal account so they look official. Do not open those tokens, do not connect your wallet, and do not interact with them. Any other CA with the STUBX ticker is a copy or a scam.")}</p>
<p>{t(CLONE_MORE_ES, CLONE_MORE_EN)}</p></div>
<h2>{t("Contrato", "Contract")}</h2>
<p class="ca-value">{CA}</p>
<p>{t("Cópiala solo desde esta web o desde @stubxai. Compárala entera, no solo el principio y el final. En Solscan debe decir STUBX, creado el 2026-09-23, y la wallet creadora es la de abajo.", "Copy it only from this website or from @stubxai. Compare the whole address, not only the start and the end. On Solscan it should say STUBX, created on 2026-09-23, and the creator wallet is the one below.")}</p>
<h2>{t("Canales oficiales", "Official channels")}</h2>
<ul class="clean">
<li>{t("X, único canal oficial en X:", "X (the only official account on X):")} <a href="https://x.com/stubxai" title="Único canal oficial en X / The only official channel on X">@stubxai</a></li>
<li>{t("Web:", "Website:")} <a href="https://stubxai.com/">stubxai.com</a>. {t(HOSTING_ES, HOSTING_EN)}</li>
<li>{t("Correo, único:", "Email (the only one):")} <a href="mailto:stubxai.hq@gmail.com">stubxai.hq@gmail.com</a></li>
<li>{t("Código, único repositorio:", "Code, the only repository:")} <a href="https://github.com/stubxai/stubx-agent">github.com/stubxai/stubx-agent</a>. {t("github.com/stubx, sin «ai», no tiene relación con STUBX.", "github.com/stubx, without “ai”, has no relation to STUBX.")}</li>
<li>{t("Telegram, solo anuncios:", "Telegram, announcements only:")} <a href="https://t.me/stubxai">t.me/stubxai</a>. {t("Los admins nunca escriben primero por privado.", "Admins never write first in private.")}</li>
<li>Farcaster: <a href="https://farcaster.xyz/stubxai">@stubxai</a></li>
<li>TikTok: <a href="https://www.tiktok.com/@stubxai">@stubxai</a>. {t("Solo vídeos antiestafa. No publica enlaces ni direcciones de token. Mensajes privados desactivados.", "Anti-scam videos only. It does not publish links or token addresses. Private messages are off.")}</li>
<li>Discord: {t("ninguno.", "none.")}</li>
</ul>
<h2>{t("Wallets que no son un canal", "Wallets that are not a channel")}</h2>
<ul class="clean">
<li>{t("Wallet creadora:", "Creator wallet:")} <code>{CREATOR}</code></li>
<li>{t("Wallet personal del creador:", "Creator’s personal wallet:")} <code>{PERSONAL}</code>. {t("Tiene STUBX. Nunca pide que le envíes nada y no acepta aportaciones.", "It holds STUBX. It never asks you to send anything and it does not accept contributions.")}</li>
<li>{t("Wallet pública del proyecto, SOL, controlada por el creador:", "Public project wallet, SOL, controlled by the creator:")} <code>{PROJECT}</code>. {t("No es multifirma. No acepta aportaciones ni donaciones.", "It is not a multisig. It does not accept contributions or donations.")}</li>
</ul>
<p>{t("Cualquier otra wallet que diga ser de STUBX o pida un envío es una estafa. Cualquier dirección «de práctica» o «de prueba» que veas por ahí: no es la CA oficial. La cuenta personal de X del creador, @CreadorSTUBX, no es un canal oficial.", "Any other wallet that claims to be STUBX or asks for a transfer is a scam. Any “practice” or “test” address you see elsewhere is not the official CA. The creator’s personal X account, @CreadorSTUBX, is not an official channel.")}</p>
<h2 id="negociacion">{t("¿Dónde se negocia STUBX?", "Where does STUBX trade?")}</h2>
<p>{t("Información, no recomendación. STUBX se creó el 2026-09-23 en Pump.fun, una plataforma de terceros para crear y negociar tokens en Solana. STUBX no es un exchange: no intermedia, no custodia fondos y no puede deshacer operaciones. Usa una wallet propia.", "Information, not a recommendation. STUBX was created on 2026-09-23 on Pump.fun, a third-party platform for creating and trading tokens on Solana. STUBX is not an exchange: it does not intermediate, it does not custody funds, and it cannot undo trades. Use your own wallet.")}</p>
<ol>
<li>{t(f"Comprueba la CA entera, carácter a carácter: {CA}. Cualquier otra es una copia.", f"Check the whole CA, character by character: {CA}. Any other one is a copy.")}</li>
<li>{t("Usa una wallet propia. Nadie de STUBX te pedirá la frase semilla ni claves, ni que conectes tu wallet en otra web.", "Use your own wallet. Nobody from STUBX will ask for the seed phrase or for keys, or for you to connect your wallet on another website.")}</li>
<li>{t("No te fíes de mensajes directos, grupos o «soporte» que te escriban: STUBX nunca escribe primero por privado, y solo son oficiales los canales de esta lista.", "Do not trust direct messages, groups, or “support” that write to you: STUBX never writes first in private, and only the channels on this list are official.")}</li>
<li>{t("Cada operación paga comisiones de Pump.fun y de la red Solana (consulta las vigentes en su página de comisiones). Además, el creador de STUBX cobra una comisión por cada operación.", "Each trade pays Pump.fun fees and Solana network fees (check the current ones on their fees page). In addition, the creator of STUBX collects a fee on every trade.")} <a href="https://pump.fun/docs/fees">{t("Página de comisiones", "Fees page")}</a> · <a href="/#transparencia">{t("transparencia", "transparency")}</a></li>
<li>{t("Pump.fun tiene sus propias condiciones, como la edad mínima de 18 años y países excluidos.", "Pump.fun has its own terms, such as a minimum age of 18 and excluded countries.")}</li>
</ol>
<p>{t("Cada venta baja el precio: si ha caído, vender puede devolverte muy poco o casi nada, y Pump.fun o la red Solana pueden fallar o saturarse. Puedes perder todo lo que pongas.", "Every sale lowers the price: if it has fallen, selling can return very little or almost nothing, and Pump.fun or the Solana network can fail or become congested. You could lose everything you put in.")}</p>
<p><a href="https://pump.fun/coin/TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump">{t("Página del token en Pump.fun (plataforma de terceros)", "Token page on Pump.fun (third-party platform)")}</a></p>
<h2>{t("Cinco reglas para no caer.", "Five rules to avoid getting scammed.")}</h2>
<ol>
<li>{t("Usa solo la CA de esta lista.", "Use only the CA on this list.")}</li>
<li>{t("Nunca compartas tu clave privada, frase semilla (seed) ni códigos de acceso.", "Never share your private key, seed phrase, or access codes.")}</li>
<li>{t("Nunca envíes SOL ni dinero por un mensaje directo.", "Never send SOL or money in response to a direct message.")}</li>
<li>{t("No conectes tu wallet en webs que no aparezcan en esta lista.", "Do not connect your wallet on websites that are not on this list.")}</li>
<li>{t("Nadie oficial te prometerá rentabilidad, precio, listado ni venta pública.", "Nobody official will promise you a return, a price, a listing, or a public sale.")}</li>
</ol>
<p>{t("Un DM que ofrezca preventa, whitelist, airdrop, devolución, inversión o «ayuda para mintear» es una señal de estafa. No respondas con datos, no abras enlaces y no firmes transacciones.", "A DM offering a presale, whitelist, airdrop, refund, investment, or “help to mint” is a scam signal. Do not reply with data, do not open links, and do not sign transactions.")}</p>
<h2>{t("Qué no pedirá el equipo", "What the team will not ask for")}</h2>
<ul class="clean">
<li>{t("Que envíes SOL, tokens o dinero.", "That you send SOL, tokens, or money.")}</li>
<li>{t("Tu frase semilla, tu clave privada o tus códigos.", "Your seed phrase, your private key, or your codes.")}</li>
<li>{t("Que conectes una wallet o firmes algo por un mensaje privado.", "That you connect a wallet or sign anything in response to a private message.")}</li>
<li>{t("Preventas, whitelists o airdrops.", "Presales, whitelists, or airdrops.")}</li>
</ul>
<p>{t("STUBX no escribe primero por mensaje directo. Si alguien lo hace en nombre de STUBX, trátalo como una estafa: no respondas, no abras enlaces y no firmes. La información válida se publica en abierto. Si hay contradicción, no actúes.", "STUBX does not write first in a direct message. If someone does it in STUBX’s name, treat it as a scam: do not reply, do not open links, and do not sign. Valid information is published in the open. If there is a contradiction, do not act.")}</p>
<h2>{t("Cómo avisar", "How to report")}</h2>
<p>{t("Escribe a stubxai.hq@gmail.com con el enlace y una descripción. No envíes la frase semilla, una contraseña ni un documento personal. También está en security.txt. No hay atención continua ni promesa de recuperar fondos.", "Write to stubxai.hq@gmail.com with the link and a description. Do not send the seed phrase, a password, or a personal document. It is also in security.txt. There is no continuous support and no promise to recover funds.")}</p>
<p><a href="../security.txt">security.txt</a> · <a href="../.well-known/security.txt">/.well-known/security.txt</a></p>
<p class="source">{t("Revisión de este texto: 2026-10-09, a partir del aviso publicado el 2026-10-05. No es vigilancia permanente ni una garantía contra el fraude.", "Review of this text: 2026-10-09, from the notice published on 2026-10-05. It is not permanent monitoring or a guarantee against fraud.")}</p>
"""


def risks() -> str:
    return f"""
<h1>{t("Riesgos", "Risks")}</h1>
<p class="lede">{t("Resumen en lenguaje llano de los riesgos de STUBX y de lo que este proyecto es y no es. No es un dictamen jurídico ni consejo de inversión. Si necesitas asesoramiento, consulta a un profesional colegiado.", "A plain-language summary of the risks of STUBX and of what this project is and is not. It is not a legal opinion or investment advice. If you need advice, ask a licensed professional.")}</p>
<div class="risk-block">
<h2>{t("Aviso de riesgo", "Risk notice")}</h2>
<p>{t(RISK_ES, RISK_EN)}</p>
<p class="mica"><strong>{t("Aviso MiCA (art. 7.1.e):", "MiCA notice (art. 7.1.e):")}</strong> {t(MICA_ES, MICA_EN)}</p>
</div>
<h2>{t("Lo que puede salir mal", "What can go wrong")}</h2>
<div class="grid-3">
<article class="card"><h3>{t("Pérdida total", "Total loss")}</h3><p>{t("Un memecoin puede irse a cero. Puedes perder el 100 % de lo que aportes.", "A memecoin can go to zero. You could lose 100% of what you put in.")}</p></article>
<article class="card"><h3>{t("Mercado y liquidez", "Market and liquidity")}</h3><p>{t("Bots que compran antes que nadie, copias del nombre, poco SOL en la curva, caídas de la red y acceso limitado según el país. Nadie aquí dice que compres o vendas.", "Bots that buy before anyone else, copies of the name, little SOL on the curve, network outages, and access limited by country. Nobody here tells you to buy or sell.")}</p></article>
<article class="card"><h3>{t("Sin promesas", "No promises")}</h3><p>{t("No prometemos rentabilidad, precio, listado en exchanges ni venta pública. STUBX no da derechos, dividendos ni reparto de nada.", "We do not promise a return, a price, an exchange listing, or a public sale. STUBX grants no rights, dividends, or distribution of anything.")}</p></article>
<article class="card"><h3>{t("Riesgo técnico", "Technical risk")}</h3><p>{t("Lanzamiento en la curva pública de Pump.fun, sin reserva de equipo y sin autoridades de emisión ni congelación. Eso reduce algunos riesgos técnicos, no el riesgo de mercado. El código del agente es un prototipo y puede tener fallos.", "Launch on the public Pump.fun curve, with no team reserve and no mint or freeze authority. That reduces some technical risks, not market risk. The agent code is a prototype and may contain bugs.")}</p></article>
<article class="card"><h3>{t("Estafas y copias", "Scams and copies")}</h3><p>{t("Habrá cuentas, webs y CAs falsas. Solo es oficial lo que aparece en Seguridad. Nadie de STUBX pedirá tu semilla ni fondos por mensaje directo.", "There will be fake accounts, websites, and CAs. Only what is listed on the Security page is official. Nobody from STUBX will ask for your seed or for funds in a direct message.")}</p></article>
<article class="card"><h3>{t("Datos parciales y operación", "Partial data and operations")}</h3><p>{t("La ficha oficial del 2026-10-09 lee curva y creadora y no es un censo. Otras fichas de esa demo siguen sin muestra de cuentas con tokens. El creador puede vender sus STUBX en cualquier momento: no hay vesting. La wallet del proyecto la controla una persona y no es multifirma.", "The official card of 2026-10-09 reads the curve and the creator and is not a census. Other cards in that demo still have no token account sample. The creator can sell their STUBX at any time: there is no vesting. One person controls the project wallet and it is not a multisig.")}</p></article>
</div>
<h2>{t("Qué es y qué no es", "What it is and what it is not")}</h2>
<div class="grid-2">
<article class="card"><h3>{t("Qué es", "What it is")}</h3><ul class="clean"><li>{t("Un personaje-meme sobre agentes de IA que piden pruebas.", "A meme character about AI agents that ask for proof.")}</li><li>{t(f"Un token en Solana creado en Pump.fun el 2026-09-23. CA {CA}.", f"A Solana token created on Pump.fun on 2026-09-23. CA {CA}.")}</li><li>{t("Un prototipo de código abierto, sin wallet ni claves, con tests, kill-switch y registro público.", "An open-source prototype, with no wallet and no keys, with tests, a kill-switch, and a public log.")}</li></ul></article>
<article class="card"><h3>{t("Qué no es", "What it is not")}</h3><ul class="clean"><li>{t("No es consejo de inversión ni una recomendación.", "It is not investment advice or a recommendation.")}</li><li>{t("No es un agente autónomo: no firma, no custodia y no opera.", "It is not an autonomous agent: it does not sign transactions, take custody of assets, or trade.")}</li><li>{t("El kill-switch solo afecta al agente del repositorio. No pausa transferencias ni congela cuentas.", "The kill-switch only affects the repository agent. It does not pause transfers or freeze accounts.")}</li><li>{t("No hay agente autónomo, aunque la descripción grabada diga «AI-native».", "There is no autonomous agent, even if the on-chain description says “AI-native”.")}</li></ul></article>
</div>
<h2>{t("Lo que no decimos ni hacemos", "What we do not say or do")}</h2>
<ul class="clean">
<li>{t("Sin promesas de rentabilidad ni de precio.", "No promises of return or price.")}</li>
<li>{t("No hay aprobación de la CNMV ni white paper MiCA notificado. Tampoco hay sello de la CNMV ni un «preparado para MiCA».", "There is no CNMV approval and no notified MiCA white paper. There is also no CNMV seal and no “MiCA-ready” label.")}</li>
<li>{t("Sin volumen falso.", "No fake volume.")}</li>
<li>{t("Sin llamadas a comprar, ni urgencias, ni anuncios de listados.", "No calls to buy, no urgency, and no listing announcements.")}</li>
</ul>
"""


def legal() -> str:
    return f"""
<h1>{t("Legal y contacto", "Legal and contact")}</h1>
<p class="lede">{t("Contacto real y límites de lo que esta web afirma. No hay sellos de cumplimiento. Un abogado no ha certificado esta vista previa.", "A real contact and the limits of what this website claims. There are no compliance seals. A lawyer has not certified this preview.")}</p>
<div class="risk-block"><p>{t(RISK_ES, RISK_EN)}</p><p class="mica"><strong>{t("Aviso MiCA (art. 7.1.e):", "MiCA notice (art. 7.1.e):")}</strong> {t(MICA_ES, MICA_EN)}</p></div>
<h2>{t("Qué no es esta web", "What this website is not")}</h2>
<ul class="clean">
<li>{t("No es una oferta ni una invitación a comprar.", "It is not an offer or an invitation to buy.")}</li>
<li>{t("No es una recomendación personalizada.", "It is not a personal recommendation.")}</li>
<li>{t("No está aprobada por la CNMV ni por otra autoridad.", "It is not approved by the CNMV or by another authority.")}</li>
<li>{t("No hay white paper MiCA notificado.", "There is no notified MiCA white paper.")}</li>
<li>{t("Hablar de un criptoactivo puede ser comunicación publicitaria: por eso lleva el aviso del art. 7.1.e.", "Talking about a crypto-asset can be a marketing communication: that is why it carries the art. 7.1.e notice.")}</li>
</ul>
<h2>{t("Privacidad", "Privacy")}</h2>
<ul class="clean">
<li>{t("No hay cuentas ni formularios. Cloudflare Web Analytics debe estar apagado en el panel de la zona. Este repositorio no lo inserta y el HTML servido el 2026-10-10 no lleva la baliza.", "There are no accounts or forms. Cloudflare Web Analytics must be off in the zone dashboard. This repository does not insert it, and the HTML served on 2026-10-10 does not contain the beacon.")}</li>
<li>{t("Este proyecto no guarda la IP. Cloudflare, como alojamiento, recibe la IP de cada visita y la trata según su propia política (registros del servidor que este proyecto no consulta ni exporta).", "This project does not store the IP address. Cloudflare, as the host, receives each visitor's IP and processes it under its own policy (server logs that this project does not query or export).")}</li>
<li>{t("El selector de idioma guarda stubx-lab-lang en este navegador. Se puede borrar desde el propio navegador.", "The language switch stores stubx-lab-lang in this browser. You can delete it in the browser itself.")}</li>
<li>{t("Lab guarda stubx-lab-mision-01 solo si haces la misión. Es progreso local, sin puntuación y sin valor. Se puede borrar.", "Lab stores stubx-lab-mision-01 only if you do the mission. It is local progress, with no score and no value. It can be deleted.")}</li>
<li>{t("__AVISO_ES__", "__AVISO_EN__")}</li>
<li>{t("El service worker solo se registra en Lab, con alcance /lab/. No guarda la portada ni las páginas de avisos. Recargar trae esta copia.", "The service worker registers only on Lab, with scope /lab/. It does not store the home page or the notice pages. Reloading fetches this copy.")}</li>
</ul>
<h2>{t("Contacto", "Contact")}</h2>
<p><a href="mailto:stubxai.hq@gmail.com">stubxai.hq@gmail.com</a>. {t("Prensa, dudas y fallos de seguridad. No hay formularios. No pedimos semilla, claves ni dinero.", "Press, questions, and security faults. There are no forms. We do not ask for a seed, keys, or money.")}</p>
<p><a href="../security.txt">security.txt</a> · <a href="https://github.com/stubxai/stubx-agent/blob/main/SECURITY.md">SECURITY.md</a>. {t("No hay recompensa económica.", "There is no monetary reward.")}</p>
<p class="source">{t("Textos de riesgo y MiCA: los de la web en producción a 2026-10-05, conservados en su significado. La frase inglesa es una traducción de esa frase española.", "Risk and MiCA texts: those of the production website as of 2026-10-05, kept in meaning. The English sentence is a translation of that Spanish sentence.")}</p>
"""


def how_to(intro_es: str, intro_en: str, commands: str, note_es: str, note_en: str) -> str:
    return (
        f"<h3>{t('Cómo repetirlo tú', 'How to repeat it yourself')}</h3>"
        f"<p>{t(intro_es, intro_en)}</p>"
        f"<pre>{html.escape(commands.strip())}</pre>"
        f"<p>{t(note_es, note_en)}</p>"
    )


def proofs() -> str:
    blocks = []

    def proof(title_es, title_en, body):
        if body.startswith("<span"):
            cut = 0
            for _ in range(2):
                cut = body.find("</span>", cut) + len("</span>")
            body = f"<p>{body[:cut]}</p>{body[cut:]}"
        blocks.append(f"<article class=\"card\"><h2>{t(title_es, title_en)}</h2>{body}</article>")

    proof(
        "Tests automáticos: 115 de 115 (a 2026-10-04)",
        "Automated tests: 115 of 115 (as of 2026-10-04)",
        t(
            "El 04-10-2026 a las 11:43 (Madrid), main estaba en el commit e4faf6e y la CI pública terminó 115 de 115 en verde, 12 grupos, 0 fallos, incluidos 20 tests de límites. A las 12:40 se repitió en un clon limpio con Node.js 22, con el mismo resultado. Demuestra que, en ese commit, el código hace lo que esos tests comprueban. No demuestra que no haya otros fallos, ni que sea una auditoría, ni nada sobre el precio. Otra versión de main puede tener otra cifra.",
            "On 2026-10-04 at 11:43 (Madrid), main was at commit e4faf6e and the public CI finished 115 of 115 green, 12 groups, 0 failures, including 20 limit tests. At 12:40 it was repeated on a clean clone with Node.js 22, with the same result. It shows that, at that commit, the code does what those tests check. It does not show that there are no other faults, it is not an audit, and it says nothing about price. Another version of main can have a different count.",
        )
        + source(
            "Ejecución citada en la web en producción: github.com/stubxai/stubx-agent, commit e4faf6e, comprobado el 2026-10-04.",
            "Run cited on the production website: github.com/stubxai/stubx-agent, commit e4faf6e, checked on 2026-10-04.",
        )
        + how_to(
            "Necesitas git y Node.js 22. No hace falta ninguna clave ni wallet.",
            "You need git and Node.js 22. No key or wallet is required.",
            "git clone https://github.com/stubxai/stubx-agent\ncd stubx-agent\ngit checkout e4faf6e\nnpm ci && npm test",
            "Al final debe salir tests 115, pass 115 y fail 0. Sin git checkout pruebas la última versión de main, que puede tener otra cifra.",
            "The end must show tests 115, pass 115 and fail 0. Without git checkout you test the latest main, which can have another count.",
        ),
    )
    proof(
        "Registro diario: 9 días (a 2026-10-04)",
        "Daily log: 9 days (as of 2026-10-04)",
        t(
            "logs/agent-log.jsonl tenía 9 entradas, del 26-09 al 04-10-2026, escritas por github-actions[bot] con el workflow daily-log. Cada entrada lleva la huella de la anterior. El 04-10-2026 a las 12:40, logs:verify dio ok con 9 entradas. Demuestra que no se cambió una entrada antigua sin rehacer las siguientes. No demuestra que el registro esté completo ni que lo anotado sea verdad. No anota los posts de @stubxai ni la cadena del token.",
            "logs/agent-log.jsonl had 9 entries, from 2026-09-26 to 2026-10-04, written by github-actions[bot] with the daily-log workflow. Each entry carries the hash of the previous one. On 2026-10-04 at 12:40, logs:verify reported ok with 9 entries. It shows that an old entry was not changed without redoing the later ones. It does not show that the log is complete or that what it records is true. It does not record @stubxai posts or the token chain.",
        )
        + how_to(
            "En el mismo clon de la prueba anterior:",
            "In the same clone as the previous proof:",
            "npm run logs:verify\nnpm run logs:status\ngit log --format='%an %s' -- logs/agent-log.jsonl",
            'logs:verify recalcula todas las huellas: debe decir "ok": true. logs:status cuenta los días (distinctDays). El git log enseña quién escribió cada entrada.',
            'logs:verify recomputes every hash: it must say "ok": true. logs:status counts the days (distinctDays). The git log shows who wrote each entry.',
        ),
    )
    proof(
        "Sellos de tiempo: 8 confirmados y 1 pendiente (a 2026-10-04)",
        "Timestamps: 8 confirmed and 1 pending (as of 2026-10-04)",
        t(
            "Había 9 anclas y 9 sellos .ots. Los 8 del 26-09 al 03-10 estaban confirmados en Bitcoin. El del 04-10 seguía pendiente. El primer bloque del ancla 2026-09-26-000001 es 968752. Bitcoin solo es el reloj: no respalda STUBX. Un sello prueba que el ancla existía a más tardar a la hora de su bloque, no que el texto sea verdad. Comprobado a mano el 03-10 y de nuevo el 04-10-2026 a las 12:41 contra blockstream.info.",
            "There were 9 anchors and 9 .ots timestamp files. The 8 from 2026-09-26 to 2026-10-03 were confirmed in Bitcoin. The 2026-10-04 timestamp was still pending. The first block of anchor 2026-09-26-000001 is 968752. Bitcoin is only the clock: it does not back STUBX. A timestamp shows that the anchor existed by the time of its block, not that the text is true. Checked by hand on 2026-10-03 and again on 2026-10-04 at 12:41 against blockstream.info.",
        )
        + how_to(
            "En el mismo clon, con Python 3 y curl (pasos de LOGS.md):",
            "In the same clone, with Python 3 and curl (steps in LOGS.md):",
            'python3 -m venv /tmp/ots\n/tmp/ots/bin/pip install --require-hashes --no-deps -r .github/ots-requirements.txt\nA=logs/anchors/2026-09-26-000001.txt\nsha256sum "$A"\n/tmp/ots/bin/ots info "$A.ots" | grep -E "File sha256 hash|BitcoinBlockHeaderAttestation|merkle root"\nH=968752\ncurl -s https://blockstream.info/api/block/$(curl -s https://blockstream.info/api/block-height/$H) | grep -o \'"merkle_root":"[^"]*"\'',
            'La huella del ancla debe coincidir con «File sha256 hash», y el merkle root del sello con el del bloque. Sin terminal: sube el .txt y su .ots a <a href="https://opentimestamps.org/">opentimestamps.org</a>.',
            'The anchor hash must match “File sha256 hash”, and the proof’s merkle root must match the block’s. Without a terminal: upload the .txt and its .ots to <a href="https://opentimestamps.org/">opentimestamps.org</a>.',
        ),
    )
    proof(
        "Autoridades revocadas",
        "Authorities revoked",
        t(
            f"El mint {CA} (Token-2022) no tiene autoridad de emisión ni de congelación, y los metadatos no tienen autoridad de actualización. Leído en el RPC público el 04-10-2026 a las 12:41 (Madrid), slot 453232549. Suministro 1.000.000.000, 6 decimales. Demuestra que nadie puede crear más STUBX ni congelar cuentas de STUBX, y que esos metadatos no se cambian. No dice nada del precio y no evita las copias.",
            f"Mint {CA} (Token-2022) has no mint authority and no freeze authority, and the metadata has no update authority. Read on the public RPC on 2026-10-04 at 12:41 (Madrid), slot 453232549. Supply 1,000,000,000, 6 decimals. It shows that nobody can create more STUBX or freeze STUBX accounts, and that this metadata cannot be changed. It says nothing about price and it does not stop copies.",
        )
        + how_to(
            f'Abre la CA en <a href="https://solscan.io/token/{CA}">Solscan</a>: la autoridad de emisión (Mint Authority) y la de congelación (Freeze Authority) deben salir vacías. O pregunta tú al RPC público:',
            f'Open the CA on <a href="https://solscan.io/token/{CA}">Solscan</a>: mint authority and freeze authority must be empty. Or ask the public RPC yourself:',
            "curl -s https://api.mainnet-beta.solana.com -H 'Content-Type: application/json' \\\n"
            f'  -d \'{{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":["{CA}",{{"encoding":"jsonParsed"}}]}}\' \\\n'
            "  | grep -oE '\"(mintAuthority|freezeAuthority|updateAuthority)\":[^,]*'",
            "Deben salir las tres con null.",
            "All three must come back as null.",
        ),
    )
    proof(
        "Reparto a 2026-10-03 14:19 (Madrid)",
        "Distribution as of 2026-10-03 14:19 (Madrid)",
        t(
            f"Curva {CURVE}: 986.122.445,10 STUBX (98,61 %). Wallet creadora {CREATOR}: 5.272.727,23 (0,53 %). Wallet personal {PERSONAL}: 8.604.827,67 (0,86 %). Suman 1.000.000.000. Releído el 04-10-2026 a las 12:41, slots 453232551 y 453232552, con las mismas cifras. La wallet del proyecto tenía 0 STUBX. No dice dónde estarán mañana. Los del creador no están bloqueados.",
            f"Curve {CURVE}: 986,122,445.10 STUBX (98.61%). Creator wallet {CREATOR}: 5,272,727.23 (0.53%). Personal wallet {PERSONAL}: 8,604,827.67 (0.86%). They sum to 1,000,000,000. Read again on 2026-10-04 at 12:41, slots 453232551 and 453232552, with the same figures. The project wallet held 0 STUBX. It does not say where they will be tomorrow. The creator’s tokens are not locked.",
        )
        + f'<p><a href="/tokenomics/">{t("Tabla completa", "Full table")}</a></p>'
        + how_to(
            f'En Solscan, la pestaña que lista las cuentas con tokens de la <a href="https://solscan.io/token/{CA}">CA</a>. O con el RPC público: getTokenSupply da el total y getTokenAccountsByOwner, con el mint de STUBX, da lo que tiene cada dirección. Ejemplo con la wallet creadora:',
            f'On Solscan, the tab that lists the token accounts of the <a href="https://solscan.io/token/{CA}">CA</a>. Or with the public RPC: getTokenSupply gives the total and getTokenAccountsByOwner, with the STUBX mint, gives what each address holds. Example with the creator wallet:',
            "curl -s https://api.mainnet-beta.solana.com -H 'Content-Type: application/json' \\\n"
            f'  -d \'{{"jsonrpc":"2.0","id":1,"method":"getTokenAccountsByOwner","params":["{CREATOR}",{{"mint":"{CA}"}},{{"encoding":"jsonParsed"}}]}}\' \\\n'
            "  | grep -o '\"amount\":\"[0-9]*\"'",
            "La cifra sale en unidades mínimas (6 decimales): 5272727232064 son 5.272.727,232064 STUBX. Repite con las otras dos direcciones de la tabla.",
            "The figure is in minor units (6 decimals): 5272727232064 is 5,272,727.232064 STUBX. Repeat with the other two addresses in the table.",
        ),
    )
    proof(
        "Wallet pública del proyecto: 0 STUBX",
        "Public project wallet: 0 STUBX",
        t(
            f"{PROJECT} no tenía ninguna cuenta de STUBX el 04-10-2026 a las 12:24 (Madrid), slot 453228585. Es una wallet normal. La controla el creador y el SOL es suyo (no es multifirma). Solo se usa con SOL y solo paga costes del proyecto. No da derechos a nadie y no acepta aportaciones. La cadena no dice quién la controla: lo declara el creador. No es la wallet del agente.",
            f"{PROJECT} had no STUBX account on 2026-10-04 at 12:24 (Madrid), slot 453228585. It is a normal wallet. It is controlled by the creator and the SOL is theirs (not a multisig). It is only used with SOL and it only pays project costs. It gives no rights to anyone and it does not accept contributions. The chain does not say who controls it: the creator declares that. It is not the agent wallet.",
        )
        + how_to(
            f'Ábrela en <a href="https://solscan.io/account/{PROJECT}">Solscan</a> y mira sus tokens y sus transacciones. O con el RPC público:',
            f'Open it on <a href="https://solscan.io/account/{PROJECT}">Solscan</a> and look at its tokens and transactions. Or with the public RPC:',
            "curl -s https://api.mainnet-beta.solana.com -H 'Content-Type: application/json' \\\n"
            f'  -d \'{{"jsonrpc":"2.0","id":1,"method":"getTokenAccountsByOwner","params":["{PROJECT}",{{"mint":"{CA}"}},{{"encoding":"jsonParsed"}}]}}\'',
            'Si no tiene STUBX, la respuesta acaba en "value":[].',
            'If it holds no STUBX, the response ends in "value":[].',
        ),
    )
    proof(
        "Reintegro de la comisión de creador",
        "Creator-fee reimbursement",
        t(
            "El 04-10-2026 a las 11:06 (Madrid), slot 453211124, la transacción 4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy envió 0,033020866 SOL desde la wallet personal a la wallet del proyecto. 0,031554107 SOL reintegran la comisión cobrada el 2026-09-23 (transacción 3rDQEqHoTQFVgkiAmtBX3sRia9sScEs3K5rcEaDu9riYSNMBrQ3uLQbu9aSBB3zNnCisafbMQo7puURyGF5FtLmH). Los otros 0,001466759 SOL son del creador, para comisiones de red. La cadena demuestra el envío, no el motivo. La comisión es un ingreso del creador: no se reparte.",
            "On 2026-10-04 at 11:06 (Madrid), slot 453211124, transaction 4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy sent 0.033020866 SOL from the personal wallet to the project wallet. 0.031554107 SOL reimburses the fee collected on 2026-09-23 (transaction 3rDQEqHoTQFVgkiAmtBX3sRia9sScEs3K5rcEaDu9riYSNMBrQ3uLQbu9aSBB3zNnCisafbMQo7puURyGF5FtLmH). The other 0.001466759 SOL is the creator’s, for network fees. The chain shows the transfer, not the reason. The fee is the creator’s income: it is not distributed.",
        )
        + how_to(
            'Abre la <a href="https://solscan.io/tx/4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy">transacción en Solscan</a> y mira el origen, el destino y el importe. O con el RPC público:',
            'Open the <a href="https://solscan.io/tx/4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy">transaction on Solscan</a> and look at the source, the destination, and the amount. Or with the public RPC:',
            "curl -s https://api.mainnet-beta.solana.com -H 'Content-Type: application/json' \\\n"
            "  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getTransaction\",\"params\":[\"4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy\",{\"encoding\":\"jsonParsed\",\"maxSupportedTransactionVersion\":0}]}' \\\n"
            "  | grep -oE '\"(destination|lamports)\":[^,}]*|\"source\":\"[1-9A-HJ-NP-Za-km-z]{32,44}\"'",
            'Debe salir "lamports":33020866 (0,033020866 SOL), con el origen y el destino de arriba.',
            'It must show "lamports":33020866 (0.033020866 SOL), with the source and destination above.',
        ),
    )
    return f"""
<h1>{t("Pruebas", "Proofs")}</h1>
<p class="lede">{t("Siete pruebas públicas, con fecha. Para cada una: qué se comprobó, qué demuestra y qué no demuestra. Después de esa hora el dato puede haber cambiado: esta página no lo vuelve a leer.", "Seven public proofs, with a date. For each one: what was checked, what it shows, and what it does not show. After that time the figure may have changed: this page does not read it again.")}</p>
{source("Página pruebas.html de la web en producción, comprobaciones del 2026-10-04 salvo que se indique otra hora. PPM cerrada en su criterio el 2026-10-05.", "The production website’s pruebas.html page, checks of 2026-10-04 unless another time is stated. PPM criterion closed on 2026-10-05.")}
{''.join(blocks)}
<h2>{t("Lo que no existe hoy", "What does not exist today")}</h2>
<p class="source">{t("Lista comprobada el 2026-10-05. «Por diseño» solo aplica a la wallet y las claves del agente.", "List checked on 2026-10-05. “By design” applies only to the agent wallet and keys.")}</p>
<ul class="clean">
<li>{t("Wallet o claves del agente. La wallet pública del proyecto la controla el creador.", "Agent wallet or keys. The creator controls the public project wallet.")}</li>
<li>{t("Firmar o enviar transacciones.", "Signing or sending transactions.")}</li>
<li>{t("Conexión del agente del repositorio a la red principal: lee una ficha local.", "Connection of the repository agent to Solana mainnet: it reads a local card.")}</li>
<li>{t("Autonomía real. «Agente autónomo» es el personaje.", "Real autonomy. “Autonomous agent” is the character.")}</li>
<li>{t("Publicar en X desde este repositorio. Los posts de @stubxai los prepara otro agente, con textos aprobados antes.", "Posting to X from this repository. @stubxai posts are prepared by another agent, from texts approved beforehand.")}</li>
<li>{t("Staking, rentabilidad o listados. No se prometen.", "Staking, returns, or listings. They are not promised.")}</li>
</ul>
<h2 id="archivo">{t("Archivo histórico", "Historical archive")}</h2>
<p>{t("Los 18 posts están publicados íntegros en /archivo, en esta misma web. Son los textos anteriores al estado vigente y las 18 publicaciones de @stubxai retiradas el 2026-10-03, hacia las 11:35 (Madrid). Fuente: copia hecha el 2026-10-03 a las 11:21 (Madrid). Huella SHA-256 de esa copia: 654f8b25a72bae9d80c83ba3b3aa16ef16a1a531c450fce17d1d806342706897. Esa huella es el SHA-256 de la copia fuente no publicada de los 18 posts (2026-10-03 a las 11:21, Madrid), no el del archivo publicado en /archivo. No describen el estado actual.", "The 18 posts are published in full at /archivo on this same website. They are the texts from before the current state and the 18 @stubxai posts removed on 2026-10-03 at about 11:35 (Madrid). Source: a copy made on 2026-10-03 at 11:21 (Madrid). SHA-256 of that copy: 654f8b25a72bae9d80c83ba3b3aa16ef16a1a531c450fce17d1d806342706897. That hash is the SHA-256 of the unpublished source copy of the 18 posts (2026-10-03 at 11:21, Madrid), not of the file published at /archivo. They do not describe the current state.")}</p>
<p><a href="/archivo">{t("Abrir el archivo", "Open the archive")}</a></p>
<p>{t("Notas que ya acompañan a ese archivo: las respuestas del 2026-10-01 a @solana, @Raydium y @WhiteHouse se retiraron por ambiguas. STUBX no está listado en Raydium y no tiene relación, acuerdo ni anuncio con Solana, Raydium o la Casa Blanca. La frase de la comisión de creador en el post del 2026-10-02 no era exacta: el detalle vigente está en el reparto.", "Notes that already accompany that archive: the 2026-10-01 replies to @solana, @Raydium, and @WhiteHouse were removed as ambiguous. STUBX is not listed on Raydium and has no relationship, agreement, or announcement with Solana, Raydium, or the White House. The creator-fee sentence in the 2026-10-02 post was not accurate: the current detail is on the supply page.")}</p>
<p>{t(HOSTING_ES, HOSTING_EN)}</p>
"""


def status() -> str:
    return f"""
<h1 id="estado">{t("Estado y casillas PPM", "Status and PPM boxes")}</h1>
<p class="lede">{t("Estado observado en las fechas de abajo. Esta página no vigila la red ni GitHub al abrirse. Si una CI o un simulacro posterior sale en rojo, la casilla correspondiente se desmarca: eso no se refleja solo.", "State observed on the dates below. This page does not watch the network or GitHub when it opens. If a later CI run or drill goes red, the matching box is unmarked: that does not update by itself.")}</p>
<p class="estado-pill">{t("Completo para las fechas citadas", "Complete for the dates cited")}</p>
{source("token.json agentStatus y la portada en producción. PPM marcada el 2026-10-05. Tests citados del 2026-10-04, commit e4faf6e, 115/115.", "token.json agentStatus and the production home page. PPM marked on 2026-10-05. Tests cited from 2026-10-04, commit e4faf6e, 115/115.")}
<div class="tabla-scroll" tabindex="0" id="ppm"><table>
<caption>{t("Prueba pública mínima: 3 de 4 marcadas · 1 no aplica. No es un 3/3.", "Minimum public proof: 3 of 4 marked · 1 not applicable. It is not 3/3.")}</caption>
<thead><tr><th scope="col">{t("Casilla", "Box")}</th><th scope="col">{t("Estado", "State")}</th><th scope="col">{t("Prueba", "Proof")}</th></tr></thead>
<tbody>
<tr><th scope="row">{t("Wallet del agente", "Agent wallet")}</th><td>{t("No aplica · 2026-10-05", "Not applicable · 2026-10-05")}</td><td>{t(f"El agente no tiene wallet ni claves, por diseño. La wallet del proyecto {PROJECT} la controla el creador y no cuenta para esta casilla.", f"The agent has no wallet and no keys, by design. The creator controls the project wallet {PROJECT} and it does not count for this box.")}</td></tr>
<tr><th scope="row">{t("Logs", "Logs")}</th><td>{t("Marcada · 2026-10-05", "Marked · 2026-10-05")}</td><td>{t("Log de solo añadir, ancla 2026-09-26-000001 confirmada en el bloque de Bitcoin 968752. Ejecución daily-log del 05-10: github.com/stubxai/stubx-agent/actions/runs/37274282121. Marcada no significa que registre todo ni que lo anotado sea cierto.", "Append-only log, anchor 2026-09-26-000001 confirmed in Bitcoin block 968752. daily-log run of 2026-10-05: github.com/stubxai/stubx-agent/actions/runs/37274282121. Marked does not mean it records everything or that the notes are true.")}</td></tr>
<tr><th scope="row">{t("Límites", "Limits")}</th><td>{t("Marcada · 2026-10-05", "Marked · 2026-10-05")}</td><td>{t("CI pública del 05-10: github.com/stubxai/stubx-agent/actions/runs/37278171372, commit a960380. Un test en verde demuestra lo que ese test comprueba, en esa versión.", "Public CI of 2026-10-05: github.com/stubxai/stubx-agent/actions/runs/37278171372, commit a960380. A green test shows what that test checks, in that version.")}</td></tr>
<tr><th scope="row">{t("Kill-switch", "Kill-switch")}</th><td>{t("Marcada · 2026-10-05", "Marked · 2026-10-05")}</td><td>{t("Simulacros en verde: 26-09 (36264436020), 28-09 (36397668286) y 05-10 (37284177840). Solo afecta al agente. No pausa transferencias ni congela cuentas.", "Green drills: 2026-09-26 (36264436020), 2026-09-28 (36397668286), and 2026-10-05 (37284177840). It only affects the agent. It does not pause transfers or freeze accounts.")}</td></tr>
</tbody>
</table></div>
<h2>{t("Estados de un dato", "States of a fact")}</h2>
<ul class="clean">
<li>{t("Vacío: todavía no hay lectura. En Verify, el cuadro espera una dirección.", "Empty: there is no reading yet. On Verify, the box waits for an address.")}</li>
<li>{t("Cargando: «Comprobando». No es un resultado.", "Loading: “Checking”. It is not a result.")}</li>
<li>{t("Completo: la ficha tiene los campos verificados que muestra, con su hora.", "Complete: the card has the verified fields it shows, with its time.")}</li>
<li>{t("Parcial: la ficha existe y dice qué falta. La muestra de cuentas con tokens del 2026-10-08 está en no disponible. Eso no anula lo demás y no se rellena con cero.", "Partial: the card exists and says what is missing. The 2026-10-08 token account sample is unavailable. That does not cancel the rest and it is not filled in with zero.")}</li>
<li>{t("Error o no disponible: dirección no válida, sin ficha, o lectura que no responde. No hay semáforo verde.", "Error or unavailable: the address is not valid, there is no card, or the reading does not respond. There is no green light.")}</li>
</ul>
<p>{t("Si la cadena o un sello dejan de cuadrar, se desmarca y se explica aquí. Si una CI posterior falla en estos tests, se desmarca y se explica aquí. Si un simulacro sale en rojo, se desmarca y se explica aquí.", "If the chain or a timestamp stops matching, it is unmarked and explained here. If a later CI run fails these tests, it is unmarked and explained here. If a drill goes red, it is unmarked and explained here.")}</p>
<p>{t("Escáner de código prohibido. Busca funciones de firma o envío de transacciones: 0 hallazgos, como publicó la portada en producción. Esta página no ha vuelto a ejecutarlo.", "Forbidden-code scan. It looks for functions that sign or send transactions: 0 findings, as the production home page published. This page has not run it again.")}</p>
<p><a href="/verify/">{t("Probar esos estados en Verify", "Try those states in Verify")}</a></p>
"""


def tokenomics() -> str:
    return f"""
<h1 id="reparto">{t("Reparto del suministro", "Supply distribution")}</h1>
<p class="lede">{t("Foto fija. No es un precio, no es un contador en vivo y no es una recomendación.", "A fixed snapshot. It is not a price, it is not a live counter, and it is not a recommendation.")}</p>
{source("Solana, RPC público, getTokenSupply y getTokenAccountsByOwner, commitment finalized. Slots 452931336 a 452931342. Hora: 2026-10-03 14:18:52–14:18:53 (Madrid), publicada como 14:19. token.json supplyDistribution. Relectura el 2026-10-04 12:41 con las mismas cifras.", "Solana public RPC, getTokenSupply and getTokenAccountsByOwner, finalized commitment. Slots 452931336 to 452931342. Time: 2026-10-03 14:18:52–14:18:53 (Madrid), published as 14:19. token.json supplyDistribution. Read again on 2026-10-04 at 12:41 with the same figures.")}
<div class="tabla-scroll" tabindex="0"><table>
<caption>{t("1.000.000.000 STUBX. Las tres filas suman el suministro.", "1,000,000,000 STUBX. The three rows add up to the supply.")}</caption>
<thead><tr><th scope="col">{t("Dónde está", "Where it is")}</th><th scope="col">STUBX</th><th scope="col">%</th></tr></thead>
<tbody>
<tr><th scope="row">{t("Curva pública de Pump.fun", "Pump.fun public curve")}<br><code>{CURVE}</code></th><td>986.122.445,10</td><td>98,61 %</td></tr>
<tr><th scope="row">{t("Wallet creadora", "Creator wallet")}<br><code>{CREATOR}</code></th><td>5.272.727,23</td><td>0,53 %</td></tr>
<tr><th scope="row">{t("Wallet personal del creador", "Creator’s personal wallet")}<br><code>{PERSONAL}</code></th><td>8.604.827,67</td><td>0,86 %</td></tr>
</tbody>
<tfoot><tr><th scope="row">{t("Total", "Total")}</th><td>1.000.000.000,00</td><td>100,00 %</td></tr></tfoot>
</table></div>
<div class="bars" aria-hidden="true">
<div><div class="bar"><span style="width:98.61%"></span></div></div>
<div><div class="bar"><span style="width:0.53%"></span></div></div>
<div><div class="bar"><span style="width:0.86%"></span></div></div>
</div>
<p>{t("Las dos wallets del creador suman 13.877.554,90 STUBX (1,39 %). A esa hora eran todos los STUBX fuera de la curva: no había más cuentas con tokens. Los STUBX de la curva no están bloqueados ni reservados y no garantizan liquidez ni valor: están a la venta y salen o vuelven con cada compra o venta. Los del creador tampoco están bloqueados: puede venderlos en cualquier momento. Eso es un riesgo.", "The creator’s two wallets add up to 13,877,554.90 STUBX (1.39%). At that time they were all the STUBX outside the curve: there were no other token accounts. The STUBX on the curve are not locked or reserved and do not guarantee liquidity or value: they are for sale and leave or return with each buy or sale. The creator’s tokens are not locked either: the creator can sell them at any time. That is a risk.")}</p>
<h2>{t("Cómo se obtuvieron", "How they were acquired")}</h2>
<ul class="clean">
<li>{t(f"Wallet creadora {CREATOR}: unos 5,27 M, comprados al crear el token el 2026-09-23 por unos 0,15 SOL, en la curva pública.", f"Creator wallet {CREATOR}: about 5.27 M, bought when the token was created on 2026-09-23 for about 0.15 SOL, on the public curve.")}</li>
<li>{t(f"Wallet personal {PERSONAL}: unos 8,60 M, comprados el 2026-09-28 por unos 0,245 SOL. Transacción 4UJJjAnzvdUKTUQ5VPU8zWHBnHNG6wREndDaTcArZ9Lmwt1MJ7NqZuRX13QWe9aGms39QbHcsErFBPg5kFDs1L8d. Esa compra no se comunicó cuando se hizo; se corrigió el 2026-10-03.", f"Personal wallet {PERSONAL}: about 8.60 M, bought on 2026-09-28 for about 0.245 SOL. Transaction 4UJJjAnzvdUKTUQ5VPU8zWHBnHNG6wREndDaTcArZ9Lmwt1MJ7NqZuRX13QWe9aGms39QbHcsErFBPg5kFDs1L8d. That buy was not disclosed when it happened; it was corrected on 2026-10-03.")}</li>
<li>{t("Sin reserva de equipo, sin preventa, sin venta privada y sin tesorería de tokens. Sin vesting.", "No team reserve, no presale, no private sale, and no token treasury. No vesting.")}</li>
<li>{t("Autoridades de emisión y de congelación revocadas. Eso no hace el token más seguro ni dice nada de su valor.", "Mint and freeze authorities revoked. That does not make the token safer and it says nothing about its value.")}</li>
</ul>
<h2 id="transparencia">{t("Comisión de creador", "Creator fee")}</h2>
<p>{t("Pump.fun paga al creador una comisión por las operaciones del token. Cobros hasta el 2026-10-03: uno, de 0,0316 SOL, el 2026-09-23. Uso: la comisión pasó, junto con el resto del SOL de la wallet creadora, a wallets personales del creador y se mezcló con su dinero; no se usó por separado para el proyecto. Es un ingreso del creador: no se reparte entre las cuentas con tokens ni con nadie. El creador de STUBX cobra una comisión por cada operación. El reintegro del 2026-10-04 está en el movimiento de abajo.", "Pump.fun pays the creator a fee on the token’s trades. Fees collected through 2026-10-03: one payment of 0.0316 SOL, on 2026-09-23. Use: the fee, together with the rest of the SOL in the creator wallet, moved to the creator’s personal wallets and was mixed with their money; it was not used separately for the project. It is the creator’s income: it is not shared with token accounts or with anyone else. The creator of STUBX collects a fee on every trade. The 2026-10-04 reimbursement is in the movement below.")}</p>
<h2 id="wallets">{t("Wallet del proyecto", "Project wallet")}</h2>
<p><code>{PROJECT}</code></p>
<p>{t("0 STUBX el 2026-10-04 a las 12:24 (Madrid), slot 453228585. No forma parte del suministro ni del gráfico. Wallet normal, creada el 2026-10-04. La controla el creador y el SOL es suyo (no es multifirma). Solo se usa con SOL y solo paga costes del proyecto. No da derechos a nadie y no acepta aportaciones ni donaciones. Nunca tiene, compra ni vende STUBX. Cada movimiento se publica aquí en un máximo de 7 días, con la fecha, el importe, el motivo y la transacción. Si alguien envía SOL sin pedirlo, se devuelve a su origen en un máximo de 30 días, descontando la comisión de red. Los tokens que lleguen sin pedirlo no se tocan. Esta wallet no es la del agente: el agente sigue sin wallet.", "0 STUBX on 2026-10-04 at 12:24 (Madrid), slot 453228585. It is not part of the supply or of the chart. A normal wallet, created on 2026-10-04. It is controlled by the creator and the SOL is theirs (not a multisig). It is only used with SOL and it only pays project costs. It gives no rights to anyone and it does not accept contributions or donations. It never holds, buys, or sells STUBX. Each movement is published here within 7 days, with the date, the amount, the reason, and the transaction. If someone sends SOL without being asked, it is returned to its origin within 30 days, minus the network fee. Tokens that arrive unasked are left untouched. This wallet is not the agent’s: the agent still has no wallet.")}</p>
<p>{t("Movimiento publicado: 2026-10-04, entrada de 0,033020866 SOL desde la wallet personal. 0,031554107 SOL reintegran la comisión de creador del 2026-09-23. 0,001466759 SOL son del creador, para comisiones de red. Salidas: ninguna, en esa publicación. Transacción 4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy.", "Published movement: 2026-10-04, incoming 0.033020866 SOL from the personal wallet. 0.031554107 SOL reimburses the creator fee of 2026-09-23. 0.001466759 SOL is the creator’s, for network fees. Outgoing: none, in that publication. Transaction 4FhEmdch5DnDSN8BXfH7pFP2h9w8o2MdAMw16FcYxkLiaZ3BJEaqEhRf5e4rVPQxYGRt8oz2n3TDi5dzsL726KEy.")}</p>
<h2>{t("Reglas de las operaciones del creador", "Rules for the creator’s trades")}</h2>
<p>{t("El creador publica aquí todas sus wallets con STUBX y la cantidad de cada una. Cualquier compra, venta o traspaso suyo se comunica en @stubxai y aquí en un máximo de 24 horas, con la transacción, la cantidad, el SOL y la posición resultante. No opera con STUBX mientras prepara un anuncio no publicado, ni desde 24 horas antes hasta 24 horas después de un anuncio del proyecto o de un post con el enlace de negociación, ni para sostener o mover el precio, ni con compras y ventas de ida y vuelta. No anuncia planes de compra ni de venta.", "The creator publishes here every wallet that holds STUBX and the amount in each. Any buy, sale, or transfer of theirs is reported on @stubxai and here within 24 hours, with the transaction, the amount, the SOL, and the resulting position. They do not trade STUBX while preparing an unpublished announcement, nor from 24 hours before until 24 hours after a project announcement or a post with the trading link, nor to support or move the price, nor with round-trip buys and sales. They do not announce buy or sell plans.")}</p>
"""


def community() -> str:
    return f"""
<h1>{t("Comunidad", "Community")}</h1>
<p class="lede">{t("Se puede seguir y comentar sin comprar STUBX. No hay colaboradores anunciados: si no está confirmado aquí, no lo está.", "You can follow and comment without buying STUBX. There are no announced collaborators: if it is not confirmed here, it is not.")}</p>
{source("Canales de token.json official, 2026-10-05. No hay una lista de alianzas. Esta página no promete atención continua.", "Channels from token.json official, 2026-10-05. There is no list of partnerships. This page does not promise continuous attention.")}
<ul class="clean">
<li><a href="https://x.com/stubxai">@stubxai</a> — {t("canal principal. Los posts los prepara un agente distinto del repositorio, con textos aprobados antes. La cuenta se identifica como bot.", "main channel. Posts are prepared by an agent other than the repository one, from texts approved beforehand. The account identifies itself as a bot.")}</li>
<li><a href="https://t.me/stubxai">t.me/stubxai</a> — {t("solo anuncios.", "announcements only.")}</li>
<li><a href="https://farcaster.xyz/stubxai">Farcaster</a> · <a href="https://www.tiktok.com/@stubxai">TikTok</a></li>
<li><a href="mailto:stubxai.hq@gmail.com">stubxai.hq@gmail.com</a></li>
</ul>
<p>{t("No hay Discord. No hay atención 24 horas. Un mensaje directo no es soporte. Las normas antiestafa están en Seguridad.", "There is no Discord. There is no 24-hour support. A direct message is not support. The anti-scam rules are on Security.")}</p>
<p>{t("Los domingos, @stubxai puede destacar un meme de la comunidad, pidiendo permiso antes en una respuesta pública, con crédito. No hay premios, pagos ni tokens por hacer memes. Nadie escribirá por privado por un meme.", "@stubxai may highlight a community meme on Sundays, asking permission first in a public reply, with credit. There are no prizes, payments, or tokens for making memes. Nobody will write in private about a meme.")}</p>
<p><a href="/security/">{t("Lista cerrada y aviso de clones", "Closed list and clone notice")}</a> · <a href="/marca/">{t("Reglas del kit", "Kit rules")}</a></p>
"""


def marca() -> str:
    return f"""
<h1>{t("Marca", "Brand")}</h1>
<p class="lede">{t("Dos piezas ya aprobadas: el personaje y el logo que está en el token. Esta web no los sustituye. La interfaz usa la paleta de Verify (PR 14) para que las herramientas y las páginas se lean como un solo sitio.", "Two pieces already approved: the character and the logo that is on the token. This website does not replace them. The interface uses the Verify palette (PR 14) so the tools and the pages read as one site.")}</p>
<div class="pair">
<figure>
<img src="../logo/stubx-logo-256.png" width="256" height="256" alt="{html.escape("Agente Talón en el logo para agregadores: ticket rosa con gema verde, fondo oscuro. / Agente Talón on the aggregator logo: a pink ticket with a green gem on a dark background.")}">
<figcaption>{t("Logo para agregadores, 1024 px en logo/stubx-logo-1024.png. SHA-256 389982f374a4c057aba84833acd78938d90fc8871152271c5602501265d4216e. No sustituye al logo on-chain.", "Aggregator logo, 1024 px at logo/stubx-logo-1024.png. SHA-256 389982f374a4c057aba84833acd78938d90fc8871152271c5602501265d4216e. It does not replace the on-chain logo.")}</figcaption>
</figure>
<figure>
<img src="../onchain/logo-bafkreiew224xxf6ncagzzew5bfxlc6hejrib6jmxx66kxdrv5pkeoavd5e.png" width="256" height="256" alt="{html.escape("Logo pixel art grabado en el token STUBX, copia de los mismos bytes que el CID on-chain. / Pixel-art logo recorded in the STUBX token, a copy of the same bytes as the on-chain CID.")}">
<figcaption>{t("Logo on-chain, pixel art, copia de los mismos bytes. CID bafkreiew224xxf6ncagzzew5bfxlc6hejrib6jmxx66kxdrv5pkeoavd5e. SHA-256 96d6b97b97cd100d9c92dd096eb178e44c501f2597bfbcab8e35ebd44702a3e9. Inmutable.", "On-chain logo, pixel art, a copy of the same bytes. CID bafkreiew224xxf6ncagzzew5bfxlc6hejrib6jmxx66kxdrv5pkeoavd5e. SHA-256 96d6b97b97cd100d9c92dd096eb178e44c501f2597bfbcab8e35ebd44702a3e9. Immutable.")}</figcaption>
</figure>
</div>
<h2>{t("Cómo comprobar el logo y los metadatos on-chain", "How to check the logo and the on-chain metadata")}</h2>
<p>{t("Los metadatos del token son inmutables y apuntan a IPFS (ipfs.io). Ese gateway público está dejando de servir archivos a apps, así que algunas webs o wallets pueden mostrar un «?» en lugar del logo. La CA y el token no cambian por eso.", "The token metadata is immutable and points at IPFS (ipfs.io). That public gateway is phasing out serving files to apps, so some websites or wallets may show a “?” instead of the logo. The CA and the token do not change because of that.")}</p>
<p>{t("Cómo comprobarlo: el CID del logo aparece dentro de los metadatos del token (campo image) y el de los metadatos en su URI on-chain (visible en Solscan). Descarga el archivo y calcula su SHA-256 o su CID (ipfs add --only-hash --cid-version=1 --raw-leaves): debe coincidir. Un logo «oficial» que no coincida con estos archivos no es STUBX.", "How to check it: the logo CID appears inside the token metadata (image field) and the metadata CID is in its on-chain URI (visible on Solscan). Download the file and compute its SHA-256 or its CID (ipfs add --only-hash --cid-version=1 --raw-leaves): it must match. An “official” logo that does not match these files is not STUBX.")}</p>
<ul class="clean">
<li>{t("Logo on-chain, copia de los mismos bytes. CID bafkreiew224xxf6ncagzzew5bfxlc6hejrib6jmxx66kxdrv5pkeoavd5e. SHA-256 96d6b97b97cd100d9c92dd096eb178e44c501f2597bfbcab8e35ebd44702a3e9.", "On-chain logo, a copy of the same bytes. CID bafkreiew224xxf6ncagzzew5bfxlc6hejrib6jmxx66kxdrv5pkeoavd5e. SHA-256 96d6b97b97cd100d9c92dd096eb178e44c501f2597bfbcab8e35ebd44702a3e9.")} <a href="../onchain/logo-bafkreiew224xxf6ncagzzew5bfxlc6hejrib6jmxx66kxdrv5pkeoavd5e.png">{t("archivo", "file")}</a></li>
<li>{t("Metadatos on-chain, JSON, copia exacta. CID bafkreif7vy3etvfskxlszijzqu2ebavqphg7ji6n2wbmnznseti5s2rnc4. SHA-256 bfae3649d4b255d72ca13985344082b079cdf4a3cdd582c6e5b224d1d96a2d17.", "On-chain metadata, JSON, an exact copy. CID bafkreif7vy3etvfskxlszijzqu2ebavqphg7ji6n2wbmnznseti5s2rnc4. SHA-256 bfae3649d4b255d72ca13985344082b079cdf4a3cdd582c6e5b224d1d96a2d17.")} <a href="../onchain/metadata-bafkreif7vy3etvfskxlszijzqu2ebavqphg7ji6n2wbmnznseti5s2rnc4.json">JSON</a></li>
<li>{t("Única excepción: el logo para agregadores publicado en stubxai.com/logo/stubx-logo-1024.png (SHA-256 que empieza por 389982f3; el hash completo está en token.json y arriba). Es el mismo personaje, servido desde stubxai.com para las webs que no cargan IPFS. La CA y los metadatos on-chain no cambian.", "The only exception: the aggregator logo published at stubxai.com/logo/stubx-logo-1024.png (SHA-256 starting with 389982f3; the full hash is in token.json and above). It is the same character, served from stubxai.com for websites that do not load IPFS. The CA and the on-chain metadata do not change.")}</li>
</ul>
<h2>{t("Personaje", "Character")}</h2>
<p>{t("Un ticket rosa en pixel art, borde perforado, ojos cuadrados, boca recta y una gema verde. Seco y escéptico. La gema significa que el prototipo está en pie. No significa «aprobado para invertir». Lema: No stub, no story.", "A pink pixel-art ticket, perforated edge, square eyes, a straight mouth, and a green gem. Dry and skeptical. The gem means the prototype is standing. It does not mean “approved for investment”. Motto: No stub, no story.")}</p>
<h2>{t("Paleta de la interfaz", "Interface palette")}</h2>
<p>{t("Fondo #071422, panel #10243f, texto #f4f7fb, línea #8eaccf, acento #ff2d6f. Es la paleta de los borradores de Verify y Lab (PR 14, 2026-10-09), para que el semáforo y las páginas usen los mismos componentes. El kit de memes v0.2 conserva sus propios colores: rosa #fb437f, esmeralda #1beb91, azul noche #05122e.", "Background #071422, panel #10243f, text #f4f7fb, line #8eaccf, accent #ff2d6f. It is the palette of the Verify and Lab drafts (PR 14, 2026-10-09), so the traffic light and the pages use the same components. The meme kit v0.2 keeps its own colors: pink #fb437f, emerald #1beb91, night blue #05122e.")}</p>
<h2>{t("Kit de memes 0.2 · 2026-09-27", "Meme kit 0.2 · 2026-09-27")}</h2>
<p><a href="../kit/stubx-kit-memes-v0.2.zip">{t("Descargar el zip (2,9 MB)", "Download the zip (2.9 MB)")}</a>. SHA-256 799e0371bdfd4619d61d9e29206ca7eb020e78a01981bb11e73a412405091461. {t("28 archivos. Licencia propia dentro del zip (LICENCIA.md). Las fuentes Silkscreen e Inter van con SIL OFL 1.1. El código del agente es MIT.", "28 files. Its own license inside the zip (LICENCIA.md). The Silkscreen and Inter fonts ship with SIL OFL 1.1. The agent code is MIT.")}</p>
<p>{t("Plantillas: T01 Pide el talón, T02 Talón opina, T05 Escalera de pruebas, T06 Ticket PPM, T07 Reacción, T08 Glosario Talón.", "Templates: T01 Pide el talón, T02 Talón opina, T05 Escalera de pruebas, T06 Ticket PPM, T07 Reacción, T08 Glosario Talón.")}</p>
<h2 id="reglas">{t("Reglas del kit", "Kit rules")}</h2>
<h3>{t("Sí", "Yes")}</h3>
<ul class="clean">
<li>{t("Humor sobre pruebas, transparencia y agentes de IA.", "Humor about proofs, transparency, and AI agents.")}</li>
<li>{t("Consejos antiestafa: leer el handle entero y no firmar lo que no se entiende.", "Anti-scam advice: read the whole handle and do not sign what you do not understand.")}</li>
<li>{t("Usar a Talón tal cual y publicar desde tu cuenta.", "Use Talón as-is and post from your own account.")}</li>
</ul>
<h2>{t("No", "No")}</h2>
<ul class="clean">
<li>{t("Precio, subidas, «100x», cohetes, lunas ni llamadas a comprar o vender.", "Price, pumps, “100x”, rockets, moons, or calls to buy or sell.")}</li>
<li>{t("Poner la CA en un meme. La única CA está en esta web y en @stubxai.", "Putting the CA in a meme. The only CA is on this website and on @stubxai.")}</li>
<li>{t("Hacerse pasar por STUBX o usar el avatar como foto de un perfil.", "Impersonating STUBX or using the avatar as a profile photo.")}</li>
<li>{t("Sorteos, airdrops, whitelists o pedir dinero, datos o firmas.", "Giveaways, airdrops, whitelists, or asking for money, data, or signatures.")}</li>
<li>{t("No ataques a personas ni proyectos reales por su nombre, y nada ofensivo o ilegal.", "Do not attack real people or projects by name, and nothing offensive or illegal.")}</li>
</ul>
<p>{t("Puedes descargar el kit y usarlo y adaptarlo para memes y contenido de fans sin ánimo de lucro, gratis y sin pedir permiso, si cumples las reglas de arriba. No puedes venderlo ni usarlo en anuncios, productos o promociones de pago sin permiso por escrito de STUBX (desde stubxai.hq@gmail.com o en una respuesta pública de @stubxai). Esta licencia no te hace socio ni representante de STUBX, no es una licencia de marca y no da derecho a nada (tokens, pagos ni acceso). El kit se ofrece tal cual, sin garantías, y el permiso se puede retirar; si alguien incumple las reglas, su permiso termina. Texto completo: LICENCIA.md, dentro del zip.", "You can download the kit and use and adapt it for non-commercial fan memes and content, free and without asking permission, if you follow the rules above. You cannot sell it or use it in ads, products, or paid promotions without written permission from STUBX (from stubxai.hq@gmail.com or in a public reply from @stubxai). This license does not make you a partner or a representative of STUBX, it is not a trademark license, and it grants no right to anything (tokens, payments, or access). The kit is offered as-is, with no warranties, and permission can be withdrawn; if someone breaks the rules, their permission ends. Full text: LICENCIA.md, inside the zip.")}</p>
<p>{t("El zip incluye además ejemplos rellenados, el avatar en 1080 px, la cabecera con aviso (solo para artículos), las fuentes con su licencia y un README con instrucciones. Avatar oficial: PNG 512 px y JPG 1080 px, dentro del kit.", "The zip also includes filled-in examples, the avatar at 1080 px, the header with the notice (for articles only), the fonts with their license, and a README with instructions. Official avatar: PNG 512 px and JPG 1080 px, inside the kit.")}</p>
<p>{t("No hay concursos, premios, pagos ni tokens por hacer memes. Nadie de STUBX te escribirá por mensaje privado por tu meme. Si pasa, es una estafa: no respondas, no abras enlaces y no firmes nada.", "There are no contests, prizes, payments, or tokens for making memes. Nobody from STUBX will write to you in a private message about your meme. If that happens, it is a scam: do not reply, do not open links, and do not sign anything.")}</p>
"""


def build_page() -> str:
    return f"""
<h1>{t("Versiones", "Versions")}</h1>
<p class="lede">{t("Lo hecho lleva fecha. Lo que sigue es un objetivo: puede cambiar y no es una promesa. No incluye precios, listados ni liquidez.", "What is done has a date. What follows is a target: it can change and it is not a promise. It does not include prices, listings, or liquidity.")}</p>
{source("Lista de la portada en producción, con las fechas que esa página ya publicaba el 2026-10-05.", "List from the production home page, with the dates that page already published on 2026-10-05.")}
<h2>{t("Hecho", "Done")}</h2>
<ul class="clean">
<li>{t("2026-09-23. Token creado. Autoridades de emisión y de congelación revocadas.", "2026-09-23. Token created. Mint and freeze authorities revoked.")}</li>
<li>{t("2026-09-26. Repositorio público, tests, límites y primer simulacro del kill-switch.", "2026-09-26. Public repository, tests, limits, and the first kill-switch drill.")}</li>
<li>{t("2026-09-26 a 2026-10-03. Registro diario del workflow, en los días que LOGS.md y la portada ya contaron.", "2026-09-26 to 2026-10-03. Daily workflow log, on the days LOGS.md and the home page already counted.")}</li>
<li>{t("2026-09-28. Primer simulacro semanal programado en verde. Dominio stubxai.com registrado.", "2026-09-28. First scheduled weekly drill passed. Domain stubxai.com registered.")}</li>
<li>{t("Octubre 2026. stubxai.com es la web oficial y www.stubxai.com ya va a Cloudflare Pages. Netlify solo redirige superb-horse-9036f5.netlify.app con 301.", "October 2026. stubxai.com is the official website and www.stubxai.com already goes to Cloudflare Pages. Netlify only redirects superb-horse-9036f5.netlify.app with a 301.")}</li>
<li>{t("2026-10-03. Revisión manual de la parte técnica de la PPM. Ninguna casilla marcada todavía ese día.", "2026-10-03. Manual review of the technical part of the PPM. No box marked yet that day.")}</li>
<li>{t("2026-10-05. Casillas Logs, Límites y Kill-switch marcadas. Wallet del agente pasa a no aplica. En la portada en producción este punto seguía en la lista de objetivos aunque el texto ya decía que estaba marcado: aquí queda en hecho, con los mismos hechos.", "2026-10-05. Logs, Limits, and Kill-switch boxes marked. The agent wallet becomes not applicable. On the production home page this item was still in the target list even though the sentence already said it was marked: here it sits under done, with the same facts.")}</li>
</ul>
<h2>{t("Objetivo, no promesa", "Target, not a promise")}</h2>
<ul class="clean">
<li>{t("Proteger más el repositorio: rama principal con reglas y enlace a la web. Preparado, sin aplicar, según la portada del 2026-10-05.", "Protect the repository further: main branch rules and a link to the website. Prepared, not applied, according to the home page of 2026-10-05.")}</li>
<li>{t("Hitos pequeños con problema, cambio, prueba, límites y una captura con fecha.", "Small milestones with a problem, a change, a proof, limits, and a dated screenshot.")}</li>
</ul>
<p>{t("El tablero de producto, con lo que está en revisión y lo que sigue en propuesta, es otra página. No mezcla estas fechas con esas fichas.", "The product board, with what is in review and what is still a proposal, is another page. It does not mix these dates with those cards.")}</p>
<p><a href="/tablero/">{t("Abrir el tablero", "Open the board")}</a></p>
"""


def avances() -> str:
    return f"""
<h1>{t("Avances", "Progress")}</h1>
<p>{t("El plan del 2026-10-09 llamó /avances al tablero. En esta vista previa el tablero está en Tablero, con el mismo registro. No hay un segundo tablero.", "The 2026-10-09 plan called the board /avances. In this preview the board is on Board, with the same record. There is not a second board.")}</p>
<p><a class="primary" href="/tablero/">{t("Abrir el tablero", "Open the board")}</a></p>
"""


def comparar() -> str:
    return f"""
<h1>{t("Ejemplo de una curva", "Curve example")}</h1>
<p><strong>{t("Ejemplo educativo. No es una comparación de calidad, ni una recomendación, ni un aval. STUBX no tiene relación con ningún token de este ejemplo.", "Educational example. It is not a quality comparison, a recommendation, or an endorsement. STUBX has no relationship with any token in this example.")}</strong></p>
<p class="lede">{t("Ejemplo hipotético, no leído de la cadena. Fecha del ejemplo: 2026-10-10.", "Hypothetical example, not read from the chain. Example date: 2026-10-10.")}</p>
<p>{t("Una curva abierta junta dos cantidades virtuales: la de la moneda del token y la de SOL. Si una se mueve, la otra se mueve en el sentido contrario. Esta página no calcula ese movimiento.", "An open curve pairs two virtual amounts: the token currency and SOL. If one moves, the other moves the other way. This page does not calculate that move.")}</p>
<p>{t("Cuando la curva está completa, ese paso ya no cabe. Si no hay curva, no hay cantidades que mostrar. Aquí las cantidades son redondas y de ejemplo.", "When the curve is complete, that step no longer fits. If there is no curve, there are no amounts to show. Here the amounts are round numbers, and they are an example.")}</p>
<h2>{t("Cantidades del ejemplo", "Amounts in the example")}</h2>
<dl>
<dt>{t("Estado", "State")}</dt><dd>{t("abierta", "open")}</dd>
<dt>{t("Moneda base", "Base currency")}</dt><dd>SOL</dd>
<dt>{t("Cantidad virtual de la moneda del token", "Virtual amount of the token currency")}</dt><dd>1 000 000</dd>
<dt>{t("Cantidad virtual de SOL", "Virtual amount of SOL")}</dt><dd>30</dd>
<dt>{t("Cantidad real de la moneda del token", "Real amount of the token currency")}</dt><dd>800 000</dd>
<dt>{t("Cantidad real de SOL", "Real amount of SOL")}</dt><dd>4</dd>
</dl>
<p>{t("Estos números no salen de ninguna dirección. No son una cotización.", "These numbers do not come from any address. They are not a quote.")}</p>
<p>{t("No conecta carteras, no firma y no envía.", "It does not connect a wallet, it does not sign, and it does not send.")}</p>
"""


def pares() -> str:
    origins = " y ".join(rpc_origins())
    origins_en = " and ".join(rpc_origins())
    return f"""
<h1>{t("Lectura de la curva", "Curve reading")}</h1>
<p class="lede">{t("Pega cualquier mint de Solana. Si hay una curva de Pump.fun, verás la moneda base y el estado de la curva, tal como están en la cadena. Si no hay curva, la página lo dice.", "Paste any Solana mint. If there is a Pump.fun curve, you see the base currency and the curve state, as they are on chain. If there is no curve, the page says so.")}</p>
<p><strong>{t("Lectura de datos públicos. No es una comparación de calidad, ni una recomendación, ni un aval. STUBX no tiene relación con estos tokens salvo la CA oficial.", "Public data reading. It is not a quality comparison, a recommendation, or an endorsement. STUBX has no relationship with these tokens except the official CA.")}</strong></p>
<p><span class="lang es" lang="es">No es una auditoría ni una recomendación. Muestra datos públicos de la cadena en el momento indicado; no dice si un token es bueno, seguro o una buena compra.</span><span class="lang en" lang="en">It is not an audit or a recommendation. It shows public chain data at the stated time; it does not say whether a token is good, safe, or a good purchase.</span></p>
<p>{t("Escribir una dirección no avala ese token. No conecta carteras, no firma y no envía.", "Writing an address does not endorse that token. It does not connect a wallet, it does not sign, and it does not send.")}</p>
<p>{t("Un emparejamiento no es una colaboración ni un respaldo.", "A pairing is not a collaboration or an endorsement.")}</p>
{source(
    f"La lectura usa primero {origins}. Si el primero no responde, prueba el siguiente. Esos servicios reciben la dirección y la IP según sus condiciones. Esta página no escribe el Cuaderno. El enlace de metadatos se muestra como texto y no se abre.",
    f"The read uses {origins_en}, in that order. If the first one does not answer, it tries the next. Those services receive the address and the IP under their own terms. This page does not write the Notebook. The metadata link is shown as text and is not opened.",
)}
<form id="consulta" class="consulta" action="#">
<label for="direccion-token">{t("Dirección del token", "Token address")}</label>
<input id="direccion-token" name="direccion" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">
<button type="submit">{t("Leer", "Read")}</button>
<button type="button" id="exportar" hidden>{t("Exportar ficha", "Export card")}</button>
</form>
<section id="resultado" class="resultado" tabindex="-1" aria-live="polite">
<h2>{t("El informe aparece aquí", "The report shows up here")}</h2>
<p>{t("Si falta un dato, no se rellena con cero. No se inventa ningún dato.", "If a fact is missing, it is not filled in with zero. No data is invented.")}</p>
</section>
"""


def contribuir() -> str:
    fallo = "https://github.com/stubxai/stubx-agent/issues/new?template=informe-fallo.yml"
    mejora = "https://github.com/stubxai/stubx-agent/issues/new?template=mejora.yml"
    cambios = "https://github.com/stubxai/stubx-agent/compare"
    politica = "https://github.com/stubxai/stubx-agent/security/policy"
    return f"""
<h1>{t("Contribuir", "Contribute")}</h1>
<p class="lede">{t("Ayuda a mejorar las herramientas de este repositorio. Sirve un error que otra persona pueda repetir, un texto confuso, una traducción revisable o una prueba de accesibilidad. Cualquier token de Solana puede ser el ejemplo del fallo.", "Help improve the tools in this repository. A useful report is a bug someone else can repeat, confusing text, a translation that can be reviewed, or an accessibility check. Any Solana token can be the example of the bug.")}</p>
<p>{t("Escribir una dirección no dice que ese token sea bueno, seguro o esté avalado. STUBX solo publica una CA oficial, y está en el pie de esta web.", "Writing an address does not say that token is good, safe, or endorsed. STUBX publishes one official CA, and it is in the footer of this website.")}</p>
<p><strong>{t("No es una auditoría ni una recomendación.", "This is not an audit or a recommendation.")}</strong></p>
<h2>{t("Qué se acepta", "What is accepted")}</h2>
<ul class="clean">
<li>{t("Un fallo con pasos para repetirlo.", "A bug with steps to repeat it.")}</li>
<li>{t("Una explicación que no se entiende.", "An explanation that is hard to follow.")}</li>
<li>{t("Una traducción para revisar.", "A translation to review.")}</li>
<li>{t("Una prueba de accesibilidad: teclado, texto grande o lector de pantalla.", "An accessibility check: keyboard, large text, or a screen reader.")}</li>
</ul>
<h2>{t("Qué no se acepta", "What is not accepted")}</h2>
<ul class="clean">
<li>{t("Encargos de compra, de volumen o de promoción.", "Requests to buy, to add volume, or to promote.")}</li>
<li>{t("Semilla, clave privada, correo personal o nombre real.", "A seed, a private key, a personal email, or a real name.")}</li>
<li>{t("Pedir pago, tokens, recompensas o una parte del proyecto. Contribuir no da derecho a nada de eso. Si lo pides en el texto, un comentario público puede citar solo tu usuario de GitHub.", "Asking for payment, tokens, rewards, or a share of the project. Contributing gives no right to any of that. If you ask in the text, a public comment can cite only your GitHub username.")}</li>
</ul>
<h2>{t("Cómo enviarlo", "How to send it")}</h2>
<p>{t("Esta página no tiene formulario y no guarda nada. No pide una cuenta de STUBX. GitHub pide su propia sesión para abrir el issue o la propuesta; STUBX no recibe esa sesión. Si el formulario de GitHub no carga, copia la plantilla de abajo en un issue nuevo.", "This page has no form and stores nothing. It does not ask for a STUBX account. GitHub asks for its own session to open the issue or the proposal; STUBX does not receive that session. If the GitHub form does not load, paste the template below into a new issue.")}</p>
<p>{t("Un issue o una propuesta de cambio es público. Lo que escribas, y tu usuario, quedan en GitHub según sus condiciones y su política de privacidad.", "An issue or a change proposal is public. What you write, and your username, stay on GitHub under its terms and privacy policy.")}</p>
<p>{t("Al enviar una propuesta de cambio, aceptas que se publique con la licencia MIT del repositorio. Las imágenes y el kit con licencia propia no entran: si aportas imágenes, di qué licencia tienen.", "By sending a change proposal, you agree that it is published under the repository's MIT license. Images and a kit with its own license are excluded: if you contribute images, say which license they have.")}</p>
<div class="btn-row">
<a class="primary" href="{fallo}">{t("Informar un fallo", "Report a bug")}</a>
<a href="{mejora}">{t("Proponer una mejora", "Suggest an improvement")}</a>
<a href="{cambios}">{t("Abrir una propuesta de cambio", "Open a change proposal")}</a>
<a href="/contribuir/plantilla.md">{t("Descargar la plantilla", "Download the template")}</a>
</div>
<h2>{t("Qué hay que incluir", "What to include")}</h2>
<ul class="clean">
<li>{t("Versión: el número de package.json o la fecha de la página.", "Version: the package.json number or the date of the page.")}</li>
<li>{t("Pasos, resultado esperado y resultado observado.", "Steps, the expected result, and the observed result.")}</li>
<li>{t("Evidencia: el texto del error o qué se ve en pantalla. Sin claves.", "Evidence: the error text or what is on screen. No keys.")}</li>
<li>{t("Dirección del token, solo si hace falta para repetir el fallo.", "The token address, only if it is needed to repeat the bug.")}</li>
</ul>
<h2>{t("Cómo se revisa", "How review works")}</h2>
<p>{t("El registro es el issue de GitHub. Esta web no guarda una copia ni asigna un revisor aquí. El equipo escribe el estado en un comentario:", "The record is the GitHub issue. This website does not keep a copy and does not assign a reviewer here. The team writes the state in a comment:")}</p>
<ul class="clean">
<li>{t("Recibida: el issue está abierto y todavía no hay comentario.", "Received: the issue is open and there is no comment yet.")}</li>
<li>{t("Pendiente: un comentario dice que se está revisando.", "Pending: a comment says it is being reviewed.")}</li>
<li>{t("Aceptada: el cambio ya está en el repositorio.", "Accepted: the change is already in the repository.")}</li>
<li>{t("Duplicada: el comentario señala otro issue igual y este se cierra.", "Duplicate: the comment points to an identical issue and this one is closed.")}</li>
</ul>
<p>{t("No hay un plazo. Un envío no se acepta por ser largo o por repetirse.", "There is no deadline. A submission is not accepted because it is long or because it is repeated.")}</p>
<h2>{t("Si el fallo es sensible", "If the bug is sensitive")}</h2>
<p>{t("No abras un issue público con el detalle. Escribe a", "Do not open a public issue with the detail. Write to")} <a href="mailto:stubxai.hq@gmail.com">stubxai.hq@gmail.com</a> {t("o lee la", "or read the")} <a href="{politica}">{t("política de seguridad", "security policy")}</a>. {t("No envíes semilla ni claves. No hay pago por informar.", "Do not send a seed or keys. There is no payment for a report.")}</p>
<p class="source">{t("Plantillas del repositorio: .github/ISSUE_TEMPLATE/ y .github/PULL_REQUEST_TEMPLATE.md. La plantilla descargable no llega a ningún servidor de esta web.", "Repository templates: .github/ISSUE_TEMPLATE/ and .github/PULL_REQUEST_TEMPLATE.md. The downloadable template is not sent to any server on this website.")}</p>
"""


def slot(title_es: str, title_en: str, body_es: str, body_en: str, anchor: str) -> str:
    return f"""
<article class="slot">
<p class="estado-pill">{t("No construido · 2026-10-09", "Not built · 2026-10-09")}</p>
<h1>{t(title_es, title_en)}</h1>
<p>{t(body_es, body_en)}</p>
<p>{t("No hay botón de crear, guardar, exportar ni enviar. Cuando exista, usará esta navegación y estos estilos.", "There is no create, save, export, or send button. When it exists, it will use this navigation and these styles.")}</p>
<p><a href="/tablero/#{anchor}">{t("Registro en el tablero", "Record on the board")}</a></p>
</article>
"""


def md_section(text: str) -> str:
    es, en = text.split("## English", 1)
    es = es.split("## Español", 1)[-1].strip()

    def block(chunk: str, lang: str) -> str:
        parts = []
        for para in re.split(r"\n\s*\n", chunk.strip()):
            line = html.escape(para.strip())
            line = re.sub(r"`([^`]+)`", r"<code>\1</code>", line)
            if not line:
                continue
            parts.append(f"<p>{line}</p>")
        klass = "es" if lang == "es" else "en"
        return f'<div class="lang {klass}" lang="{lang}">{"".join(parts)}</div>'

    return block(es, "es") + block(en, "en")


def aprender() -> str:
    # Texto de la biblioteca escrito para cualquier token. No sale del glosario JSON:
    # regenerar la página tiene que dejar el mismo HTML que está en main.
    return """<h1><span class="lang es" lang="es">Aprender</span><span class="lang en" lang="en">Learn</span></h1>
<p class="lede"><span class="lang es" lang="es">Glosario y tres guías para leer cualquier token de Solana. Es texto estático: esta página no llama a la red.</span><span class="lang en" lang="en">A glossary and three guides for reading any Solana token. It is static text: this page does not call the network.</span></p>
<p class="source"><span class="lang es" lang="es">Inglés: pendiente de revisión humana. Si una frase no coincide, manda el español.</span><span class="lang en" lang="en">English: pending human review. If a sentence does not match, the Spanish version prevails.</span></p>
<p class="nota"><span class="lang es" lang="es">No es una auditoría ni una recomendación. Muestra cómo leer datos públicos; no dice si un token es bueno, seguro o una buena compra.</span><span class="lang en" lang="en">It is not an audit or a recommendation. It shows how to read public data; it does not say whether a token is good, safe, or a good purchase.</span></p>
<p><span class="lang es" lang="es">El único ejemplo con un token real es la dirección oficial de STUBX:</span><span class="lang en" lang="en">The only example that uses a real token is the official STUBX address:</span> <code>TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump</code></p>
<nav class="ayuda-terminos" aria-label="Guías / Guides">
<a href="#guia-identificar"><span class="lang es" lang="es">Identificar un token</span><span class="lang en" lang="en">Identify a token</span></a>
<a href="#guia-permisos"><span class="lang es" lang="es">Permisos y extensiones</span><span class="lang en" lang="en">Permissions and extensions</span></a>
<a href="#guia-liquidez"><span class="lang es" lang="es">Curva y liquidez</span><span class="lang en" lang="en">Curve and liquidity</span></a>
<a href="/verify/"><span class="lang es" lang="es">Pruébalo en Verify</span><span class="lang en" lang="en">Try it in Verify</span></a>
<a href="/lab/"><span class="lang es" lang="es">Misión de Lab</span><span class="lang en" lang="en">Lab mission</span></a>
<a href="/cuaderno/"><span class="lang es" lang="es">Abrir el cuaderno</span><span class="lang en" lang="en">Open the notebook</span></a>
</nav>

<h2><span class="lang es" lang="es">Glosario</span><span class="lang en" lang="en">Glossary</span></h2>
<div class="grid-2">

<article class="card" id="direccion"><h3><span class="lang es" lang="es">Dirección del mint</span><span class="lang en" lang="en">Mint address</span></h3>
<p><span class="lang es" lang="es">Es la cuenta que identifica ese token en Solana. El nombre y el símbolo son textos aparte: dos tokens pueden llamarse igual y ser direcciones distintas.</span><span class="lang en" lang="en">It is the account that identifies that token on Solana. The name and the symbol are separate text: two tokens can share a name and still be different addresses.</span></p>
<p><span class="lang es" lang="es">Ejemplo. La dirección oficial de STUBX es TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump. Otra dirección, aunque el nombre se parezca, no es esta.</span><span class="lang en" lang="en">Example. The official STUBX address is TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump. Another address, even if the name looks similar, is not this one.</span></p>
<p><span class="lang es" lang="es">No permite concluir: no dice quién es una persona ni si conviene hacer nada con el token.</span><span class="lang en" lang="en">It does not let you conclude: it does not name a person, and it does not say that any action with the token is advisable.</span></p>
</article>

<article class="card" id="registro"><h3><span class="lang es" lang="es">Registro curado</span><span class="lang en" lang="en">Curated registry</span></h3>
<p><span class="lang es" lang="es">Lista local con la que Verify compara el mint de STUBX. Hoy incluye la dirección oficial. Que otra dirección no esté en la lista no es una acusación.</span><span class="lang en" lang="en">A local list Verify uses when it compares the STUBX mint. Today it includes the official address. Another address being absent from the list is not an accusation.</span></p>
<p><span class="lang es" lang="es">Ejemplo. Si pegas la dirección oficial, Verify puede decir que coincide con el registro. Si pegas otra, puede decir que no es la dirección oficial de STUBX.</span><span class="lang en" lang="en">Example. If you paste the official address, Verify can say it matches the registry. If you paste another one, it can say it is not the official STUBX address.</span></p>
<p><span class="lang es" lang="es">No permite concluir: estar en el registro no es una auditoría. No estar tampoco dice que un token ajeno sea bueno o malo.</span><span class="lang en" lang="en">It does not let you conclude: being in the registry is not an audit. Being absent also does not say that someone else’s token is good or bad.</span></p>
</article>

<article class="card" id="autoridad-emision"><h3><span class="lang es" lang="es">Autoridad de emisión</span><span class="lang en" lang="en">Mint authority</span></h3>
<p><span class="lang es" lang="es">Permiso para aumentar el suministro de ese mint. Revocada, si el campo está verificado, significa que ese permiso figura vacío en esa lectura. Activa significa que sigue asignado a una dirección.</span><span class="lang en" lang="en">Permission to increase the supply of that mint. Revoked, when the field is verified, means that permission is recorded as empty in that reading. Active means it is still assigned to an address.</span></p>
<p><span class="lang es" lang="es">Ejemplo. En la ficha oficial de STUBX del 2026-10-09 este permiso está revocado. Un ejemplo hipotético, no leído de la cadena: otro token puede tenerlo activo.</span><span class="lang en" lang="en">Example. On the official STUBX card from 2026-10-09 this permission is revoked. A hypothetical example, not read from the chain: another token can have it active.</span></p>
<p><span class="lang es" lang="es">No permite concluir: que el permiso de emisión esté revocado no impide que el precio baje y no predice la demanda ni la liquidez. Un campo no disponible no se rellena como revocada.</span><span class="lang en" lang="en">It does not let you conclude: a revoked mint authority does not stop the price from falling, and it does not predict demand or liquidity. An unavailable field is not filled in as revoked.</span></p>
</article>

<article class="card" id="autoridad-congelacion"><h3><span class="lang es" lang="es">Autoridad de congelación</span><span class="lang en" lang="en">Freeze authority</span></h3>
<p><span class="lang es" lang="es">Permiso para congelar cuentas de ese token. Es distinto del permiso de emisión. Revocada lo quita en esa lectura. Activa lo deja asignado.</span><span class="lang en" lang="en">Permission to freeze accounts of that token. It is different from mint authority. Revoked removes it in that reading. Active leaves it assigned.</span></p>
<p><span class="lang es" lang="es">Ejemplo. En la misma ficha oficial de STUBX, este permiso también está revocado. Eso describe esa lectura, no todos los tokens.</span><span class="lang en" lang="en">Example. On the same official STUBX card, this permission is also revoked. That describes that reading, not every token.</span></p>
<p><span class="lang es" lang="es">No permite concluir: no es una garantía ni una prueba de identidad. Que no haya este permiso no impide otras limitaciones del token.</span><span class="lang en" lang="en">It does not let you conclude: it is not a guarantee or proof of identity. The absence of this permission does not rule out other restrictions on the token.</span></p>
</article>

<article class="card" id="metadatos-mutables"><h3><span class="lang es" lang="es">Metadatos mutables</span><span class="lang en" lang="en">Mutable metadata</span></h3>
<p><span class="lang es" lang="es">Si is_mutable es verdadero, el nombre, el símbolo o la imagen pueden cambiar después. «No» describe esa cuenta en esa hora.</span><span class="lang en" lang="en">If is_mutable is true, the name, the symbol, or the image can change later. “No” describes that account at that time.</span></p>
<p><span class="lang es" lang="es">Ejemplo. La ficha oficial de STUBX los deja como no mutables en las fuentes leídas. El nombre sigue siendo texto: no sustituye a la dirección.</span><span class="lang en" lang="en">Example. The official STUBX card records them as not mutable in the sources read. The name is still text: it does not replace the address.</span></p>
<p><span class="lang es" lang="es">No permite concluir: que no se puedan cambiar no demuestra legitimidad. Que se puedan cambiar no es, por sí solo, una suplantación.</span><span class="lang en" lang="en">It does not let you conclude: that they cannot be changed does not show legitimacy. That they can be changed is not, by itself, impersonation.</span></p>
</article>

<article class="card" id="desconocido"><h3><span class="lang es" lang="es">Desconocido y no disponible</span><span class="lang en" lang="en">Unknown and unavailable</span></h3>
<p><span class="lang es" lang="es">No disponible significa que esa llamada no dejó un dato utilizable. Desconocido es lo que no se leyó. Ninguno de los dos es un cero.</span><span class="lang en" lang="en">Unavailable means that call did not leave a usable fact. Unknown is what was not read. Neither one is a zero.</span></p>
<p><span class="lang es" lang="es">Ejemplo. Si el lector responde HTTP 429 o se agota el tiempo, la ficha queda parcial y anota la hora. No inventa un suministro.</span><span class="lang en" lang="en">Example. If the reader returns HTTP 429 or the time runs out, the card stays partial and records the time. It does not invent a supply.</span></p>
<p><span class="lang es" lang="es">No permite concluir: no se convierte en autoridad revocada, en metadatos inmutables ni en cantidad cero.</span><span class="lang en" lang="en">It does not let you conclude: it does not become a revoked authority, immutable metadata, or a zero amount.</span></p>
</article>

<article class="card" id="curva-pump"><h3><span class="lang es" lang="es">Curva de Pump.fun</span><span class="lang en" lang="en">Pump.fun curve</span></h3>
<p><span class="lang es" lang="es">Cuenta derivada. Si su programa es el de la curva, se leen campos públicos. Si no hay curva, no se rellenan esas cantidades con cero.</span><span class="lang en" lang="en">A derived account. If its program is the curve program, public fields are read. If there is no curve, those amounts are not filled in with zero.</span></p>
<p><span class="lang es" lang="es">Ejemplo. La dirección oficial de STUBX tiene una cuenta de curva en la ficha del 2026-10-09. Un token que no use esa curva deja el campo en no aplica.</span><span class="lang en" lang="en">Example. The official STUBX address has a curve account on the 2026-10-09 card. A token that does not use that curve leaves the field as not applicable.</span></p>
<p><span class="lang es" lang="es">No permite concluir: el avance no dice qué hacer. Esta página no simula un intercambio.</span><span class="lang en" lang="en">It does not let you conclude: progress does not say what to do. This page does not simulate a swap.</span></p>
</article>

<article class="card" id="reserva-real"><h3><span class="lang es" lang="es">Cantidad real de la curva</span><span class="lang en" lang="en">Real curve amount</span></h3>
<p><span class="lang es" lang="es">Campo real de la cuenta de la curva, en unidades mínimas. Es distinto de la cantidad virtual.</span><span class="lang en" lang="en">The real field of the curve account, in base units. It is different from the virtual amount.</span></p>
<p><span class="lang es" lang="es">Ejemplo. En la ficha oficial se muestra como un entero leído, no como un saldo que esta página calcule como retirable.</span><span class="lang en" lang="en">Example. On the official card it is shown as an integer that was read, not as a balance this page treats as withdrawable.</span></p>
<p><span class="lang es" lang="es">No permite concluir: no es una auditoría de fondos. Si el campo no está, no se inventa un cero.</span><span class="lang en" lang="en">It does not let you conclude: it is not an audit of funds. If the field is absent, a zero is not invented.</span></p>
</article>

<article class="card" id="reserva-virtual"><h3><span class="lang es" lang="es">Cantidad virtual de la curva</span><span class="lang en" lang="en">Virtual curve amount</span></h3>
<p><span class="lang es" lang="es">Campo virtual de la misma cuenta. Sirve al cálculo de la curva y no es la cantidad real.</span><span class="lang en" lang="en">The virtual field of the same account. It is used by the curve calculation and it is not the real amount.</span></p>
<p><span class="lang es" lang="es">Ejemplo. La ficha oficial enseña la cantidad virtual y la real como números distintos.</span><span class="lang en" lang="en">Example. The official card shows the virtual amount and the real amount as different numbers.</span></p>
<p><span class="lang es" lang="es">No permite concluir: sumarlas no crea una única cantidad disponible.</span><span class="lang en" lang="en">It does not let you conclude: adding them does not create one available pool.</span></p>
</article>

<article class="card" id="suplantacion"><h3><span class="lang es" lang="es">Posible suplantación</span><span class="lang en" lang="en">Possible impersonation</span></h3>
<p><span class="lang es" lang="es">Señal de Verify solo frente al registro de STUBX: el nombre, el símbolo, la imagen o un enlace coinciden y la dirección es otra. No atribuye intención.</span><span class="lang en" lang="en">A Verify signal only against the STUBX registry: the name, symbol, image, or a link matches and the address is different. It does not attribute intent.</span></p>
<p><span class="lang es" lang="es">Ejemplo. Verify puede mostrar esa señal en una ficha fechada cuya dirección no es la oficial. Para cualquier otro token, esta biblioteca no usa esa palabra.</span><span class="lang en" lang="en">Example. Verify can show that signal on a dated card whose address is not the official one. For any other token, this library does not use that word.</span></p>
<p><span class="lang es" lang="es">No permite concluir: no es una sentencia. Un nombre parecido no sustituye a leer la dirección.</span><span class="lang en" lang="en">It does not let you conclude: it is not a verdict. A similar name does not replace reading the address.</span></p>
</article>

<article class="card" id="titular"><h3><span class="lang es" lang="es">Titular y persona</span><span class="lang en" lang="en">Account and person</span></h3>
<p><span class="lang es" lang="es">Una dirección guardada en una cuenta es un campo público. No identifica a una persona ni a un titular jurídico.</span><span class="lang en" lang="en">An address stored on an account is a public field. It does not identify a person or a legal owner.</span></p>
<p><span class="lang es" lang="es">Ejemplo. El creator de la curva, cuando la ficha lo trae, sigue siendo una dirección.</span><span class="lang en" lang="en">Example. The curve creator, when the card includes it, is still an address.</span></p>
<p><span class="lang es" lang="es">No permite concluir: esta página no pasa de una dirección a un nombre de persona. No pide datos personales.</span><span class="lang en" lang="en">It does not let you conclude: this page does not turn an address into a person’s name. It does not ask for personal data.</span></p>
</article>

<article class="card" id="holder"><h3><span class="lang es" lang="es">‘Holder’ (término del sector)</span><span class="lang en" lang="en">‘Holder’ (industry term)</span></h3>
<p><span class="lang es" lang="es">‘Holder’ (término del sector): cuenta que tiene tokens. No implica derechos ni comunidad de inversores.</span><span class="lang en" lang="en">‘Holder’ (industry term): an account that holds tokens. It implies no rights and no investor community.</span></p>
<p><span class="lang es" lang="es">Ejemplo. Una cuenta con tokens no es, por ese dato, una persona.</span><span class="lang en" lang="en">Example. An account that holds tokens is not, from that fact alone, a person.</span></p>
<p><span class="lang es" lang="es">No permite concluir: no implica derechos ni comunidad de inversores.</span><span class="lang en" lang="en">It does not let you conclude: it implies no rights and no investor community.</span></p>
</article>

<article class="card" id="ficha"><h3><span class="lang es" lang="es">Ficha</span><span class="lang en" lang="en">Card</span></h3>
<p><span class="lang es" lang="es">Lectura fechada de una dirección. No se actualiza sola y no es una auditoría.</span><span class="lang en" lang="en">A dated reading of an address. It does not update itself and it is not an audit.</span></p>
<p><span class="lang es" lang="es">Ejemplo. La ficha oficial usada aquí lleva fecha 2026-10-09. Una consulta posterior es otra ficha.</span><span class="lang en" lang="en">Example. The official card used here is dated 2026-10-09. A later query is another card.</span></p>
<p><span class="lang es" lang="es">No permite concluir: una ficha antigua no es el estado actual. Puede haber cambiado.</span><span class="lang en" lang="en">It does not let you conclude: an old card is not the current state. It may have changed.</span></p>
</article>

<article class="card" id="censo"><h3><span class="lang es" lang="es">Censo</span><span class="lang en" lang="en">Census</span></h3>
<p><span class="lang es" lang="es">Un censo sería la lista de todas las cuentas. Estas lecturas no lo son: si un dato falta, no se rellena con un cero.</span><span class="lang en" lang="en">A census would be the list of every account. These readings are not that: if a fact is missing, it is not filled in with a zero.</span></p>
<p><span class="lang es" lang="es">Ejemplo. La ficha oficial dice qué cuentas leyó y que eso no es un censo.</span><span class="lang en" lang="en">Example. The official card says which accounts it read and that this is not a census.</span></p>
<p><span class="lang es" lang="es">No permite concluir: que no sea un censo no convierte el dato que falta en un cero.</span><span class="lang en" lang="en">It does not let you conclude: not being a census does not turn the missing fact into a zero.</span></p>
</article>

<article class="card" id="comision"><h3><span class="lang es" lang="es">Comisión</span><span class="lang en" lang="en">Fee</span></h3>
<p><span class="lang es" lang="es">Regla de un conector sobre un intercambio. Esta biblioteca no calcula comisiones ni intercambios.</span><span class="lang en" lang="en">A fee rule set by a connector on a swap. This library does not calculate fees or swaps.</span></p>
<p><span class="lang es" lang="es">Ejemplo. Las guías leen campos públicos. No añaden un cálculo de comisión.</span><span class="lang en" lang="en">Example. The guides read public fields. They do not add a fee calculation.</span></p>
<p><span class="lang es" lang="es">No permite concluir: una comisión no identifica el mint y no es un resultado prometido.</span><span class="lang en" lang="en">It does not let you conclude: a fee does not identify the mint and is not a promised result.</span></p>
</article>

<article class="card" id="extension-token-2022"><h3><span class="lang es" lang="es">Extensión de Token-2022</span><span class="lang en" lang="en">Token-2022 extension</span></h3>
<p><span class="lang es" lang="es">Dato extra en un mint del programa Token-2022, después de la cuenta base. SPL Token clásico no las trae: el estado queda en no aplica.</span><span class="lang en" lang="en">Extra data on a Token-2022 mint, after the base account. Classic SPL Token does not have them: the status stays not applicable.</span></p>
<p><span class="lang es" lang="es">Ejemplo hipotético, no leído de la cadena: una extensión puede llamarse TransferFeeConfig o PermanentDelegate. Si el tipo no está en la lista, se marca no soportada y no se inventa su efecto.</span><span class="lang en" lang="en">Hypothetical example, not read from the chain: an extension can be named TransferFeeConfig or PermanentDelegate. If the type is not on the list, it is marked not supported and its effect is not invented.</span></p>
<p><span class="lang es" lang="es">No permite concluir: ver el nombre de una extensión no dice si el token es seguro ni qué hará esa extensión en un intercambio.</span><span class="lang en" lang="en">It does not let you conclude: seeing an extension’s name does not say whether the token is safe or what that extension will do in a swap.</span></p>
</article>
</div>

<h2><span class="lang es" lang="es">Guías</span><span class="lang en" lang="en">Guides</span></h2>

<article class="card" id="guia-identificar"><h2><span class="lang es" lang="es">Identificar un token</span><span class="lang en" lang="en">Identify a token</span></h2>
<div class="lang es" lang="es">
<p>El nombre, el símbolo y la imagen son textos y un archivo. La dirección del mint es la cuenta de ese token.</p>
<p>Para cualquier token el orden es el mismo: leer la dirección completa y no sustituirla por el nombre, aunque el nombre lleve palabras como oficial o comunidad.</p>
<p>El único token real que esta guía afirma es STUBX, y solo por su dirección <code>TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump</code>. Cualquier otra dirección no es la oficial de STUBX. Eso no dice si ese otro token es bueno o malo.</p>
<p>Una ficha tiene hora UTC. Volver a consultar crea otra ficha. Lo que no se pudo leer queda en no disponible.</p>
<p><a href="/verify/">Pruébalo en Verify</a>. El enlace abre Verify vacío: no pega la dirección de un tercero.</p>
</div>
<div class="lang en" lang="en">
<p>The name, the symbol, and the image are text and a file. The mint address is the account of that token.</p>
<p>For any token the order is the same: read the full address and do not replace it with the name, even if the name contains words such as official or community.</p>
<p>The only real token this guide states is STUBX, and only by its address <code>TNWwnzecb37272ZoySDE6D2UcmqNnU12EqtycNSpump</code>. Any other address is not the official STUBX address. That does not say whether that other token is good or bad.</p>
<p>A card has a UTC time. Checking again creates another card. What could not be read stays unavailable.</p>
<p><a href="/verify/">Try it in Verify</a>. The link opens Verify empty: it does not paste a third party’s address.</p>
</div>
</article>

<article class="card" id="guia-permisos"><h2><span class="lang es" lang="es">Interpretar permisos</span><span class="lang en" lang="en">Read permissions</span></h2>
<div class="lang es" lang="es">
<p>Un permiso no es una garantía. La autoridad de emisión, si está activa, puede aumentar el suministro de ese mint. Si está revocada y el campo está verificado, ese permiso concreto figura vacío en esa lectura.</p>
<p>En una moneda estable, un permiso de emisión activo es habitual: quien la emite añade unidades cuando entra dinero. Si un proyecto prometió un suministro fijo, el mismo permiso permite crear más. La lectura no dice cuál de los dos casos es y no acusa.</p>
<p>La autoridad de congelación es otro permiso. Revocada lo quita en esa lectura. Activa lo deja asignado a la dirección que muestra la ficha.</p>
<p>En Token-2022 pueden aparecer extensiones después de la cuenta base. Si el tipo está en la lista, se muestra el nombre. Si no, queda en no soportada. En un mint SPL clásico las extensiones no aplican.</p>
<p>Que el permiso de emisión esté revocado no impide que el precio baje y no predice la demanda ni la liquidez. Un ejemplo hipotético, no leído de la cadena: un token con la emisión revocada puede seguir sin liquidez.</p>
<p>Si un campo está en no disponible, no se rellena como revocada ni como inmutable.</p>
<p><a href="/verify/">Pruébalo en Verify</a></p>
</div>
<div class="lang en" lang="en">
<p>A permission is not a guarantee. Mint authority, if active, can increase the supply of that mint. If it is revoked and the field is verified, that specific permission is recorded as empty in that reading.</p>
<p>On a stablecoin, an active mint authority is common: the issuer adds units when money comes in. If a project promised a fixed supply, the same permission can create more. The reading does not say which of the two cases this is, and it does not accuse.</p>
<p>Freeze authority is a different permission. Revoked removes it in that reading. Active leaves it assigned to the address the card shows.</p>
<p>On Token-2022, extensions can appear after the base account. If the type is on the list, the name is shown. If it is not, it stays not supported. On a classic SPL mint, extensions do not apply.</p>
<p>A revoked mint authority does not stop the price from falling and does not predict demand or liquidity. A hypothetical example, not read from the chain: a token with mint authority revoked can still have no liquidity.</p>
<p>If a field is unavailable, it is not filled in as revoked or as immutable.</p>
<p><a href="/verify/">Try it in Verify</a></p>
</div>
</article>

<article class="card" id="guia-liquidez"><h2><span class="lang es" lang="es">Comprender la curva</span><span class="lang en" lang="en">Understand the curve</span></h2>
<div class="lang es" lang="es">
<p>La curva de Pump.fun, cuando existe, es una cuenta derivada. Se leen cantidades virtuales y reales por separado, y si <code>complete</code> es verdadero o falso.</p>
<p>La cantidad virtual no es la cantidad real. No se suman como si fueran una única cantidad retirable.</p>
<p>Si la cuenta derivada no es del programa de la curva, el campo queda en no aplica. No se rellena con cero.</p>
<p>La capitalización no es la liquidez de la curva. Esta guía no calcula capitalización, comisiones ni un intercambio.</p>
<p>Un ejemplo hipotético, no leído de la cadena: una curva marcada como completa no dice qué hará el precio después.</p>
<p><a href="/cuaderno/">Guarda la lectura en el cuaderno</a> si quieres compararla más tarde. La ficha guardada dirá la hora y que puede haber cambiado.</p>
</div>
<div class="lang en" lang="en">
<p>The Pump.fun curve, when it exists, is a derived account. Virtual and real amounts are read separately, and so is whether <code>complete</code> is true or false.</p>
<p>The virtual amount is not the real amount. They are not added together as one withdrawable pool.</p>
<p>If the derived account is not owned by the curve program, the field stays not applicable. It is not filled in with zero.</p>
<p>Market cap is not the curve’s liquidity. This guide does not calculate market cap, fees, or a swap.</p>
<p>A hypothetical example, not read from the chain: a curve marked complete does not say what the price will do later.</p>
<p><a href="/cuaderno/">Save the reading in the notebook</a> if you want to compare it later. The saved card will show the time and that it may have changed.</p>
</div>
</article>
"""


def not_found() -> str:
    return f"""
<h1>{t("Esta página no está", "This page is not here")}</h1>
<p>{t("La vista previa no tiene esa ruta. La portada sigue en el inicio.", "This preview has no page at that address. Go back to the home page.")}</p>
<p><a class="primary" href="/">{t("Ir al inicio", "Go to the home page")}</a></p>
"""


def headers() -> str:
    origins = " ".join(rpc_origins())
    verify_csp = (
        "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; "
        "img-src 'self'; font-src 'self'; connect-src 'self' "
        + origins
        + "; manifest-src 'self'; media-src 'none'; frame-src 'none'; worker-src 'none'; "
        "object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests"
    )
    return f"""# www.stubxai.com lo sirve Cloudflare Pages (comprobado 2026-10-09). El apex pasa por el proxy de Cloudflare.
# Netlify ya no sirve el dominio: solo superb-horse-9036f5.netlify.app, con la redirección 301 de _redirects.
# HSTS va aquí porque Pages no lo envía solo. Sin preload.
# worker-src 'self' deja registrar el service worker de Lab. Las páginas que no son Lab
# repiten worker-src 'none' en la meta, y las dos políticas se cruzan.
# connect-src global se queda en 'self'. /verify/ y /verify/* quitan esa política
# con ! Content-Security-Policy y ponen la suya, solo con los dos RPC públicos.
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; media-src 'none'; frame-src 'none'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cross-Origin-Opener-Policy: same-origin

# Studio no repite cabeceras: /* ya trae X-Frame-Options, nosniff y Referrer-Policy.
# La CSP más estricta (default-src 'none', worker-src 'none', connect-src 'self')
# vive en el meta del HTML y se cruza con la de /*. connect-src sigue en 'self'
# porque el editor descarga los PNG de avatar. frame-ancestors queda solo en /*.
/verify/
  ! Content-Security-Policy
  {verify_csp}
/verify/*
  ! Content-Security-Policy
  {verify_csp}
/pares/
  ! Content-Security-Policy
  {verify_csp}
/pares/*
  ! Content-Security-Policy
  {verify_csp}

/assets/*
  Cache-Control: public, max-age=0, must-revalidate
/fonts/*
  Cache-Control: public, max-age=2592000
/kit/*
  Cache-Control: public, max-age=604800
/onchain/*
  Cache-Control: public, max-age=31536000, immutable
/token.json
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300
  Access-Control-Allow-Origin: *
/.well-known/security.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=3600
/sitemap.xml
  Content-Type: application/xml; charset=utf-8
# Lo que no debe salir en buscadores: service worker, datos JSON y la página 404.
/lab/sw.js
  X-Robots-Tag: noindex, nofollow
/modules/*
  X-Robots-Tag: noindex, nofollow
/onchain/*
  X-Robots-Tag: noindex, nofollow
/token.json
  X-Robots-Tag: noindex, nofollow
/site.webmanifest
  X-Robots-Tag: noindex, nofollow
/404.html
  X-Robots-Tag: noindex, nofollow
/cuaderno/*
  ! Content-Security-Policy
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' https://solana-rpc.publicnode.com https://api.mainnet-beta.solana.com; manifest-src 'self'; media-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
"""


def redirects() -> str:
    return """# www.stubxai.com lo sirve Cloudflare Pages. Esta primera regla solo la aplica Netlify,
# en superb-horse-9036f5.netlify.app. Cloudflare Pages ignora reglas con dominio.
# La dirección está grabada en los metadatos on-chain. El «!» fuerza el 301 aunque el archivo exista.
https://superb-horse-9036f5.netlify.app/*  https://stubxai.com/:splat  301!

# Cloudflare Pages quita la extensión de un HTML suelto y lo sirve sin ella.
# Si el archivo es index.html, la URL lleva barra final. No redirigir /archivo
# hacia ese HTML con extensión: con la regla de Pages eso es un bucle.
# /docs apunta a la URL que responde 200.
/canales            /security/   301
/canales/           /security/   301
/canales.html       /security/   301
/riesgos            /risks/      301
/riesgos/           /risks/      301
/riesgos.html       /risks/      301
/pruebas            /proofs/     301
/pruebas/           /proofs/     301
/pruebas.html       /proofs/     301
/marca              /marca/      301
/marca.html         /marca/      301
/docs               /archivo     301
/docs/              /archivo     301
/docs.html          /archivo     301
/.well-known/security.txt  /security.txt  200
"""


def manifest() -> str:
    return json.dumps(
        {
            "id": "/",
            "name": "STUBX",
            "short_name": "STUBX",
            "description": "STUBX: a meme that asks for proof. High-risk crypto.",
            "lang": "es",
            "start_url": "/",
            "scope": "./",
            "display": "browser",
            "background_color": "#071422",
            "theme_color": "#071422",
            "icons": [
                {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
                {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
            ],
        },
        ensure_ascii=False,
        indent=2,
    ) + "\n"


def robots() -> str:
    ai = ["GPTBot", "Google-Extended", "CCBot", "ClaudeBot", "anthropic-ai", "Applebot-Extended", "Bytespider", "meta-externalagent"]
    blocks = "\n".join(f"User-agent: {bot}\nDisallow: /\n" for bot in ai)
    return f"""# STUBX · robots.txt · v3 (2026-10-09).
# Web oficial: https://stubxai.com · Las páginas públicas son indexables.
# Se pide a los rastreadores de entrenamiento de IA que no usen el contenido.

User-agent: *
Allow: /

{blocks}
Sitemap: https://stubxai.com/sitemap.xml
"""


def sitemap() -> str:
    dated = [
        ("https://stubxai.com/", "2026-10-09"),
        ("https://stubxai.com/verify/", "2026-10-09"),
        ("https://stubxai.com/lab/", "2026-10-09"),
        ("https://stubxai.com/tablero/", "2026-10-09"),
        ("https://stubxai.com/studio/", "2026-10-09"),
        ("https://stubxai.com/studio/reglas/", "2026-10-09"),
        ("https://stubxai.com/pares/", "2026-10-10"),
        ("https://stubxai.com/methodology/", "2026-10-09"),
        ("https://stubxai.com/security/", "2026-10-09"),
        ("https://stubxai.com/risks/", "2026-10-09"),
        ("https://stubxai.com/legal/", "2026-10-09"),
        ("https://stubxai.com/proofs/", "2026-10-09"),
        ("https://stubxai.com/status/", "2026-10-09"),
        ("https://stubxai.com/tokenomics/", "2026-10-09"),
        ("https://stubxai.com/community/", "2026-10-09"),
        ("https://stubxai.com/marca/", "2026-10-09"),
        ("https://stubxai.com/build/", "2026-10-09"),
        ("https://stubxai.com/aprender/", "2026-10-09"),
        ("https://stubxai.com/cuaderno/", "2026-10-09"),
        ("https://stubxai.com/contribuir/", "2026-10-10"),
        ("https://stubxai.com/archivo", "2026-10-03"),
    ]
    rows = "\n".join(f"  <url><loc>{loc}</loc><lastmod>{day}</lastmod></url>" for loc, day in dated)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{rows}
</urlset>
"""


def _join(*parts: str) -> str:
    return "".join(parts)


def strip_archive(archive: str) -> str:
    """Quita el pie repetido y la etiqueta de imagen. Conserva MiCA, la CA y el texto histórico."""
    risk = _join("Cripto de alto riesgo", " · ", "Puedes perderlo todo", " · ", "No es consejo de inversión.")
    risk_en = _join("High-risk crypto", " · ", "You could lose everything", " · ", "Not investment advice.")
    ai_es = _join("Ilustración con elementos ", "generados con IA.")
    ai_en = _join("Illustration with ", "AI-generated elements.")
    credit = _join(" · Imágenes de Agente Talón ", "generadas con IA")
    meme = _join("\n", "Meme", "coin experimental", " · puedes perderlo todo", " · no es consejo de inversión.")
    archive = archive.replace("https://stubxai.com/archivo.html", "https://stubxai.com/archivo")
    archive = archive.replace('    <meta name="robots" content="noindex, nofollow" />\n', "")
    archive = archive.replace(f" Puede estar desactualizado. {risk}", " Puede estar desactualizado.")
    archive = archive.replace(f" ve a stubxai.com. {risk}", " ve a stubxai.com.")
    archive = archive.replace(f" Pie: «{risk}» · {ai_es}", "")
    archive = archive.replace(f" Footer: “{risk_en}” · {ai_en}", "")
    archive = archive.replace(meme, "")
    archive = archive.replace(
        '          <p class="footer-risk-line"><svg class="i i-sm" aria-hidden="true" focusable="false"><use href="#i-alert"/></svg>'
        f"<span><strong>Aviso:</strong> {risk} <a href=\"riesgos.html\">Riesgos</a></span></p>\n",
        "",
    )
    archive = archive.replace(credit, "")
    return archive


def main() -> None:
    global PUBLISH
    PUBLISH = publish_mode()
    # site.css de main tiene una llave de más entre tool.css y el @font-face de site-extra.css.
    css = (ROOT / "assets/tool.css").read_text(encoding="utf-8") + "}\n\n" + (ROOT / "assets/site-extra.css").read_text(encoding="utf-8")
    (ROOT / "assets/site.css").write_text(css, encoding="utf-8")
    (ROOT / "_headers").write_text(headers(), encoding="utf-8")
    (ROOT / "_redirects").write_text(redirects(), encoding="utf-8")
    (ROOT / "site.webmanifest").write_text(manifest(), encoding="utf-8")
    (ROOT / "robots.txt").write_text(robots(), encoding="utf-8")
    (ROOT / "sitemap.xml").write_text(sitemap(), encoding="utf-8")
    current = REPO / "web/current"
    shutil.copyfile(current / "archivo.html", ROOT / "archivo.html")
    archive = (ROOT / "archivo.html").read_text(encoding="utf-8")
    archive = strip_archive(archive)
    (ROOT / "archivo.html").write_text(archive, encoding="utf-8")
    shutil.copyfile(current / "styles.css", ROOT / "styles.css")
    shutil.copyfile(current / "app.js", ROOT / "app.js")

    write_page("index.html", "home", "STUBX · Contrasta la dirección", "STUBX · Check the address", "Vista previa de STUBX. Lee un token en directo y solo en lectura. No es consejo de inversión.", "STUBX preview. Read a token live and read-only. Not investment advice.", home())
    write_page("verify/index.html", "verify", "STUBX Verify", "STUBX Verify", "Lee cualquier token SPL o Token-2022 en directo y solo en lectura. Las fichas fechadas siguen como ejemplo.", "Read any SPL or Token-2022 token live and read-only. The dated cards remain as examples.", prepare_tool("verify"), ["assets/draft-address.js", "assets/verify.js"], True, connect=connect_src(True), modules=["assets/verificar-acciones.mjs"])
    write_page("comparar/index.html", "comparar", "STUBX · Ejemplo de una curva", "STUBX · Curve example", "Ejemplo hipotético, no leído de la cadena. No es una recomendación ni un aval.", "Hypothetical example, not read from the chain. It is not a recommendation or an endorsement.", comparar(), narrow=True)
    write_page("pares/index.html", "pares", "STUBX · Lectura de la curva", "STUBX · Curve reading", "Moneda base y estado de la curva, tal como están en la cadena. No es una auditoría ni una recomendación.", "Base currency and curve state, as they are on chain. It is not an audit or a recommendation.", pares(), narrow=True, connect=connect_src(True), modules=["assets/pares.mjs"])
    write_page("lab/index.html", "lab", "STUBX Lab", "STUBX Lab", "Misión para distinguir el mint del registro de un clon.", "A mission to tell the registry mint from a clone.", prepare_tool("lab"), ["assets/mission.js"], True, True)
    board = prepare_tool("tablero")
    write_page("tablero/index.html", "tablero", "STUBX · Tablero", "STUBX · Board", "Tablero de construcción con el registro del 2026-10-09.", "Construction board with the 2026-10-09 record.", board)
    write_page("methodology/index.html", "methodology", "STUBX · Metodología", "STUBX · Methodology", "Fuentes, fechas y límites de lo que esta web afirma.", "Sources, dates, and limits of what this website claims.", methodology())
    write_page("security/index.html", "security", "STUBX · Seguridad", "STUBX · Security", "Contrato, canales oficiales y aviso de clones.", "Contract, official channels, and clone notice.", security())
    write_page("risks/index.html", "risks", "STUBX · Riesgos", "STUBX · Risks", "Riesgos de STUBX en lenguaje llano.", "STUBX risks in plain language.", risks())
    write_page("legal/index.html", "legal", "STUBX · Legal", "STUBX · Legal", "Aviso, privacidad y contacto.", "Notice, privacy, and contact.", legal())
    write_page("proofs/index.html", "proofs", "STUBX · Pruebas", "STUBX · Proofs", "Pruebas fechadas y archivo histórico.", "Dated proofs and the historical archive.", proofs())
    write_page("status/index.html", "status", "STUBX · Estado", "STUBX · Status", "Casillas PPM con fecha y fuente.", "PPM boxes with date and source.", status())
    write_page("tokenomics/index.html", "tokenomics", "STUBX · Reparto", "STUBX · Supply", "Reparto del suministro a 2026-10-03.", "Supply distribution as of 2026-10-03.", tokenomics())
    write_page("community/index.html", "community", "STUBX · Comunidad", "STUBX · Community", "Canales y participación sin comprar.", "Channels and participation without buying.", community())
    write_page("marca/index.html", "marca", "STUBX · Marca", "STUBX · Brand", "Personaje, logos y reglas del kit.", "Character, logos, and kit rules.", marca())
    write_page("build/index.html", "build", "STUBX · Versiones", "STUBX · Versions", "Lo hecho y lo que sigue siendo un objetivo.", "What is done and what is still a target.", build_page())
    write_page("avances/index.html", "avances", "STUBX · Avances", "STUBX · Progress", "El tablero vive en /tablero.", "The board lives at /tablero.", avances())
    write_page("aprender/index.html", "aprender", "STUBX · Aprender", "STUBX · Learn", "Glosario y tres guías para cualquier token de Solana, 2026-10-09.", "Glossary and three guides for any Solana token, 2026-10-09.", aprender(), ["assets/draft-address.js"])
    # U02 vive en web/v2/studio/ y no se regenera desde aquí: el editor, el catálogo y las reglas
    # se mantienen a mano. Un rebuild no debe borrar esa carpeta.
    # El cuaderno de web/v2/cuaderno/ también está escrito a mano. Regenerarlo lo sustituiría por un hueco.
    write_page(
        "contribuir/index.html",
        "contribuir",
        "STUBX · Contribuir",
        "STUBX · Contribute",
        "Informa un fallo o una mejora. Sin formulario y sin datos personales.",
        "Report a bug or an improvement. No form and no personal data.",
        contribuir(),
    )
    write_page("404.html", "home", "STUBX · No está", "STUBX · Not here", "Esa ruta no está en la vista previa.", "That route is not in the preview.", not_found(), absolute=True)
    print("web v2 escrita")


if __name__ == "__main__":
    main()
