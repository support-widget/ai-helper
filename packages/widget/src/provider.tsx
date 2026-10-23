'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { AiHelperControls, AiHelperProviderProps } from './types';

interface UiContextValue {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  openHelper: () => void;
  closeHelper: () => void;
  toggleHelper: () => void;
}

const AiHelperContext = createContext<UiContextValue | null>(null);

/**
 * Optional provider for programmatic open/close. The widget also works on its own.
 */
export function AiHelperProvider({
  children,
  defaultOpen = false,
  onOpenChange,
}: AiHelperProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isOpenRef = useRef(isOpen);
  const callbackRef = useRef(onOpenChange);
  callbackRef.current = onOpenChange;

  const setOpen = useCallback((next: boolean) => {
    if (isOpenRef.current === next) return;
    isOpenRef.current = next;
    setIsOpen(next);
    try {
      callbackRef.current?.(next);
    } catch {
      // Ignore host callback failures.
    }
  }, []);

  const openHelper = useCallback(() => setOpen(true), [setOpen]);
  const closeHelper = useCallback(() => setOpen(false), [setOpen]);
  const toggleHelper = useCallback(() => setOpen(!isOpenRef.current), [setOpen]);

  const value = useMemo(
    () => ({ isOpen, setOpen, openHelper, closeHelper, toggleHelper }),
    [closeHelper, isOpen, openHelper, setOpen, toggleHelper],
  );

  return <AiHelperContext.Provider value={value}>{children}</AiHelperContext.Provider>;
}

export function useAiHelperControls(): AiHelperControls {
  const context = useContext(AiHelperContext);
  if (!context) {
    throw new Error(
      'useAiHelperControls() must be used inside <AiHelperProvider>. Wrap your app or layout with it.',
    );
  }
  return context;
}

/** Internal hook used by the widget to share UI state with the optional provider. */
export function useAiHelperUi(): UiContextValue | null {
  return useContext(AiHelperContext);
}
