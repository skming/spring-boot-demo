function snapshot(detail: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(detail)
    if (!parsed || typeof parsed !== 'object') return null
    const change = parsed as Record<string, unknown>
    const record = change.after ?? change.before
    return record && typeof record === 'object' && !Array.isArray(record)
      ? (record as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function previewLogDetail(detail: string): string {
  const movie = snapshot(detail)
  const text =
    movie && typeof movie.title === 'string'
      ? [
          movie.title,
          typeof movie.watchStatusLabel === 'string' ? movie.watchStatusLabel : movie.watchStatus,
          Array.isArray(movie.genres) ? movie.genres.join(' / ') : '',
          movie.rating == null ? '' : `${movie.rating} 星`,
        ]
          .filter(Boolean)
          .join(' · ')
      : detail.replace(/\s+/g, ' ').trim()
  return text.length > 48 ? `${text.slice(0, 48)}…` : text || '—'
}

export function formatLogDetail(detail: string): string {
  if (!detail) return '—'
  try {
    return JSON.stringify(JSON.parse(detail), null, 2)
  } catch {
    return detail
  }
}
