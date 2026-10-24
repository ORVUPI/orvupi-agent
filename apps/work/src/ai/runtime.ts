/** Hilos del motor WASM. Sin aislamiento de origen no hay SharedArrayBuffer: más de un hilo
 *  tumba la sesión y la IA no arranca aunque el modelo ya esté descargado. */
export function wasmThreadCount(cores: number | undefined, crossOriginIsolated: boolean): number {
  const n = typeof cores === "number" && cores > 0 ? cores : 4;
  if (!crossOriginIsolated) return 1;
  return Math.max(1, Math.min(4, n - 1));
}
