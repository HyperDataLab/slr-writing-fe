import { useCallback, useRef } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

/**
 * A `t` whose identity never changes. react-i18next gives `t` a new identity on every language change, so using it
 * in a data-loading hook dependency refetches (and, in the drafting page, drops an unsaved edit) when the user
 * only switches language. Use it for messages produced inside effects; keep the normal `t` for rendering.
 */
export function useStableT(): TFunction {
  const { t } = useTranslation();
  const ref = useRef(t);
  ref.current = t;
  return useCallback(((...args: Parameters<TFunction>) => ref.current(...args)) as TFunction, []);
}
