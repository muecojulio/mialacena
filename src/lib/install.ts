/**
 * Utilidades para la instalación de la aplicación como PWA (Progressive Web App).
 */

export function installApp() {
  if (typeof window === "undefined") return;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = new URL(window.location.href);
  url.searchParams.set("install", "1");
  url.searchParams.set("platform", ios ? "ios" : "android");
  window.location.assign(url.toString());
}

export function isAppInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone);
  return isStandalone;
}
