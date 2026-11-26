import { defineStore } from 'pinia'
import { appCodeStorage, createStorage } from 'udp/utils/Storage'
import * as appTheme from '@/config/theme-overrides'
import { addColorAlpha } from 'udp/utils/color'

export type Layout = 'singlePage' | 'topPage' | 'menuPage' | undefined | null
interface AppStore {
  themeMode: string
  theme: string
  layout: Layout
  isHeader: boolean
  isMenu: boolean
  contentHeight: string
  isLoadingAnimate: boolean
}
const Storage = appCodeStorage
const session = createStorage({ storage: sessionStorage })
const storeThemeMode = Storage.get('themeMode')
const storeTheme = session.get(`theme`) || Storage.get(`theme`)
const currentTheme = storeTheme ?? appTheme.theme
const setRootColor = (theme: string) => {
  document.body.style.setProperty('--mx-primary', theme)
  document.body.style.setProperty('--mx-primary-opacity', addColorAlpha(theme, 0.1))
}
setRootColor(currentTheme)
const defaultLayout = appTheme.pageLayout
export const udpAppStore = defineStore('app-store', {
  state: (): AppStore => ({
    themeMode: storeThemeMode ?? appTheme.themeMode ?? 'light',
    theme: currentTheme,
    layout: defaultLayout,
    isHeader: true,
    isMenu: true,
    contentHeight: '100vh',
    isLoadingAnimate: true
  }),
  actions: {
    // 设置mode
    setThemeMode(mode: 'light' | 'dark') {
      this.themeMode = mode
      Storage.set('themeMode', mode)
    },
    // 设置theme，不进行本地存储
    setThemeToStore(theme: string) {
      this.theme = theme
      setRootColor(theme)
      session.set(`theme`, theme)
    },
    // 设置theme
    setTheme(theme: string) {
      Storage.set(`theme`, theme)
      this.setThemeToStore(theme)
    },
    // 设置布局类型
    setLayout(layout?: Layout) {
      this.layout = layout === 'singlePage' ? layout : defaultLayout || layout
      switch (this.layout) {
        case 'singlePage':
          this.isHeader = false
          this.isMenu = false
          break
        case 'topPage':
          this.isHeader = true
          this.isMenu = false
          break
        case 'menuPage':
          this.isHeader = false
          this.isMenu = true
          break
        default:
          this.isHeader = true
          this.isMenu = true
          break
      }
    },
    // 设置contentHeight的高
    setContentHeight(h: string) {
      this.contentHeight = h
    },
    // 设置loading
    setLoading(isLoading: boolean) {
      if (!isLoading && this.isLoadingAnimate) {
        const parent = document.querySelector('#app-mask')
        parent && parent.remove()
      }
      this.isLoadingAnimate = isLoading
    }
  }
})
