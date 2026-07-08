'use client';

// ─── DarkModeContext: Light / Dark Theme Toggle ──────────────────────────────
// Persists the user's theme preference in localStorage and toggles the 'dark'
// class on the <html> element (Tailwind's dark mode strategy).
// ──────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from 'react';

// Create the context object.
const C = createContext<any>(null);

// Custom hook to access dark mode state and toggle function from any component.
export const useDarkMode = () => useContext(C);

// ─── DarkModeProvider Component ──────────────────────────────────────────────
export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  // Tracks whether dark mode is active (true) or light mode (false).
  const [dark, setDark] = useState(false);

  // ─── Initialisation Effect ──────────────────────────────────────────────────
  // Runs once on mount. Reads the user's saved preference from localStorage
  // ('edutrack_dark'). If the value is 'true', we activate dark mode by setting
  // the state and adding the 'dark' class to the document <html> element.
  useEffect(() => {
    const saved = localStorage.getItem('edutrack_dark');
    if (saved === 'true') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // ─── toggle() ───────────────────────────────────────────────────────────────
  // Flips the dark mode state. Uses the functional updater form of setDark
  // to safely derive the next state from the previous one. Persists the new
  // preference to localStorage and toggles the 'dark' class on <html>.
  function toggle() {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem('edutrack_dark', String(next));
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }

  return <C.Provider value={{ dark, toggle }}>{children}</C.Provider>;
}
