import type { Localized } from "./types.js";

/** Mismos textos que web/v2/shared/entender.js. El enlace de la lección no inventa otro destino. */
export type EntenderLink = {
  id: string;
  href: string;
  es: string;
  en: string;
  explain: Localized;
};

export const ENTENDER_LINKS: readonly EntenderLink[] = [
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
      es: "Curva: si el token no se creó en Pump.fun, este dato no aplica. Si se creó y no hay cuenta, esta lectura no la encontró.",
      en: "Curve: if the token was not created on Pump.fun, this fact does not apply. If it was and there is no account, this reading did not find it.",
    },
  },
];

export const ENTENDER_BUTTON: Localized = {
  es: "Entender este resultado",
  en: "Understand this result",
};
