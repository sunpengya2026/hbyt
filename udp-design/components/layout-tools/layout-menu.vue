<template>
  <n-menu
    :value="selectedKey"
    :collapsed="collapsed"
    :collapsed-width="collapsedWidth"
    :collapsed-icon-size="22"
    :root-indent="21"
    :mode="mode"
    :options="currentMenu"
    v-bind="siderConfig"
  />
</template>

<script lang="ts">
  import { h, computed, defineComponent, PropType, reactive } from 'vue'
  import type { RouteRecordRaw } from 'vue-router'
  import { RouterLink, useRoute } from 'vue-router'
  import { NMenu, NEllipsis } from 'naive-ui'
  import type { MenuOption } from 'naive-ui'
  import * as config from '@/config/theme-overrides'
  import Icon from 'udp/components/tools/icon'
  import plugin from '@/config/plugin'
  import { useI18n } from 'vue-i18n'

  export default defineComponent({
    name: 'LayoutMenu',
    components: { NMenu },
    props: {
      menu: {
        type: Array as PropType<RouteRecordRaw[]>,
        required: true
      },
      mode: {
        type: String as PropType<'vertical' | 'horizontal'>,
        required: false,
        default: 'vertical'
      },
      collapsed: {
        type: Boolean,
        default: false
      },
      step: {
        type: Number,
        default: 0
      },
      collapsedWidth: {
        type: Number,
        default: 64
      }
    },
    setup(props) {
      const { t } = useI18n()
      // 菜单label
      const renderMenuLabel = (item: Record<string, any>) => {
        const target = item?.meta?.target || null
        const text = (item?.meta?.i18nkey && t(item.meta.i18nkey)) || item?.meta?.title
        if (item.children && !item.hideChildrenInMenu && item.children.some((v: RouteRecordRaw) => !v?.meta?.hidden)) {
          if (item?.meta?.parentSelfLinkTo) {
            return h(
              NEllipsis,
              {
                tooltip: !props.collapsed
              },
              {
                tooltip: () => text,
                default: () => h(RouterLink, { to: { path: item.meta.parentSelfLinkTo } }, { default: () => text })
              }
            )
          } else {
            return h(
              NEllipsis,
              {
                tooltip: !props.collapsed
              },
              {
                default: () => text
              }
            )
          }
        } else {
          if (target) {
            return h(
              NEllipsis,
              {
                tooltip: !props.collapsed
              },
              {
                tooltip: () => text,
                default: () => h('a', { href: item.path, target }, text)
              }
            )
          } else {
            if (item?.meta?.parentSelfLinkTo) {
              return h(
                NEllipsis,
                {
                  tooltip: !props.collapsed
                },
                {
                  tooltip: () => text,
                  default: () => h(RouterLink, { to: { path: item.meta.parentSelfLinkTo } }, { default: () => text })
                }
              )
            } else {
              return h(
                NEllipsis,
                {
                  tooltip: !props.collapsed
                },
                {
                  tooltip: () => text,
                  default: () =>
                    h(
                      RouterLink,
                      { to: { name: item.name, query: item?.query || {}, params: item?.params || {} } },
                      { default: () => text }
                    )
                }
              )
            }
          }
        }
      }
      // 菜单Icon
      const renderMenuIcon = (item: Record<string, any>, isChild: boolean) => {
        let icon: any = null
        if (config.isHeaderMenuIconShow || (isChild && props.mode === 'horizontal') || props.mode === 'vertical') {
          if (item?.meta?.icon) {
            icon = () => h(Icon, { src: item?.meta?.icon })
          } else {
            if (!config.isHiddenDefaultIcon) {
              if (item?.children?.length) {
                icon = () => h(Icon, { src: 'self-mx-folder' })
              } else {
                icon = () => h(Icon, { src: 'self-mx-page' })
              }
            }
          }
        }
        return icon
      }
      // 路由转化成菜单
      const formateMenu = (propMenu: RouteRecordRaw[], isChild: boolean) => {
        const menu: MenuOption[] = []
        propMenu.forEach((v: any) => {
          if (!v?.meta?.hidden) {
            const _o: MenuOption = {
              key: v.name,
              label: () => renderMenuLabel(v)
            }
            _o.icon = renderMenuIcon(v, isChild)
            if (
              v?.children?.length &&
              !v.hideChildrenInMenu &&
              v.children.some((item: RouteRecordRaw) => !item?.meta?.hidden)
            ) {
              _o.children = formateMenu(v.children, true)
            }
            menu.push(_o)
          }
        })
        return menu
      }
      // 生成menu菜单
      const currentMenu = computed((): MenuOption[] => {
        return formateMenu(props.menu, false)
      })
      // 监听路由自动选中菜单
      const Route = useRoute()
      const searchKey = (i: number, routers: RouteRecordRaw[]): string => {
        if (routers[i]?.meta?.parentSelfLinkFrom) {
          return routers[i]?.meta?.parentSelfLinkFrom as string
        } else if (routers[i]?.meta?.hidden) {
          return searchKey(--i, routers)
        } else {
          return routers[i]?.name as string
        }
      }
      const selectedKey = computed(() => {
        let i = props.step
        const matchedLen = Route.matched.length
        if (!props.step || props.step === Infinity || i > matchedLen - 1) {
          i = matchedLen - 1
        }
        return searchKey(i, Route.matched)
      })
      const siderConfig = reactive({
        ...(plugin?.layoutSiderConfig?.menu || {})
      })
      return {
        currentMenu,
        selectedKey,
        siderConfig
      }
    }
  })
</script>
