import { useEffect, useState } from 'react'
import { toast } from '@heroui/react'
import { listWatchStatuses } from '../api/movieApi'
import type { WatchStatusOption } from '../types/movie'

export function useWatchStatuses() {
  const [watchStatuses, setWatchStatuses] = useState<WatchStatusOption[]>([])
  const [loadingWatchStatuses, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    void listWatchStatuses()
      .then((options) => {
        if (!cancelled) setWatchStatuses(options)
      })
      .catch((error: unknown) => {
        if (!cancelled)
          toast.danger('加载观影状态失败', {
            description: error instanceof Error ? error.message : '请刷新重试',
          })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [revision])
  function refreshWatchStatuses() {
    setLoading(true)
    setRevision((current) => current + 1)
  }
  return { watchStatuses, loadingWatchStatuses, refreshWatchStatuses }
}
