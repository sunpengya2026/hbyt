<template>
  <div class="history-list-container">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="yyyy-MM-dd"
          style="width: 260px"
          @change="handleDateChange"
        />
        <el-select
          v-model="filterStatus"
          placeholder="执行状态"
          style="width: 140px; margin-left: 10px"
          clearable
          @change="handleFilter"
        >
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="运行中" value="running" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        <el-select
          v-model="filterType"
          placeholder="执行类型"
          style="width: 140px; margin-left: 10px"
          clearable
          @change="handleFilter"
        >
          <el-option label="手动执行" value="manual" />
          <el-option label="定时执行" value="scheduled" />
          <el-option label="API调用" value="api" />
        </el-select>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索报告名称"
          prefix-icon="el-icon-search"
          style="width: 200px; margin-left: 10px"
          clearable
          @input="handleSearch"
        />
      </div>
      <div class="toolbar-right">
        <el-button icon="el-icon-refresh" @click="handleRefresh">刷新</el-button>
        <el-button icon="el-icon-download" @click="handleExport">导出记录</el-button>
      </div>
    </div>

    <!-- 执行记录列表 -->
    <el-table
      v-loading="tableLoading"
      :data="tableData"
      border
      stripe
      style="width: 100%; margin-top: 15px"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="reportName" label="报告名称" min-width="200" show-overflow-tooltip>
        <template slot-scope="{ row }">
          <span class="report-name" @click="handleViewReport(row)">{{ row.reportName }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="executeType" label="执行类型" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="getExecuteTypeTag(row.executeType)" size="small">
            {{ getExecuteTypeName(row.executeType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="executeTime" label="执行时间" width="160" align="center" />
      <el-table-column prop="duration" label="执行耗时" width="100" align="center">
        <template slot-scope="{ row }">
          <span :class="getDurationClass(row.duration)">{{ row.duration }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusName(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="nodeCount" label="节点数" width="80" align="center">
        <template slot-scope="{ row }">
          <span>{{ row.successNodeCount }}/{{ row.totalNodeCount }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="executor" label="执行人" width="120" align="center" />
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template slot-scope="{ row }">
          <el-button type="text" size="small" @click="handleDetail(row)">详情</el-button>
          <el-button type="text" size="small" @click="handleRerun(row)">重新执行</el-button>
          <el-button
            v-if="row.status === 'running'"
            type="text"
            size="small"
            class="danger-text"
            @click="handleCancel(row)"
          >
            取消
          </el-button>
          <el-button
            v-if="row.status === 'success'"
            type="text"
            size="small"
            @click="handleViewReport(row)"
          >
            查看报告
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      :current-page="pagination.page"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="pagination.size"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 20px; text-align: right"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <!-- 执行详情弹窗 -->
    <el-dialog
      :visible.sync="detailVisible"
      title="执行详情"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div v-if="currentExecution" class="execution-detail">
        <!-- 基本信息 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="执行ID">
            {{ currentExecution.id }}
          </el-descriptions-item>
          <el-descriptions-item label="报告名称">
            {{ currentExecution.reportName }}
          </el-descriptions-item>
          <el-descriptions-item label="执行类型">
            {{ getExecuteTypeName(currentExecution.executeType) }}
          </el-descriptions-item>
          <el-descriptions-item label="执行状态">
            <el-tag :type="getStatusType(currentExecution.status)">
              {{ getStatusName(currentExecution.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行时间">
            {{ currentExecution.executeTime }}
          </el-descriptions-item>
          <el-descriptions-item label="执行耗时">
            {{ currentExecution.duration }}
          </el-descriptions-item>
          <el-descriptions-item label="执行人">
            {{ currentExecution.executor }}
          </el-descriptions-item>
          <el-descriptions-item label="触发来源">
            {{ currentExecution.triggerSource || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 节点执行情况 -->
        <div class="node-execution-section" style="margin-top: 20px">
          <h4>节点执行情况</h4>
          <el-table :data="currentExecution.nodeExecutions" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="nodeName" label="节点名称" min-width="150" />
            <el-table-column prop="nodeType" label="节点类型" width="100" />
            <el-table-column prop="status" label="状态" width="80" align="center">
              <template slot-scope="{ row }">
                <el-tag :type="getNodeStatusType(row.status)" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="startTime" label="开始时间" width="160" />
            <el-table-column prop="endTime" label="结束时间" width="160" />
            <el-table-column prop="duration" label="耗时" width="80" align="center" />
            <el-table-column prop="message" label="消息" show-overflow-tooltip />
          </el-table>
        </div>

        <!-- 执行日志 -->
        <div class="execution-logs" style="margin-top: 20px">
          <h4>执行日志</h4>
          <div class="log-container">
            <div
              v-for="(log, index) in currentExecution.logs"
              :key="index"
              class="log-item"
              :class="'log-' + log.level"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-level">[{{ log.level.toUpperCase() }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleRerunFromDetail">重新执行</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  getExecutionHistory,
  getExecutionDetail,
  cancelExecution,
  rerunExecution,
  exportExecutionHistory
} from '@/api/history'

export default {
  name: 'HistoryList',
  data() {
    return {
      dateRange: [],
      filterStatus: '',
      filterType: '',
      searchKeyword: '',
      tableLoading: false,
      tableData: [],
      pagination: {
        page: 1,
        size: 10,
        total: 0
      },
      detailVisible: false,
      currentExecution: null
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    loadData() {
      this.tableLoading = true
      getExecutionHistory({
        page: this.pagination.page,
        size: this.pagination.size,
        startDate: this.dateRange ? this.dateRange[0] : '',
        endDate: this.dateRange ? this.dateRange[1] : '',
        status: this.filterStatus,
        executeType: this.filterType,
        keyword: this.searchKeyword
      })
        .then(res => {
          this.tableData = res.data.list || []
          this.pagination.total = res.data.total || 0
        })
        .catch(err => {
          this.$message.error(err.message || '加载数据失败')
        })
        .finally(() => {
          this.tableLoading = false
        })
    },

    handleDateChange() {
      this.pagination.page = 1
      this.loadData()
    },

    handleFilter() {
      this.pagination.page = 1
      this.loadData()
    },

    handleSearch() {
      this.pagination.page = 1
      this.loadData()
    },

    handleRefresh() {
      this.loadData()
    },

    handleSizeChange(size) {
      this.pagination.size = size
      this.loadData()
    },

    handleCurrentChange(page) {
      this.pagination.page = page
      this.loadData()
    },

    handleDetail(row) {
      getExecutionDetail(row.id)
        .then(res => {
          this.currentExecution = res.data
          this.detailVisible = true
        })
        .catch(err => {
          this.$message.error(err.message || '加载执行详情失败')
        })
    },

    handleRerun(row) {
      this.$confirm('确定要重新执行该报告吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      })
        .then(() => {
          rerunExecution(row.id)
            .then(() => {
              this.$message.success('已提交重新执行任务')
              this.loadData()
            })
            .catch(err => {
              this.$message.error(err.message || '重新执行失败')
            })
        })
        .catch(() => {})
    },

    handleRerunFromDetail() {
      this.detailVisible = false
      this.handleRerun(this.currentExecution)
    },

    handleCancel(row) {
      this.$confirm('确定要取消正在执行的报告吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          cancelExecution(row.id)
            .then(() => {
              this.$message.success('已取消执行')
              this.loadData()
            })
            .catch(err => {
              this.$message.error(err.message || '取消失败')
            })
        })
        .catch(() => {})
    },

    handleViewReport(row) {
      if (row.reportId) {
        this.$router.push(`/report/detail/${row.reportId}`)
      }
    },

    handleExport() {
      exportExecutionHistory({
        startDate: this.dateRange ? this.dateRange[0] : '',
        endDate: this.dateRange ? this.dateRange[1] : '',
        status: this.filterStatus,
        executeType: this.filterType
      })
        .then(res => {
          this.$message.success('导出成功，正在下载...')
          const blob = new Blob([res.data], { type: 'application/json' })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `execution_history_${Date.now()}.json`
          link.click()
          window.URL.revokeObjectURL(url)
        })
        .catch(err => {
          this.$message.error(err.message || '导出失败')
        })
    },

    getExecuteTypeName(type) {
      const map = {
        manual: '手动执行',
        scheduled: '定时执行',
        api: 'API调用'
      }
      return map[type] || type
    },

    getExecuteTypeTag(type) {
      const map = {
        manual: 'primary',
        scheduled: 'success',
        api: 'warning'
      }
      return map[type] || ''
    },

    getStatusName(status) {
      const map = {
        success: '成功',
        failed: '失败',
        running: '运行中',
        cancelled: '已取消'
      }
      return map[status] || status
    },

    getStatusType(status) {
      const map = {
        success: 'success',
        failed: 'danger',
        running: 'primary',
        cancelled: 'info'
      }
      return map[status] || ''
    },

    getNodeStatusType(status) {
      const map = {
        pending: 'info',
        running: 'primary',
        success: 'success',
        failed: 'danger',
        skipped: 'warning'
      }
      return map[status] || ''
    },

    getDurationClass(duration) {
      const seconds = parseInt(duration)
      if (seconds < 60) return 'duration-fast'
      if (seconds < 300) return 'duration-normal'
      return 'duration-slow'
    }
  }
}
</script>

<style scoped>
.history-list-container {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.report-name {
  color: #409eff;
  cursor: pointer;
}

.report-name:hover {
  text-decoration: underline;
}

.danger-text {
  color: #f56c6c;
}

.duration-fast {
  color: #67c23a;
}

.duration-normal {
  color: #e6a23c;
}

.duration-slow {
  color: #f56c6c;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-item {
  margin-bottom: 5px;
  line-height: 1.6;
}

.log-time {
  color: #808080;
  margin-right: 10px;
}

.log-level {
  margin-right: 10px;
}

.log-info .log-level {
  color: #4ec9b0;
}

.log-warning .log-level {
  color: #dcdcaa;
}

.log-error .log-level {
  color: #f14c4c;
}

h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #303133;
}
</style>
