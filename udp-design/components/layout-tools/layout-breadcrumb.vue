<template>
  <div v-if="isHideBreadcrumb" class="mx-breadcrumb">
    <component :is="slotBreadcrumbBefore" v-if="slotBreadcrumbBefore"></component>
    <Icon class="icon_refresh" src="self-mx-refresh" :is-mxdir="true" @click="reloadPage"></Icon>
    <n-breadcrumb>
      <n-breadcrumb-item v-for="item in breadList" :key="item.name">
        {{ (item.i18nkey && $t(item.i18nkey)) || item.title }}
      </n-breadcrumb-item>
    </n-breadcrumb>
    <component :is="slotBreadcrumbAfter" v-if="slotBreadcrumbAfter"></component>
  </div>
</template>

<script lang="ts">
  import { defineComponent, watch, ref, computed, defineAsyncComponent } from 'vue'
  import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui'
  import { udpAppStore } from 'udp/store/app-store'
  import { udpTabsViewStore } from 'udp/store/tabs-view-store'
  import { mxMenuHiddenStore } from 'udp/store/menu-hidden-store'
  import { useRoute } from 'vue-router'
  import Icon from '../tools/icon'
  import plugin from '@/config/plugin'

  const slotModule = import.meta.glob('../../../src/components/layout-tools/**.vue')
  const slotBefore = '../../../src/components/layout-tools/slot-breadcrumb-before.vue'
  const slotAfter = '../../../src/components/layout-tools/slot-breadcrumb-after.vue'

  export default defineComponent({
    name: 'LayoutBreadcrumb',
    components: { NBreadcrumb, NBreadcrumbItem, Icon },
    setup() {
      const appStore = udpAppStore()
      const TabsViewStore = udpTabsViewStore()
      const menuHiddenStore = mxMenuHiddenStore()
      const Route = useRoute()
      let breadList = ref([] as breadListType[])
      const theme = computed(() => appStore.theme)
      // 刷新tag
      const reloadPage = () => {
        TabsViewStore.reloadPage(Route)
      }
      const { definedBreadcrumb } = plugin
      const isHideBreadcrumb = ref(true)
      // 插槽
      let slotBreadcrumbBefore = null
      if (slotModule[slotBefore]) {
        slotBreadcrumbBefore = defineAsyncComponent(slotModule[slotBefore])
      }
      let slotBreadcrumbAfter = null
      if (slotModule[slotAfter]) {
        slotBreadcrumbAfter = defineAsyncComponent(slotModule[slotAfter])
      }

      watch(
        () => Route.matched,
        n => {
          if (definedBreadcrumb) {
            breadList.value = definedBreadcrumb(Route)
          } else {
            const breadItems = n
              .map(v => ({
                title: v?.meta?.title,
                name: v.name as string,
                path: v.path,
                i18nkey: v?.meta?.i18nkey
              }))
              .slice(1)
            const { hidden, isChildRoute } = Route.meta
            if (hidden && !isChildRoute) {
              const hiddenpPrent = menuHiddenStore.getHiddenParent(Route.name as string)
              if (hiddenpPrent) {
                const hiddenMap = menuHiddenStore.formateHiddenParent(hiddenpPrent)
                breadItems.pop()
                hiddenMap.forEach(v => {
                  if (v.name) {
                    breadItems.push({
                      title: v.title,
                      name: v.name as string,
                      path: v.meta.parentSelfLinkTo ?? v.fullPath,
                      i18nkey: v.i18nkey
                    })
                  }
                })
              }
            }
            breadList.value = breadItems
          }
          isHideBreadcrumb.value = !!(definedBreadcrumb
            ? breadList.value?.length
            : (breadList.value?.length && breadList.value.length > 1) || breadList.value[0]?.name === 'Redirect')
          Route.meta.isBreadcrumb = isHideBreadcrumb.value
        },
        { immediate: true }
      )
      return {
        breadList,
        theme,
        reloadPage,
        isHideBreadcrumb,
        slotBreadcrumbBefore,
        slotBreadcrumbAfter
      }
    }
  })
</script>

<style lang="less" scoped>
  .mx-breadcrumb {
    display: flex;
    padding: 0 16px;
    align-items: center;
    height: 48px;
    
    .icon_refresh {
      margin-right: 4px;
      font-size: 18px;
      cursor: pointer;
      color: #666;

      &:hover {
        color: v-bind(theme);
      }
    }

    .icon_location {
      margin-right: 4px;
    }
  }
</style>
