export function navigateBackOrFallback(onFallback: () => void) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return;
  }

  onFallback();
}
