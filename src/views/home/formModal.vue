<template>
  <n-modal
    :show="showModal"
    preset="dialog"
    :show-icon="false"
    :title="editorDataList.id ? $t('f_title_edit') : $t('f_title_add')"
    :positive-text="$t('f_title_sure')"
    :negative-text="$t('f_title_cancel')"
    :style="{
      width: '640px'
    }"
    @positive-click="submitCallback"
    @negative-click="cancelCallback"
    @close="cancelCallback"
  >
    <div class="form-content">
      <n-form
        ref="formRef"
        :model="editorDataList"
        :rules="rules"
        label-placement="left"
        label-width="auto"
        require-mark-placement="right-hanging"
        size="medium"
        :style="{
          maxWidth: '640px'
        }"
      >
        <n-form-item :label="$t('f_taskName')" path="taskName">
          <n-input v-model:value="editorDataList.taskName" :placeholder="$t('f_taskName')" />
        </n-form-item>
        <n-form-item :label="$t('f_receiver')" path="taskTo">
          <n-input v-model:value="editorDataList.taskTo" :placeholder="$t('f_receiver')" />
        </n-form-item>
        <n-form-item :label="$t('f_taskUrl')" path="taskUrl">
          <n-input v-model:value="editorDataList.taskUrl" :placeholder="$t('f_taskUrl')" />
        </n-form-item>
        <n-form-item :label="$t('f_params')" path="taskParam">
          <n-input v-model:value="editorDataList.taskParam" :placeholder="$t('f_params')" />
        </n-form-item>
        <n-form-item :label="$t('f_cron')" path="taskCron">
          <n-input v-model:value="editorDataList.taskCron" :placeholder="$t('f_cron')" />
        </n-form-item>
        <n-form-item :label="$t('f_taskMethod')" path="taskMethod">
          <n-radio-group v-model:value="editorDataList.taskMethod" name="radiogroup1">
            <n-space>
              <n-radio value="GET"> GET </n-radio>
              <n-radio value="POST"> POST </n-radio>
              <n-radio value="PUT"> PUT </n-radio>
              <n-radio value="DELETE"> DELETE </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item :label="$t('f_describe')">
          <n-input
            v-model:value="editorDataList.taskDesc"
            :placeholder="$t('f_describe')"
            type="textarea"
            :autosize="{
              minRows: 3,
              maxRows: 5
            }"
          />
        </n-form-item>
      </n-form>
    </div>
  </n-modal>
</template>

<script lang="ts">
  import { defineComponent, ref, watch, PropType } from 'vue'
  import { FormInst, useMessage } from 'naive-ui'
  import { useI18n } from 'vue-i18n'
  import { http } from 'udp/utils/service/request'
  import { Row } from './type'

  export default defineComponent({
    props: {
      showModal: {
        type: Boolean,
        default: false
      },
      editorData: {
        type: Object as PropType<Row>,
        default: () => {
          return {}
        }
      }
    },
    emits: ['refresh', 'update:showModal'],
    setup(props, { emit }) {
      const { t } = useI18n()
      // 初始化数据
      const editorDataList = ref<Row>({ id: '' })
      const formRef = ref<FormInst | null>(null)
      const message = useMessage()

      // 监听props变化
      watch(
        () => props.showModal,
        () => {
          editorDataList.value = { ...props.editorData }
        }
      )

      // 关闭弹框
      const cancelCallback = () => emit('update:showModal', false)

      // 表单提交
      const submitCallback = () => {
        formRef.value?.validate(errors => {
          if (!errors) {
            const { id, ...data } = editorDataList.value
            const isAdd = !editorDataList.value?.id
            http({
              ignoreBaseUri: true,
              url: isAdd ? '/sys/task/add' : `/sys/task/update/${id}`,
              method: 'post',
              data,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }).then((res: any) => {
              const msg = isAdd ? $t('f_title_add') : $t('f_title_edit')
              if (res === true) {
                message.success(`${msg}${t('f_msg_success')}`)
                emit('refresh')
                cancelCallback()
              } else {
                message.error(res.msg ? res.msg : `${msg}${t('f_msg_faild')},${t('f_resubmit')}`)
              }
            })
          }
        })
      }
      return {
        formRef,
        editorDataList,
        rules: {
          taskName: {
            required: true,
            renderMessage: () => `${t('f_title_input')}${t('f_taskName')}`
          },
          taskTo: {
            required: true,
            renderMessage: () => `${t('f_title_input')}${t('f_receiver')}`
          },
          taskCron: {
            required: true,
            renderMessage: () => `${t('f_title_input')}${t('f_cron')}`
          }
        },
        submitCallback,
        cancelCallback
      }
    }
  })
</script>
<style lang="less" scoped>
  .form-content {
    background-color: #fff;
    padding: 20px;
  }
</style>
