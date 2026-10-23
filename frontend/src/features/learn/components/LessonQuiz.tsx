import { Button, Label, Radio, RadioGroup } from '@heroui/react'
import { useId, useReducer } from 'react'
import { EMPTY_QUIZ, reduceQuiz, type QuizAction, type QuizState } from '../lessonQuiz'
import type { LessonQuestion } from '../types'
import { LessonCode } from './LessonCode'

export function LessonQuiz({ question, index }: { question: LessonQuestion; index: number }) {
  return <QuizForm key={JSON.stringify(question)} question={question} index={index} />
}

function QuizForm({ question, index }: { question: LessonQuestion; index: number }) {
  const feedbackId = useId()
  const [state, dispatch] = useReducer(
    (current: QuizState, action: QuizAction) => reduceQuiz(question, current, action),
    EMPTY_QUIZ,
  )
  const checked = state.feedback === 'correct' || state.feedback === 'incorrect'
  return (
    <form
      aria-label={question.title}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        dispatch({ type: 'check' })
      }}
    >
      <p className="text-sm leading-7 text-muted">{question.scenario}</p>
      {question.code ? (
        <LessonCode
          filename="演示语句 · 不会执行"
          code={question.code}
          language={question.language}
        />
      ) : null}
      <RadioGroup
        name={question.id}
        value={state.selected}
        variant="secondary"
        aria-describedby={feedbackId}
        onChange={(value) => dispatch({ type: 'select', value })}
      >
        <Label className="mb-1 font-semibold">
          {index + 1}. {question.title}
        </Label>
        {question.options.map((option) => (
          <Radio key={option.value} value={option.value} className="w-full">
            <Radio.Content className="w-full gap-3 border border-border bg-surface px-4 py-3 data-[selected=true]:border-accent/50 data-[selected=true]:bg-accent-soft">
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <span className="text-sm">{option.label}</span>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          检查判断
        </Button>
        <Button
          type="button"
          size="sm"
          variant="tertiary"
          isDisabled={!state.selected && state.feedback === 'idle'}
          onPress={() => dispatch({ type: 'reset' })}
        >
          重新作答
        </Button>
      </div>
      <div
        id={feedbackId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`min-h-6 text-sm leading-7 ${state.feedback === 'correct' ? 'text-success-soft-foreground' : state.feedback === 'idle' ? 'text-muted' : 'text-warning-soft-foreground'}`}
      >
        {state.feedback === 'missing' ? (
          '请先选择一个答案。'
        ) : checked ? (
          <p>
            <span className="font-semibold">
              {state.feedback === 'correct' ? '判断正确。' : '再想一步。'}
            </span>
            {question.explanation}
          </p>
        ) : (
          '选择后检查判断，可以改选后再试一次。'
        )}
      </div>
    </form>
  )
}
