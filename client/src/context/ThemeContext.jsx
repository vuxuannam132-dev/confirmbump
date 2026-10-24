import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('confirmbump_theme') || 'light';
  });

  const applyTheme = (themeName) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (themeName === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }
  };

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('confirmbump_theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
