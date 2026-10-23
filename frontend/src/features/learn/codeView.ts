export const LESSON_CODE_LINE_HEIGHT = 24
export const LESSON_CODE_PADDING = 32

export function formatLessonCode(code: string, language: string): string {
  if (language === 'json') {
    try {
      return JSON.stringify(JSON.parse(code), null, 2)
    } catch {
      // 不完整或故意错误的教学示例保留原文。
      return code
    }
  }
  return code
}

export function lessonCodeHeight(contentHeight: number): number {
  return Math.min(420, Math.max(80, Math.ceil(contentHeight)))
}
