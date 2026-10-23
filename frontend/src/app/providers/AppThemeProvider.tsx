import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute={['class', 'data-theme']}
      storageKey="db-lab-theme"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
