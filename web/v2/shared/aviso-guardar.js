/**
 * Único texto del aviso de «Guardar esta consulta», sustituido el 2026-10-11
 * por el texto de Legal de la PR 50. Nombra a DEX Screener y a los dos nodos
 * de Verify (verify/policy/limits.json y web/v2/shared/solana-read.js):
 * solana-rpc.publicnode.com y api.mainnet-beta.solana.com.
 * No se guarda nada antes del botón. No hay guardado automático, ni analítica del Cuaderno,
 * ni envío del Cuaderno a un servidor. Los datos de mercado no se guardan.
 * Si se añade sincronización o cuentas, este aviso deja de valer y hay que revisarlo con Legal.
 */
export const AVISO_GUARDAR = Object.freeze({
  es: "Este sitio no guarda en ningún servidor la dirección que consultas. Para leerla en directo, se envía a un nodo público de Solana (solana-rpc.publicnode.com y api.mainnet-beta.solana.com) y, si pides los datos de mercado, también a DEX Screener a través de este sitio, sin reenviar tu IP. Solo si pulsas «Guardar esta consulta», se guarda en el Cuaderno de este navegador, en tu dispositivo, y puedes borrarla allí cuando quieras. Los datos de mercado no se guardan.",
  en: "This site does not store the address you look up on any server. To read it live, it is sent to a public Solana node (solana-rpc.publicnode.com and api.mainnet-beta.solana.com) and, if you request market data, also to DEX Screener through this site, without forwarding your IP. Only if you press \"Save this lookup\" is it stored in this browser's Notebook, on your device, and you can delete it there at any time. Market data is not stored.",
});
