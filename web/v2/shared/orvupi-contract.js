/**
 * Contrato ORVUPI en la web: único módulo del que leen todas las páginas.
 * Tiene que coincidir con shared/orvupi-contract.json (lo comprueba test/web-v2.test.ts).
 * Hoy no existe: null. Una cadena vacía o un valor que falte nunca cuentan como oficiales.
 */
export const OFFICIAL_NETWORK = null;
export const OFFICIAL_ADDRESS = null;

export function isOfficialAddress(value) {
  return typeof OFFICIAL_ADDRESS === "string" && OFFICIAL_ADDRESS !== "" && typeof value === "string" && value === OFFICIAL_ADDRESS;
}
