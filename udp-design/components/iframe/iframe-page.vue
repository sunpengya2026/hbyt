<template>
  <div :style="{ height: '100%' }">
    <n-space v-if="!loaded" vertical>
      <n-skeleton text :repeat="5" />
      <n-skeleton text style="width: 60%" />
    </n-space>
    <iframe
      :style="{ height: contentHeight }"
      :src="src"
      frameborder="0"
      width="100%"
      scrolling="auto"
      sandbox="allow-same-origin allow-scripts allow-modals allow-forms allow-top-navigation allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-downloads"
      @load="() => (loaded = true)"
    ></iframe>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, watchEffect, computed } from 'vue'
  import { udpUserStore } from 'udp/store/user-store'
  import { udpAppStore } from 'udp/store/app-store'
  import { useRoute } from 'vue-router'
  import { udpLangStore } from 'udp/lang/langStore'
  
  export default defineComponent({
    name: 'IframePage',
    props: {
      url: {
        type: String,
        default: ''
      },
      height: {
        type: String,
        default: '500px'
      }
    },
    setup(props) {
      const Route = useRoute()
      const UserStore = udpUserStore()
      const AppStore = udpAppStore()
      const LangStore = udpLangStore()
      const loaded = ref(false)

      const src = ref('')
      const contentHeight = computed(() => (props.url ? props.height : '100%'))
      // Qs.parse 解决只有key没有value的情况
      const queryParse = (str: string) => {
        const o = {}
        if (str) {
          str.split('&').forEach((v: string) => {
            const [key, value] = v.split('=')
            o[key] = value
          })
        }
        return o
      }
      // Qs.stringfy 解决只有key没有value的情况
      const queryStringfy = (o: Record<string, any>) => {
        let str = ''
        for (const key in o) {
          if (o[key] === undefined) {
            str += `&${key}`
          } else {
            str += `&${key}=${o[key]}`
          }
        }
        return str.slice(1)
      }
      watchEffect(() => {
        let url = props.url || (Route.meta.url as string)
        if (url) {
          url = url.replace('${token}', UserStore.token)
          url = url.replace('${tenantCode}', UserStore.tenantCode)
          const i = url.indexOf('?')
          const query: any = i === -1 ? {} : queryParse(url.slice(i + 1))

          // url添加theme
          const theme = AppStore.theme
          if (theme) {
            query.theme = theme.slice(1)
          }
          // url添加lang
          const lang = LangStore.selectedLang
          if (lang) {
            query.lang = lang
          }

          const queryStr = queryStringfy(query)
          src.value = `${i === -1 ? url : url.slice(0, i)}${queryStr ? '?' + queryStr : ''}`
        }
      })

      return {
        src,
        loaded,
        contentHeight
      }
    }
  })
</script>

<style lang="less" scoped></style>
