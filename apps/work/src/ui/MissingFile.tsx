export function absentOnDevice(ready: boolean, id: string | null, files: ReadonlyArray<{ id: string }>): boolean {
  if (!ready || !id) return false;
  return !files.some((file) => file.id === id);
}

export function MissingFile({
  message,
  action,
  onBack,
}: {
  message: string;
  action: string;
  onBack: () => void;
}) {
  return (
    <div className="ow-missing" role="status">
      <p>{message}</p>
      <button type="button" className="ow-button" onClick={onBack}>{action}</button>
    </div>
  );
}
