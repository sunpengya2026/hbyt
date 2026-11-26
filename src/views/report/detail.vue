<template>
  <div class="report-detail-container">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <el-button icon="el-icon-arrow-left" @click="goBack">返回</el-button>
      <div class="toolbar-right">
        <el-button
          v-if="report.status === 'draft'"
          type="primary"
          @click="handleSave"
        >
          保存
        </el-button>
        <el-button
          v-if="report.status === 'draft'"
          type="success"
          @click="handlePublish"
        >
          发布
        </el-button>
        <el-dropdown @command="handleExport">
          <el-button type="warning">
            导出<i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="word">导出为 Word</el-dropdown-item>
            <el-dropdown-item command="pdf">导出为 PDF</el-dropdown-item>
            <el-dropdown-item command="html">导出为 HTML</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>

    <!-- 报告信息 -->
    <el-card class="report-info-card" shadow="never">
      <div class="report-header">
        <div class="report-title">
          <h1>{{ report.title }}</h1>
          <el-tag :type="getStatusType(report.status)" size="small">
            {{ getStatusName(report.status) }}
          </el-tag>
        </div>
        <div class="report-meta">
          <span>创建者：{{ report.creator }}</span>
          <span>创建时间：{{ report.createTime }}</span>
          <span v-if="report.updateTime">更新时间：{{ report.updateTime }}</span>
        </div>
      </div>
    </el-card>

    <!-- 报告内容 -->
    <el-card class="report-content-card" shadow="never">
      <div class="report-content">
        <!-- 报告摘要 -->
        <div class="report-section">
          <h2 class="section-title">报告摘要</h2>
          <div class="section-content">
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="报告类型">
                {{ report.type }}
              </el-descriptions-item>
              <el-descriptions-item label="所属行业">
                {{ report.industry }}
              </el-descriptions-item>
              <el-descriptions-item label="数据周期">
                {{ report.dataPeriod }}
              </el-descriptions-item>
              <el-descriptions-item label="生成方式">
                {{ report.generationType }}
              </el-descriptions-item>
              <el-descriptions-item label="执行节点">
                {{ report.nodeCount }} 个
              </el-descriptions-item>
              <el-descriptions-item label="引用知识库">
                {{ report.knowledgeCount }} 个
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <!-- 执行记录 -->
        <div class="report-section">
          <h2 class="section-title">执行记录</h2>
          <el-table :data="executionHistory" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="executeTime" label="执行时间" width="180" />
            <el-table-column prop="status" label="状态" width="100">
              <template slot-scope="{ row }">
                <el-tag :type="getExecutionStatusType(row.status)" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="耗时" width="100" />
            <el-table-column prop="executor" label="执行人" width="120" />
            <el-table-column prop="result" label="结果" show-overflow-tooltip />
            <el-table-column label="操作" width="120">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="viewExecutionDetail(row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 报告正文 -->
        <div class="report-section">
          <h2 class="section-title">报告正文</h2>
          <div class="report-body" v-html="report.content"></div>
        </div>

        <!-- 附件列表 -->
        <div class="report-section" v-if="report.attachments && report.attachments.length > 0">
          <h2 class="section-title">附件列表</h2>
          <el-table :data="report.attachments" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="name" label="附件名称" />
            <el-table-column prop="type" label="类型" width="100" />
            <el-table-column prop="size" label="大小" width="100" />
            <el-table-column prop="uploadTime" label="上传时间" width="180" />
            <el-table-column label="操作" width="120">
              <template slot-scope="{ row }">
                <el-button type="text" size="small" @click="downloadAttachment(row)">
                  下载
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>

    <!-- 执行详情弹窗 -->
    <el-dialog
      :visible.sync="executionDetailVisible"
      title="执行详情"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-if="currentExecution" class="execution-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="执行ID">
            {{ currentExecution.id }}
          </el-descriptions-item>
          <el-descriptions-item label="执行时间">
            {{ currentExecution.executeTime }}
          </el-descriptions-item>
          <el-descriptions-item label="执行状态">
            <el-tag :type="getExecutionStatusType(currentExecution.status)">
              {{ currentExecution.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="执行耗时">
            {{ currentExecution.duration }}
          </el-descriptions-item>
          <el-descriptions-item label="执行人" :span="2">
            {{ currentExecution.executor }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="node-execution-list" style="margin-top: 20px">
          <h4>节点执行情况</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(node, index) in currentExecution.nodes"
              :key="index"
              :color="getNodeStatusColor(node.status)"
              :timestamp="node.executeTime"
              placement="top"
            >
              <el-card shadow="never">
                <h5>{{ node.name }}</h5>
                <p>类型：{{ node.type }}</p>
                <p>状态：{{ node.status }}</p>
                <p v-if="node.output">输出：{{ node.output }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getReportDetail, saveReport, publishReport, exportReport } from '@/api/report'

export default {
  name: 'ReportDetail',
  data() {
    return {
      reportId: '',
      report: {
        id: '',
        title: '',
        status: 'draft',
        creator: '',
        createTime: '',
        updateTime: '',
        type: '',
        industry: '',
        dataPeriod: '',
        generationType: '',
        nodeCount: 0,
        knowledgeCount: 0,
        content: '',
        attachments: []
      },
      executionHistory: [],
      executionDetailVisible: false,
      currentExecution: null
    }
  },
  created() {
    this.reportId = this.$route.params.id
    this.loadReportDetail()
  },
  methods: {
    loadReportDetail() {
      getReportDetail(this.reportId)
        .then(res => {
          this.report = res.data
          this.executionHistory = res.data.executionHistory || []
        })
        .catch(err => {
          this.$message.error(err.message || '加载报告详情失败')
        })
    },

    goBack() {
      this.$router.go(-1)
    },

    handleSave() {
      saveReport(this.report)
        .then(() => {
          this.$message.success('保存成功')
          this.loadReportDetail()
        })
        .catch(err => {
          this.$message.error(err.message || '保存失败')
        })
    },

    handlePublish() {
      this.$confirm('确定要发布该报告吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      })
        .then(() => {
          publishReport(this.reportId)
            .then(() => {
              this.$message.success('发布成功')
              this.loadReportDetail()
            })
            .catch(err => {
              this.$message.error(err.message || '发布失败')
            })
        })
        .catch(() => {})
    },

    handleExport(command) {
      exportReport(this.reportId, command)
        .then(res => {
          this.$message.success('导出成功，正在下载...')
          // 下载文件
          const blob = new Blob([res.data], { type: 'application/octet-stream' })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${this.report.title}.${command}`
          link.click()
          window.URL.revokeObjectURL(url)
        })
        .catch(err => {
          this.$message.error(err.message || '导出失败')
        })
    },

    viewExecutionDetail(row) {
      this.currentExecution = row
      this.executionDetailVisible = true
    },

    downloadAttachment(row) {
      // 下载附件
      window.open(row.downloadUrl, '_blank')
    },

    getStatusName(status) {
      const map = {
        draft: '草稿',
        published: '已发布',
        archived: '已归档'
      }
      return map[status] || status
    },

    getStatusType(status) {
      const map = {
        draft: 'info',
        published: 'success',
        archived: ''
      }
      return map[status] || ''
    },

    getExecutionStatusType(status) {
      const map = {
        pending: 'info',
        running: 'primary',
        success: 'success',
        failed: 'danger'
      }
      return map[status] || ''
    },

    getNodeStatusColor(status) {
      const map = {
        pending: '#909399',
        running: '#409eff',
        success: '#67c23a',
        failed: '#f56c6c'
      }
      return map[status] || '#909399'
    }
  }
}
</script>

<style scoped>
.report-detail-container {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.report-info-card {
  margin-bottom: 20px;
}

.report-header {
  .report-title {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 15px;

    h1 {
      margin: 0;
      font-size: 24px;
      color: #303133;
    }
  }

  .report-meta {
    display: flex;
    gap: 30px;
    color: #909399;
    font-size: 14px;
  }
}

.report-content-card {
  .report-section {
    margin-bottom: 30px;

    .section-title {
      font-size: 18px;
      color: #303133;
      margin: 0 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #409eff;
    }

    .section-content {
      padding: 15px;
      background: #f5f7fa;
      border-radius: 4px;
    }
  }

  .report-body {
    padding: 20px;
    line-height: 1.8;
    color: #606266;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    min-height: 300px;
  }
}

.node-execution-list h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #303133;
}
</style>
