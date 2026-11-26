<template>
  <div class="task-list-container">
    <el-card>
      <div slot="header" class="card-header">
        <span>任务列表</span>
      </div>

      <el-tabs v-model="activeTab" @tab-click="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="执行中" name="running" />
        <el-tab-pane label="已完成" name="completed" />
        <el-tab-pane label="失败" name="failed" />
      </el-tabs>

      <el-table :data="taskList" v-loading="loading" border stripe>
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="taskName" label="任务名称" min-width="150" />
        <el-table-column prop="reportName" label="关联报告" min-width="150" />
        <el-table-column label="状态" width="100">
          <template slot-scope="{row}">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="150">
          <template slot-scope="{row}">
            <el-progress :percentage="row.progress" :status="getProgressStatus(row.progress)" />
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template slot-scope="{row}">
            <el-button v-if="row.status === 'RUNNING'" type="text" size="small" @click="handleViewMonitor(row)">
              监控
            </el-button>
            <el-button type="text" size="small" @click="handleView(row)">
              详情
            </el-button>
            <el-button v-if="row.status === 'FAILED'" type="text" size="small" @click="handleRetry(row)">
              重试
            </el-button>
          </template>
        </el-table-column>
      </el-table>

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
  </div>
</template>

<script>
export default {
  name: 'TaskList',
  data() {
    return {
      activeTab: 'all',
      loading: false,
      taskList: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0
      }
    }
  },
  created() {
    this.loadTasks()
  },
  methods: {
    loadTasks() {
      this.loading = true
      // TODO: 调用 API 获取任务列表
      setTimeout(() => {
        this.taskList = [
          { id: 1, taskName: '周报生成任务', reportName: '特种设备运行周报', status: 'RUNNING', progress: 60, createTime: '2026-07-23 08:00:00' },
          { id: 2, taskName: '日报生成任务', reportName: '生产运行日报', status: 'COMPLETED', progress: 100, createTime: '2026-07-23 10:00:00' },
          { id: 3, taskName: '设备维护周报', reportName: '设备维护周报', status: 'FAILED', progress: 30, createTime: '2026-07-22 08:00:00' }
        ]
        this.pagination.total = 3
        this.loading = false
      }, 500)
    },
    handleTabChange() {
      this.pagination.page = 1
      this.loadTasks()
    },
    handleViewMonitor(row) {
      this.$router.push({
        name: 'ExecutionMonitor',
        params: { reportId: row.reportId, sessionId: row.sessionId }
      })
    },
    handleView(row) {
      this.$router.push({
        name: 'ReportDetail',
        params: { id: row.reportId }
      })
    },
    handleRetry(row) {
      this.$confirm('确认重试该任务？', '提示').then(() => {
        // TODO: 调用重试 API
        this.$message.success('任务已重新提交')
        this.loadTasks()
      })
    },
    getStatusType(status) {
      const types = { 'PENDING': 'info', 'RUNNING': 'warning', 'COMPLETED': 'success', 'FAILED': 'danger' }
      return types[status] || 'info'
    },
    getStatusName(status) {
      const names = { 'PENDING': '等待中', 'RUNNING': '执行中', 'COMPLETED': '已完成', 'FAILED': '失败' }
      return names[status] || status
    },
    getProgressStatus(progress) {
      if (progress === 100) return 'success'
      if (progress < 0) return 'exception'
      return null
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.loadTasks()
    },
    handleCurrentChange(val) {
      this.pagination.page = val
      this.loadTasks()
    }
  }
}
</script>

<style scoped>
.task-list-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
