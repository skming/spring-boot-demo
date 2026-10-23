import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const blocks = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
const variables = (selector: string) => {
  const block = blocks.find((match) => match[1].includes(selector))
  assert.ok(block)
  return Object.fromEntries(
    Array.from(block[2].matchAll(/(--[\w-]+):\s*([^;]+);/g), (match) => [match[1], match[2]]),
  )
}
const light = variables(':root')
const themes = { light, dark: { ...light, ...variables('.dark') } }

// 这里只转换项目中的不透明 OKLCH token，不是通用 CSS 颜色解析器。
function oklab(tokens: Record<string, string>, name: string): number[] {
  const value = tokens[name]
  assert.ok(value, `Missing theme token: ${name}`)
  const reference = value.match(/^var\((--[\w-]+)\)$/)
  if (reference) return oklab(tokens, reference[1])
  const mix = value.match(
    /^color-mix\(in oklab, var\((--[\w-]+)\) ([\d.]+)%, var\((--[\w-]+)\) ([\d.]+)%\)$/,
  )
  if (mix) {
    const first = oklab(tokens, mix[1]),
      second = oklab(tokens, mix[3])
    const weight = Number(mix[2]) / (Number(mix[2]) + Number(mix[4]))
    return first.map((channel, index) => channel * weight + second[index] * (1 - weight))
  }
  const color = value.match(/^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)$/)
  assert.ok(color, `Unsupported test color: ${value}`)
  const lightness = Number(color[1]) / 100
  const chroma = Number(color[2])
  const hue = (Number(color[3]) * Math.PI) / 180
  const a = chroma * Math.cos(hue),
    b = chroma * Math.sin(hue)
  return [lightness, a, b]
}

function luminance(tokens: Record<string, string>, name: string): number {
  const [lightness, a, b] = oklab(tokens, name)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.min(1, Math.max(0, channel)))
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

const textPairs = [
  ['--foreground', '--background'],
  ['--foreground', '--surface'],
  ['--muted', '--surface'],
  ['--muted', '--surface-secondary'],
  ['--muted', '--surface-tertiary'],
  ['--field-placeholder', '--field-background'],
  ['--field-foreground', '--field-background'],
  ['--accent', '--surface'],
  ['--accent-foreground', '--accent'],
  ['--default-foreground', '--default'],
  ['--overlay-foreground', '--overlay'],
  ['--success-foreground', '--success'],
  ['--success', '--surface-secondary'],
  ['--success', '--surface-tertiary'],
  ['--warning-foreground', '--warning'],
  ['--danger-foreground', '--danger'],
  ['--danger', '--surface'],
  ['--danger', '--surface-secondary'],
  ['--danger', '--surface-tertiary'],
  ['--success-soft-foreground', '--success-soft'],
  ['--success-soft-foreground', '--success-soft-hover'],
  ['--warning-soft-foreground', '--warning-soft'],
  ['--warning-soft-foreground', '--warning-soft-hover'],
  ['--warning-soft-foreground', '--surface'],
  ['--warning-soft-foreground', '--surface-secondary'],
  ['--accent-foreground', '--accent-hover'],
  ['--success-foreground', '--success-hover'],
  ['--warning-foreground', '--warning-hover'],
  ['--danger-foreground', '--danger-hover'],
]

test('palette contrast calculation handles black and white reference colors', () => {
  const references = { black: 'oklch(0% 0 0)', white: 'oklch(100% 0 0)' }
  assert.equal(luminance(references, 'black'), 0)
  assert.ok(Math.abs(luminance(references, 'white') - 1) < 0.000001)
})

for (const [theme, tokens] of Object.entries(themes)) {
  test(`${theme} theme text pairs maintain minimum contrast`, () => {
    const failures = textPairs.flatMap(([foreground, background]) => {
      const fg = luminance(tokens, foreground),
        bg = luminance(tokens, background)
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
      return ratio >= 4.5 ? [] : [`${foreground} / ${background}: ${ratio.toFixed(2)}:1`]
    })
    assert.deepEqual(failures, [], failures.join('\n'))
  })
}
