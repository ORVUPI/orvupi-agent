/**
 * Enlaces fijos a la Biblioteca. El href sale de esta lista, no de la página ni de la cadena.
 */
export const ENTENDER = Object.freeze([
  {
    id: "permisos",
    href: "/aprender/#guia-permisos",
    es: "Permisos",
    en: "Permissions",
    explain: {
      es: "Permisos: el de emisión permite crear más tokens. El de congelación permite bloquear cuentas. Ninguno de los dos dice si el proyecto es legítimo.",
      en: "Permissions: the mint permission can create more tokens. The freeze permission can block accounts. Neither one says the project is legitimate.",
    },
  },
  {
    id: "suministro",
    href: "/aprender/#autoridad-emision",
    es: "Suministro",
    en: "Supply",
    explain: {
      es: "Suministro: es la cantidad total de tokens en esta lectura, con los decimales de este token.",
      en: "Supply: it is the total number of tokens in this reading, using this token's decimals.",
    },
  },
  {
    id: "metadatos",
    href: "/aprender/#metadatos-mutables",
    es: "Metadatos",
    en: "Metadata",
    explain: {
      es: "Metadatos: si se pueden cambiar, puede que mañana el nombre o el símbolo ya no sean los de esta lectura.",
      en: "Metadata: if they can change, the name or symbol in this reading may not be tomorrow's.",
    },
  },
  {
    id: "distribucion",
    href: "/aprender/#censo",
    es: "Distribución (guía Censo)",
    en: "Distribution (Census guide)",
    explain: {
      es: "Distribución: una muestra de cuentas no es un censo de quién tiene los tokens.",
      en: "Distribution: a sample of accounts is not a census of who holds the tokens.",
    },
  },
  {
    id: "curva",
    href: "/aprender/#curva-pump",
    es: "Curva",
    en: "Curve",
    explain: {
      es: "Curva: si el token no tiene curva de Pump.fun ni de Raydium LaunchLab, este dato no aplica. Si la tiene y no hay cuenta, esta lectura no la encontró.",
      en: "Curve: if the token has no Pump.fun or Raydium LaunchLab curve, this fact does not apply. If it has one and there is no account, this reading did not find it.",
    },
  },
]);

export function entenderNav(lang) {
  const nav = document.createElement("nav");
  nav.className = "entender-resultado";
  const titleText = lang === "en" ? "Understand this result" : "Entender este resultado";
  nav.setAttribute("aria-label", titleText);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "abrir-entender";
  button.textContent = titleText;
  const panel = document.createElement("div");
  panel.className = "explicacion-resultado";
  panel.hidden = true;
  panel.tabIndex = -1;
  for (const item of ENTENDER) {
    const paragraph = document.createElement("p");
    paragraph.dataset.tema = item.id;
    paragraph.tabIndex = -1;
    const anchor = `entender-${item.id}`;
    if (!document.getElementById(anchor)) paragraph.id = anchor;
    paragraph.textContent = lang === "en" ? item.explain.en : item.explain.es;
    panel.append(paragraph);
  }
  for (const item of ENTENDER) {
    const link = document.createElement("a");
    link.href = item.href;
    link.dataset.guia = item.href;
    link.textContent = lang === "en" ? item.en : item.es;
    panel.append(link);
  }
  button.addEventListener("click", () => {
    panel.hidden = false;
    panel.focus();
  });
  nav.append(button, panel);
  return nav;
}
