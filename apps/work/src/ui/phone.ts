import { useEffect, useState } from "react";

/** Teléfono o tableta estrecha, y también un dedo aunque el ancho CSS venga inflado. */
export const PHONE_QUERY = "(max-width: 840px), (pointer: coarse)";

export function usePhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(PHONE_QUERY);
    const apply = () => setPhone(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return phone;
}
