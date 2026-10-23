import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@heroui/react'
import {
  createMovie,
  deleteMovie,
  listMovies,
  updateMovie,
  saveWatchRecord,
  deleteWatchRecord,
} from '../api/movieApi'
import type { Movie, WatchRecordInput } from '../types/movie'
import type { MoviePayload } from '../movieSchema'

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (savingRef.current) return
    setLoading(true)
    try {
      const data = await listMovies()
      setMovies(data)
      setLoaded(true)
    } catch (err) {
      toast.danger('加载观影记录失败', {
        description: err instanceof Error ? err.message : '请稍后刷新重试',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const data = await listMovies()
        if (!cancelled) {
          setMovies(data)
          setLoaded(true)
        }
      } catch (err) {
        if (!cancelled) {
          toast.danger('加载观影记录失败', {
            description: err instanceof Error ? err.message : '请稍后刷新重试',
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const create = useCallback(async (input: MoviePayload) => {
    if (savingRef.current) throw new Error('已有保存操作正在进行')
    savingRef.current = true
    setSaving(true)
    try {
      const created = await createMovie(input)
      setMovies((current) => [created, ...current])
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建观影记录失败'
      toast.danger('未能加入片单', { description: message })
      throw err
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [])

  const update = useCallback(async (id: string, input: MoviePayload) => {
    if (savingRef.current) throw new Error('已有保存操作正在进行')
    savingRef.current = true
    setSaving(true)
    try {
      const updated = await updateMovie(id, input)
      setMovies((current) => current.map((movie) => (movie.id === id ? updated : movie)))
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新观影记录失败'
      toast.danger('观影记录未保存', { description: message })
      throw err
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    if (savingRef.current) throw new Error('已有保存操作正在进行')
    savingRef.current = true
    setSaving(true)
    try {
      await deleteMovie(id)
      setMovies((current) => current.filter((movie) => movie.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除观影记录失败'
      toast.danger('观影记录未删除', { description: message })
      throw err
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [])

  const mutateWatch = useCallback(
    async (id: string, recordId: string | null, input: WatchRecordInput | null) => {
      if (savingRef.current) throw new Error('已有保存操作正在进行')
      savingRef.current = true
      setSaving(true)
      try {
        const updated = input
          ? await saveWatchRecord(id, recordId, input)
          : await deleteWatchRecord(id, recordId!)
        setMovies((current) => current.map((movie) => (movie.id === id ? updated : movie)))
        return updated
      } catch (err) {
        toast.danger('观影记录未保存', {
          description: err instanceof Error ? err.message : '请稍后重试',
        })
        throw err
      } finally {
        savingRef.current = false
        setSaving(false)
      }
    },
    [],
  )

  return {
    movies,
    loading,
    loaded,
    saving,
    refresh,
    create,
    update,
    remove,
    mutateWatch,
  }
}
