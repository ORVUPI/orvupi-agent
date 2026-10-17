import { useEffect, useState } from "react";

export function UpdateBanner({ title, action }: { title: string; action: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("ow-update", show);
    return () => window.removeEventListener("ow-update", show);
  }, []);
  if (!open) return null;
  return (
    <div className="ow-update" role="status">
      <p>{title}</p>
      <button type="button" onClick={() => window.location.reload()}>{action}</button>
    </div>
  );
}
