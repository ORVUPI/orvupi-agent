/**
 * Contrato ORVUPI en la web: único módulo del que leen todas las páginas.
 * Tiene que coincidir con shared/orvupi-contract.json (lo comprueba test/web-v2.test.ts).
 * Solana, creado el 17-10-2026. Una cadena vacía o un valor que falte nunca cuentan como oficiales.
 */
export const OFFICIAL_NETWORK = "solana";
export const OFFICIAL_ADDRESS = "Bj6orFgn4UegmXtQ4WHcBsHSjjfgruHcScCSeauW1TyU";

export function isOfficialAddress(value) {
  return typeof OFFICIAL_ADDRESS === "string" && OFFICIAL_ADDRESS !== "" && typeof value === "string" && value === OFFICIAL_ADDRESS;
}
