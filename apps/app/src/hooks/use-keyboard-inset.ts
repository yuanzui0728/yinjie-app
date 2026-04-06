import { useEffect, useEffectEvent, useState } from "react";
import { getNativeShellPlatform } from "../lib/native-shell";

function readKeyboardInset() {
  if (typeof window === "undefined" || !window.visualViewport) {
    return 0;
  }

  const inset = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
  return inset > 0 ? Math.round(inset) : 0;
}

export function useKeyboardInset() {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const updateInset = useEffectEvent(() => {
    setKeyboardInset(readKeyboardInset());
  });

  useEffect(() => {
    updateInset();

    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    viewport.addEventListener("resize", updateInset);
    viewport.addEventListener("scroll", updateInset);
    window.addEventListener("focusin", updateInset);
    window.addEventListener("focusout", updateInset);

    return () => {
      viewport.removeEventListener("resize", updateInset);
      viewport.removeEventListener("scroll", updateInset);
      window.removeEventListener("focusin", updateInset);
      window.removeEventListener("focusout", updateInset);
    };
  }, [updateInset]);

  return {
    keyboardInset,
    keyboardOpen: keyboardInset > 0,
    nativePlatform: getNativeShellPlatform(),
  };
}
