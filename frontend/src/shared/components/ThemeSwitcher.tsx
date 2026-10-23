import { Dropdown, Label } from '@heroui/react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

const options = [
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
  { id: 'system', label: '跟随系统', icon: Monitor },
] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const current = options.find((option) => option.id === theme) ?? options[2]
  const Icon = current.icon
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`切换主题，当前：${current.label}`}
        className="flex size-9 shrink-0 items-center justify-center border-0 bg-transparent text-muted transition-colors hover:bg-accent-soft hover:text-accent data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus"
      >
        <Icon size={18} aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="min-w-44">
        <Dropdown.Menu
          aria-label="选择主题"
          selectionMode="single"
          selectedKeys={new Set([current.id])}
          onAction={(key) => {
            if (options.some((option) => option.id === key)) setTheme(String(key))
          }}
        >
          {options.map(({ id, label, icon: OptionIcon }) => (
            <Dropdown.Item key={id} id={id} textValue={label}>
              <OptionIcon size={16} className="text-muted" aria-hidden="true" />
              <Label>{label}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
