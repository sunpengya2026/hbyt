<template>
  <div class="mx-layout">
    <n-layout>
      <n-layout-header v-if="isHeader">
        <h2 class="mx-layout-title" @click="$router.push('/')">
          <img :src="logoUrl" class="mx-layout-title_img"/>
          <p class="mx-layout-title_text">{{ $t('f_TITLE') }}</p>
          <component :is="slotTitleAfter" v-if="slotTitleAfter"></component>
        </h2>
        <LayoutMenu
          v-if="topMenuStep && isMenu"
          class="mx-layout-menu_horizontal"
          :menu="topMenu"
          :step="topMenuStep"
          mode="horizontal"
        />
        <HeaderTools />
      </n-layout-header>
      <n-layout has-sider>
        <n-layout-sider v-if="sideMenu.length && sideMenu.some(v => !v?.meta?.hidden) && isMenu" v-bind="siderConfig">
          <component :is="slotSiderBefore" v-if="slotSiderBefore" :collapsed="collapsed"></component>
          <n-scrollbar trigger="none">
            <LayoutMenu
              class="mx-layout-menu_vertical"
              :collapsed="collapsed"
              :menu="sideMenu"
              mode="vertical"
              :collapsed-width="siderConfig.collapsedWidth"
            />
          </n-scrollbar>
          <component :is="slotSiderAfter" v-if="slotSiderAfter" :collapsed="collapsed"></component>
        </n-layout-sider>
        <n-layout-content :native-scrollbar="false" content-style="padding: 0;">
          <LayoutBreadcrumb v-if="isMenu" />
          <ContentLayout />
        </n-layout-content>
      </n-layout>
    </n-layout>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, computed, watch, Ref, reactive, defineAsyncComponent } from 'vue'
  import { NLayout, NLayoutHeader, NLayoutContent, NLayoutSider } from 'naive-ui'
  import type { RouteRecordRaw } from 'vue-router'
  import { useRoute } from 'vue-router'
  import logoUrl from '/static/logo.png'
  import LayoutMenu from 'udp/components/layout-tools/layout-menu.vue'
  import HeaderTools from '@/components/header-tools/header-tools.vue'
  import { udpPermissionStore } from 'udp/store/permission-store'
  import { udpAppStore } from 'udp/store/app-store'
  import { udpUserStore } from 'udp/store/user-store'
  import LayoutBreadcrumb from 'udp/components/layout-tools/layout-breadcrumb.vue'
  import ContentLayout from './content-layout.vue'
  import { menuTop } from '@/config/theme-overrides'
  import plugin from '@/config/plugin'

  const slotModule = import.meta.glob('../../src/components/layout-tools/**.vue')
  const slotSiderBeforeFile = '../../src/components/layout-tools/slot-sider-header.vue'
  const slotSiderAfterFile = '../../src/components/layout-tools/slot-sider-footer.vue'
  const slotTitleAfterFile = '../../src/components/layout-tools/slot-title-after.vue'

  export default defineComponent({
    name: 'MenuLayout',
    components: {
      NLayout,
      NLayoutHeader,
      NLayoutContent,
      NLayoutSider,
      LayoutMenu,
      LayoutBreadcrumb,
      ContentLayout,
      HeaderTools
    },
    props: {
      menuTop: {
        type: Number,
        default: null,
        required: false
      }
    },
    setup(props) {
      const PermissionStore = udpPermissionStore()
      const AppStore = udpAppStore()
      const UserStore = udpUserStore()

      // 应用名称
      const title = computed(() => UserStore.envMap.UDP_TITLE)

      // 布局
      const topMenuStep = ref(props.menuTop || menuTop)

      const isHeader = computed(() => AppStore.isHeader)
      const isMenu = computed(() => AppStore.isMenu)

      const collapsed = ref(false)
      const defaultConfig = {
        width: 240,
        collapsedWidth: 64,
        showTrigger: 'arrow-circle',
        collapseMode: 'width',
        nativeScrollbar: false,
        contentStyle: 'padding-top: 7px;',
        collapsed,
        onCollapse: () => (collapsed.value = true),
        onExpand: () => (collapsed.value = false)
      }
      const { layoutSiderConfig } = plugin
      const siderConfig = reactive({
        ...defaultConfig,
        ...(layoutSiderConfig?.layout || {})
      })
      // 菜单处理
      const menus = computed(() => PermissionStore?.addRouters?.children || [])
      let sideMenu: Ref<RouteRecordRaw[]> = ref([])
      const formatMenu = (menus: RouteRecordRaw[] | undefined, step: number, sub?: string) => {
        if (menus) {
          menus.forEach((item: Record<string, any>) => {
            if (step) {
              if (item.children) {
                formatMenu(item.children, step - 1, sub)
              }
            } else {
              if (sub) {
                if (item.name === sub) {
                  sideMenu.value = (item.children && item.children.filter((v: Record<string, any>) => !v.hidden)) || []
                }
              } else {
                item.hideChildrenInMenu = true
              }
            }
          })
        }
      }
      const topMenu = computed(() => {
        if (!topMenuStep.value) {
          return []
        } else {
          formatMenu(menus.value, topMenuStep.value - 1)
          return menus.value
        }
      })

      // 插槽
      let slotSiderBefore = null
      if (slotModule[slotSiderBeforeFile]) {
        slotSiderBefore = defineAsyncComponent(slotModule[slotSiderBeforeFile])
      }
      let slotSiderAfter = null
      if (slotModule[slotSiderAfterFile]) {
        slotSiderAfter = defineAsyncComponent(slotModule[slotSiderAfterFile])
      }
      let slotTitleAfter = null
      if (slotModule[slotTitleAfterFile]) {
        slotTitleAfter = defineAsyncComponent(slotModule[slotTitleAfterFile])
      }

      // 路由监听
      const Route = useRoute()
      watch(
        () => Route.matched,
        (n, o) => {
          if (menus.value.length) {
            if (topMenuStep.value === 0) {
              sideMenu.value = menus.value
            } else if (topMenuStep.value === Infinity) {
              sideMenu.value = []
            } else {
              const step = topMenuStep.value
              if (!n[step]) {
                sideMenu.value = []
              } else {
                const current = n[step]
                if (!o || !o[step] || n[step].name !== o[step].name) {
                  let name = n[step]?.name?.toString()
                  if (current?.meta?.parentSelfLinkFrom) {
                    name = current.meta.parentSelfLinkFrom
                  }
                  formatMenu(menus.value, step - 1, name)
                }
              }
            }
          } else {
            sideMenu.value = []
          }
        },
        { immediate: true }
      )
      return {
        collapsed,
        logoUrl,
        title,
        sideMenu,
        topMenu,
        isHeader,
        isMenu,
        topMenuStep,
        siderConfig,
        slotSiderBefore,
        slotSiderAfter,
        slotTitleAfter
      }
    }
  })
</script>
<style lang="less" scoped>
  .mx-layout {
    p,
    h2 {
      padding: 0;
      margin: 0;
    }

    :deep(.n-layout-header) {
      position: relative;
      z-index: 2;
      display: flex;
      // height: 48px;
      padding: 0 16px;
      box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.08);
      justify-content: space-between;
      align-items: center;

      .mx-layout-menu_horizontal {
        flex: 1;
      }
    }

    .mx-layout-title {
      display: flex;
      width: 240px;
      line-height: 48px;
      align-items: center;

      &_img {
        width: 24px;
        height: 24px;
        padding: 3px;
        margin: 0 8px;
        background: #fff;
        border-radius: 50%;
        box-sizing: border-box;
      }

      &_text {
        overflow: hidden;
        font-size: 14px;
        color: #fff;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
</style>
