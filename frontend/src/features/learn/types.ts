export type LessonQuestion = {
  id: string
  title: string
  scenario: string
  code?: string
  language?: string
  options: { value: string; label: string }[]
  answer: string
  explanation: string
}

export type LessonSection = { id: string; title: string; description: string }
