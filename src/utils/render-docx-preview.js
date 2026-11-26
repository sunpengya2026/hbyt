export async function renderDocxPreview(blob, container, isCurrent = () => true) {
  const { parseAsync, renderDocument } = await import(
    /* webpackChunkName: "docx-preview" */ 'docx-preview'
  )
  const options = {
    className: 'docx-wrapper',
    ignoreHeight: true,
    renderAltChunks: false,
    experimental: true
  }
  const doc = await parseAsync(blob, options)
  const nodes = await renderDocument(doc, options)
  if (!isCurrent() || !container.isConnected) return

  const fragment = document.createDocumentFragment()
  nodes.forEach(node => fragment.appendChild(node))
  fragment.querySelectorAll('a[href]').forEach(link => {
    if (!['https:', 'http:', 'mailto:'].includes(link.protocol)) {
      link.removeAttribute('href')
    }
  })
  container.textContent = ''
  container.appendChild(fragment)
}
