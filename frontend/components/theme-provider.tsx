'use client'

import { createContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

export interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme: Theme = stored === 'light' || stored === 'dark'
      ? stored
      : systemPrefersDark
        ? 'dark'
        : 'light'

    const root = document.documentElement
    root.classList.toggle('dark', initialTheme === 'dark')

    setTheme(initialTheme)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('theme', theme)
  }, [mounted, theme])

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light'
      const root = document.documentElement
      root.classList.toggle('dark', nextTheme === 'dark')
      window.localStorage.setItem('theme', nextTheme)
      return nextTheme
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
