import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false
    }

    return window.innerWidth < MOBILE_BREAKPOINT
  })

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches)
    }

    onChange(mediaQuery)
    mediaQuery.addEventListener("change", onChange)

    return () => mediaQuery.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
