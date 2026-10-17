/// <reference types="vite/client" />

declare module "virtual:pwa-register" {
  export function registerSW(options?: { immediate?: boolean }): (reloadPage?: boolean) => Promise<void>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}
