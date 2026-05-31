// PWA install detection & prompt helpers
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isStandalone(): boolean {
  if (typeof window === "undefined") return true; // SSR — assume OK
  const mql = window.matchMedia?.("(display-mode: standalone)");
  // iOS Safari
  // @ts-expect-error legacy iOS prop
  const iosStandalone = window.navigator.standalone === true;
  return Boolean(mql?.matches || iosStandalone);
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export function isMobile(): boolean {
  return isIos() || isAndroid();
}
