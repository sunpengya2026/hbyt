<template>
  <div class="fracturing-extract-container">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h2><i class="el-icon-document-copy"></i> 压裂文档自动生成</h2>
          <p class="page-desc">智能解析压裂设计文档，自动提取字段并检测数据冲突</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" size="medium" @click="showUploadDialog = true">
            <i class="el-icon-upload2"></i> 上传模板
          </el-button>
          <el-button type="success" size="medium" :disabled="!extractionResult" @click="exportDocument">
            <i class="el-icon-download"></i> 导出Word
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 中间文档预览区 -->
      <div class="document-preview-area">
        <div class="area-header">
          <span class="area-title"><i class="el-icon-document"></i> 文档预览</span>
          <span v-if="uploadedFile" class="file-name">{{ uploadedFile.name }}</span>
        </div>

        <div class="preview-content" v-if="extractionResult">
          <!-- 文档标题 -->
          <div class="doc-header">
            <h3 class="doc-title">{{ extractionResult.wellName || '未知井' }} 压裂工程设计</h3>
            <p class="doc-meta">
              <span v-if="extractionResult.clientUnit">{{ extractionResult.clientUnit }}</span>
              <span v-if="extractionResult.completionDate"> | {{ extractionResult.completionDate }}</span>
            </p>
          </div>

          <!-- 基本信息表格 -->
          <table class="info-table">
            <tr>
              <td class="label">井号</td>
              <td class="value">
                <span class="field-value">{{ extractionResult.wellName || '-' }}</span>
                <el-tag v-if="hasFieldValue('wellName')" type="success" size="mini">已确认</el-tag>
              </td>
            </tr>
            <tr>
              <td class="label">区块</td>
              <td class="value">
                <span class="field-value">{{ extractionResult.block || '-' }}</span>
              </td>
            </tr>
            <tr>
              <td class="label">层位</td>
              <td class="value">
                <span class="field-value">{{ extractionResult.formation || '-' }}</span>
              </td>
            </tr>
            <tr :class="{ 'conflict-row': hasConflict('施工井段') }">
              <td class="label">施工井段</td>
              <td class="value">
                <template v-if="hasConflict('施工井段')">
                  <span class="conflict-value">{{ getConflictValue1('施工井段') }}</span>
                  <span class="separator">|</span>
                  <span class="conflict-value">{{ getConflictValue2('施工井段') }}</span>
                  <el-tag type="danger" size="mini">冲突</el-tag>
                </template>
                <template v-else>
                  <span class="field-value">{{ extractionResult.wellSection || '-' }}</span>
                </template>
              </td>
            </tr>
            <tr>
              <td class="label">井控级别</td>
              <td class="value">
                <span class="field-value">{{ extractionResult.wellControlLevel || '-' }}</span>
              </td>
            </tr>
            <tr>
              <td class="label">类型</td>
              <td class="value">
                <span class="field-value">{{ extractionResult.fracturingType || '-' }}</span>
              </td>
            </tr>
            <tr>
              <td class="label">委托单位</td>
              <td class="value">
                <span class="field-value">{{ extractionResult.clientUnit || '-' }}</span>
              </td>
            </tr>
            <tr>
              <td class="label">设计单位</td>
              <td class="value">
                <span class="field-value">{{ extractionResult.designUnit || '-' }}</span>
              </td>
            </tr>
          </table>

          <!-- 冲突警告 -->
          <div v-if="extractionResult.conflicts && extractionResult.conflicts.length > 0" class="conflict-warning">
            <div class="warning-header">
              <i class="el-icon-warning"></i>
              <span>数据冲突提醒</span>
            </div>
            <div v-for="(conflict, index) in extractionResult.conflicts" :key="index" class="conflict-item">
              <p class="conflict-title">{{ conflict.fieldName }} 存在冲突</p>
              <p class="conflict-desc">{{ conflict.reason }}</p>
            </div>
          </div>

          <!-- 缺失字段提醒 -->
          <div v-if="extractionResult.missingFields && extractionResult.missingFields.length > 0" class="missing-warning">
            <div class="warning-header">
              <i class="el-icon-info"></i>
              <span>待确认字段</span>
            </div>
            <p>以下字段未能自动提取，需人工确认：{{ extractionResult.missingFields.join('、') }}</p>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <i class="el-icon-document-delete"></i>
          <p>请上传压裂设计文档</p>
          <el-button type="primary" @click="showUploadDialog = true">上传文档</el-button>
        </div>
      </div>

      <!-- 右侧批注面板 -->
      <div class="annotation-panel">
        <!-- 知识库抽取区域 -->
        <div class="knowledge-extraction">
          <h4 class="panel-title"><i class="el-icon-search"></i> 知识库抽取</h4>
          <div class="input-group">
            <el-input
              v-model="wellName"
              placeholder="输入井号"
              size="medium"
              clearable
            >
              <template slot="prepend">井号</template>
            </el-input>
          </div>
          <el-button
            type="primary"
            size="medium"
            :loading="extracting"
            :disabled="!uploadedFile"
            @click="startExtraction"
            class="extract-btn"
          >
            <i class="el-icon-magic-stick"></i> 抽取内容并生成
          </el-button>
        </div>

        <!-- 状态指示 -->
        <div class="status-bar">
          <div v-if="extractionResult" class="status-content">
            <div class="status-indicator success">
              <i class="el-icon-circle-check"></i>
              <span>已完成解析</span>
            </div>
            <div class="field-count">
              共提取 <strong>{{ extractionResult.totalFields }}</strong> 个字段
            </div>
            <div class="status-detail">
              <span class="confirmed"><i class="el-icon-check"></i> 已确认 {{ extractionResult.confirmedFields }}</span>
              <span v-if="extractionResult.pendingFields > 0" class="pending"><i class="el-icon-question"></i> 待处理 {{ extractionResult.pendingFields }}</span>
              <span v-if="extractionResult.conflictFields > 0" class="conflict"><i class="el-icon-warning"></i> 冲突 {{ extractionResult.conflictFields }}</span>
            </div>
          </div>
          <div v-else class="status-placeholder">
            <span>等待上传文档...</span>
          </div>
        </div>

        <!-- 批注清单 -->
        <div class="annotation-list">
          <h4 class="panel-title"><i class="el-icon-tickets"></i> 批注清单</h4>

          <div v-if="extractionResult" class="list-content">
            <!-- 冲突项 -->
            <div
              v-for="conflict in extractionResult.conflicts"
              :key="'conflict-' + conflict.fieldName"
              class="annotation-item conflict"
              @click="scrollToField(conflict.fieldName)"
            >
              <div class="item-header">
                <span class="item-name">{{ conflict.fieldName }}</span>
                <el-tag type="danger" size="mini">冲突</el-tag>
              </div>
              <div class="item-values">
                <span class="value-tag">{{ conflict.value1 }}</span>
                <span class="vs">vs</span>
                <span class="value-tag">{{ conflict.value2 }}</span>
              </div>
              <p class="item-reason">{{ conflict.reason }}</p>
            </div>

            <!-- 正常字段 -->
            <div
              v-for="item in extractionResult.items"
              :key="item.fieldKey"
              class="annotation-item"
              :class="{
                'confirmed': item.status === 'confirmed',
                'pending': item.status === 'pending',
                'conflict': item.status === 'conflict'
              }"
              @click="scrollToField(item.fieldName)"
            >
              <div class="item-header">
                <span class="item-name">{{ item.fieldName }}</span>
                <el-tag v-if="item.status === 'confirmed'" type="success" size="mini">✓ 已确认</el-tag>
                <el-tag v-else-if="item.status === 'pending'" type="warning" size="mini">⚠ 待处理</el-tag>
                <el-tag v-else type="danger" size="mini">⚠ 冲突</el-tag>
              </div>
              <div class="item-value">{{ item.fieldValue || '未提取' }}</div>
              <div v-if="item.confidence" class="item-meta">
                <span class="confidence">置信度: {{ item.confidence }}</span>
                <span v-if="item.extractionMethod === 'llm'" class="method-tag">AI补充</span>
              </div>
            </div>
          </div>

          <div v-else class="empty-list">
            <p>暂无批注数据</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传对话框 -->
    <el-dialog
      title="上传压裂设计文档"
      :visible.sync="showUploadDialog"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-upload
        ref="upload"
        class="upload-dialog"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :file-list="fileList"
        accept=".docx,.doc"
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将Word文档拖到此处，或<em>点击上传</em></div>
        <div class="el-upload__tip" slot="tip">支持 .docx 格式的压裂设计文档</div>
      </el-upload>
      <div slot="footer" class="dialog-footer">
        <el-button @click="showUploadDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!selectedFile" @click="confirmUpload">确定</el-button>
      </div>
    </el-dialog>

    <!-- 冲突详情对话框 -->
    <el-dialog
      :title="'冲突详情 - ' + (selectedConflict ? selectedConflict.fieldName : '')"
      :visible.sync="showConflictDialog"
      width="600px"
    >
      <div v-if="selectedConflict" class="conflict-detail">
        <el-alert type="error" :closable="false">
          <template slot="title">
            <strong>{{ selectedConflict.fieldName }}</strong> 存在数据冲突
          </template>
        </el-alert>

        <div class="conflict-values">
          <div class="value-card">
            <h5>{{ selectedConflict.source1 }}</h5>
            <p class="value-text">{{ selectedConflict.value1 }}</p>
          </div>
          <div class="vs">VS</div>
          <div class="value-card">
            <h5>{{ selectedConflict.source2 }}</h5>
            <p class="value-text">{{ selectedConflict.value2 }}</p>
          </div>
        </div>

        <div class="conflict-reason">
          <h5>冲突原因</h5>
          <p>{{ selectedConflict.reason }}</p>
        </div>

        <div class="conflict-suggestion">
          <h5>处理建议</h5>
          <p>请核实数据来源，选择正确的值进行填充。</p>
        </div>
      </div>
      <div slot="footer">
        <el-button @click="showConflictDialog = false">关闭</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {
  getFracturingFieldsApi,
  extractFracturingOnlyApi,
  extractAndGenerateFracturingApi
} from '@/api/fracturing'

export default {
  name: 'FracturingExtract',
  data() {
    return {
      // 文件相关
      showUploadDialog: false,
      fileList: [],
      selectedFile: null,
      uploadedFile: null,

      // 知识库相关
      wellName: '',

      // 状态相关
      extracting: false,
      extractionResult: null,

      // 冲突对话框
      showConflictDialog: false,
      selectedConflict: null
    }
  },

  methods: {
    // 文件选择
    handleFileChange(file, fileList) {
      this.fileList = fileList.slice(-1)
      this.selectedFile = file.raw
    },

    // 确认上传
    confirmUpload() {
      if (this.selectedFile) {
        this.uploadedFile = {
          name: this.selectedFile.name,
          size: this.selectedFile.size,
          raw: this.selectedFile
        }
        this.showUploadDialog = false
        this.$message.success('文档已上传：' + this.selectedFile.name)
      }
    },

    // 开始提取
    async startExtraction() {
      if (!this.uploadedFile) {
        this.$message.warning('请先上传压裂设计文档')
        return
      }

      this.extracting = true
      this.extractionResult = null

      try {
        const formData = new FormData()
        formData.append('fracturingDoc', this.uploadedFile.raw, this.uploadedFile.name)
        if (this.wellName) {
          formData.append('wellName', this.wellName)
        }

        const res = await extractFracturingOnlyApi(formData)

        if (res.code === 0 || res.code === 200) {
          this.extractionResult = res.data
          this.$message.success('提取完成，共提取 ' + this.extractionResult.totalFields + ' 个字段')
        } else {
          throw new Error(res.message || '提取失败')
        }
      } catch (e) {
        console.error('提取失败', e)
        this.$message.error('提取失败: ' + (e.message || '请检查文档格式'))
      } finally {
        this.extracting = false
      }
    },

    // 导出文档
    async exportDocument() {
      if (!this.uploadedFile || !this.extractionResult) {
        this.$message.warning('请先执行提取')
        return
      }

      try {
        const formData = new FormData()
        formData.append('fracturingDoc', this.uploadedFile.raw, this.uploadedFile.name)
        if (this.wellName) {
          formData.append('wellName', this.wellName)
        }

        this.$message.info('正在生成文档，请稍候...')

        const blob = await extractAndGenerateFracturingApi(formData)

        if (blob instanceof Blob) {
          const fileName = (this.extractionResult.wellName || '未知井') + '_压裂工程设计.docx'
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          this.$message.success('文档已导出：' + fileName)
        } else {
          throw new Error('文档生成失败')
        }
      } catch (e) {
        console.error('导出失败', e)
        this.$message.error('导出失败: ' + (e.message || '未知错误'))
      }
    },

    // 滚动到字段
    scrollToField(fieldName) {
      // 可以实现页面内滚动
      console.log('scroll to field:', fieldName)
    },

    // 辅助方法
    hasFieldValue(fieldKey) {
      if (!this.extractionResult) return false
      const item = this.extractionResult.items.find(i => i.fieldKey === fieldKey)
      return item && item.fieldValue && item.fieldValue.length > 0
    },

    hasConflict(fieldName) {
      if (!this.extractionResult || !this.extractionResult.conflicts) return false
      return this.extractionResult.conflicts.some(c => c.fieldName === fieldName)
    },

    getConflictValue1(fieldName) {
      const conflict = this.extractionResult.conflicts.find(c => c.fieldName === fieldName)
      return conflict ? conflict.value1 : ''
    },

    getConflictValue2(fieldName) {
      const conflict = this.extractionResult.conflicts.find(c => c.fieldName === fieldName)
      return conflict ? conflict.value2 : ''
    }
  }
}
</script>

<style scoped>
.fracturing-extract-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f0f2f5;
}

/* 顶部操作栏 */
.page-header {
  background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);
  color: white;
  padding: 16px 24px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left h2 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
}

.page-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 文档预览区 */
.document-preview-area {
  flex: 1;
  min-width: 500px;
  background: #fff;
  margin: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.area-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.area-title {
  font-weight: 600;
  color: #303133;
}

.file-name {
  color: #909399;
  font-size: 13px;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 文档标题 */
.doc-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.doc-title {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 8px 0;
}

.doc-meta {
  font-size: 12px;
  color: #8c8c8c;
  margin: 0;
}

/* 信息表格 */
.info-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.info-table tr {
  border-bottom: 1px solid #e8e8e8;
}

.info-table td {
  padding: 10px 8px;
}

.info-table .label {
  width: 100px;
  color: #8c8c8c;
  font-size: 13px;
}

.info-table .value {
  color: #262626;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-value {
  font-weight: 500;
}

.conflict-row {
  background: #fff1f0;
}

.conflict-value {
  color: #f5222d;
  font-weight: 500;
}

.separator {
  color: #8c8c8c;
}

/* 冲突警告 */
.conflict-warning {
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f5222d;
  font-weight: 600;
  margin-bottom: 12px;
}

.conflict-item {
  margin-bottom: 12px;
}

.conflict-item:last-child {
  margin-bottom: 0;
}

.conflict-title {
  font-weight: 500;
  color: #262626;
  margin: 0 0 4px 0;
}

.conflict-desc {
  font-size: 12px;
  color: #595959;
  margin: 0;
  line-height: 1.5;
}

/* 缺失警告 */
.missing-warning {
  background: #fff7e6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 16px;
}

.missing-warning .warning-header {
  color: #fa8c16;
}

.missing-warning p {
  margin: 0;
  font-size: 13px;
  color: #595959;
}

/* 空状态 */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0 0 16px 0;
}

/* 批注面板 */
.annotation-panel {
  width: 320px;
  background: #fff;
  margin: 16px;
  margin-left: 8px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 知识库抽取 */
.knowledge-extraction {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.panel-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-group {
  margin-bottom: 12px;
}

.extract-btn {
  width: 100%;
}

/* 状态栏 */
.status-bar {
  padding: 12px 16px;
  background: #f0f5ff;
  border-bottom: 1px solid #e8e8e8;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.status-indicator.success {
  color: #52c41a;
}

.status-indicator i {
  font-size: 16px;
}

.field-count {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.field-count strong {
  color: #1890ff;
}

.status-detail {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
}

.status-detail span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-detail .confirmed {
  color: #52c41a;
}

.status-detail .pending {
  color: #fa8c16;
}

.status-detail .conflict {
  color: #f5222d;
}

.status-placeholder {
  color: #8c8c8c;
  font-size: 13px;
}

/* 批注列表 */
.annotation-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.list-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.annotation-item {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.annotation-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.annotation-item.conflict {
  background: #fff1f0;
  border-color: #ffccc7;
}

.annotation-item.pending {
  background: #fff7e6;
  border-color: #ffe58f;
}

.annotation-item.confirmed {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.item-name {
  font-weight: 500;
  font-size: 13px;
  color: #262626;
}

.item-value {
  font-size: 12px;
  color: #595959;
  margin-bottom: 4px;
}

.item-meta {
  font-size: 11px;
  color: #8c8c8c;
  display: flex;
  gap: 8px;
}

.method-tag {
  background: #e6f7ff;
  color: #1890ff;
  padding: 0 4px;
  border-radius: 2px;
}

.item-values {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.value-tag {
  background: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #595959;
}

.vs {
  color: #8c8c8c;
  font-size: 11px;
  font-weight: 600;
}

.item-reason {
  font-size: 11px;
  color: #8c8c8c;
  margin: 0;
  line-height: 1.4;
}

.empty-list {
  text-align: center;
  color: #8c8c8c;
  padding: 40px 0;
}

/* 上传对话框 */
.upload-dialog {
  text-align: center;
}

.upload-dialog i {
  font-size: 48px;
  color: #C0C4CC;
  margin-bottom: 16px;
}

/* 冲突详情 */
.conflict-detail {
  padding: 8px 0;
}

.conflict-values {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
}

.value-card {
  flex: 1;
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.value-card h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #8c8c8c;
}

.value-text {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.vs {
  padding: 0 16px;
  font-weight: 600;
  color: #8c8c8c;
}

.conflict-reason,
.conflict-suggestion {
  margin-top: 16px;
}

.conflict-reason h5,
.conflict-suggestion h5 {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #303133;
}

.conflict-reason p,
.conflict-suggestion p {
  margin: 0;
  font-size: 13px;
  color: #595959;
  line-height: 1.6;
}
</style>
