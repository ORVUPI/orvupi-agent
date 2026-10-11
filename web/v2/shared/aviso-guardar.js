/**
 * Único texto del aviso de «Guardar esta consulta».
 * Legal (2026-10-11) nombra los nodos públicos de Solana
 * solana-rpc.publicnode.com y api.mainnet-beta.solana.com, que también
 * ven la IP. Al pulsar «Leer datos de mercado ahora» el navegador conecta
 * con DEX Screener, que también ve la IP y la dirección consultada.
 * No se guarda nada antes del botón. No hay guardado automático, ni analítica del Cuaderno,
 * ni envío del Cuaderno a un servidor. Los datos de mercado no se guardan.
 * Si se añade sincronización o cuentas, este aviso deja de valer y hay que revisarlo con Legal.
 */
export const AVISO_GUARDAR = Object.freeze({
  es: "Este sitio no guarda en ningún servidor la dirección que consultas. Para leerla en directo, se envía a los nodos públicos de Solana solana-rpc.publicnode.com y api.mainnet-beta.solana.com, que también ven tu IP. Si pulsas «Leer datos de mercado ahora», tu navegador conecta con DEX Screener y DEX Screener también ve tu IP y la dirección consultada. Solo si pulsas «Guardar esta consulta», se guarda en el Cuaderno de este navegador, en tu dispositivo, y puedes borrarla allí cuando quieras. Los datos de mercado no se guardan.",
  en: "This site does not store the address you look up on any server. To read it live, it is sent to the Solana public nodes solana-rpc.publicnode.com and api.mainnet-beta.solana.com, which also see your IP. If you press \"Read market data now\", your browser connects to DEX Screener and it also sees your IP and the address you look up. Only if you press \"Save this lookup\" is it stored in this browser's Notebook, on your device, and you can delete it there at any time. Market data is not stored.",
});
