'use client'

import { useEffect } from 'react'
import { useTheme } from '@/hooks/use-theme'

export function ThemeAwareIcons() {
  const { theme } = useTheme()

  useEffect(() => {
    const iconHref =
      theme === 'dark'
        ? '/ledger_core_L_white_64.png'
        : '/ledger_core_L_dark_text_64.png'

    const appleHref =
      theme === 'dark'
        ? '/ledger_core_L_white_256.png'
        : '/ledger_core_L_dark_text_256.png'

    const setIconLink = (rel: string, href: string) => {
      const links = document.querySelectorAll<HTMLLinkElement>(
        `link[rel="${rel}"]`
      )

      if (links.length === 0) {
        const link = document.createElement('link')
        link.rel = rel
        link.href = href
        document.head.appendChild(link)
        return
      }

      links.forEach((link) => {
        link.href = href
      })
    }

    setIconLink('icon', iconHref)
    setIconLink('shortcut icon', iconHref)
    setIconLink('apple-touch-icon', appleHref)
  }, [theme])

  return null
}