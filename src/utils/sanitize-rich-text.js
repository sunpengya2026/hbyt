import DOMPurify from 'dompurify'

export function sanitizeRichText(value) {
  if (!DOMPurify.isSupported || typeof value !== 'string') return ''

  return DOMPurify.sanitize(value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select']
  })
}
