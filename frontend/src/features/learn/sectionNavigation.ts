export type SectionPosition = { id: string; top: number }

/** 输入顺序为文档顺序；长章节持续激活，直到下一个章节越过顶部阅读线。 */
export function activeLessonSection(
  sections: SectionPosition[],
  readingOffset: number,
  atBottom: boolean,
): string {
  if (!sections.length) return ''
  if (atBottom) return sections[sections.length - 1].id
  let active = sections[0].id
  for (const section of sections) {
    if (section.top <= readingOffset + 1) active = section.id
  }
  return active
}
