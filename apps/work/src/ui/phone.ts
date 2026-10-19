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

/** Presentaciones: móvil (< 768 px), tableta (768–1199 px, o un dedo desde 768 px) o escritorio. */
export const SLIDES_PHONE_QUERY = "(max-width: 767px)";
export const SLIDES_TABLET_QUERY = "(min-width: 768px) and (max-width: 1199px), (min-width: 768px) and (pointer: coarse)";
export type DeviceLayout = "phone" | "tablet" | "desktop";

export function useDeviceLayout(): DeviceLayout {
  const read = (): DeviceLayout => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "desktop";
    if (window.matchMedia(SLIDES_PHONE_QUERY).matches) return "phone";
    if (window.matchMedia(SLIDES_TABLET_QUERY).matches) return "tablet";
    return "desktop";
  };
  const [layout, setLayout] = useState<DeviceLayout>(read);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const a = window.matchMedia(SLIDES_PHONE_QUERY);
    const b = window.matchMedia(SLIDES_TABLET_QUERY);
    const apply = () => setLayout(read());
    apply();
    a.addEventListener("change", apply);
    b.addEventListener("change", apply);
    return () => { a.removeEventListener("change", apply); b.removeEventListener("change", apply); };
  }, []);
  return layout;
}
