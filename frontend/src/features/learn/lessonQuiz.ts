import type { LessonQuestion } from './types.ts'

export type QuizState = { selected: string; feedback: 'idle' | 'missing' | 'correct' | 'incorrect' }
export type QuizAction = { type: 'select'; value: string } | { type: 'check' } | { type: 'reset' }
export const EMPTY_QUIZ: QuizState = { selected: '', feedback: 'idle' }

export function reduceQuiz(
  question: LessonQuestion,
  state: QuizState,
  action: QuizAction,
): QuizState {
  if (action.type === 'reset') return { ...EMPTY_QUIZ }
  if (action.type === 'select') {
    return {
      selected: question.options.some((option) => option.value === action.value)
        ? action.value
        : '',
      feedback: 'idle',
    }
  }
  if (!question.options.some((option) => option.value === state.selected))
    return { ...state, feedback: 'missing' }
  return { ...state, feedback: state.selected === question.answer ? 'correct' : 'incorrect' }
}
