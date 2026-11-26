<template>
  <HeaderUserItem icon="self-mx-theme" :is-icon-in-mxdir="true" i18n="f_theme">
    <ul class="mx-theme-list">
      <li
        v-for="v in themeList"
        :key="v.color"
        class="mx-theme-item"
        :class="{ active: v.color === theme }"
        :style="{ color: v.color }"
        @click="changTheme(v.color, true)"
      >
        <span
          class="mx-theme-list_color"
          :style="{
            background: v.color
          }"
        ></span>
      </li>
      <li class="mx-theme-item" @click.stop="changTheme(defaultColor)">
        <n-color-picker
          :class="{ active: !themeList?.filter(v => v.color === theme).length }"
          :style="{ color: theme }"
          :default-value="defaultColor"
          class="mx-theme-defined"
          :show-alpha="false"
          :render-label="renderLabel"
          :modes="['hex']"
          @complete="changTheme"
        />
        <span class="mx-theme-defined_title">{{ $t('f_title_custom') }}</span>
      </li>
    </ul>
  </HeaderUserItem>
</template>

<script lang="ts">
  import { defineComponent, ref, h, computed } from 'vue'
  import { udpAppStore } from 'udp/store/app-store'
  import { themeArr } from '@/config/theme-overrides'
  import { appCodeStorage } from 'udp/utils/Storage'
  import Icon from 'udp/components/tools/icon'
  import HeaderUserItem from 'udp/components/header-tools/header-user-item.vue'
  export default defineComponent({
    name: 'HeaderUser',
    components: { HeaderUserItem },
    setup() {
      const appStore = udpAppStore()
      const themeList = ref(themeArr)
      const theme = computed(() => appStore.theme)
      const renderLabel = () => {
        return h(Icon, { src: 'self-mx-colorpick', isMxdir: true })
      }
      const defaultColor = ref(
        themeList.value?.filter(v => v.color === theme.value).length
          ? appCodeStorage.get('pickColor') || '#000'
          : theme.value
      )
      const changTheme = (color: string, isList?: boolean) => {
        if (!isList) {
          appCodeStorage.set('pickColor', color)
          defaultColor.value = color
        }
        appStore.setTheme(color)
      }
      return {
        themeList,
        changTheme,
        renderLabel,
        theme,
        defaultColor
      }
    }
  })
</script>

<style lang="less" scoped>
  .mx-theme-list {
    display: flex;
    padding: 0;
    list-style: none;
  }

  .mx-theme-item {
    display: flex;
    cursor: pointer;
    width: 16px;
    height: 16px;
    padding: 3px;
    margin-right: 8px;
    border: 1px solid transparent;
    &.active {
      border-color: inherit;
    }

    .mx-theme-list_color {
      width: 100%;
      height: 100%;
    }

    .mx-theme-list_title {
      margin-top: 8px;
      line-height: 19px;
    }

    .mx-theme-defined {
      height: 24px;
      width: 24px;
      border: 1px solid transparent;
      padding: 3px;

      &.active {
        border-color: initial;
      }

      :deep(.n-color-picker-trigger) {
        border: none;
      }
      :deep(.n-color-picker-trigger .n-color-picker-trigger__fill) {
        left: 3px;
        right: 3px;
        top: 3px;
        bottom: 3px;
      }
      :deep(.anticon) {
        font-size: 12px;
        padding-top: 2px;
        display: block;
      }
    }

    &:nth-last-child(1) {
      margin-left: 8px;
      margin-right: 0;
      position: relative;
      width: auto;
      display: flex;
      align-items: center;
      &::before {
        content: '';
        position: absolute;
        width: 1px;
        height: 50%;
        background: #ccc;
        left: -8px;
        top: 25%;
      }
      .mx-theme-defined_title {
        font-size: 12px;
        color: #666666;
        margin-left: 4px;
      }
    }
  }
</style>
