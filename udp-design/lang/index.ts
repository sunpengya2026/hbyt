import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import plugin from '@/config/plugin'

const { definedVueI18nConfig } = plugin

const defaultConfig = {
  legacy: false,
  locale: 'lang',
  messages: {
    lang: {}
  },
  silentTranslationWarn: true
}

export const i18n = createI18n({ ...defaultConfig, ...(definedVueI18nConfig ? definedVueI18nConfig() : {}) })

export function setupLang(app: App<Element>) {
  app.use(i18n)
  window.t = i18n.global.t
}
