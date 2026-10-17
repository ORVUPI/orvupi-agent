import { useEffect, useState } from "react";

const PHONE = "(max-width: 768px)";

export function usePhone(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(PHONE);
    const apply = () => setPhone(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return phone;
}
