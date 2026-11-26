<template>
  <div class="mx-user-item">
    <p class="mx-user-item_title">
      <icon class="mx-user-item_icon" :src="icon" :is-mxdir="isIconInMxdir"></icon>{{ i18n ? $t(i18n) : title }}
    </p>
    <div class="mx-user-item_content">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import Icon from 'udp/components/tools/icon'
  export default defineComponent({
    name: 'HeaderUserItem',
    components: { Icon },
    props: {
      icon: {
        type: String,
        default: 'self-mx-notice'
      },
      isIconInMxdir: {
        type: Boolean,
        default: false
      },
      title: {
        type: String,
        default: ''
      },
      i18n: {
        type: String,
        default: ''
      }
    },
    setup() {
      return {}
    }
  })
</script>

<style lang="less" scoped>
  .mx-user-item {
    margin-bottom: 16px;
    .mx-user-item_title {
      margin: 0 0 16px;
      font-size: 14px;
      color: #333333;
      display: flex;
      align-items: center;
      font-weight: 600;
      .mx-user-item_icon {
        font-size: 16px;
        margin-right: 12px;
      }
    }
    .mx-user-item_content {
      padding-left: 28px;
    }
  }
</style>
