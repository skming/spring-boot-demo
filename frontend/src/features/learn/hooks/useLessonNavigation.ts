import { useEffect, useState } from 'react'
import type { LessonSection } from '../types'
import { activeLessonSection } from '../sectionNavigation'

export function useLessonNavigation(sectionDefinitions: LessonSection[]) {
  const [activeId, setActiveId] = useState(sectionDefinitions[0].id)
  const [scrollOffset, setScrollOffset] = useState(112)

  useEffect(() => {
    const sections = sectionDefinitions.flatMap(({ id }) => {
      const element = document.getElementById(id)
      return element ? [{ id, element }] : []
    })
    const header = document.querySelector<HTMLElement>('[data-app-header]')
    let frame: number | null = null
    const update = () => {
      frame = null
      const offset = (header?.getBoundingClientRect().bottom ?? 88) + 24
      const atBottom =
        window.scrollY > 0 &&
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      setScrollOffset(offset)
      setActiveId(
        activeLessonSection(
          sections.map(({ id, element }) => ({ id, top: element.getBoundingClientRect().top })),
          offset,
          atBottom,
        ),
      )
    }
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('hashchange', schedule)
    // Monaco 初始化和题目反馈会改变章节高度，未滚动时也应重新定位。
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    for (const { element } of sections) observer?.observe(element)
    if (header) observer?.observe(header)
    schedule()
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('hashchange', schedule)
      observer?.disconnect()
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [sectionDefinitions])

  return { activeId, scrollOffset, activateSection: setActiveId }
}
