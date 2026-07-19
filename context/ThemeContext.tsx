"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      const frameId = window.requestAnimationFrame(() => {
        setTheme(savedTheme);
      });
      return () => window.cancelAnimationFrame(frameId);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const themeColor = theme === "dark" ? "#121110" : "#FAF8F5";

    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }

    // Keep the installed PWA's Android status bar in sync with the app theme.
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", themeColor));

    // iOS reads this at launch, while some versions also apply runtime changes.
    document
      .querySelectorAll<HTMLMetaElement>(
        'meta[name="apple-mobile-web-app-status-bar-style"]',
      )
      .forEach((meta) =>
        meta.setAttribute(
          "content",
          theme === "dark" ? "black-translucent" : "default",
        ),
      );

    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
