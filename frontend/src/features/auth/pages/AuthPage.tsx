import {
  Button,
  Card,
  Chip,
  FieldError,
  Input,
  Label,
  Surface,
  TextField,
  toast,
} from '@heroui/react'
import { useMemo, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/auth-context'
import { ApiError } from '../../../shared/api/http'
import { login, register } from '../api/authApi'
import { ThemeSwitcher } from '../../../shared/components/ThemeSwitcher'
import { loginSchema, registerSchema } from '../authSchema'

type Mode = 'login' | 'register'

type FieldErrors = {
  email?: string
  password?: string
}

export function AuthPage() {
  const { applyAuth, isAuthenticated } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [pending, setPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const validation = useMemo(
    () => (mode === 'login' ? loginSchema : registerSchema).safeParse({ email, password }),
    [email, mode, password],
  )
  const liveErrors =
    !validation.success && submitted ? z.flattenError(validation.error).fieldErrors : {}

  const errors = {
    email: fieldErrors.email ?? liveErrors.email?.[0],
    password: fieldErrors.password ?? liveErrors.password?.[0],
  }

  if (isAuthenticated) {
    return <Navigate to="/movies" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setSubmitted(true)
    setFieldErrors({})

    if (!validation.success) {
      toast.danger('请先修正表单错误')
      return
    }

    setPending(true)
    try {
      const response =
        mode === 'login' ? await login(validation.data) : await register(validation.data)
      applyAuth(response)
      toast.success(mode === 'login' ? '登录成功' : '注册成功')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors.email || err.fieldErrors.password) {
          setFieldErrors({
            email: err.fieldErrors.email,
            password: err.fieldErrors.password,
          })
          toast.danger(err.message || '请检查输入')
        } else if (err.status === 409) {
          setFieldErrors({ email: err.message })
          toast.danger(err.message)
        } else if (err.status === 401) {
          setFieldErrors({ password: err.message })
          toast.danger(err.message)
        } else {
          toast.danger(err.message || '认证失败')
        }
      } else {
        toast.danger(err instanceof Error ? err.message : '认证失败')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitcher />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_360px_at_20%_10%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_60%),radial-gradient(560px_300px_at_85%_80%,color-mix(in_oklab,var(--warning)_14%,transparent),transparent_55%)]" />

      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Surface
          variant="tertiary"
          className="hidden flex-col justify-between border border-accent/15 bg-gradient-to-br from-accent/15 via-surface to-success/10 p-8 lg:flex"
        >
          <div className="space-y-4">
            <Chip color="accent" size="sm" variant="soft">
              <Chip.Label>观影手账</Chip.Label>
            </Chip>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              收藏想看的电影
              <span className="mt-2 block bg-gradient-to-r from-accent to-success bg-clip-text text-transparent">
                留下看过的故事
              </span>
            </h1>
            <p className="max-w-md text-sm leading-6 text-muted">
              管理个人片单，记录观影评分与笔记，也可以在 SQL 工作台查询和编辑数据。
            </p>
          </div>

          <div className="grid gap-3">
            <Surface variant="secondary" className="p-4">
              <p className="text-xs font-semibold tracking-wide text-accent">观影记录</p>
              <p className="mt-1 text-sm text-foreground">收藏电影、记录评分、整理观影笔记</p>
            </Surface>
            <Surface variant="secondary" className="p-4">
              <p className="text-xs font-semibold tracking-wide text-success">SQL 工作台</p>
              <p className="mt-1 text-sm text-foreground">查看表结构，执行查询与数据修改</p>
            </Surface>
            <Surface variant="secondary" className="p-4">
              <p className="text-xs font-semibold tracking-wide text-warning-soft-foreground">
                操作日志
              </p>
              <p className="mt-1 text-sm text-foreground">按时间与执行状态查看操作记录</p>
            </Surface>
          </div>
        </Surface>

        <Card className="gap-6 border border-border/80 bg-surface/95 p-6 shadow-xl shadow-accent/10 backdrop-blur sm:p-8">
          <Card.Header className="space-y-3">
            <div className="flex items-center gap-2">
              <Card.Title className="text-xl">DB Lab</Card.Title>
              <Chip color="accent" size="sm" variant="soft">
                <Chip.Label>观影手账</Chip.Label>
              </Chip>
            </div>
            <Card.Description>
              {mode === 'login'
                ? '登录以管理你的片单和观影记录。'
                : '创建账号，开始记录你的观影生活。'}
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <TextField
                isRequired
                name="email"
                variant="secondary"
                isInvalid={Boolean(errors.email)}
              >
                <Label>邮箱</Label>
                <Input
                  autoComplete="email"
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setFieldErrors((current) => ({ ...current, email: undefined }))
                  }}
                />
                <FieldError>{errors.email}</FieldError>
              </TextField>

              <TextField
                isRequired
                name="password"
                variant="secondary"
                isInvalid={Boolean(errors.password)}
              >
                <Label>密码</Label>
                <Input
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'register' ? '至少 8 位' : '请输入密码'}
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setFieldErrors((current) => ({ ...current, password: undefined }))
                  }}
                />
                <FieldError>{errors.password}</FieldError>
              </TextField>

              <Button fullWidth isPending={pending} type="submit">
                {mode === 'login' ? '登录' : '注册并进入'}
              </Button>
            </form>
          </Card.Content>
          <Card.Footer className="justify-between gap-2">
            <span className="text-sm text-muted">
              {mode === 'login' ? '还没有账号？' : '已经有账号？'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setMode((current) => (current === 'login' ? 'register' : 'login'))
                setFieldErrors({})
                setSubmitted(false)
              }}
            >
              {mode === 'login' ? '去注册' : '去登录'}
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </div>
  )
}
