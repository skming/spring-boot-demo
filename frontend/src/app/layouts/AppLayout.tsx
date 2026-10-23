import { Avatar, Dropdown, Label } from '@heroui/react'
import { ChevronDown, LogOut } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../providers/auth-context'
import { CopyButton } from '../../shared/components/CopyButton'
import { ThemeSwitcher } from '../../shared/components/ThemeSwitcher'

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex min-h-11 flex-1 items-center justify-center whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:flex-none md:px-4',
    isActive
      ? 'border-accent bg-accent/8 text-accent'
      : 'border-transparent text-muted hover:border-border hover:bg-surface-secondary/60 hover:text-foreground',
  ].join(' ')

export function AppLayout() {
  const { user, logout } = useAuth()
  const initials = Array.from(user?.email.split('@')[0] ?? '用户')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative isolate min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_420px_at_12%_-8%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_60%),radial-gradient(700px_360px_at_92%_0%,color-mix(in_oklab,var(--success)_12%,transparent),transparent_55%)]" />

      <header
        data-app-header
        className="sticky top-0 z-20 border-b border-border/70 bg-surface/85 shadow-xs backdrop-blur-xl"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-8">
          <Link
            to="/movies"
            aria-label="DB Lab 首页"
            className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-focus"
          >
            <span className="shrink-0 text-lg font-bold tracking-tight text-accent">DB Lab</span>
            <span className="truncate border-l border-border pl-3 text-xs text-muted">
              观影手账
            </span>
          </Link>

          <nav
            aria-label="主导航"
            className="col-span-2 row-start-2 -mx-1 flex min-w-0 items-stretch gap-1 border-t border-border/60 md:col-span-1 md:col-start-2 md:row-start-1 md:mx-0 md:gap-2 md:border-t-0"
          >
            <NavLink to="/movies" className={navClass}>
              观影记录
            </NavLink>
            <NavLink to="/lab" className={navClass}>
              工作台
            </NavLink>
            <NavLink to="/logs" className={navClass}>
              日志
            </NavLink>
            <NavLink to="/learn" className={navClass}>
              学习
            </NavLink>
          </nav>

          <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2 py-2 md:col-start-3">
            <ThemeSwitcher />
            <Dropdown>
              <Dropdown.Trigger
                aria-label="打开账户菜单"
                className="flex min-h-9 shrink-0 items-center gap-2 border border-transparent px-1.5 outline-none transition-colors hover:border-border hover:bg-surface-secondary data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus"
              >
                <Avatar
                  size="sm"
                  className="rounded-full bg-accent-soft text-accent-soft-foreground"
                >
                  <Avatar.Fallback delayMs={0}>{initials}</Avatar.Fallback>
                </Avatar>
                <ChevronDown size={14} className="text-muted" aria-hidden="true" />
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end" className="w-64">
                <div className="space-y-2 border-b border-border px-3 py-3">
                  <p className="text-xs text-muted">当前账户</p>
                  <p className="break-all text-sm font-medium">{user?.email}</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="min-w-0 truncate text-[11px] text-muted">{user?.userId}</code>
                    <CopyButton value={user?.userId ?? ''} label="复制用户 ID" />
                  </div>
                </div>
                <Dropdown.Menu
                  aria-label="账户操作"
                  onAction={(key) => {
                    if (key === 'logout') logout()
                  }}
                >
                  <Dropdown.Item id="logout" textValue="退出登录" variant="danger">
                    <Label>退出登录</Label>
                    <LogOut size={16} className="ml-auto text-danger" aria-hidden="true" />
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
