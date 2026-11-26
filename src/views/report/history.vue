<template>
  <div class="report-history-container">
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>历史报告</span>
        <el-button style="float: right;" type="primary" size="small" @click="handleRefresh">
          刷新
        </el-button>
      </div>

      <!-- 搜索条件 -->
      <el-form :inline="true" :model="queryForm" class="search-form">
        <el-form-item label="报告类型">
          <el-select v-model="queryForm.reportType" clearable placeholder="全部">
            <el-option label="压裂工程设计" value="fracturing_design" />
            <el-option label="钻井工程设计" value="drilling_design" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="queryForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-dd"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 报告列表 -->
      <el-table
        v-loading="loading"
        :data="reportList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="reportName" label="报告名称" min-width="200" />
        <el-table-column prop="reportType" label="报告类型" width="120">
          <template slot-scope="{row}">
            {{ getTypeText(row.reportType) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template slot-scope="{row}">
            <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column prop="creator" label="创建人" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template slot-scope="{row}">
            <el-button type="text" size="small" @click="handleView(row)">查看</el-button>
            <el-button v-if="row.status === 'COMPLETED'" type="text" size="small" @click="handleDownload(row)">
              下载
            </el-button>
            <el-button type="text" size="small" style="color: #F56C6C;" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        :current-page="pagination.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; text-align: right;"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>
  </div>
</template>

<script>
import { getReportList, deleteReport, downloadReport } from '@/api/report'

export default {
  name: 'ReportHistory',
  data() {
    return {
      loading: false,
      queryForm: {
        reportType: '',
        dateRange: []
      },
      reportList: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0
      }
    }
  },
  created() {
    this.loadReportList()
  },
  methods: {
    loadReportList() {
      this.loading = true
      const params = {
        page: this.pagination.page,
        pageSize: this.pagination.pageSize,
        ...this.queryForm
      }
      getReportList(params).then(res => {
        this.reportList = res.data || []
        this.pagination.total = res.total || 0
      }).finally(() => {
        this.loading = false
      })
    },
    handleSearch() {
      this.pagination.page = 1
      this.loadReportList()
    },
    handleReset() {
      this.queryForm = {
        reportType: '',
        dateRange: []
      }
      this.pagination.page = 1
      this.loadReportList()
    },
    handleRefresh() {
      this.loadReportList()
    },
    handleView(row) {
      this.$router.push({ name: 'ReportDetail', params: { id: row.reportId } })
    },
    handleDownload(row) {
      window.open(`/api/v1/reports/${row.reportId}/download?format=DOCX`, '_blank')
    },
    handleDelete(row) {
      this.$confirm('确定要删除该报告吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        deleteReport(row.reportId).then(() => {
          this.$message.success('删除成功')
          this.loadReportList()
        })
      })
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.loadReportList()
    },
    handleCurrentChange(val) {
      this.pagination.page = val
      this.loadReportList()
    },
    getTypeText(type) {
      const map = {
        fracturing_design: '压裂工程设计',
        drilling_design: '钻井工程设计',
        completion_design: '完井方案',
        custom: '自定义报告'
      }
      return map[type] || type
    },
    getStatusType(status) {
      const map = {
        PENDING: 'info',
        PROCESSING: 'warning',
        COMPLETED: 'success',
        FAILED: 'danger'
      }
      return map[status] || 'info'
    }
  }
}
</script>

<style scoped>
.report-history-container {
  padding: 20px;
}

.search-form {
  margin-bottom: 20px;
}
</style>
