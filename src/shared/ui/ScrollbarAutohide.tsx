import { useEffect } from "react";

export function ScrollbarAutohide() {
  useEffect(() => {
    const hideTimers = new WeakMap<Element, number>();

    function handleScroll(event: Event) {
      const scrollingElement =
        event.target instanceof Element ? event.target : document.scrollingElement;
      if (!scrollingElement) return;

      scrollingElement.classList.add("is-scrolling");
      window.clearTimeout(hideTimers.get(scrollingElement));
      hideTimers.set(
        scrollingElement,
        window.setTimeout(() => scrollingElement.classList.remove("is-scrolling"), 700),
      );
    }

    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, []);

  return null;
}
