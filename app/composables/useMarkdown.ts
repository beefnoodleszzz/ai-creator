import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  breaks: true,
  linkify: true,
})

export function useMarkdown() {
  const purifier = shallowRef<typeof import('dompurify').default | null>(null)

  onMounted(async () => {
    const module = await import('dompurify')
    purifier.value = module.default
  })

  function renderMarkdown(source: string) {
    const html = markdown.render(source || '')

    if (!purifier.value) {
      return ''
    }

    return purifier.value.sanitize(html)
  }

  return {
    renderMarkdown,
  }
}
