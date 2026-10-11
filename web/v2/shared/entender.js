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
      en: "Permissions: mint authority can create more tokens. Freeze authority can block accounts. Neither one says the project is legitimate.",
    },
  },
  {
    id: "suministro",
    href: "/aprender/#autoridad-emision",
    es: "Suministro",
    en: "Supply",
    explain: {
      es: "Suministro: es la cantidad total de tokens en esta lectura, con los decimales del mint.",
      en: "Supply: it is the total number of tokens in this reading, using the mint decimals.",
    },
  },
  {
    id: "metadatos",
    href: "/aprender/#metadatos-mutables",
    es: "Metadatos",
    en: "Metadata",
    explain: {
      es: "Metadatos: si se pueden cambiar, el nombre o el símbolo de esta lectura pueden dejar de ser los de mañana.",
      en: "Metadata: if they can change, the name or symbol in this reading may not be tomorrow's.",
    },
  },
  {
    id: "distribucion",
    href: "/aprender/#censo",
    es: "Distribución",
    en: "Distribution",
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
      es: "Curva: si el token no se creó en Pump.fun, este dato no aplica. Si se creó y no hay cuenta, esta lectura no la encontró.",
      en: "Curve: if the token was not created on Pump.fun, this fact does not apply. If it was and there is no account, this reading did not find it.",
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
