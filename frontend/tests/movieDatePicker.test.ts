import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cloneElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('date picker preserves ISO values and renders its calendar actions without slot errors', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  try {
    const { MovieDatePicker } = await server.ssrLoadModule(
      '/src/features/movie/components/MovieDatePicker.tsx',
    )
    let changed: string | null = '2026-10-06'
    const picker = MovieDatePicker({
      value: changed,
      disabled: false,
      onChange: (date: string | null) => {
        changed = date
      },
    })
    const markup = renderToStaticMarkup(picker)
    assert.match(markup, /value="2026-10-06"/)
    assert.match(markup, /观影日期/)
    assert.match(markup, /aria-label="选择观影日期"/)

    // Portals are omitted by SSR. Render the actual popover children in their
    // DatePicker context to exercise Calendar's strict button-slot validation.
    const popover = picker.props.children[2]
    const panel = popover.props.children
    const openContent = cloneElement(picker, {}, panel)
    assert.doesNotThrow(() => renderToStaticMarkup(openContent))
    assert.match(renderToStaticMarkup(openContent), /清空日期/)
    const clear = panel.props.children[1] as ReactElement<{ onPress: () => void }>
    clear.props.onPress()
    assert.equal(changed, null)

    const disabled = MovieDatePicker({ value: null, disabled: true, onChange: () => {} })
    assert.match(renderToStaticMarkup(disabled), /disabled/)
    assert.equal(
      disabled.props.maxValue.toString(),
      new Date().getFullYear() +
        '-' +
        String(new Date().getMonth() + 1).padStart(2, '0') +
        '-' +
        String(new Date().getDate()).padStart(2, '0'),
    )
  } finally {
    await server.close()
  }
})
