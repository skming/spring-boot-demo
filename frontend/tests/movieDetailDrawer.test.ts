import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Drawer } from '@heroui/react'
import { createServer } from 'vite'
import type { Movie } from '../src/features/movie/types/movie.ts'

test('shared movie details show full notes and viewing history without opening an edit form', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
  })
  try {
    const { MovieDetailDrawer } = await server.ssrLoadModule(
      '/src/features/movie/components/MovieDetailDrawer.tsx',
    )
    const movie: Movie = {
      id: 'movie-id',
      title: '星际穿越',
      director: '诺兰',
      releaseYear: 2014,
      genres: ['科幻'],
      notes: '电影备注\n'.repeat(100) + '备注结尾',
      watchStatus: 'WATCHED',
      watchStatusLabel: '已看',
      rating: 5,
      watchedOn: '2026-10-21',
      createdAt: '',
      updatedAt: '',
      watchRecords: [
        {
          id: 'recent',
          watchedOn: '2026-10-21',
          rating: 5,
          notes: '观影笔记\n'.repeat(100) + '笔记结尾',
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'first',
          watchedOn: '2026-01-01',
          rating: null,
          notes: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
    }
    let edits = 0,
      watches = 0,
      closes = 0
    const props = {
      movie,
      disabled: false,
      onEdit: () => edits++,
      onWatch: () => watches++,
      onClose: () => closes++,
    }
    const tree = MovieDetailDrawer(props)
    const dialog = tree.props.children.props.children
    const body = dialog.props.children.find(
      (child: { type: unknown }) => child.type === Drawer.Body,
    )
    const header = dialog.props.children.find(
      (child: { type: unknown }) => child.type === Drawer.Header,
    )
    const heading = header.props.children.find(
      (child: { type: unknown }) => child.type === Drawer.Heading,
    )
    assert.equal(heading.props.children, movie.title)
    const markup = renderToStaticMarkup(createElement('div', null, body.props.children))
    assert.ok(markup.includes(movie.notes!))
    assert.ok(markup.includes(movie.watchRecords[0].notes))
    assert.match(markup, /2 次观看/)
    assert.match(markup, /2026-10-21/)
    assert.match(markup, /2026-01-01/)
    assert.match(markup, /未评分/)
    assert.match(markup, /未填写观影笔记/)
    assert.doesNotMatch(markup, /line-clamp|truncate|<form|<input|<textarea/)
    assert.equal(edits + watches + closes, 0)
    const footer = dialog.props.children.find(
      (child: { type: unknown }) => child.type === Drawer.Footer,
    )
    assert.match(footer.props.className, /justify-end/)
    footer.props.children[0].props.onPress()
    footer.props.children[1].props.onPress()
    tree.props.onOpenChange(false)
    assert.deepEqual([edits, watches, closes], [1, 1, 1])

    const empty = MovieDetailDrawer({
      ...props,
      disabled: true,
      movie: {
        ...movie,
        notes: null,
        watchRecords: [],
        rating: null,
        watchedOn: null,
        watchStatus: 'WANT_TO_WATCH',
        watchStatusLabel: '想看',
      },
    })
    const emptyDialog = empty.props.children.props.children
    const emptyBody = emptyDialog.props.children.find(
      (child: { type: unknown }) => child.type === Drawer.Body,
    )
    const emptyMarkup = renderToStaticMarkup(createElement('div', null, emptyBody.props.children))
    assert.match(emptyMarkup, /暂无电影备注/)
    assert.match(emptyMarkup, /0 次观看/)
    assert.match(emptyMarkup, /尚未记录观看/)
    assert.match(emptyMarkup, /尚未评分/)
    const emptyFooter = emptyDialog.props.children.find(
      (child: { type: unknown }) => child.type === Drawer.Footer,
    )
    assert.ok(
      emptyFooter.props.children.every(
        (child: { props: { isDisabled: boolean } }) => child.props.isDisabled,
      ),
    )
  } finally {
    await server.close()
  }
})
