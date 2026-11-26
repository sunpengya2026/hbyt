<template>
  <div class="geological-extract-container">
    <div class="page-header">
      <h2><i class="el-icon-magic-stick"></i> 地质设计文档智能生成</h2>
      <p class="page-desc">从工程设计文档提取数据，自动填充地质设计文档</p>
    </div>

    <!-- 上传区域 -->
    <div class="upload-section">
      <el-row :gutter="20">
        <!-- 地质设计文档（源 - 需要填写的内容） -->
        <el-col :span="12">
          <div class="upload-card">
            <div class="card-header">
              <span class="card-title"><i class="el-icon-document"></i> 地质设计文档（待生成）</span>
              <el-tag type="warning">源文档</el-tag>
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
                <div class="upload-text">将地质设计文档拖到此处，或<em>点击上传</em></div>
                <div class="upload-tip">支持 .docx 格式（待填写的目标文档）</div>
              </div>
            </el-upload>
            <div v-if="engineeringFile" class="selected-file">
              <i class="el-icon-document word-icon"></i>
              <span class="file-name">{{ engineeringFile.name }}</span>
              <el-button type="text" size="small" @click="previewEngineering">
                <i class="el-icon-view"></i> 预览
              </el-button>
            </div>
          </div>
        </el-col>

        <!-- 工程设计文档（参考数据） -->
        <el-col :span="12">
          <div class="upload-card">
            <div class="card-header">
              <span class="card-title"><i class="el-icon-document-copy"></i> 工程设计文档（数据来源）</span>
              <el-tag type="success">参考文档</el-tag>
            </div>
            <el-upload
              ref="templateUpload"
              class="upload-area"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleTemplateChange"
              :on-remove="handleTemplateRemove"
              :file-list="templateFileList"
              accept=".docx"
            >
              <div class="upload-content">
                <i class="el-icon-upload"></i>
                <div class="upload-text">将工程设计文档拖到此处，或<em>点击上传</em></div>
                <div class="upload-tip">提供数据的参考文档</div>
              </div>
            </el-upload>
            <div v-if="templateFile" class="selected-file">
              <i class="el-icon-document-copy word-icon"></i>
              <span class="file-name">{{ templateFile.name }}</span>
              <el-button type="text" size="small" @click="previewTemplate">
                <i class="el-icon-view"></i> 预览
              </el-button>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="primary" size="large" :loading="extracting" :disabled="!canExtract" @click="startExtraction">
          <i class="el-icon-magic-stick"></i> 智能提取并生成文档
        </el-button>
        <el-button size="large" @click="resetForm">
          <i class="el-icon-refresh"></i> 重置
        </el-button>
      </div>
    </div>

    <!-- 提取进度 -->
    <div v-if="extracting" class="extraction-progress">
      <el-progress :percentage="progress" :format="formatProgress" :stroke-width="20" />
      <p class="progress-text">{{ progressText }}</p>
    </div>

    <!-- 提取结果 -->
    <div v-if="extractionResult" class="result-section">
      <div class="section-header">
        <h3><i class="el-icon-document-checked"></i> 提取结果</h3>
        <div class="header-actions">
          <el-button size="small" @click="exportResult">
            <i class="el-icon-download"></i> 导出结果
          </el-button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-cards">
        <div class="stat-card success">
          <div class="stat-value">{{ extractedCount }}</div>
          <div class="stat-label">已提取字段</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">{{ missingCount }}</div>
          <div class="stat-label">未提取字段</div>
        </div>
        <div class="stat-card info">
          <div class="stat-value">{{ totalCount }}</div>
          <div class="stat-label">总字段数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ wellName }}</div>
          <div class="stat-label">井名</div>
        </div>
      </div>

      <!-- 提取详情表格 -->
      <el-table :data="extractionItems" border stripe class="result-table">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="fieldName" label="字段名称" width="150" fixed />
        <el-table-column prop="fieldValue" label="提取值" min-width="200">
          <template slot-scope="scope">
            <span v-if="scope.row.fieldValue">{{ scope.row.fieldValue }}</span>
            <span v-else class="missing-value">未提取</span>
          </template>
        </el-table-column>
        <el-table-column prop="sourceSection" label="来源章节" width="150" />
        <el-table-column prop="confidence" label="置信度" width="100">
          <template slot-scope="scope">
            <el-tag :type="getConfidenceType(scope.row.confidence)" size="small">
              {{ scope.row.confidence }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="extractionMethod" label="提取方式" width="100">
          <template slot-scope="scope">
            <el-tag v-if="scope.row.extractionMethod === 'auto'" type="success" size="small">自动</el-tag>
            <el-tag v-else-if="scope.row.extractionMethod === 'llm'" type="primary" size="small">AI</el-tag>
            <el-tag v-else type="info" size="small">手动</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="editField(scope.row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 警告信息 -->
      <div v-if="extractionResult.warnings && extractionResult.warnings.length > 0" class="warnings-section">
        <el-alert
          title="提取警告"
          type="warning"
          :closable="false"
        >
          <ul>
            <li v-for="(warning, index) in extractionResult.warnings" :key="index">{{ warning }}</li>
          </ul>
        </el-alert>
      </div>

      <!-- 缺失字段 -->
      <div v-if="extractionResult.missingFields && extractionResult.missingFields.length > 0" class="missing-section">
        <el-alert
          title="以下必填字段未能自动提取，需手动填写："
          type="info"
          :closable="false"
        >
          <div class="missing-tags">
            <el-tag v-for="field in extractionResult.missingFields" :key="field" type="warning" style="margin-right: 8px; margin-bottom: 4px;">
              {{ field }}
            </el-tag>
          </div>
        </el-alert>
      </div>

      <!-- 生成文档按钮 -->
      <div class="generate-actions">
        <el-button type="primary" size="large" :loading="generating" @click="generateDocument">
          <i class="el-icon-document"></i> 生成地质设计文档
        </el-button>
        <el-button size="large" @click="copyAsJson">
          <i class="el-icon-document-copy"></i> 复制为JSON
        </el-button>
      </div>
    </div>

    <!-- 字段编辑对话框 -->
    <el-dialog title="编辑字段值" :visible.sync="editDialogVisible" width="500px">
      <el-form :model="editingField" label-width="100px">
        <el-form-item label="字段名称">
          <el-input v-model="editingField.fieldName" disabled />
        </el-form-item>
        <el-form-item label="提取值">
          <el-input v-model="editingField.fieldValue" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveFieldEdit">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { extractAndGenerateApi, extractOnlyApi } from '@/api/annotation'

export default {
  name: 'GeologicalExtraction',
  data() {
    return {
      engineeringFile: null,
      engineeringFileList: [],
      templateFile: null,
      templateFileList: [],
      extracting: false,
      generating: false,
      progress: 0,
      progressText: '准备提取...',
      extractionResult: null,
      editDialogVisible: false,
      editingField: {
        fieldName: '',
        fieldValue: ''
      }
    }
  },
  computed: {
    canExtract() {
      return this.engineeringFile && this.templateFile
    },
    extractionItems() {
      return (this.extractionResult && this.extractionResult.items) || []
    },
    extractedCount() {
      return this.extractionItems.filter(item => item.fieldValue && item.fieldValue.length > 0).length
    },
    missingCount() {
      return ((this.extractionResult && this.extractionResult.missingFields) || []).length
    },
    totalCount() {
      return this.extractionItems.length
    },
    wellName() {
      return (this.extractionResult && this.extractionResult.wellName) || '未知'
    }
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

    // 工程设计文档移除
    handleEngineeringRemove() {
      this.engineeringFile = null
      this.engineeringFileList = []
    },

    // 地质设计模板变化
    handleTemplateChange(file, fileList) {
      this.templateFileList = fileList.slice(-1)
      this.templateFile = {
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },

    // 地质设计模板移除
    handleTemplateRemove() {
      this.templateFile = null
      this.templateFileList = []
    },

    // 预览工程设计文档
    previewEngineering() {
      this.downloadFile(this.engineeringFile.raw, this.engineeringFile.name)
    },

    // 预览地质设计模板
    previewTemplate() {
      this.downloadFile(this.templateFile.raw, this.templateFile.name)
    },

    // 下载文件
    downloadFile(file, fileName) {
      const url = window.URL.createObjectURL(file.raw)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },

    // 格式化进度
    formatProgress(percentage) {
      return percentage + '%'
    },

    // 开始提取
    async startExtraction() {
      if (!this.canExtract) {
        this.$message.warning('请先上传两个文档')
        return
      }

      this.extracting = true
      this.progress = 10
      this.progressText = '读取文档内容...'
      this.extractionResult = null

      try {
        const formData = new FormData()
        formData.append('engineeringDoc', this.engineeringFile.raw, this.engineeringFile.name)
        formData.append('geologicalDoc', this.templateFile.raw, this.templateFile.name)

        this.progress = 30
        this.progressText = '智能分析文档结构...'

        // 先仅获取提取结果（不生成文档）
        const res = await extractOnlyApi(formData)

        this.progress = 70
        this.progressText = '整理提取结果...'

        if (res.code === 0 || res.code === 200) {
          this.extractionResult = res.data
          this.progress = 100
          this.progressText = '提取完成'
          this.$message.success(`提取完成，共 ${this.totalCount} 个字段，已提取 ${this.extractedCount} 个`)

          // 提取完成后，跳转到编辑页面
          this.$nextTick(() => {
            // 存储提取结果到 sessionStorage
            const editorData = {
              wellName: this.wellName,
              extractionResult: this.extractionResult,
              engineeringFileName: this.engineeringFile.name,
              templateFileName: this.templateFile.name,
              isExtractionResult: true
            }
            sessionStorage.setItem('extractionEditorData', JSON.stringify(editorData))

            // 跳转到编辑器页面
            this.$router.push({ name: 'ReportEditor' })
          })

        } else {
          throw new Error(res.message || '提取失败')
        }

      } catch (e) {
        console.error('提取失败', e)
        this.$message.error('提取失败: ' + (e.message || '请检查文档格式'))
        this.progress = 0
        this.progressText = '提取失败'
      } finally {
        setTimeout(() => {
          this.extracting = false
        }, 500)
      }
    },

    // 重置表单
    resetForm() {
      this.engineeringFile = null
      this.engineeringFileList = []
      this.templateFile = null
      this.templateFileList = []
      this.extractionResult = null
      this.progress = 0
      this.progressText = '准备提取...'
    },

    // 获取置信度类型
    getConfidenceType(confidence) {
      if (confidence === '高' || confidence === '中(LLM)') return 'success'
      if (confidence === '中') return 'warning'
      return 'info'
    },

    // 编辑字段
    editField(row) {
      this.editingField = { ...row }
      this.editDialogVisible = true
    },

    // 保存字段编辑
    saveFieldEdit() {
      if (this.extractionResult && this.editingField) {
        const item = this.extractionResult.items.find(i => i.fieldName === this.editingField.fieldName)
        if (item) {
          item.fieldValue = this.editingField.fieldValue
          // 更新缺失字段列表
          if (item.fieldValue && item.fieldValue.length > 0 && this.extractionResult.missingFields) {
            const index = this.extractionResult.missingFields.indexOf(item.fieldName)
            if (index > -1) {
              this.extractionResult.missingFields.splice(index, 1)
            }
          }
        }
        this.editDialogVisible = false
        this.$message.success('字段已更新')
      }
    },

    // 生成文档并跳转到编辑器
    async generateDocument() {
      if (!this.canExtract || !this.extractionResult) {
        this.$message.warning('请先执行提取')
        return
      }

      this.generating = true
      try {
        const formData = new FormData()
        formData.append('engineeringDoc', this.engineeringFile.raw, this.engineeringFile.name)
        formData.append('geologicalDoc', this.templateFile.raw, this.templateFile.name)

        // 显示进度
        this.$message.info('正在生成文档，请稍候...')

        const blob = await extractAndGenerateApi(formData)

        if (blob instanceof Blob) {
          const fileName = this.wellName + '_地质设计.docx'

          // 将文档转换为 base64 并存储到 sessionStorage
          const reader = new FileReader()
          const docBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })

          // 存储到 sessionStorage
          const editorData = {
            fileName: fileName,
            fileData: docBase64,
            isGeologicalDoc: true,
            extractionResult: this.extractionResult,
            wellName: this.wellName
          }
          sessionStorage.setItem('geologicalEditorDocument', JSON.stringify(editorData))

          // 跳转到编辑器页面
          this.$router.push({ name: 'ReportEditor' })

          this.$message.success('文档已生成，正在打开编辑器...')
        } else {
          throw new Error('文档生成失败，返回数据格式错误')
        }

      } catch (e) {
        console.error('生成文档失败', e)
        // 错误消息由 axios 拦截器显示
        if (!e.message.includes('请求失败') && !e.message.includes('Request failed')) {
          this.$message.error('生成文档失败: ' + (e.message || '未知错误'))
        }
      } finally {
        this.generating = false
      }
    },

    // 导出结果
    exportResult() {
      if (!this.extractionResult) return

      const data = JSON.stringify(this.extractionResult, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const fileName = this.wellName + '_提取结果.json'
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      this.$message.success('提取结果已导出')
    },

    // 复制为JSON
    copyAsJson() {
      if (!this.extractionResult) return

      const data = JSON.stringify(this.extractionResult, null, 2)
      navigator.clipboard.writeText(data).then(() => {
        this.$message.success('已复制到剪贴板')
      })
    }
  }
}
</script>

<style scoped>
.geological-extract-container {
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

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}

/* 提取进度 */
.extraction-progress {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;
}

.progress-text {
  text-align: center;
  color: #606266;
  margin-top: 12px;
}

/* 结果区域 */
.result-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
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

.stat-card.info {
  background: #eef1fe;
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

/* 结果表格 */
.result-table {
  margin-bottom: 16px;
}

.missing-value {
  color: #ff4d4f;
  font-style: italic;
}

/* 警告和缺失 */
.warnings-section,
.missing-section {
  margin-bottom: 16px;
}

.missing-tags {
  margin-top: 8px;
}

/* 生成文档按钮 */
.generate-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}
</style>
