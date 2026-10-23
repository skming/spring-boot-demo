import { createContext, useContext } from 'react'
import type { ConfirmOptions } from './confirmController'

export const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(
  null,
)

export function useConfirm() {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error('useConfirm requires ConfirmProvider')
  return confirm
}
