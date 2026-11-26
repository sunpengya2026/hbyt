<template>
  <div>
    <n-grid :x-gap="12" :y-gap="8" :cols="4">
      <n-gi :span="1">
        <n-space style="margin-bottom: 10px">
          <n-button type="primary" @click="editTask({ id: '' })">
            {{ $t('f_title_add') }}
          </n-button>
          <n-button ghost :type="checkedRowKeysRef.length === 0 ? undefined : 'warning'"
            :disabled="checkedRowKeysRef.length === 0" @click="deleteTask()">
            {{ $t('f_title_deleteBatch') }}
          </n-button>
        </n-space>
      </n-gi>
      <n-gi :span="3">
        <n-space justify="end">
          <n-input v-model:value="queryParams.taskName" :placeholder="$t('f_taskName')" />
                <n-input v-model:value="queryParams.taskTo" :placeholder="$t('f_receiver')" />
                      <n-button type="primary" @click="getTaskList">
                        {{ $t('f_title_search') }}
                      </n-button>
                      <n-button @click="reset">
                        {{ $t('f_title_reset') }}
                      </n-button>
        </n-space>
      </n-gi>
    </n-grid>
    <n-data-table :loading="spinning" :columns="columns" :data="tableData.list" :pagination="pagination" :remote="true"
      :row-key="(row: Record<string, any>) => row.id" :bordered="false" size="small" :style="{ height: contentHeight }"
      flex-height @update:checked-row-keys="handleCheck" @update:page="pageChange" />
    <form-modal ref="formModal" v-model:showModal="showEditorModal" :editor-data="model" @refresh="getTaskList" />
    <detail-modal ref="detailModal" v-model:showModal="showDetailModal" :detail-date="model" />
  </div>
</template>

<script lang="ts">
import { h, defineComponent, ref, reactive, computed, getCurrentInstance } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
  import { useI18n } from 'vue-i18n'
  import { udpAppStore } from 'udp/store/app-store'
import formModal from './formModal.vue'
import detailModal from './detailModal.vue'
import { Row } from './type'

interface Operate {
  name: string
    i18nkey ?: string 
      isDelete ?: boolean
method(row: Row): void
  }
const createColumns = (options: Operate[], t ) => {
  return [
    {
      type: 'selection'
    },
    {
      title:  () => h('span', {}, t('f_taskName')) ,
    key: 'taskName',
    ellipsis: true
      },
{
  title:  () => h('span', {}, t('f_taskUrl')) ,
    key: 'taskUrl',
      ellipsis: true
},
{
  title:  () => h('span', {}, t('f_params')) ,
    key: 'taskParam'
},
{
  title:  () => h('span', {}, t('f_receiver')) ,
    key: 'taskTo'
},
{
  title:  () => h('span', {}, t('f_cron')) ,
    key: 'taskCron'
},
{
  title:  () => h('span', {}, t('f_taskDesc')) ,
    key: 'taskDesc',
      ellipsis: true
},
{
  title:  () => h('span', {}, t('f_title_operat')) ,
    key: 'options',
      render(row: Row) {
    const spans = options.map(v => {
      return h(
        'span',
        {
          style: {
            color: v.isDelete ? '#c43b3b' : '#0080EB',
            marginRight: '15px',
            cursor: 'pointer'
          },
          onClick: () => v.method(row)
        },
        { default: () =>  (v.i18nkey ? t(v.i18nkey) : v.name)  }
    )
  })
  return spans
}
      }
    ]
  }

export default defineComponent({
  name: 'Home',
  components: { formModal, detailModal },
  setup() {
    const internalInstance = getCurrentInstance()
    const $api = internalInstance?.appContext.config.globalProperties.$api
    // 弹框相关
    const dialog = useDialog()
    const message = useMessage()
    const formModal = ref()
    const detailModal = ref()
    const showDetailModal = ref(false)
    const showEditorModal = ref(false)
    const model = ref({ id: '' }) 
      const { t } = useI18n() 

      // table相关
      const tableData = reactive({
      list: []
    })
    const spinning = ref(false)
    const pagination = reactive({
      pageSize: 10,
      itemCount: 0,
      page: 1
    })
    const checkedRowKeysRef = ref([])
    const handleCheck = (rowKeys: never[]) => {
      checkedRowKeysRef.value = rowKeys
    }
    // table高度
    const appStore = udpAppStore()
    const contentHeight = computed(() => appStore.contentHeight.replace(')', ' - 90px )'))

    // 查询相关
    const queryParams = reactive({
      taskName: '',
      taskTo: ''
    })
    // 请求数据
    const queryTableData = () => {
      spinning.value = true
      tableData.list = []
      pagination.itemCount = 0
      spinning.value = false
    }
    // 获取数据
    const getTaskList = () => {
      pagination.page = 1
      queryTableData()
    }
    // 切换分页
    const pageChange = (page: number) => {
      pagination.page = page
      queryTableData()
    }
    // 重置
    const reset = () => {
      queryParams.taskName = ''
      queryParams.taskTo = ''
      getTaskList()
    }
    // 编辑
    const editTask = (row: Row) => {
      model.value = row
      showEditorModal.value = true
    }
    // 删除相关
    const deleteTask = (id?: string) => {
      const key = id || checkedRowKeysRef.value.join(',')
      dialog.warning({
        title:  t('f_title_delete') ,
        content:  () => t('f_delete_confirm') ,
  positiveText:  t('f_title_sure') ,
    negativeText:  t('f_title_cancel') ,
      onPositiveClick: () => {
        $api.delete(`/sys/task/deletes/${key}`).then((res: any) => {
          if (res) {
            message.success( `${t('f_title_delete')}${t('f_msg_success')}` )
        getTaskList()
      } else {
  message.error( `${t('f_title_delete')}${t('f_msg_faild')}` )
}
            })
          }
        })
      }

// 操作
const options: Operate[] = [
  {
    name: '详情',
      i18nkey: 'f_title_detail', 
        method(row: Row) {
  model.value = row
  showDetailModal.value = true
}
        },
{
  name: '编辑', 
    i18nkey: 'f_title_edit', 
      method: (row: Row) => editTask(row)
},
{
  name: '删除', 
    i18nkey: 'f_title_delete', 
      isDelete: true,
        method: (row: Row) => deleteTask(row.id)
}
      ]

getTaskList()

return {
  queryParams,
  tableData,
  contentHeight,
  spinning,
  columns: createColumns(options , t ),
checkedRowKeysRef,
  pagination,
  handleCheck,
  pageChange,
  getTaskList,
  reset,
  editTask,
  deleteTask,
  formModal,
  detailModal,
  model,
  showDetailModal,
  showEditorModal ,
    t 
      }
    }
  })
</script>
<style lang="less" scoped></style>
