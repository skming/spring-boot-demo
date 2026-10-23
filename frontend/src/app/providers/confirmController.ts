export type ConfirmOptions = {
  title: string
  description: string
  confirmText?: string
  danger?: boolean
}

/** 同时只展示一次确认；关闭或卸载时取消，避免遗留待处理的操作。 */
export function createConfirmController(onOpen: (options: ConfirmOptions | null) => void) {
  let pending: ((confirmed: boolean) => void) | null = null

  return {
    request(options: ConfirmOptions): Promise<boolean> {
      if (pending) return Promise.resolve(false)
      return new Promise((resolve) => {
        pending = resolve
        onOpen(options)
      })
    },
    settle(confirmed: boolean) {
      const resolve = pending
      pending = null
      onOpen(null)
      resolve?.(confirmed)
    },
    dispose() {
      const resolve = pending
      pending = null
      resolve?.(false)
    },
  }
}
