<template>
  <div :style="{ height: '100%' }">
    <router-view v-slot="{ Component, route }">
      <transition v-if="isContentAnimation" name="zoom-fade" mode="out-in" appear>
        <keep-alive :include="include" :exclude="tabsExcludeList">
          <component :is="Component" :key="componentKey(route)" />
        </keep-alive>
      </transition>
      <template v-else>
        <keep-alive :include="include" :exclude="tabsExcludeList">
          <component :is="Component" :key="componentKey(route)" />
        </keep-alive>
      </template>
    </router-view>
  </div>
</template>

<script lang="ts">
  import { defineComponent, computed } from 'vue'
  import { udpTabsViewStore } from 'udp/store/tabs-view-store'
  import type { RouteLocationNormalized } from 'vue-router'
  import * as config from '@/config/theme-overrides'
  export default defineComponent({
    name: 'BlankLayout',
    props: {
      mxLevel: {
        type: Number,
        default: null
      }
    },
    setup(props) {
      const TabsViewStore = udpTabsViewStore()

      const tabsKeepAliveList = computed(
        () => TabsViewStore.tabsList.map(v => v.componentName).filter(v => !!v) as string[]
      )
      const tabsExcludeList = computed(
        () => TabsViewStore.excludeKeepAliveList.map(v => v.componentName).filter(v => !!v) as string[]
      )
      const noTabsKeepAliveList = computed(
        () => TabsViewStore.noTabsKeepAliveList.map(v => v.componentName).filter(v => !!v) as string[]
      )
      const hiddenKeepAliveList = computed(
        () => TabsViewStore.hiddenKeepAliveList.map(v => v.componentName).filter(v => !!v) as string[]
      )

      const componentKey = (route: RouteLocationNormalized) => {
        // 处理父子路由情况下，父路由缓存的问题
        let key = route.path
        if (props.mxLevel !== null) {
          key = route.path
            .split('/')
            .slice(0, props.mxLevel + 2)
            .join('/')
        }
        const _o = route.matched.filter(v => v.path === key)[0]
        const componentName = route.matched.slice(-1)[0]?.components?.default?.name
        if (tabsKeepAliveList.value.filter(v => v === componentName).length > 1) {
          return route.path + new Date().getTime()
        }
        return _o && _o.meta.isParentRoute && !_o.meta.keepAlive ? route.name : undefined
      }

      const keepAliveList = computed(() =>
        Array.from(
          new Set([
            ...tabsKeepAliveList.value,
            ...noTabsKeepAliveList.value,
            ...hiddenKeepAliveList.value,
            'BlankLayout'
          ])
        )
      )
      const noKeepAliveList = computed(() =>
        Array.from(new Set([...noTabsKeepAliveList.value, ...hiddenKeepAliveList.value, 'BlankLayout']))
      )
      const include = computed(() => (tabsKeepAliveList.value.length ? keepAliveList.value : noKeepAliveList.value))
      return {
        tabsExcludeList,
        include,
        componentKey,
        isContentAnimation: config.isContentAnimation
      }
    }
  })
</script>

<style lang="less" scoped>
  .zoom-fade-enter-active,
  .zoom-fade-leave-active {
    transition: transform 0.35s, opacity 0.28s ease-in-out;
  }

  .zoom-fade-enter-from {
    opacity: 0;
    transform: scale(0.97);
  }

  .zoom-fade-leave-to {
    opacity: 0;
    transform: scale(1.03);
  }
</style>
