export const FILES_CHANNEL = "orvupi-work";

export function publishFilesChanged(): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(FILES_CHANNEL);
  channel.postMessage({ type: "files-changed" });
  channel.close();
}

export function subscribeFilesChanged(onChange: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(FILES_CHANNEL);
  channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === "files-changed") onChange();
  };
  return () => channel.close();
}
