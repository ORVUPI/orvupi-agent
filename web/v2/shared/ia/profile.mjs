/** Perfiles de conversación de ARQIVEN. `v1` es el activo.
 * `?perfil=legacy` en la URL restaura los límites anteriores sin cambiar el código.
 */

export const PROFILES = {
  legacy: {
    id: "legacy",
    repetitionPenalty: 1.22,
    noRepeatNgram: 5,
    maxTokensCap: 120,
    dropNonModel: false,
    pinFirst: false,
    perMessage: 1500,
    disableThinking: false,
  },
  v1: {
    id: "v1",
    repetitionPenalty: 1.1,
    noRepeatNgram: 0,
    maxTokensCap: 0,
    dropNonModel: true,
    pinFirst: true,
    perMessage: 0,
    disableThinking: true,
  },
};

/** Cambia a "legacy" para volver al comportamiento anterior en todo el sitio. */
export const ACTIVE_PROFILE = "v1";

export function profileById(id) {
  return PROFILES[id] || PROFILES[ACTIVE_PROFILE] || PROFILES.v1;
}

export function activeProfile(search = "") {
  const asked = new URLSearchParams(String(search || "").replace(/^\?/, "")).get("perfil");
  if (asked === "legacy" || asked === "v1") return PROFILES[asked];
  return profileById(ACTIVE_PROFILE);
}
