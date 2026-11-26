<template>
  <div class="reverse-extract-container">
    <div class="page-header">
      <h2><i class="el-icon-refresh"></i> 工程设计文档生成</h2>
      <p class="page-desc">从地质设计文档提取数据，自动生成工程设计文档</p>
    </div>

    <!-- 上传区域 -->
    <div v-if="!extractionStarted" class="upload-section">
      <el-row :gutter="20">
        <!-- 地质设计文档（源 - 提供数据） -->
        <el-col :span="12">
          <div class="upload-card">
            <div class="card-header">
              <span class="card-title"><i class="el-icon-document"></i> 地质设计文档（数据来源）</span>
              <el-tag type="success">源文档</el-tag>
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
                <div class="upload-text">将地质设计文档拖到此处，或<em>点击上传</em></div>
                <div class="upload-tip">提供数据的源文档</div>
              </div>
            </el-upload>
            <div v-if="geologicalFile" class="selected-file">
              <i class="el-icon-document word-icon"></i>
              <span class="file-name">{{ geologicalFile.name }}</span>
              <el-button type="text" size="small" @click="previewGeological">
                <i class="el-icon-view"></i> 预览
              </el-button>
            </div>
          </div>
        </el-col>

        <!-- 工程设计模板（目标） -->
        <el-col :span="12">
          <div class="upload-card">
            <div class="card-header">
              <span class="card-title"><i class="el-icon-document-copy"></i> 工程设计模板（待生成）</span>
              <el-tag type="warning">目标模板</el-tag>
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
                <div class="upload-text">将工程设计模板拖到此处，或<em>点击上传</em></div>
                <div class="upload-tip">支持带批注的 .docx 格式</div>
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
        <el-button type="primary" size="large" :disabled="!canExtract" @click="startExtraction">
          <i class="el-icon-magic-stick"></i> 智能提取并生成文档
        </el-button>
        <el-button size="large" @click="resetForm">
          <i class="el-icon-refresh"></i> 重置
        </el-button>
      </div>
    </div>

    <!-- 流式提取进度展示 -->
    <div v-if="extractionStarted" class="extraction-view">
      <!-- 工具栏 -->
      <div class="extraction-toolbar">
        <el-button icon="el-icon-arrow-left" size="small" @click="goBack">返回上传</el-button>
        <div class="toolbar-info">
          <span class="doc-name">{{ geologicalFile.name }}</span>
        </div>
        <div class="toolbar-actions">
          <el-button size="small" @click="exportAllSections" :disabled="!allExtracted">
            <i class="el-icon-download"></i> 导出所有章节
          </el-button>
        </div>
      </div>

      <!-- 总进度条 -->
      <div class="overall-progress">
        <el-progress :percentage="overallProgress" :format="formatProgress" :stroke-width="12" />
        <p class="progress-text">{{ progressMessage }}</p>
      </div>

      <!-- 章节列表 -->
      <div class="sections-container">
        <div class="sections-sidebar">
          <div class="sidebar-header">
            <span>章节列表</span>
            <span class="section-count">{{ sections.length }} 个章节</span>
          </div>
          <div class="section-list">
            <div
              v-for="(section, index) in sections"
              :key="index"
              :class="['section-item', { active: currentSectionIndex === index, extracted: section.extracted }]"
              @click="selectSection(index)"
            >
              <div class="section-item-header">
                <i :class="section.extracted ? 'el-icon-check' : 'el-icon-document'"></i>
                <span class="section-title">{{ section.name }}</span>
              </div>
              <el-progress
                v-if="section.extracting"
                :percentage="section.progress || 0"
                :show-text="false"
                :stroke-width="3"
              />
              <div v-if="section.extracted && section.extractedFields && section.extractedFields.length > 0" class="field-count">
                {{ section.extractedFields.length }} 个字段
              </div>
            </div>
          </div>
        </div>

        <!-- 章节内容展示 -->
        <div class="section-content-panel">
          <div v-if="currentSection" class="section-detail">
            <div class="detail-header">
              <h3>{{ currentSection.name }}</h3>
              <div class="detail-actions">
                <el-tag v-if="currentSection.extracted" type="success" size="small">
                  <i class="el-icon-check"></i> 已提取
                </el-tag>
                <el-tag v-else-if="currentSection.extracting" type="warning" size="small">
                  <i class="el-icon-loading"></i> 提取中...
                </el-tag>
                <el-button v-else size="small" type="primary" @click="extractSection(currentSectionIndex)">
                  提取此章节
                </el-button>
              </div>
            </div>

            <!-- 提取的字段 -->
            <div v-if="currentSection.extractedFields && currentSection.extractedFields.length > 0" class="extracted-fields">
              <h4><i class="el-icon-notebook-2"></i> 提取的字段</h4>
              <div class="fields-grid">
                <div v-for="(field, idx) in currentSection.extractedFields" :key="idx" class="field-card">
                  <div class="field-name">{{ field.fieldName }}</div>
                  <div class="field-value">{{ field.fieldValue }}</div>
                  <div class="field-meta">
                    <el-tag size="mini" :type="getConfidenceType(field.confidence)">{{ field.confidence }}</el-tag>
                  </div>
                </div>
              </div>
            </div>

            <!-- 章节完整内容 -->
            <div class="section-content">
              <h4><i class="el-icon-document"></i> 章节内容</h4>
              <div class="content-text" v-html="formatContent(currentSection.content)"></div>
            </div>

            <!-- 提取摘要 -->
            <div v-if="currentSection.extractedContent" class="extracted-summary">
              <h4><i class="el-icon-star-on"></i> 关键内容摘要</h4>
              <div class="summary-text">{{ currentSection.extractedContent }}</div>
            </div>
          </div>

          <div v-else class="no-section-selected">
            <i class="el-icon-document"></i>
            <p>请从左侧选择一个章节查看详情</p>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="bottom-actions">
        <el-button type="primary" size="large" @click="generateDocument" :disabled="!allExtracted">
          <i class="el-icon-document"></i> 生成工程设计文档
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
import { extractOnlyApi, extractAndGenerateApi } from '@/api/annotation'
import { streamingExtractSectionsApi, streamingExtractSectionApi, streamingExtractAllApi } from '@/api/annotation'

export default {
  name: 'ReverseExtraction',
  data() {
    return {
      geologicalFile: null,
      geologicalFileList: [],
      templateFile: null,
      templateFileList: [],
      extractionStarted: false,
      sections: [],
      currentSectionIndex: 0,
      overallProgress: 0,
      progressMessage: '准备提取...',
      allExtracted: false,
      editDialogVisible: false,
      editingField: {
        fieldName: '',
        fieldValue: ''
      }
    }
  },
  computed: {
    canExtract() {
      return this.geologicalFile && this.templateFile
    },
    currentSection() {
      return this.sections[this.currentSectionIndex] || null
    }
  },
  methods: {
    // 地质设计文档变化
    handleGeologicalChange(file, fileList) {
      this.geologicalFileList = fileList.slice(-1)
      this.geologicalFile = {
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },

    // 地质设计文档移除
    handleGeologicalRemove() {
      this.geologicalFile = null
      this.geologicalFileList = []
    },

    // 工程设计模板变化
    handleTemplateChange(file, fileList) {
      this.templateFileList = fileList.slice(-1)
      this.templateFile = {
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },

    // 工程设计模板移除
    handleTemplateRemove() {
      this.templateFile = null
      this.templateFileList = []
    },

    // 预览地质设计文档
    previewGeological() {
      this.downloadFile(this.geologicalFile.raw, this.geologicalFile.name)
    },

    // 预览工程设计模板
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

    // 开始流式提取
    async startExtraction() {
      if (!this.canExtract) {
        this.$message.warning('请上传两个文档')
        return
      }

      this.extractionStarted = true
      this.progressMessage = '正在读取文档章节...'

      try {
        const formData = new FormData()
        formData.append('sourceDoc', this.geologicalFile.raw, this.geologicalFile.name)
        formData.append('templateDoc', this.templateFile.raw, this.templateFile.name)

        // 调用一次性提取所有章节的接口
        const res = await streamingExtractAllApi(formData)

        if (res.code === 0 || res.code === 200) {
          const data = res.data
          const sectionsData = data.sections || []

          // 初始化章节列表
          this.sections = sectionsData.map((s, index) => ({
            index: index,
            name: s.name,
            content: s.content,
            extractedFields: s.extractedFields || [],
            extractedContent: s.extractedContent || '',
            progress: s.progress || 0,
            extracted: true,
            extracting: false
          }))

          this.overallProgress = 100
          this.progressMessage = '提取完成，共 ' + this.sections.length + ' 个章节'
          this.allExtracted = true

          this.$message.success('文档章节提取完成')

          // 跳转到编辑器
          this.$nextTick(() => {
            const editorData = {
              sections: this.sections,
              sourceFileName: this.geologicalFile.name,
              templateFileName: this.templateFile.name,
              wellName: data.wellName || '未知井',
              isExtractionResult: true,
              reverseMode: true
            }
            sessionStorage.setItem('extractionEditorData', JSON.stringify(editorData))
          })

        } else {
          throw new Error(res.message || '提取失败')
        }

      } catch (e) {
        console.error('提取失败', e)
        this.$message.error('提取失败: ' + (e.message || '请检查文档格式'))
        this.extractionStarted = false
      }
    },

    // 选择章节
    selectSection(index) {
      this.currentSectionIndex = index
    },

    // 提取单个章节
    async extractSection(index) {
      if (!this.sections[index]) return

      this.sections[index].extracting = true
      this.sections[index].progress = 0

      try {
        const formData = new FormData()
        formData.append('sourceDoc', this.geologicalFile.raw, this.geologicalFile.name)
        formData.append('sectionIndex', index.toString())

        const res = await streamingExtractSectionApi(formData)

        if (res.code === 0 || res.code === 200) {
          const data = res.data
          this.sections[index].extractedFields = data.extractedFields || []
          this.sections[index].extractedContent = data.extractedContent || ''
          this.sections[index].progress = data.progress || 100
          this.sections[index].extracted = true
          this.sections[index].extracting = false

          this.updateOverallProgress()
        }

      } catch (e) {
        console.error('章节提取失败', e)
        this.sections[index].extracting = false
        this.$message.error('章节提取失败')
      }
    },

    // 更新总进度
    updateOverallProgress() {
      const extractedCount = this.sections.filter(s => s.extracted).length
      this.overallProgress = Math.round((extractedCount / this.sections.length) * 100)
      this.progressMessage = `已提取 ${extractedCount}/${this.sections.length} 个章节`
      this.allExtracted = extractedCount === this.sections.length
    },

    // 获取置信度类型
    getConfidenceType(confidence) {
      if (confidence === '高') return 'success'
      if (confidence === '中') return 'warning'
      return 'info'
    },

    // 格式化内容（高亮关键词）
    formatContent(content) {
      if (!content) return ''
      // 将换行转换为 <br>
      return content.replace(/\n/g, '<br>')
    },

    // 返回上传页面
    goBack() {
      this.extractionStarted = false
      this.sections = []
      this.currentSectionIndex = 0
      this.overallProgress = 0
      this.allExtracted = false
    },

    // 生成文档
    async generateDocument() {
      try {
        this.$message.info('正在生成文档，请稍候...')

        const formData = new FormData()
        formData.append('geologicalDoc', this.geologicalFile.raw, this.geologicalFile.name)
        formData.append('engineeringDoc', this.templateFile.raw, this.templateFile.name)

        const blob = await extractAndGenerateApi(formData)

        if (blob instanceof Blob) {
          const fileName = '工程设计_生成.docx'
          const reader = new FileReader()
          const docBase64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })

          const editorData = {
            fileName: fileName,
            fileData: docBase64,
            sections: this.sections,
            isGeologicalDoc: false
          }
          sessionStorage.setItem('geologicalEditorDocument', JSON.stringify(editorData))
          this.$router.push({ name: 'ReportEditor' })

          this.$message.success('文档已生成，正在打开编辑器...')
        }

      } catch (e) {
        console.error('生成文档失败', e)
        if (!e.message.includes('请求失败') && !e.message.includes('Request failed')) {
          this.$message.error('生成文档失败: ' + (e.message || '未知错误'))
        }
      }
    },

    // 导出所有章节
    exportAllSections() {
      const exportData = {
        sourceFile: this.geologicalFile.name,
        templateFile: this.templateFile.name,
        sections: this.sections.map(s => ({
          name: s.name,
          extractedFields: s.extractedFields,
          extractedContent: s.extractedContent,
          content: s.content
        }))
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '提取结果_' + this.geologicalFile.name.replace('.docx', '') + '.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      this.$message.success('已导出所有章节内容')
    },

    // 复制为JSON
    copyAsJson() {
      const data = {
        sourceFile: this.geologicalFile.name,
        templateFile: this.templateFile.name,
        sections: this.sections.map(s => ({
          name: s.name,
          extractedFields: s.extractedFields,
          extractedContent: s.extractedContent
        }))
      }

      navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
        this.$message.success('已复制到剪贴板')
      })
    },

    // 编辑字段
    editField(row) {
      this.editingField = { ...row }
      this.editDialogVisible = true
    },

    // 保存字段编辑
    saveFieldEdit() {
      if (this.currentSection) {
        const field = this.currentSection.extractedFields.find(
          f => f.fieldName === this.editingField.fieldName
        )
        if (field) {
          field.fieldValue = this.editingField.fieldValue
        }
      }
      this.editDialogVisible = false
      this.$message.success('字段已更新')
    },

    // 重置表单
    resetForm() {
      this.geologicalFile = null
      this.geologicalFileList = []
      this.templateFile = null
      this.templateFileList = []
      this.extractionStarted = false
      this.sections = []
      this.overallProgress = 0
    }
  }
}
</script>

<style scoped>
.reverse-extract-container {
  padding: 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 120px);
}

.page-header {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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

/* 提取视图 */
.extraction-view {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.extraction-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.toolbar-info {
  flex: 1;
}

.doc-name {
  font-weight: 600;
  color: #303133;
}

.overall-progress {
  margin-bottom: 20px;
}

.progress-text {
  text-align: center;
  color: #606266;
  margin-top: 8px;
  font-size: 14px;
}

/* 章节容器 */
.sections-container {
  display: flex;
  gap: 20px;
  min-height: 500px;
}

.sections-sidebar {
  width: 280px;
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 600;
}

.section-count {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

.section-list {
  max-height: 600px;
  overflow-y: auto;
}

.section-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.section-item:hover {
  background: #f0f0f0;
}

.section-item.active {
  background: #e6f7ff;
  border-color: #91d5ff;
}

.section-item.extracted {
  background: #f6ffed;
}

.section-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-item-header i {
  color: #909399;
}

.section-item.extracted .section-item-header i {
  color: #52c41a;
}

.section-title {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-count {
  font-size: 11px;
  color: #52c41a;
  margin-top: 4px;
  padding-left: 24px;
}

/* 章节内容面板 */
.section-content-panel {
  flex: 1;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
}

.section-detail {
  min-height: 400px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.detail-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.extracted-fields {
  margin-bottom: 20px;
}

.extracted-fields h4,
.section-content h4,
.extracted-summary h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.field-card {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #e8e8e8;
}

.field-name {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.field-value {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  word-break: break-all;
}

.field-meta {
  display: flex;
  gap: 4px;
}

.section-content {
  margin-bottom: 20px;
}

.content-text {
  background: #fafafa;
  border-radius: 6px;
  padding: 16px;
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.extracted-summary {
  background: #fffbe6;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #ffe58f;
}

.summary-text {
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.8;
  color: #8c8c8c;
}

.no-section-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #909399;
}

.no-section-selected i {
  font-size: 64px;
  margin-bottom: 16px;
}

/* 底部操作 */
.bottom-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}
</style>
