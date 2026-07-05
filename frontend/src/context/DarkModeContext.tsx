'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

const C = createContext<any>(null);
export const useDarkMode = () => useContext(C);

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('edutrack_dark');
    if (saved === 'true') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

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
