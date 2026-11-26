import { defineStore } from 'pinia'
import { i18n } from 'udp/lang'
import { $api } from 'udp/utils/service/request'
import { appCodeStorage } from 'udp/utils/Storage'
import { router } from 'udp/router'
import * as userConfig from '@/config/theme-overrides'
import plugin from '@/config/plugin'
import langConf from 'udp/lang/langConf'
import { systemModules } from 'udp/store/views-module'

const systemConfig = systemModules['../../src/config/system-config.ts']
const modulesDefault = import.meta.glob('./locale/**.js')
const modulesUser = import.meta.glob('../../src/lang/**.js')
const { handleLangChange } = plugin

const mergeObjectKey = (target: Record<string, any>, o: Record<string, any>, k?: string) => {
  for (const key in o) {
    const keyStr = `${k ? k + '.' : ''}${key}`
    if (typeof o[key] === 'object') {
      mergeObjectKey(target, o[key], keyStr)
    } else {
      target[keyStr] = o[key]
    }
  }
}

interface langOption {
  appCode?: string
  code?: string
  id?: string
  name?: string
}
interface LangStore {
  selectedLang: string
  lang: langOption[] | null | undefined
  fulfilled: string[]
}
const noQueryLanguage = userConfig.noQueryLanguage as string[] | null | undefined
const queryLanguageType = userConfig.definedQueryLanguageType || ['menu', 'front', 'data']
export const udpLangStore = defineStore('language-store', {
  state: (): LangStore => ({
    selectedLang: appCodeStorage.get('lang') || userConfig.defaultLanguage || 'zh_CN',
    lang:
      noQueryLanguage?.map(v => ({
        id: v,
        code: v,
        name: langConf.locale.find(o => o.id === v)?.name || v
      })) || null,
    fulfilled: []
  }),
  getters: {},
  actions: {
    // 设置语言
    setLang(code?: string) {
      code && (this.selectedLang = code)
      const _l = this.selectedLang
      const cla = document.body.getAttribute('class')
      const current = cla?.includes('lang-')
        ? cla?.replace(/lang-.*/, `lang-${_l}`)
        : `${cla ? cla + ' ' : ''}lang-${_l}`
      document.body.setAttribute('class', current)
      appCodeStorage.set('lang', _l)
    },
    // 设置语言信息
    async setLanguageMessage(code?: string, fulfilled?: string[]) {
      this.setLang(code)
      const _l = this.selectedLang
      const langMsg = []
      // 框架本地配置
      const defaultLangMsg = modulesDefault[`./locale/${_l}.js`]
      defaultLangMsg && langMsg.push(defaultLangMsg())
      // 用户本地配置
      const userLangMsg = modulesUser[`../../src/lang/${_l}.js`]
      userLangMsg && langMsg.push(userLangMsg())
      // 远程多语言配置
      // const types = fulfilled || queryLanguageType
      // if (!noQueryLanguage) {
      //   const systemConfigObj = systemConfig ? await systemConfig() : null
      //   const appCode = window.udpGlobalConfig?.UDP_APP_CODE || import.meta.env.UDP_APP_CODE
      //   if (systemConfigObj?.default.customGetLanguage) {
      //     langMsg.push(systemConfigObj.default.customGetLanguage(appCode, _l))
      //   } else {
      //     types.forEach(v => {
      //       langMsg.push($api.get(`/sys/i18n/query/${appCode}/${_l}/${v}`, {}, { ignoreBaseUri: true }))
      //     })
      //   }
      // }
      // 获取配置信息
      Promise.allSettled(langMsg)
        .then(res => {
          this.fulfilled = []
          // if (!noQueryLanguage) {
          //   const con = res.length - 3 - 1
          //   res.forEach((v: any, i) => {
          //     if (!v.value && i > con) {
          //       this.fulfilled.push(types[i - con - 1])
          //     }
          //   })
          // }
          const localeMsg = res
            .filter((v: any) => v.value)
            .map((v: any) => v.value)
            .reduce((pre, cur) => {
              const t = Object.prototype.toString.call(cur)
              let msg: any = {}
              if (t === '[object Module]') {
                mergeObjectKey(msg, cur.default)
              } else {
                msg = cur
              }
              return { ...pre, ...msg }
            }, {})
          const { t, setLocaleMessage } = i18n.global
          setLocaleMessage('lang', localeMsg)
          const i18nkey = router.currentRoute.value.meta?.i18nkey
          document.title = `${i18nkey ? t(i18nkey) + ' | ' : ''}${t('f_TITLE')}`
          handleLangChange && handleLangChange()
        })
        .catch(err => {
          console.error(err)
        })
    },
    // 对多语言fulfilled接口重新请求
    refreshLanguage() {
      if (!noQueryLanguage && this.fulfilled.length) {
        this.setLanguageMessage(undefined, this.fulfilled)
      }
    },
    // 设置语言选项
    async getLanguageSelectOption() {
      const systemConfigObj = systemConfig ? await systemConfig() : null
      return new Promise((resolve, reject) => {
        if (this.lang) {
          resolve(this.lang)
        } else {
          if (!noQueryLanguage) {
            const appCode = window.udpGlobalConfig?.UDP_APP_CODE || import.meta.env.UDP_APP_CODE
            const customLangListResult =
              systemConfigObj?.default.customGetLanguageList?.(appCode) ||
              $api.get(`/sys/i18n/lang/${appCode}`, {}, { ignoreBaseUri: true })
            customLangListResult
              .then((res: langOption[]) => {
                this.lang = res as langOption[]
                resolve(this.lang)
              })
              .catch((err: any) => {
                reject(err)
              })
          }
        }
      })
    }
  }
})
