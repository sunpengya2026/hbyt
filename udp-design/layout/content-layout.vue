<template>
  <div class="mx-content-layout">
    <template v-if="isMenu">
      <div v-if="isShowTab" ref="navWrap" class="mx-content-tabs_view">
        <span class="mx-content-tabs_left" @click="scrollPrev"></span>
        <div ref="navScroll" class="mx-content-tabs_scroll">
          <Draggable
            v-model="tabList"
            :animation="300"
            item-key="name"
            class="mx-content-tabs_drag"
            @update="dragUpdate"
          >
            <template #item="{ element }">
              <n-tag
                :id="element.name"
                :full-path="element.fullPath"
                :class="{ active: currentItem === element.fullPath }"
                :bordered="false"
                :closable="tabList.length > 1"
                class="mx-content-tabs-item"
                @click="handleSelectTag(element)"
                @close.stop="handleCloseTag(element)"
                @contextmenu="e => handleContextMenu(e, element)"
              >
                {{ (element.i18nkey && $t(element.i18nkey)) || element.title }}
              </n-tag>
            </template>
          </Draggable>
        </div>
        <span class="mx-content-tabs_right" @click="scrollNext"></span>
        <n-dropdown
          placement="bottom-start"
          trigger="manual"
          :x="x"
          :y="y"
          :options="dropdownOption"
          :show="showDropdown"
          :on-clickoutside="() => (showDropdown = false)"
          @select="handleSelectDrop"
        />
      </div>
      <div v-else class="mx-tabs-show">
        <n-popover trigger="hover" placement="bottom-end">
          <template #trigger>
            <Icon src="self-mx-fullscreen" :is-mxdir="true" @click="handleShowTab" />
          </template>
          <span>{{ $t('f_tab_show') }}</span>
        </n-popover>
      </div>
    </template>
    <n-card
      :bordered="false"
      :style="{ height: contentHeight }"
      :content-style="{ height: '100%', overflowY: 'auto', padding: cardPadding }"
    >
      <component :is="slotContentBefore" v-if="slotContentBefore"></component>
      <BlankLayout :is-reload="isReload" :mx-level="0" />
      <component :is="slotContentAfter" v-if="slotContentAfter"></component>
    </n-card>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, nextTick, watch, onMounted, onBeforeUnmount, h, computed, watchEffect, Ref, defineAsyncComponent } from 'vue'
  import { useRoute, useRouter, RouteLocationNormalized } from 'vue-router'
  import debounce from 'lodash.debounce'
  import elementResizeDetectorMaker from 'element-resize-detector'
  import Draggable from 'vuedraggable'
  import { udpTabsViewStore, RouteItem } from 'udp/store/tabs-view-store'
  import { mxMenuHiddenStore } from 'udp/store/menu-hidden-store'
  import { udpAppStore } from 'udp/store/app-store'
  import { NTag, NPopover } from 'naive-ui'
  import Icon from 'udp/components/tools/icon'
  import BlankLayout from 'udp/layout/blank-layout.vue'
  import { tabKeepAlive } from '@/config/theme-overrides'
  import { createStorage } from 'udp/utils/Storage'
  import { useI18n } from 'vue-i18n'

  const slotModule = import.meta.glob('../../src/components/layout-tools/**.vue')
  const slotBefore = '../../src/components/layout-tools/slot-content-before.vue'
  const slotAfter = '../../src/components/layout-tools/slot-content-after.vue'
  export default defineComponent({
    name: 'ContentLayout',
    components: { NTag, NPopover, Draggable, Icon, BlankLayout },
    setup() {
      const { t } = useI18n()
      const TabsViewStore = udpTabsViewStore()
      const AppStore = udpAppStore()
      const route = useRoute()
      const router = useRouter()
      const navWrap = ref()
      const navScroll = ref()
      const tabList: Ref<RouteItem[]> = ref([])
      const currentItem = ref('')
      const isShowTab = computed(() => TabsViewStore.getTabsShow())
      const isReload = ref(false)
      const x = ref(0)
      const y = ref(0)
      const showDropdown = ref(false)
      const renderIcon = (icon: string) => {
        return () => h(Icon, { src: `self-${icon}`, 'is-mxdir': true })
      }
      const dropdownOption = computed(() => {
        const isDisabled = tabList.value.length <= 1
        return [
          {
            label: t('f_tab_refresh'),
            key: '1',
            icon: renderIcon('mx-refresh')
          },
          {
            label: t('f_tab_closeCurrent'),
            key: '2',
            disabled: isDisabled,
            icon: renderIcon('mx-close')
          },
          {
            label: t('f_tab_closeOther'),
            key: '3',
            disabled: isDisabled,
            icon: renderIcon('mx-close-other')
          },
          {
            label: t('f_tab_closeAll'),
            key: '4',
            icon: renderIcon('mx-close-all')
          }
        ]
      })
      const isMenu = computed(() => AppStore.isMenu && tabKeepAlive)
      const cardPadding = computed(() => (AppStore.layout === 'singlePage' ? 0 : undefined))

      // 以下是滚动的内容
      /**
       * @param autoScroll 是否开启自动滚动功能
       */
      async function updateNavScroll(autoScroll?: boolean) {
        await nextTick()
        if (!navScroll.value) return
        const containerWidth = navScroll.value.offsetWidth
        const navWidth = navScroll.value.scrollWidth
        if (containerWidth < navWidth) {
          if (autoScroll) {
            let tagList = navScroll.value.querySelectorAll('.mx-content-tabs-item') || []
            ;[...tagList].forEach((tag: HTMLElement) => {
              if (tag.getAttribute('full-path') === currentItem.value) {
                tag.scrollIntoView && tag.scrollIntoView()
              }
            })
          }
        }
      }
      /**
       * 滚动
       * @param value 要滚动到的位置
       * @param amplitude 每次滚动的长度
       */
      function scrollTo(value: number, amplitude: number) {
        const currentScroll = navScroll.value.scrollLeft
        const scrollWidth =
          (amplitude > 0 && currentScroll + amplitude >= value) || (amplitude < 0 && currentScroll + amplitude <= value)
            ? value
            : currentScroll + amplitude
        navScroll.value && navScroll.value.scrollTo(scrollWidth, 0)
        if (scrollWidth === value) return
        window.requestAnimationFrame(() => scrollTo(value, amplitude))
      }
      // 向前滚
      function scrollPrev() {
        const containerWidth = navScroll.value.offsetWidth
        const currentScroll = navScroll.value.scrollLeft
        if (!currentScroll) return
        const scrollLeft = currentScroll > containerWidth ? currentScroll - containerWidth : 0
        scrollTo(scrollLeft, (scrollLeft - currentScroll) / 10)
      }
      // 向后滚
      function scrollNext() {
        const containerWidth = navScroll.value.offsetWidth
        const navWidth = navScroll.value.scrollWidth
        const currentScroll = navScroll.value.scrollLeft
        if (navWidth - currentScroll <= containerWidth) return
        const scrollLeft =
          navWidth - currentScroll > containerWidth * 2 ? currentScroll + containerWidth : navWidth - containerWidth
        scrollTo(scrollLeft, (scrollLeft - currentScroll) / 10)
      }
      // 路由切换，添加list项
      watch(
        () => router.currentRoute.value,
        (to, from) => {
          if (to.name !== 'Redirect') {
            TabsViewStore.addTabs(route)
            if (isShowTab.value) {
              currentItem.value = route.fullPath
              updateNavScroll(true)
            } else {
              if (!route.meta.keepAlive) {
                if (!route.meta.hidden) {
                  TabsViewStore.setExcludeKeepAliveList(false, route)
                }
              }
              const menuHiddenStore = mxMenuHiddenStore()
              const fromName = from?.name as string
              const toName = to?.name as string
              if (!menuHiddenStore.isInHiddenMenuMap(toName)) {
                TabsViewStore.deleteHiddenKeepAliveList()
              } else if (
                fromName &&
                menuHiddenStore.isInHiddenMenuMap(fromName) &&
                !menuHiddenStore.isOneLineMenuMap(fromName, toName)
              ) {
                TabsViewStore.setExcludeKeepAliveList(false, from as RouteLocationNormalized)
              }
            }
          }
        },
        { immediate: true }
      )
      // 根据getTabList变动设置tabList
      watch(
        () => TabsViewStore.tabsList,
        n => {
          tabList.value = n
        },
        { immediate: true, deep: true }
      )
      const dragUpdate = () => {
        TabsViewStore.setTabsList(tabList.value)
      }

      // 挂载后，监听tab栏的缩放
      const elementResize = () => {
        let observer
        observer = elementResizeDetectorMaker()
        observer.listenTo(
          navWrap.value,
          debounce(() => updateNavScroll(true), 100)
        )
      }

      onMounted(() => {
        if (isShowTab.value && isMenu.value) {
          elementResize()
        }
      })

      // 以下是tag删除的内容
      let currentKeyObj: RouteItem
      // 选择tag
      const handleSelectTag = (to: RouteItem) => {
        currentItem.value = to.fullPath as string
        router.push(to.fullPath)
      }
      // 删除tag
      const handleCloseTag = (to: RouteItem) => {
        TabsViewStore.closeCurrentTab(to)
        if (to.fullPath === currentItem.value) {
          handleSelectTag(tabList.value[tabList.value.length - 1])
        }
        updateNavScroll()
      }
      // 删除其他tag
      const handleCloseOther = (to: RouteItem) => {
        TabsViewStore.closeOtherTabs(to)
        if (to.fullPath !== currentItem.value) {
          handleSelectTag(to)
        }
      }
      // 关闭tag
      const handleCloseAll = (cur: RouteItem) => {
        TabsViewStore.closeAllTabs(cur)
        TabsViewStore.changeTabsShowHide(false)
      }
      // 刷新tag
      const reloadPage = (cur: RouteItem) => {
        TabsViewStore.reloadPage(route, cur)
      }
      const handleSelectDrop = (key: string) => {
        switch (key) {
          // 刷新
          case '1':
            reloadPage(currentKeyObj)
            break
          // 关闭当前
          case '2':
            handleCloseTag(currentKeyObj)
            break
          // 关闭其他
          case '3':
            handleCloseOther(currentKeyObj)
            break
          // 关闭所有
          case '4':
            handleCloseAll(currentKeyObj)
            break
          default:
            break
        }
        updateNavScroll()
        showDropdown.value = false
      }
      const handleContextMenu = (e: MouseEvent, el: RouteItem) => {
        e.preventDefault()
        showDropdown.value = false
        nextTick().then(() => {
          showDropdown.value = true
          x.value = e.clientX
          y.value = e.clientY
          currentKeyObj = el
        })
      }

      // 打开tab栏
      const handleShowTab = () => {
        currentItem.value = route.fullPath
        TabsViewStore.changeTabsShowHide(true)
        nextTick().then(() => {
          elementResize()
        })
        TabsViewStore.addTabs(route)
        if (route.meta.hidden) {
          TabsViewStore.changeTabs(route)
        }
      }
      // 内容区的高度
      const isHeader = computed(() => AppStore.isHeader)
      const contentHeight = ref('')
      watchEffect(() => {
        const routeBreadcrumb = route.meta.isBreadcrumb
        const headerHeight = isHeader.value ? 48 : 0
        const menuBreadcrumbHeight = AppStore.isMenu && routeBreadcrumb ? 48 : 0
        const tabHeight = isShowTab.value && isMenu.value ? 40 : 0
        contentHeight.value = `calc(100vh - ${headerHeight + menuBreadcrumbHeight + tabHeight}px)`
        AppStore.setContentHeight(contentHeight.value)
      })

      // 刷新保存
      const beforeReload = () => {
        if (route.meta.hidden) {
          const menuHiddenStore = mxMenuHiddenStore()
          const Storage = createStorage({ storage: sessionStorage })
          const hiddenParent = menuHiddenStore.getHiddenParent(route.name as string)
          Storage.set(`catch`, hiddenParent)
        }
      }
      window.addEventListener('beforeunload', beforeReload)
      onBeforeUnmount(() => {
        window.removeEventListener('beforeunload', beforeReload)
      })
      // 插槽
      let slotContentBefore = null
      if (slotModule[slotBefore]) {
        slotContentBefore = defineAsyncComponent(slotModule[slotBefore])
      }
      let slotContentAfter = null
      if (slotModule[slotAfter]) {
        slotContentAfter = defineAsyncComponent(slotModule[slotAfter])
      }
      return {
        tabList,
        currentItem,
        isShowTab,
        scrollPrev,
        scrollNext,
        navWrap,
        navScroll,
        handleSelectTag,
        handleCloseTag,
        x,
        y,
        dropdownOption,
        showDropdown,
        handleSelectDrop,
        handleContextMenu,
        handleShowTab,
        isReload,
        isMenu,
        contentHeight,
        dragUpdate,
        slotContentBefore,
        slotContentAfter,
        cardPadding
      }
    }
  })
</script>

<style lang="less" scoped>
  .mx-content-layout {
    position: relative;
  }

  .mx-arrow {
    position: relative;
    width: 20px;
    height: 40px;
    cursor: pointer;

    &::before {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 6px;
      height: 6px;
      border-right: 2px solid;
      border-bottom: 2px solid;
      content: '';
    }
  }

  .mx-tabs-show {
    position: absolute;
    top: -40px;
    right: 24px;
    font-size: 24px;
    cursor: pointer;

    & > svg:focus {
      outline: none;
    }
  }

  .mx-content-tabs_view {
    display: flex;
    align-items: center;

    .mx-content-tabs_left {
      .mx-arrow;

      &::before {
        transform: translate(-50%, -50%) rotate(135deg);
      }
    }

    .mx-content-tabs_right {
      .mx-arrow;

      &::before {
        transform: translate(-50%, -50%) rotate(-45deg);
      }
    }

    .mx-content-tabs_scroll {
      flex: 1;
      overflow: hidden;
      white-space: nowrap;
    }

    :deep(.n-tag) {
      height: 40px;
      padding: 0 16px;
      background: transparent;
      border-radius: 8px 8px 0 0;

      &::after {
        position: absolute;
        right: 0;
        width: 1px;
        height: 16px;
        background: #e5e5e5;
        content: '';
      }

      &:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      &.active {
        background: #fff;
      }
    }

    :deep(.n-tag__content) {
      margin-right: 12px;
    }

    :deep(.n-tag .n-tag__close) {
      font-size: 12px;

      &:hover {
        color: var(--n-color-checked);
      }
    }
  }
</style>
