<template>
  <div class="knowledge-list-container">
    <el-card>
      <div slot="header" class="card-header">
        <span>压裂文档库</span>
        <div>
          <el-select
            v-model="currentDatasetId"
            size="small"
            style="width: 220px; margin-right: 10px;"
            placeholder="选择知识库"
            @change="handleDatasetChange"
          >
            <el-option
              v-for="ds in datasets"
              :key="ds.id"
              :label="ds.name + '（' + (ds.documentCount || 0) + '）'"
              :value="ds.id"
            />
          </el-select>
          <el-button type="primary" size="small" icon="el-icon-plus" @click="handleCreate">
            添加知识
          </el-button>
          <el-button size="small" icon="el-icon-upload2" @click="handleBatchImport">
            批量导入
          </el-button>
        </div>
      </div>

      <!-- 搜索筛选 -->
      <el-form :inline="true" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="queryForm.keyword" placeholder="搜索文件名" clearable @keyup.enter.native="handleSearch" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="queryForm.suffix" placeholder="全部" clearable>
            <el-option label="docx" value="docx" />
            <el-option label="doc" value="doc" />
            <el-option label="pdf" value="pdf" />
            <el-option label="txt" value="txt" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
          <el-button icon="el-icon-refresh" @click="handleReset">重置</el-button>
          <el-button
            type="success"
            icon="el-icon-refresh"
            :loading="loading"
            @click="loadDocuments"
          >刷新</el-button>
        </el-form-item>
      </el-form>

      <!-- 文档列表 -->
      <el-table :data="filteredDocuments" v-loading="loading" border stripe>
        <el-table-column type="index" width="50" label="序号" />
        <el-table-column prop="name" label="文档名称" min-width="240" show-overflow-tooltip />
        <el-table-column prop="suffix" label="类型" width="80">
          <template slot-scope="{row}">
            <el-tag size="small" type="info">{{ row.suffix || '未知' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="100">
          <template slot-scope="{row}">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column prop="createDate" label="上传时间" width="170" />
        <el-table-column label="状态" width="90">
          <template slot-scope="{row}">
            <el-tag size="small" :type="row.run === 'DONE' ? 'success' : 'warning'">
              {{ row.run === 'DONE' ? '已解析' : '未解析' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template slot-scope="{row}">
            <el-button type="text" size="small" @click="handleView(row)">预览</el-button>
            <el-button type="text" size="small" @click="handleDownload(row)">下载</el-button>
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

    <!-- 添加/编辑对话框 -->
    <el-dialog
      :title="dialogTitle"
      :visible.sync="dialogVisible"
      width="700px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="输入知识标题" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="选择分类" filterable allow-create>
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="来源" prop="source">
          <el-input v-model="form.source" placeholder="输入知识来源" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            placeholder="输入知识内容"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tags" multiple placeholder="选择标签" filterable allow-create>
            <el-option label="压裂" value="压裂" />
            <el-option label="钻井" value="钻井" />
            <el-option label="设备" value="设备" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </span>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog title="文档预览" :visible.sync="detailVisible" width="900px" top="5vh">
      <div class="detail-meta-bar" v-if="currentKnowledge.name">
        <el-tag size="small">{{ currentKnowledge.suffix || 'docx' }}</el-tag>
        <span class="doc-name">{{ currentKnowledge.name }}</span>
        <span class="doc-size">{{ formatSize(currentKnowledge.size) }}</span>
      </div>
      <div class="knowledge-detail" v-loading="previewLoading">
        <!-- Excel：多 sheet 可切换。后端只把 Excel 转成一张表，用它看不到其余 sheet，
             所以这里改成取原始文件在前端解析 -->
        <excel-sheet-preview
          v-if="previewKind === 'xlsx'"
          :source="previewExcelSource"
          max-height="66vh"
        />
        <p v-else-if="previewError" class="empty-hint">{{ previewError }}</p>
        <div v-else class="detail-content preview-body" v-html="sanitizeRichText(previewHtml)"></div>
      </div>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog
      title="上传文件到压裂知识库"
      :visible.sync="importDialogVisible"
      width="560px"
      :close-on-click-modal="!uploading"
      :show-close="!uploading"
    >
      <el-alert
        title="文件将上传到知识库，上传后即可在线预览，并可直接用于压裂设计文档生成。"
        type="info"
        :closable="false"
        style="margin-bottom: 14px;"
      />
      <el-alert
        v-if="failedUploads.length && !uploading"
        type="error"
        :closable="false"
        style="margin-bottom: 14px;"
        title="上次上传有文件失败"
      >
        <div class="fail-list">
          <div v-for="(f, i) in failedUploads.slice(0, 3)" :key="i" class="fail-item">
            {{ f.name }} — {{ f.msg }}
          </div>
          <div v-if="failedUploads.length > 3" class="fail-more">
            另有 {{ failedUploads.length - 3 }} 个文件同样失败
          </div>
        </div>
      </el-alert>

      <div v-if="uploading && uploadProgress" class="upload-progress">
        <div class="upload-progress__text">
          正在上传 {{ uploadProgress.done + 1 > uploadProgress.total ? uploadProgress.total : uploadProgress.done + 1 }}
          / {{ uploadProgress.total }}：{{ uploadProgress.current }}
        </div>
        <el-progress
          :percentage="Math.round(uploadProgress.done / uploadProgress.total * 100)"
          :stroke-width="10"
        />
      </div>

      <el-upload
        v-if="!uploading"
        ref="upload"
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :multiple="true"
        accept=".doc,.docx,.pdf,.txt,.xls,.xlsx"
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <div class="el-upload__tip" slot="tip">
          支持 DOC / DOCX / PDF / TXT / XLS / XLSX，可多选；系统按顺序逐个上传，单个失败不影响其余文件
        </div>
      </el-upload>
      <span slot="footer">
        <el-button :disabled="uploading" @click="importDialogVisible = false">取消</el-button>
        <el-button
          v-if="failedUploads.length && !uploading"
          type="warning"
          @click="handleRetryFailed"
        >
          重试失败的 {{ failedUploads.length }} 个
        </el-button>
        <el-button type="primary" :loading="uploading" @click="handleConfirmImport">
          {{ uploading ? '上传中…' : '确认上传' }}
        </el-button>
      </span>
    </el-dialog>

    <!-- 智能问答：右下角悬浮球 + 抽屉式对话面板 -->
    <knowledge-chat
      :dataset-id="currentDatasetId"
      :dataset-name="currentDatasetName"
      :doc-total="pagination.total"
    />
  </div>
</template>

<script>
import { sanitizeRichText } from '@/utils/sanitize-rich-text'
import {
  getRagDatasetsApi,
  getRagWorkbenchDatasetApi,
  getRagDocumentsApi,
  uploadRagDocumentApi,
  previewRagDocumentApi,
  deleteRagDocumentsApi,
  downloadRagDocumentApi
} from '@/api/ragflow'
import KnowledgeChat from '@/components/KnowledgeChat'
import ExcelSheetPreview from '@/components/shared/ExcelSheetPreview.vue'

export default {
  name: 'KnowledgeList',
  components: { KnowledgeChat, ExcelSheetPreview },
  data() {
    return {
      loading: false,
      uploading: false,
      previewLoading: false,
      queryForm: {
        keyword: '',
        suffix: ''
      },
      categories: ['压裂工艺', '钻井技术', '设备维护', '安全管理', '标准规范'],
      datasets: [],
      currentDatasetId: '',
      documents: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0
      },
      dialogVisible: false,
      dialogTitle: '添加知识',
      detailVisible: false,
      importDialogVisible: false,
      currentKnowledge: {},
      previewHtml: '',
      previewError: '',
      /** 'html'（后端转换正文）| 'xlsx'（前端解析原始表） */
      previewKind: 'html',
      /** Excel 预览源（ArrayBuffer） */
      previewExcelSource: null,
      form: {
        id: null,
        title: '',
        category: '',
        source: '',
        content: '',
        tags: []
      },
      rules: {
        title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
        category: [{ required: true, message: '请选择分类', trigger: 'change' }],
        content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
      },
      fileList: [],
      uploadProgress: null,
      failedUploads: []
    }
  },
  computed: {
    // 当前知识库名称（问答面板标题展示用）
    currentDatasetName() {
      const ds = this.datasets.find(d => d.id === this.currentDatasetId)
      return ds ? ds.name : ''
    },
    filteredDocuments() {
      const kw = (this.queryForm.keyword || '').trim().toLowerCase()
      const sfx = this.queryForm.suffix
      return this.documents.filter(d => {
        if (sfx && d.suffix !== sfx) return false
        if (!kw) return true
        return (d.name || '').toLowerCase().indexOf(kw) >= 0
      })
    }
  },
  created() {
    this.loadDatasets()
  },
  methods: {
    sanitizeRichText,
    /* ---------- 知识库 ---------- */
    async loadDatasets() {
      try {
        const res = await getRagDatasetsApi()
        this.datasets = (res.data || []).filter(d => d.id)
        // 默认用工作台配置的知识库（压裂知识库）
        let target = this.currentDatasetId
        try {
          const wb = await getRagWorkbenchDatasetApi()
          if (wb.data && wb.data.datasetId) target = wb.data.datasetId
        } catch (e) {
          // 工作台知识库不可用时退回列表首个
        }
        if (!target && this.datasets.length) target = this.datasets[0].id
        this.currentDatasetId = target
        if (target) {
          this.loadDocuments()
        } else {
          this.$message.warning('RagFlow 中没有可用知识库')
        }
      } catch (e) {
        this.$message.error('读取知识库列表失败：' + (e.message || '请检查后端服务'))
      }
    },

    handleDatasetChange() {
      this.pagination.page = 1
      this.loadDocuments()
    },

    /* ---------- 文档 ---------- */
    async loadDocuments() {
      if (!this.currentDatasetId) return
      this.loading = true
      try {
        const res = await getRagDocumentsApi(
          this.currentDatasetId,
          this.pagination.page,
          this.pagination.pageSize
        )
        const data = res.data || {}
        this.documents = data.list || []
        this.pagination.total = data.total || 0
      } catch (e) {
        this.$message.error('读取文档列表失败：' + (e.message || '请检查后端服务'))
      } finally {
        this.loading = false
      }
    },

    handleSearch() {
      this.pagination.page = 1
      this.loadDocuments()
    },
    handleReset() {
      this.queryForm = { keyword: '', suffix: '' }
      this.pagination.page = 1
      this.loadDocuments()
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
      this.loadDocuments()
    },
    handleCurrentChange(val) {
      this.pagination.page = val
      this.loadDocuments()
    },

    /* ---------- 预览 ---------- */
    async handleView(row) {
      this.currentKnowledge = { ...row }
      this.previewHtml = ''
      this.previewError = ''
      this.previewExcelSource = null
      this.previewKind = 'html'
      this.detailVisible = true
      this.previewLoading = true
      // 后端按「取后缀」的判断，有些数据 suffix 为空但 name 带扩展名
      const ext = String(row.suffix || (row.name || '').split('.').pop() || '')
        .toLowerCase()
        .replace(/^\./, '')
      try {
        if (['xls', 'xlsx'].includes(ext)) {
          // Excel 走原始文件：后端 HTML 转换只保留一张表，看不到其余 sheet
          const blob = await downloadRagDocumentApi(this.currentDatasetId, row.id, row.name)
          this.previewExcelSource = await blob.arrayBuffer()
          this.previewKind = 'xlsx'
        } else {
          const res = await previewRagDocumentApi(
            this.currentDatasetId,
            row.id,
            row.name,
            this.guessWellName(row.name)
          )
          const data = res.data || {}
          this.previewHtml = data.html || '<p class="empty-hint">该文档没有可解析的正文内容</p>'
        }
      } catch (e) {
        if (this.previewKind === 'xlsx') {
          this.previewKind = 'html'
        }
        this.previewError = '预览失败：' + (e.message || '未知错误')
      } finally {
        this.previewLoading = false
      }
    },

    /* ---------- 上传 ---------- */
    handleBatchImport() {
      this.fileList = []
      this.failedUploads = []
      this.uploadProgress = null
      this.importDialogVisible = true
    },
    handleFileChange(file, fileList) {
      this.fileList = fileList
    },
    async handleConfirmImport() {
      if (this.fileList.length === 0) {
        this.$message.warning('请先选择文件')
        return
      }
      if (!this.currentDatasetId) {
        this.$message.warning('请先选择知识库')
        return
      }
      await this.runBatchUpload(this.fileList.map(i => i.raw || i).filter(Boolean))
    },

    /**
     * 批量上传（串行）。OmniRAG 服务端限制并发文档操作数（max_parallel=2），
     * 且单文件解析耗时不确定，串行最稳，也能把进度如实反馈给用户。
     */
    async runBatchUpload(files) {
      if (!files.length) return
      const total = files.length
      this.uploading = true
      this.uploadProgress = { done: 0, total, current: '' }
      let ok = 0
      const failed = []
      for (let i = 0; i < total; i++) {
        const raw = files[i]
        this.uploadProgress.current = raw.name || '文件'
        try {
          await uploadRagDocumentApi(this.currentDatasetId, raw)
          ok++
        } catch (e) {
          failed.push({ name: raw.name || '文件', file: raw, msg: e.message || '上传失败' })
        }
        this.uploadProgress.done = i + 1
      }
      this.uploading = false
      this.failedUploads = failed
      if (!failed.length) {
        this.importDialogVisible = false
        this.fileList = []
        this.uploadProgress = null
        this.$message.success(`成功上传 ${ok} 个文件`)
      } else {
        // 失败项留在弹窗里，用户可一键重试，不用重新选一遍文件
        this.fileList = failed.map(f => f.file)
        this.showUploadError(ok, failed)
      }
      this.loadDocuments()
    },

    /** 失败汇总：同一原因只提示一次，避免 5 个文件重复刷 5 行相同文案 */
    showUploadError(ok, failed) {
      const byReason = new Map()
      failed.forEach(f => {
        if (!byReason.has(f.msg)) byReason.set(f.msg, [])
        byReason.get(f.msg).push(f.name)
      })
      const parts = []
      byReason.forEach((names, msg) => {
        parts.push(`${msg}\n影响 ${names.length} 个文件：${names.join('、')}`)
      })
      const head = ok > 0 ? `成功 ${ok} 个，失败 ${failed.length} 个。\n\n` : `全部 ${failed.length} 个文件上传失败。\n\n`
      this.$alert(head + parts.join('\n\n'), '上传结果', {
        type: 'error',
        customClass: 'upload-result-box'
      })
    },

    async handleRetryFailed() {
      const files = this.fileList.slice()
      if (!files.length) return
      await this.runBatchUpload(files)
    },

    /* ---------- 下载 ---------- */
    async handleDownload(row) {
      try {
        const blob = await downloadRagDocumentApi(this.currentDatasetId, row.id, row.name)
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = row.name || 'document.docx'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } catch (e) {
        this.$message.error('下载失败：' + (e.message || '未知错误'))
      }
    },

    /* ---------- 删除 ---------- */
    handleDelete(row) {
      this.$confirm('确认从知识库中删除「' + row.name + '」？', '提示', { type: 'warning' }).then(async () => {
        try {
          await deleteRagDocumentsApi(this.currentDatasetId, [row.id])
          this.$message.success('删除成功')
          this.loadDocuments()
        } catch (e) {
          this.$message.error('删除失败：' + (e.message || '未知错误'))
        }
      }).catch(() => {})
    },

    /* ---------- 工具 ---------- */
    cleanWellName(s) {
      let t = String(s == null ? '' : s).trim()
      if (!t) return ''
      t = t.replace(/\.(docx?|pdf|txt)$/i, '')
      t = t.replace(/(压裂)?(地质设计|工程设计)(文档)?$/i, '')
      t = t.replace(/井组$/, '')
      t = t.replace(/井$/, '')
      t = t.trim()
      return t
    },
    guessWellName(fileName) {
      const n = this.cleanWellName(fileName || '')
      // 井号一般形如 郑58-5B-3平2 / 马平5
      const m = n.match(/[一-龥A-Za-z][A-Za-z0-9]*\d[\dA-Za-z\-平]*\d?/)
      return m ? m[0] : n
    },
    formatSize(bytes) {
      if (!bytes && bytes !== 0) return '--'
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(2) + ' MB'
    },
    handleCreate() {
      this.dialogTitle = '添加知识'
      this.form = { id: null, title: '', category: '', source: '', content: '', tags: [] }
      this.dialogVisible = true
    },
    handleSubmit() {
      this.$refs.form.validate(valid => {
        if (valid) {
          this.$message.warning('知识条目维护暂未开放，请通过「批量导入」上传文档到压裂知识库')
          this.dialogVisible = false
        }
      })
    },
    handleDialogClose() {
      this.$refs.form.resetFields()
    }
  }
}
</script>

<style scoped>
.knowledge-list-container {
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

.detail-meta-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  color: #8e8e93;
  font-size: 13px;
}

.detail-meta-bar .doc-name {
  color: #303133;
  font-weight: 600;
}

.knowledge-detail .detail-header {
  margin-bottom: 20px;
}

.knowledge-detail .detail-header h3 {
  margin-bottom: 12px;
  font-size: 18px;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #8e8e93;
  font-size: 13px;
}

.detail-content {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.preview-body {
  max-height: 68vh;
  overflow: auto;
  white-space: normal;
}

.preview-body >>> table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.preview-body >>> table td,
.preview-body >>> table th {
  border: 1px solid #dcdfe6;
  padding: 4px 8px;
  font-size: 13px;
}

.preview-body >>> p {
  margin: 6px 0;
}

.empty-hint {
  color: #909399;
  text-align: center;
  padding: 24px 0;
}

.tip-text {
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}

.doc-name {
  color: #303133;
}

.upload-progress {
  padding: 8px 0 4px;

  &__text {
    font-size: 13px;
    color: #606266;
    margin-bottom: 10px;
    line-height: 1.5;
    word-break: break-all;
  }
}

.fail-list {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.7;
}

.fail-item {
  color: #f56c6c;
  word-break: break-all;
}

.fail-more {
  color: #909399;
  margin-top: 2px;
}
</style>

<style>
/* 上传结果弹窗：多段原因分行展示，需全局样式（el-alert 内部节点） */
.upload-result-box .el-message-box__message {
  white-space: pre-wrap;
  line-height: 1.7;
  max-height: 420px;
  overflow-y: auto;
}
</style>
