export type CopyFeedback = { copying: boolean; copiedText: string | null }

/** 成功后短暂展示反馈；失败、重复点击与卸载均不遗留成功状态。 */
export function createCopyController(
  writeText: (text: string) => Promise<void>,
  onChange: (feedback: CopyFeedback) => void,
  onError: () => void,
) {
  let pending = false
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  return {
    async copy(text: string) {
      if (pending || !text) return
      const current = ++revision
      pending = true
      clearTimer()
      onChange({ copying: true, copiedText: null })
      try {
        await writeText(text)
        if (current !== revision) return
        onChange({ copying: false, copiedText: text })
        timer = setTimeout(() => {
          timer = null
          if (current === revision) onChange({ copying: false, copiedText: null })
        }, 1800)
      } catch {
        if (current !== revision) return
        onChange({ copying: false, copiedText: null })
        onError()
      } finally {
        if (current === revision) pending = false
      }
    },
    dispose() {
      revision++
      pending = false
      clearTimer()
    },
  }
}
