import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EMPTY_QUIZ, reduceQuiz } from '../src/features/learn/lessonQuiz.ts'
import { COURSE_SECTIONS as LESSON_SECTIONS, LESSONS } from '../src/features/learn/curriculum.ts'
const TRANSACTION_QUESTIONS = LESSONS.map((lesson) => lesson.quiz)

test('the shown repeat-viewing answer is correct regardless of option order', () => {
  const question = LESSONS.find((lesson) => lesson.id === 'data-model')!.quiz
  for (const options of [question.options, [...question.options].reverse()]) {
    const current = { ...question, options }
    const selected = options.find(
      (option) => option.label === '只增加一条 watch_records，引用原电影',
    )!
    assert.ok(selected)
    const state = reduceQuiz(current, EMPTY_QUIZ, { type: 'select', value: selected.value })
    assert.equal(reduceQuiz(current, state, { type: 'check' }).feedback, 'correct')
    const wrong = options.find((option) => option.label === '增加一条 movies，复制电影资料')!
    assert.equal(
      reduceQuiz(current, { selected: wrong.value, feedback: 'idle' }, { type: 'check' }).feedback,
      'incorrect',
    )
  }
  assert.match(question.explanation, /电影总数不变/)
})

test('reordering any question preserves its selected answer identity', () => {
  for (const question of TRANSACTION_QUESTIONS) {
    const selected = reduceQuiz(question, EMPTY_QUIZ, { type: 'select', value: question.answer })
    assert.equal(
      reduceQuiz({ ...question, options: [...question.options].reverse() }, selected, {
        type: 'check',
      }).feedback,
      'correct',
    )
  }
})

test('lesson questions have distinct ids, balanced options and varied correct answer positions', () => {
  assert.equal(
    new Set(TRANSACTION_QUESTIONS.map((question) => question.id)).size,
    TRANSACTION_QUESTIONS.length,
  )
  assert.equal(new Set(LESSON_SECTIONS.map((section) => section.id)).size, LESSON_SECTIONS.length)
  for (const question of TRANSACTION_QUESTIONS) {
    assert.equal(question.options.filter((option) => option.value === question.answer).length, 1)
    assert.equal(
      new Set(question.options.map((option) => option.label)).size,
      question.options.length,
    )
  }
  assert.equal(
    new Set(
      TRANSACTION_QUESTIONS.map((question) =>
        question.options.findIndex((option) => option.value === question.answer),
      ),
    ).size,
    2,
  )
})

test('checking an unanswered question requests a selection and does not invent an answer', () => {
  const state = reduceQuiz(TRANSACTION_QUESTIONS[0], EMPTY_QUIZ, { type: 'check' })
  assert.deepEqual(state, { selected: '', feedback: 'missing' })
  assert.deepEqual(EMPTY_QUIZ, { selected: '', feedback: 'idle' })
})

test('each question evaluates correct and incorrect choices independently', () => {
  for (const question of TRANSACTION_QUESTIONS) {
    for (const option of question.options) {
      const selected = reduceQuiz(question, EMPTY_QUIZ, { type: 'select', value: option.value })
      assert.equal(selected.feedback, 'idle')
      assert.equal(
        reduceQuiz(question, selected, { type: 'check' }).feedback,
        option.value === question.answer ? 'correct' : 'incorrect',
      )
    }
  }
})

test('changing a checked answer clears stale feedback and reset returns to an unanswered state', () => {
  const question = TRANSACTION_QUESTIONS[0]
  const checked = reduceQuiz(
    question,
    { selected: question.answer, feedback: 'idle' },
    { type: 'check' },
  )
  const next = question.options.find((option) => option.value !== question.answer)!
  const changed = reduceQuiz(question, checked, { type: 'select', value: next.value })
  assert.deepEqual(changed, { selected: next.value, feedback: 'idle' })
  assert.deepEqual(reduceQuiz(question, checked, { type: 'reset' }), EMPTY_QUIZ)
  assert.equal(checked.feedback, 'correct')
})

test('an unknown option cannot count as an answered question', () => {
  const question = TRANSACTION_QUESTIONS[0]
  const selected = reduceQuiz(question, EMPTY_QUIZ, { type: 'select', value: 'not-an-option' })
  assert.equal(selected.selected, '')
  assert.equal(reduceQuiz(question, selected, { type: 'check' }).feedback, 'missing')
})
