import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Hook per verificare se il dispositivo è mobile
 * @returns {boolean} True se il dispositivo è mobile, false altrimenti
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

// Export predefinito per compatibilità con i due stili di import
export default useIsMobile;
