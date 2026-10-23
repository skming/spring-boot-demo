import { Button, Calendar, DateField, DatePicker, Label } from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { localDate } from '../movieView'

type MovieDatePickerProps = {
  value: string | null
  disabled: boolean
  onChange: (value: string | null) => void
}

export function MovieDatePicker({ value, disabled, onChange }: MovieDatePickerProps) {
  return (
    <DatePicker
      name="watchedOn"
      className="min-w-0"
      isRequired
      isDisabled={disabled}
      value={value ? parseDate(value) : null}
      maxValue={parseDate(localDate())}
      granularity="day"
      shouldForceLeadingZeros
      validationBehavior="native"
      onChange={(date) => onChange(date?.toString() ?? null)}
    >
      <Label>观影日期</Label>
      <DateField.Group fullWidth variant="secondary" className="min-w-0">
        <DateField.Input className="text-sm">
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger aria-label="选择观影日期">
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <div className="space-y-2">
          <Calendar aria-label="观影日期">
            <Calendar.Header>
              <Calendar.NavButton slot="previous" />
              <Calendar.Heading />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
          <Button
            size="sm"
            variant="ghost"
            fullWidth
            isDisabled={!value}
            onPress={() => onChange(null)}
          >
            清空日期
          </Button>
        </div>
      </DatePicker.Popover>
    </DatePicker>
  )
}
