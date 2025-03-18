"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

type Theme = "light" | "dark"

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("light")

  // Cargar tema al iniciar
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null
    if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
      setThemeState(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    }
  }, [])

  // Función para cambiar el tema
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <NextThemesProvider
        {...props}
        enableSystem={false}
        defaultTheme="light"
        attribute="class"
        value={{
          light: "light",
          dark: "dark",
        }}
      >
        {children}
      </NextThemesProvider>
    </ThemeContext.Provider>
  )
}

