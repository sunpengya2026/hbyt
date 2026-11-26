<template>
  <n-config-provider :locale="locale" :date-locale="dateLocale" :theme="themeMode" :theme-overrides="modeOverrides">
    <n-loading-bar-provider>
      <LoadingContent />
      <n-dialog-provider>
        <DialogContent />
        <n-notification-provider>
          <NotificationContent />
          <n-message-provider :keep-alive-on-hover="true">
            <MessageContent />
            <RouterView />
            <slot></slot>
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>
<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { NDialogProvider, NNotificationProvider, NMessageProvider, NConfigProvider } from 'naive-ui'
import { darkTheme } from 'naive-ui'
import DialogContent from 'udp/components/naive-content/dialog-content'
import MessageContent from 'udp/components/naive-content/message-content'
import NotificationContent from 'udp/components/naive-content/notification-content'
import LoadingContent from 'udp/components/naive-content/loading-content'
import { udpAppStore } from 'udp/store/app-store'
import * as config from '@/config/theme-overrides'
import { useRouter } from 'vue-router'
import { getColorPalette } from 'udp/utils/color'
  import * as locales from 'naive-ui/es/locales'
  import { udpLangStore } from 'udp/lang/langStore'
  import langConf from 'udp/lang/langConf'
  
  export default defineComponent({
    name: 'AppProvider',
    components: {
      NDialogProvider,
      NNotificationProvider,
      NMessageProvider,
      DialogContent,
      MessageContent,
      NotificationContent,
      LoadingContent,
      NConfigProvider
    },
    setup() {
      const Router = useRouter()
      const appStore = udpAppStore()
      const themeMode = computed(() => (appStore.themeMode === 'dark' ? darkTheme : null))
      const theme = computed(() => appStore.theme)
      const themeOverrides = computed(() =>
        appStore.themeMode === 'dark' ? config.darkThemeOverrides(theme.value) : config.lightThemeOverrides(theme.value)
      )
      const commonPrimary = computed(() => {
        const lightenStr = getColorPalette(theme.value, 6.3)
        return {
          primaryColor: theme.value,
          primaryColorHover: lightenStr,
          primaryColorPressed: lightenStr
        }
      })
      const modeOverrides = computed(() => ({
        LoadingBar: {
          colorLoading: theme.value
        },
        ...themeOverrides.value,
        common: {
          ...themeOverrides.value.common,
          ...commonPrimary.value
        }
      })) 
      const langStore = udpLangStore()
        const langConfig = langConf.locale
        const naiveLang: any = { ...locales }
        const lang = computed(() => langConfig.filter(v => v.id === langStore.selectedLang)[0]?.nFile)
        const locale = computed(() => naiveLang[lang.value])
        const dateLocale = computed(() => naiveLang[`date${lang.value.charAt(0).toUpperCase() + lang.value.substring(1)}`]) 

      if (config.isLogoutLinkage) {
        window.addEventListener('storage', e => {
          if (
            e.key === 'jwt' &&
            new URL(e.url)?.pathname?.startsWith(import.meta.env.UDP_PUBLIC_URL) &&
            e.newValue !== e.oldValue
          ) {
            const Route = Router.currentRoute.value
            if (Route.path !== '/login') {
              window.location.reload()
            }
          }
        })
      }

      return {
        locale,
        dateLocale,
        modeOverrides,
        themeMode
      }
    }
  })
</script>
<style scoped></style>
