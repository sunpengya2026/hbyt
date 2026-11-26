<template>
  <div class="rule-analyzer-container">
    <div class="page-header">
      <h2><i class="el-icon-connection"></i> 智能提取规则生成</h2>
      <p class="page-desc">分析地质设计和工程设计文档，自动发现字段映射关系，生成可复用的提取规则</p>
    </div>

    <!-- 上传区域 -->
    <div class="upload-section">
      <el-row :gutter="20">
        <!-- 工程设计文档 -->
        <el-col :span="12">
          <div class="upload-card">
            <div class="card-header">
              <span class="card-title"><i class="el-icon-document"></i> 工程设计文档（源）</span>
              <el-tag type="info">数据来源</el-tag>
            </div>
            <el-upload
              ref="engineeringUpload"
              class="upload-area"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleEngineeringChange"
              :on-remove="handleEngineeringRemove"
              :file-list="engineeringFileList"
              accept=".docx"
            >
              <div class="upload-content">
                <i class="el-icon-upload"></i>
                <div class="upload-text">拖拽工程设计文档到此处，或<em>点击上传</em></div>
                <div class="upload-tip">支持 .docx 格式</div>
              </div>
            </el-upload>
            <div v-if="engineeringFile" class="selected-file">
              <i class="el-icon-document word-icon"></i>
              <span class="file-name">{{ engineeringFile.name }}</span>
              <span class="file-size">{{ formatFileSize(engineeringFile.size) }}</span>
            </div>
          </div>
        </el-col>

        <!-- 地质设计文档 -->
        <el-col :span="12">
          <div class="upload-card">
            <div class="card-header">
              <span class="card-title"><i class="el-icon-document-copy"></i> 地质设计文档（目标）</span>
              <el-tag type="info">模板参考</el-tag>
            </div>
            <el-upload
              ref="geologicalUpload"
              class="upload-area"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleGeologicalChange"
              :on-remove="handleGeologicalRemove"
              :file-list="geologicalFileList"
              accept=".docx"
            >
              <div class="upload-content">
                <i class="el-icon-upload"></i>
                <div class="upload-text">拖拽地质设计文档到此处，或<em>点击上传</em></div>
                <div class="upload-tip">支持 .docx 格式（可带批注）</div>
              </div>
            </el-upload>
            <div v-if="geologicalFile" class="selected-file">
              <i class="el-icon-document-copy word-icon"></i>
              <span class="file-name">{{ geologicalFile.name }}</span>
              <span class="file-size">{{ formatFileSize(geologicalFile.size) }}</span>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 分析按钮 -->
      <div class="action-buttons">
        <el-button
          type="primary"
          size="large"
          :loading="analyzing"
          :disabled="!canAnalyze"
          @click="startAnalysis"
        >
          <i class="el-icon-magic-stick"></i> 开始智能分析
        </el-button>
        <el-button size="large" @click="resetForm">
          <i class="el-icon-refresh"></i> 重置
        </el-button>
      </div>
    </div>

    <!-- 分析进度 -->
    <div v-if="analyzing" class="analysis-progress">
      <el-card shadow="hover">
        <div class="progress-content">
          <i class="el-icon-loading progress-icon"></i>
          <div class="progress-text">
            <p class="progress-title">正在分析文档...</p>
            <p class="progress-desc">{{ progressText }}</p>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 分析结果 -->
    <div v-if="analysisResult" class="result-section">
      <el-card shadow="hover">
        <div slot="header" class="result-header">
          <span><i class="el-icon-success" style="color: #67c23a;"></i> 分析完成</span>
          <div>
            <el-button type="text" size="small" @click="copyRulesAsJson">
              <i class="el-icon-document-copy"></i> 复制为JSON
            </el-button>
            <el-button type="text" size="small" @click="exportRules">
              <i class="el-icon-download"></i> 导出规则
            </el-button>
          </div>
        </div>

        <!-- 分析摘要 -->
        <div class="analysis-summary">
          <el-alert
            :title="analysisResult.summary || '分析完成'"
            type="success"
            :closable="false"
            show-icon
          />
        </div>

        <!-- 统计信息 -->
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-value">{{ analysisResult.mappings ? analysisResult.mappings.length : 0 }}</div>
            <div class="stat-label">发现映射</div>
          </div>
          <div class="stat-card success">
            <div class="stat-value">{{ highConfidenceCount }}</div>
            <div class="stat-label">高置信度</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">{{ mediumConfidenceCount }}</div>
            <div class="stat-label">中置信度</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ Math.round((analysisResult.confidence || 0) * 100) }}%</div>
            <div class="stat-label">总体置信度</div>
          </div>
        </div>

        <!-- 映射关系表格 -->
        <div class="mappings-table">
          <p class="table-title"><i class="el-icon-notebook-2"></i> 字段映射关系</p>
          <el-table :data="analysisResult.mappings" border stripe size="small">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="targetField" label="目标字段" width="150">
              <template slot-scope="scope">
                <span class="target-field">{{ scope.row.targetField }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="sourceField" label="源字段/关键词" width="180">
              <template slot-scope="scope">
                <span class="source-field">{{ scope.row.sourceField }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="sourceSection" label="来源章节" width="150" />
            <el-table-column prop="extractionPattern" label="提取模式" min-width="200">
              <template slot-scope="scope">
                <code class="pattern-code">{{ scope.row.extractionPattern || '默认关键词匹配' }}</code>
              </template>
            </el-table-column>
            <el-table-column prop="valueExample" label="示例值" width="120">
              <template slot-scope="scope">
                <span class="value-example">{{ scope.row.valueExample || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="confidence" label="置信度" width="100" align="center">
              <template slot-scope="scope">
                <el-tag
                  :type="getConfidenceType(scope.row.confidence)"
                  size="small"
                >
                  {{ Math.round(scope.row.confidence * 100) }}%
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="required" label="必填" width="80" align="center">
              <template slot-scope="scope">
                <el-tag v-if="scope.row.required" type="danger" size="small">是</el-tag>
                <el-tag v-else type="info" size="small">否</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 操作提示 -->
        <div class="action-tips">
          <el-alert
            title="规则已保存"
            description="该提取规则已自动保存，您可以在提取规则列表中使用此规则"
            type="info"
            :closable="false"
            show-icon
          />
        </div>
      </el-card>
    </div>

    <!-- 已保存的规则列表 -->
    <div class="saved-rules-section">
      <el-card shadow="hover">
        <div slot="header" class="result-header">
          <span><i class="el-icon-folder-opened"></i> 已保存的提取规则</span>
          <el-button type="text" size="small" @click="loadSavedRules">
            <i class="el-icon-refresh"></i> 刷新
          </el-button>
        </div>

        <div v-if="savedRules.length === 0" class="empty-rules">
          <i class="el-icon-folder-delete"></i>
          <p>暂无保存的规则</p>
        </div>

        <el-table v-else :data="savedRules" border stripe>
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="ruleId" label="规则ID" width="180" />
          <el-table-column prop="sourceDocName" label="源文档" min-width="150" />
          <el-table-column prop="targetDocName" label="目标文档" min-width="150" />
          <el-table-column prop="mappings" label="映射数" width="80" align="center">
            <template slot-scope="scope">
              <el-tag type="primary" size="small">{{ scope.row.mappings ? scope.row.mappings.length : 0 }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="confidence" label="置信度" width="100" align="center">
            <template slot-scope="scope">
              <el-progress
                :percentage="Math.round((scope.row.confidence || 0) * 100)"
                :status="getProgressStatus(scope.row.confidence)"
                :stroke-width="10"
              />
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160" />
          <el-table-column label="操作" width="150" fixed="right">
            <template slot-scope="scope">
              <el-button type="text" size="small" @click="viewRuleDetail(scope.row)">查看</el-button>
              <el-button type="text" size="small" @click="deleteSavedRule(scope.row.ruleId)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 规则详情弹窗 -->
    <el-dialog
      title="规则详情"
      :visible.sync="detailDialogVisible"
      width="800px"
    >
      <div v-if="selectedRule" class="rule-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="规则ID">{{ selectedRule.ruleId }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedRule.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="源文档">{{ selectedRule.sourceDocName }}</el-descriptions-item>
          <el-descriptions-item label="目标文档">{{ selectedRule.targetDocName }}</el-descriptions-item>
          <el-descriptions-item label="总体置信度" :span="2">
            <el-progress
              :percentage="Math.round((selectedRule.confidence || 0) * 100)"
              :status="getProgressStatus(selectedRule.confidence)"
            />
          </el-descriptions-item>
          <el-descriptions-item label="分析摘要" :span="2">{{ selectedRule.summary }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-top: 20px;">字段映射列表</h4>
        <el-table :data="selectedRule.mappings" border size="small" max-height="400">
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="targetField" label="目标字段" width="120" />
          <el-table-column prop="sourceField" label="源字段" width="120" />
          <el-table-column prop="sourceSection" label="来源章节" width="120" />
          <el-table-column prop="extractionPattern" label="提取模式" min-width="150" />
          <el-table-column prop="confidence" label="置信度" width="80" align="center">
            <template slot-scope="scope">
              <el-tag :type="getConfidenceType(scope.row.confidence)" size="small">
                {{ Math.round(scope.row.confidence * 100) }}%
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <span slot="footer">
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { analyzeDocumentsApi, getRulesListApi, deleteRuleApi } from '@/api/annotation'

export default {
  name: 'RuleAnalyzer',
  data() {
    return {
      engineeringFile: null,
      engineeringFileList: [],
      geologicalFile: null,
      geologicalFileList: [],
      analyzing: false,
      progressText: '准备分析...',
      analysisResult: null,
      savedRules: [],
      detailDialogVisible: false,
      selectedRule: null
    }
  },
  computed: {
    canAnalyze() {
      return this.engineeringFile && this.geologicalFile && !this.analyzing
    },
    highConfidenceCount() {
      if (!this.analysisResult || !this.analysisResult.mappings) return 0
      return this.analysisResult.mappings.filter(m => m.confidence >= 0.7).length
    },
    mediumConfidenceCount() {
      if (!this.analysisResult || !this.analysisResult.mappings) return 0
      return this.analysisResult.mappings.filter(m => m.confidence >= 0.4 && m.confidence < 0.7).length
    }
  },
  created() {
    this.loadSavedRules()
  },
  methods: {
    // 工程设计文档变化
    handleEngineeringChange(file, fileList) {
      this.engineeringFileList = fileList.slice(-1)
      this.engineeringFile = {
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },
    handleEngineeringRemove() {
      this.engineeringFile = null
      this.engineeringFileList = []
    },

    // 地质设计文档变化
    handleGeologicalChange(file, fileList) {
      this.geologicalFileList = fileList.slice(-1)
      this.geologicalFile = {
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },
    handleGeologicalRemove() {
      this.geologicalFile = null
      this.geologicalFileList = []
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (!bytes) return ''
      const size = bytes / 1024
      if (size < 1024) {
        return size.toFixed(1) + ' KB'
      }
      return (size / 1024).toFixed(1) + ' MB'
    },

    // 开始分析
    async startAnalysis() {
      if (!this.canAnalyze) {
        this.$message.warning('请上传两个文档')
        return
      }

      this.analyzing = true
      this.progressText = '正在读取文档内容...'
      this.analysisResult = null

      try {
        const formData = new FormData()
        formData.append('engineeringDoc', this.engineeringFile.raw, this.engineeringFile.name)
        formData.append('geologicalDoc', this.geologicalFile.raw, this.geologicalFile.name)
        formData.append('saveRule', 'true')

        this.progressText = '正在分析文档结构...'

        const res = await analyzeDocumentsApi(formData)

        this.progressText = '正在生成提取规则...'

        if (res.code === 0 || res.code === 200) {
          this.analysisResult = res.data
          this.$message.success('规则分析完成，发现 ' + (this.analysisResult.mappings ? this.analysisResult.mappings.length : 0) + ' 个字段映射')
          // 刷新规则列表
          this.loadSavedRules()
        } else {
          throw new Error(res.message || '分析失败')
        }

      } catch (e) {
        console.error('规则分析失败', e)
        this.$message.error('规则分析失败: ' + (e.message || '请检查文档格式'))
      } finally {
        this.analyzing = false
      }
    },

    // 重置表单
    resetForm() {
      this.engineeringFile = null
      this.engineeringFileList = []
      this.geologicalFile = null
      this.geologicalFileList = []
      this.analysisResult = null
    },

    // 加载保存的规则
    async loadSavedRules() {
      try {
        const res = await getRulesListApi()
        if (res.code === 0 || res.code === 200) {
          this.savedRules = res.data || []
        }
      } catch (e) {
        console.error('加载规则列表失败', e)
      }
    },

    // 查看规则详情
    viewRuleDetail(rule) {
      this.selectedRule = rule
      this.detailDialogVisible = true
    },

    // 删除规则
    async deleteSavedRule(ruleId) {
      try {
        await this.$confirm('确定要删除此规则吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        const res = await deleteRuleApi(ruleId)
        if (res.code === 0 || res.code === 200) {
          this.$message.success('规则已删除')
          this.loadSavedRules()
        }
      } catch (e) {
        if (e !== 'cancel') {
          console.error('删除规则失败', e)
          this.$message.error('删除规则失败')
        }
      }
    },

    // 复制规则为 JSON
    copyRulesAsJson() {
      if (!this.analysisResult) return
      const data = JSON.stringify(this.analysisResult, null, 2)
      navigator.clipboard.writeText(data).then(() => {
        this.$message.success('已复制到剪贴板')
      })
    },

    // 导出规则
    exportRules() {
      if (!this.analysisResult) return
      const data = JSON.stringify(this.analysisResult, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const fileName = 'extraction_rule_' + (this.analysisResult.ruleId || 'export') + '.json'
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      this.$message.success('规则已导出')
    },

    // 获取置信度类型
    getConfidenceType(confidence) {
      if (confidence >= 0.7) return 'success'
      if (confidence >= 0.4) return 'warning'
      return 'info'
    },

    // 获取进度条状态
    getProgressStatus(confidence) {
      if (confidence >= 0.7) return 'success'
      if (confidence >= 0.4) return 'warning'
      return null
    }
  }
}
</script>

<style scoped>
.rule-analyzer-container {
  padding: 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 120px);
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.page-desc {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

/* 上传区域 */
.upload-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.upload-card {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-weight: 600;
  color: #303133;
}

.upload-area {
  width: 100%;
}

.upload-area ::v-deep .el-upload-dragger {
  width: 100%;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-content {
  text-align: center;
}

.upload-content i {
  font-size: 40px;
  color: #C0C4CC;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 14px;
  color: #606266;
}

.upload-text em {
  color: #3D5FEF;
  font-style: normal;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f0f9ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  margin-top: 12px;
}

.word-icon {
  font-size: 24px;
  color: #3D5FEF;
}

.file-name {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}

/* 分析进度 */
.analysis-progress {
  margin-bottom: 20px;
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.progress-icon {
  font-size: 32px;
  color: #3D5FEF;
}

.progress-text {
  flex: 1;
}

.progress-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 500;
}

.progress-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* 结果区域 */
.result-section {
  margin-bottom: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.analysis-summary {
  margin-bottom: 16px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-card.success {
  background: #f6ffed;
}

.stat-card.warning {
  background: #fff7e6;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #3D5FEF;
}

.stat-card.success .stat-value {
  color: #52c41a;
}

.stat-card.warning .stat-value {
  color: #fa8c16;
}

.stat-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 映射表格 */
.mappings-table {
  margin-bottom: 16px;
}

.table-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #303133;
}

.target-field {
  font-weight: 600;
  color: #3D5FEF;
}

.source-field {
  color: #67c23a;
}

.pattern-code {
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  word-break: break-all;
}

.value-example {
  color: #909399;
  font-style: italic;
}

.action-tips {
  margin-top: 16px;
}

/* 保存的规则 */
.saved-rules-section {
  margin-bottom: 20px;
}

.empty-rules {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.empty-rules i {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-rules p {
  margin: 0;
}

/* 规则详情 */
.rule-detail {
  max-height: 600px;
  overflow-y: auto;
}
</style>
