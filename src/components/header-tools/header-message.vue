<template>
  <div class="udp-header-message">
    <n-popover trigger="click" :style="{ width: '300px' }">
      <template #trigger>
        <n-badge value="2">
          <Icon src="self-mx-notice" style="color: #fff" />
        </n-badge>
      </template>
      <n-tabs type="line" justify-content="space-evenly">
        <n-tab-pane name="oasis" :tab="$t('notice.f_title_notice')">
          <n-list>
            <n-list-item v-for="(v, i) in noticeList" :key="i" :class="v.class">
              <template #prefix>
                <Icon :src="v.icon" />
              </template>
              <n-thing>
                <template #header>{{ $t(v.title) }}</template>
                <template #description>{{ $t(v.time) }}</template>
              </n-thing>
            </n-list-item>
          </n-list>
        </n-tab-pane>
        <n-tab-pane name="the beatles" :tab="$t('notice.f_title_message')" >
          {{ $t('notice.f_title_message') }}
        </n-tab-pane>
      </n-tabs>
    </n-popover>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue'
  import Icon from 'udp/components/tools/icon'
  export default defineComponent({
    name: 'HeaderMessage',
    components: { Icon },
    setup() {
      const noticeList = ref([
        {
          title: 'notice.f_weeklyPapers',
          time: 'notice.f_AYearAgo',
          icon: 'self-mx-page',
          class: 'blue'
        },
        {
          title: 'notice.f_msgContent',
          time: 'notice.f_AYearAgo',
          icon: 'self-mx-page',
          class: 'orange'
        },
        {
          title: 'notice.f_msgOther',
          time: '02-12 12:00',
          icon: 'self-mx-page',
          class: 'green'
        },
        {
          title: 'notice.f_langContent',
          time: '02-12 12:00',
          icon: 'self-mx-page',
          class: 'red'
        }
      ])
      return {
        noticeList
      }
    }
  })
</script>

<style lang="less" scoped>
  :deep(.n-list .n-list-item .n-list-item__prefix) {
    width: 40px;
    height: 40px;
    margin-right: 16px;
    font-size: 18px;
    line-height: 40px;
    color: #fff;
    text-align: center;
    border-radius: 50%;
    flex: inherit;
  }

  .blue :deep(.n-list-item__prefix) {
    background: #4499e9;
  }

  .orange :deep(.n-list-item__prefix) {
    background: #ff8300;
  }

  .green :deep(.n-list-item__prefix) {
    background: #2fce90;
  }

  .red :deep(.n-list-item__prefix) {
    background: #cc0100;
  }

  :deep(.n-list .n-list-item:not(:last-child)) {
    border: none;
  }

  :deep(.n-thing .n-thing-main .n-thing-header .n-thing-header__title) {
    font-size: 14px;
    line-height: 19px;
    color: var(--n-text-color);
  }

  :deep(.n-thing .n-thing-main .n-thing-main__description) {
    font-size: 12px;
    color: var(--n-title-text-color);
  }

  :deep(.n-badge) {
    font-size: 24px;
  }

  .udp-header-message {
    cursor: pointer;
  }
</style>
