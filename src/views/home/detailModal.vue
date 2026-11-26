<template>
  <n-modal
    :show="showModal"
    preset="dialog"
    :show-icon="false"
    :title="$t('f_title_detail')"
    :style="{ width: '400px' }"
    :positive-text="$t('f_title_sure')"
    @update:show="(value:boolean) => $emit('update:showModal', value)"
  >
    <div class="detail-content">
      <n-grid x-gap="12" y-gap="12" :cols="1">
        <n-gi> {{ $t('f_taskName') }}：{{ detailDate.taskName }} </n-gi>
        <n-gi> {{ $t('f_taskUrl') }}：{{ detailDate.taskUrl }} </n-gi>
        <n-gi> {{ $t('f_params') }}：{{ detailDate.taskParam }} </n-gi>
        <n-gi> {{ $t('f_taskMethod') }}：{{ detailDate.taskMethod }} </n-gi>
        <n-gi> {{ $t('f_receiver') }}：{{ detailDate.taskTo }} </n-gi>
        <n-gi> {{ $t('f_cron') }}：{{ detailDate.taskCron }} </n-gi>
        <n-gi> {{ $t('f_taskDesc') }}：{{ detailDate.taskDesc }} </n-gi>
      </n-grid>
    </div>
  </n-modal>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  export default defineComponent({
    props: {
      showModal: {
        type: Boolean,
        default: false
      },
      detailDate: {
        type: Object,
        default: () => {
          return {}
        }
      }
    },
    emits: ['update:showModal']
  })
</script>
<style lang="less" scoped>
  .detail-content {
    padding: 10px;
  }
</style>
