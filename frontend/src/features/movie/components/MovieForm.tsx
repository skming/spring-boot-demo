import {
  Description,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  TextArea,
  TextField,
  toast,
} from '@heroui/react'
import type { FormEvent } from 'react'
import type { MovieInput } from '../types/movie'
import { MOVIE_GENRES } from '../movieView'
import { MAX_RELEASE_YEAR, MIN_RELEASE_YEAR } from '../movieSchema'

type MovieFormProps = {
  form: MovieInput
  disabled: boolean
  onChange: (form: MovieInput) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function MovieForm({ form, disabled, onChange, onSubmit }: MovieFormProps) {
  return (
    <form id="movie-record-form" noValidate onSubmit={onSubmit} className="space-y-4">
      <TextField name="title" isRequired isDisabled={disabled} variant="secondary">
        <Label>片名</Label>
        <Input
          autoFocus
          maxLength={100}
          value={form.title}
          placeholder="例如：星际穿越"
          onChange={(event) => onChange({ ...form, title: event.target.value })}
        />
      </TextField>
      <TextField name="director" isRequired isDisabled={disabled} variant="secondary">
        <Label>导演</Label>
        <Input
          maxLength={100}
          value={form.director}
          onChange={(event) => onChange({ ...form, director: event.target.value })}
        />
      </TextField>
      <NumberField
        name="releaseYear"
        isRequired
        isDisabled={disabled}
        variant="secondary"
        value={form.releaseYear ?? NaN}
        minValue={MIN_RELEASE_YEAR}
        maxValue={MAX_RELEASE_YEAR}
        step={1}
        formatOptions={{ useGrouping: false, maximumFractionDigits: 0 }}
        onChange={(value) =>
          onChange({ ...form, releaseYear: value == null || Number.isNaN(value) ? null : value })
        }
      >
        <Label>发行年份</Label>
        <NumberField.Group>
          <NumberField.Input placeholder="例如：2014" />
        </NumberField.Group>
        <Description>填写 1888–2100 之间的年份。</Description>
      </NumberField>
      <Select
        value={form.genres}
        selectionMode="multiple"
        isRequired
        placeholder="选择电影类型"
        isDisabled={disabled}
        variant="secondary"
        onChange={(keys) => {
          const genres = keys?.map(String) ?? []
          if (genres.length > 8) {
            toast.warning('最多选择 8 个类型')
            return
          }
          onChange({ ...form, genres })
        }}
      >
        <Label>类型（可多选）</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {Array.from(new Set([...MOVIE_GENRES, ...form.genres])).map((genre) => (
              <ListBox.Item key={genre} id={genre} textValue={genre}>
                {genre}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <TextField name="notes" isDisabled={disabled} variant="secondary">
        <Label>电影备注 / 想看理由</Label>
        <TextArea
          rows={4}
          maxLength={1000}
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
        />
      </TextField>
      <p className="text-xs leading-6 text-muted">
        这里只修改电影资料。观影日期、评分与每次的笔记在“记录观影”中管理。
      </p>
    </form>
  )
}
