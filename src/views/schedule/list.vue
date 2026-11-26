<template>
  <div class="schedule-list-container">
    <el-card>
      <div slot="header" class="card-header">
        <span>定时任务</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="handleCreate">
          创建任务
        </el-button>
      </div>

      <!-- 搜索筛选 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="关联报告">
          <el-select v-model="queryForm.reportId" clearable placeholder="全部">
            <el-option
              v-for="report in reportList"
              :key="report.id"
              :label="report.name"
              :value="report.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.enabled" clearable placeholder="全部">
            <el-option label="已启用" :value="true" />
            <el-option label="已暂停" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 任务列表 -->
      <el-table :data="scheduleList" v-loading="loading" border stripe>
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="name" label="任务名称" min-width="150" />
        <el-table-column label="关联报告" min-width="150">
          <template slot-scope="{row}">
            <el-link type="primary" @click="handleViewReport(row.reportId)">
              {{ getReportName(row.reportId) }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="触发类型" width="100">
          <template slot-scope="{row}">
            <el-tag :type="row.triggerType === 'cron' ? 'primary' : 'info'" size="small">
              {{ row.triggerType === 'cron' ? '周期执行' : '单次执行' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="执行时间" min-width="150">
          <template slot-scope="{row}">
            <span v-if="row.triggerType === 'cron'">{{ row.cronExpression }}</span>
            <span v-else>{{ formatDate(row.onceTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="下次执行" width="160">
          <template slot-scope="{row}">
            <span v-if="row.enabled">{{ formatDate(row.nextRunTime) }}</span>
            <span v-else class="text-muted">--</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template slot-scope="{row}">
            <el-switch
              :value="row.enabled"
              @change="handleToggle(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template slot-scope="{row}">
            <el-button type="text" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="text" size="small" @click="handleTrigger(row)">立即执行</el-button>
            <el-button type="text" size="small" style="color: #F56C6C;" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        :current-page="pagination.page"
        :page-sizes="[10, 20, 50]"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; text-align: right;"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      :visible.sync="dialogVisible"
      width="600px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" placeholder="输入任务名称" />
        </el-form-item>
        <el-form-item label="关联报告" prop="reportId">
          <el-select v-model="form.reportId" placeholder="请选择报告">
            <el-option
              v-for="report in reportList"
              :key="report.id"
              :label="report.name"
              :value="report.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="触发类型" prop="triggerType">
          <el-radio-group v-model="form.triggerType">
            <el-radio label="cron">周期执行</el-radio>
            <el-radio label="once">单次执行</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.triggerType === 'cron'" label="Cron表达式" prop="cronExpression">
          <el-input v-model="form.cronExpression" placeholder="如: 0 0 * * * (每天凌晨)">
            <template slot="append">
              <el-button @click="handleCronBuilder">可视化构建</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item v-if="form.triggerType === 'once'" label="执行时间" prop="onceTime">
          <el-date-picker
            v-model="form.onceTime"
            type="datetime"
            placeholder="选择执行时间"
            value-format="yyyy-MM-dd HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </span>
    </el-dialog>

    <!-- Cron 可视化构建器 -->
    <el-dialog title="Cron表达式构建器" :visible.sync="cronDialogVisible" width="500px">
      <div class="cron-builder">
        <el-form label-width="80px">
          <el-form-item label="执行频率">
            <el-select v-model="cronConfig.frequency" @change="handleFrequencyChange">
              <el-option label="每天" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="cronConfig.frequency === 'weekly'" label="星期">
            <el-checkbox-group v-model="cronConfig.weekdays">
              <el-checkbox label="1">周一</el-checkbox>
              <el-checkbox label="2">周二</el-checkbox>
              <el-checkbox label="3">周三</el-checkbox>
              <el-checkbox label="4">周四</el-checkbox>
              <el-checkbox label="5">周五</el-checkbox>
              <el-checkbox label="6">周六</el-checkbox>
              <el-checkbox label="0">周日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="时间">
            <el-time-picker
              v-model="cronConfig.time"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="选择时间"
            />
          </el-form-item>
        </el-form>
        <div class="cron-preview">
          <span class="label">生成表达式：</span>
          <code>{{ generatedCron }}</code>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="cronDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmCron">确认</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getScheduleList, createSchedule, updateSchedule, deleteSchedule, toggleSchedule, triggerSchedule } from '@/api/schedule'

export default {
  name: 'ScheduleList',
  data() {
    return {
      loading: false,
      queryForm: {
        reportId: null,
        enabled: null
      },
      scheduleList: [],
      reportList: [
        { id: 1, name: '特种设备运行周报' },
        { id: 2, name: '生产运行日报' }
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0
      },
      dialogVisible: false,
      dialogTitle: '创建任务',
      form: {
        id: null,
        name: '',
        reportId: null,
        triggerType: 'cron',
        cronExpression: '',
        onceTime: '',
        remark: ''
      },
      rules: {
        name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
        reportId: [{ required: true, message: '请选择报告', trigger: 'change' }],
        triggerType: [{ required: true, message: '请选择触发类型', trigger: 'change' }],
        cronExpression: [{ required: true, message: '请输入Cron表达式', trigger: 'blur' }]
      },
      cronDialogVisible: false,
      cronConfig: {
        frequency: 'daily',
        weekdays: ['1'],
        time: '08:00'
      }
    }
  },
  computed: {
    generatedCron() {
      const time = this.cronConfig.time || '08:00'
      const [hour, minute] = time.split(':')

      switch (this.cronConfig.frequency) {
        case 'daily':
          return `${minute} ${hour} * * *`
        case 'weekly':
          const days = this.cronConfig.weekdays.join(',')
          return `${minute} ${hour} * * ${days}`
        case 'monthly':
          return `${minute} ${hour} 1 * *`
        default:
          return ''
      }
    }
  },
  created() {
    this.loadSchedules()
  },
  methods: {
    loadSchedules() {
      this.loading = true
      const params = {
        page: this.pagination.page,
        pageSize: this.pagination.pageSize,
        ...this.queryForm
      }
      // TODO: 调用 API 获取列表
      setTimeout(() => {
        this.scheduleList = []
        this.pagination.total = 0
        this.loading = false
      }, 500)
    },
    handleSearch() {
      this.pagination.page = 1
      this.loadSchedules()
    },
    handleReset() {
      this.queryForm = {
        reportId: null,
        enabled: null
      }
      this.pagination.page = 1
      this.loadSchedules()
    },
    handleCreate() {
      this.dialogTitle = '创建任务'
      this.form = {
        id: null,
        name: '',
        reportId: null,
        triggerType: 'cron',
        cronExpression: '0 8 * * *',
        onceTime: '',
        remark: ''
      }
      this.dialogVisible = true
    },
    handleEdit(row) {
      this.dialogTitle = '编辑任务'
      this.form = { ...row }
      this.dialogVisible = true
    },
    handleSubmit() {
      this.$refs.form.validate(valid => {
        if (valid) {
          // TODO: 调用 API 保存
          this.$message.success('保存成功')
          this.dialogVisible = false
          this.loadSchedules()
        }
      })
    },
    handleDialogClose() {
      this.$refs.form.resetFields()
    },
    handleToggle(row) {
      const action = row.enabled ? '暂停' : '启用'
      this.$confirm(`确认${action}该任务？`, '提示').then(() => {
        // TODO: 调用 API 切换状态
        row.enabled = !row.enabled
        this.$message.success(`${action}成功`)
      })
    },
    handleTrigger(row) {
      this.$confirm('确认立即执行该任务？', '提示').then(() => {
        // TODO: 调用 API 触发执行
        this.$message.success('任务已触发，请到执行记录中查看')
      })
    },
    handleDelete(row) {
      this.$confirm('确认删除该任务？', '提示', { type: 'warning' }).then(() => {
        // TODO: 调用 API 删除
        this.$message.success('删除成功')
        this.loadSchedules()
      })
    },
    handleCronBuilder() {
      this.cronDialogVisible = true
    },
    handleFrequencyChange() {
      this.form.cronExpression = this.generatedCron
    },
    handleConfirmCron() {
      this.form.cronExpression = this.generatedCron
      this.cronDialogVisible = false
    },
    handleViewReport(reportId) {
      this.$router.push({ name: 'ReportEditor', params: { id: reportId } })
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.loadSchedules()
    },
    handleCurrentChange(val) {
      this.pagination.page = val
      this.loadSchedules()
    },
    getReportName(reportId) {
      const report = this.reportList.find(r => r.id === reportId)
      return report ? report.name : '--'
    },
    formatDate(date) {
      if (!date) return '--'
      const d = new Date(date)
      return d.toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.schedule-list-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-form {
  margin-bottom: 20px;
}

.text-muted {
  color: #8e8e93;
}

.cron-builder {
  padding: 10px 0;
}

.cron-preview {
  margin-top: 20px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.cron-preview code {
  color: #0071e3;
  font-size: 14px;
  font-weight: 600;
}
</style>
