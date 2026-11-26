<template>
  <div class="template-list-container">
    <!-- 射孔方式模板概览 -->
    <div class="method-cards">
      <div
        v-for="m in methodStatus"
        :key="m.method"
        class="method-card"
        :class="{ uploaded: m.uploaded, active: filterMethod === m.method }"
        @click="toggleMethodFilter(m.method)"
      >
        <div class="card-head">
          <i :class="m.uploaded ? 'el-icon-circle-check' : 'el-icon-warning-outline'"></i>
          <span class="method-name">{{ m.method }}</span>
        </div>
        <div class="card-body">
          <template v-if="m.uploaded">
            <div class="card-line">{{ m.fileName || '已绑定模板文件' }}</div>
            <div class="card-hint">文档中心已归档</div>
          </template>
          <template v-else>
            <div class="card-line muted">尚未上传模板</div>
            <div class="card-hint">点击右侧「上传模板」补充</div>
          </template>
        </div>
      </div>
    </div>

    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索模板名称 / 文件名"
          prefix-icon="el-icon-search"
          style="width: 260px"
          clearable
        />
        <el-select
          v-model="filterMethod"
          placeholder="射孔方式"
          style="width: 160px; margin-left: 10px"
          clearable
        >
          <el-option
            v-for="m in methodStatus"
            :key="m.method"
            :label="m.method"
            :value="m.method"
          />
        </el-select>
        <el-button icon="el-icon-refresh" style="margin-left: 10px" @click="loadAll">
          刷新
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" icon="el-icon-upload2" @click="openUpload()">
          上传模板
        </el-button>
      </div>
    </div>

    <!-- 模板列表 -->
    <el-table
      v-loading="tableLoading"
      :data="filteredData"
      border
      stripe
      style="width: 100%; margin-top: 15px"
      empty-text="暂无模板，请点击右上角「上传模板」"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="templateName" label="模板名称" min-width="200" show-overflow-tooltip>
        <template slot-scope="{ row }">
          <span class="template-name" @click="handlePreview(row)">{{ row.templateName }}</span>
          <el-tag v-if="row.isDefault === '1'" type="success" size="mini" style="margin-left: 6px">
            默认
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="perforationMethod" label="射孔方式" width="130" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.perforationMethod" size="small">{{ row.perforationMethod }}</el-tag>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="fileName" label="模板文件" min-width="180" show-overflow-tooltip>
        <template slot-scope="{ row }">
          <span v-if="row.fileName">{{ row.fileName }}</span>
          <span v-else class="muted">未上传</span>
        </template>
      </el-table-column>
      <el-table-column label="文件大小" width="100" align="center">
        <template slot-scope="{ row }">
          {{ formatSize(row.fileSize) }}
        </template>
      </el-table-column>
      <el-table-column prop="nodeCount" label="节点数" width="80" align="center" />
      <el-table-column prop="useCount" label="使用次数" width="90" align="center" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template slot-scope="{ row }">
          <el-switch
            v-model="row.status"
            active-value="1"
            inactive-value="0"
            @change="handleStatusChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" align="center" fixed="right">
        <template slot-scope="{ row }">
          <el-button
            type="text"
            size="small"
            :disabled="!row.fileId"
            @click="handleDownload(row)"
          >
            下载
          </el-button>
          <el-button
            v-if="row.perforationMethod"
            type="text"
            size="small"
            @click="openUpload(row.perforationMethod, row)"
          >
            替换
          </el-button>
          <el-button type="text" size="small" @click="handlePreview(row)">详情</el-button>
          <el-button type="text" size="small" class="danger-text" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 详情弹窗 -->
    <el-dialog
      :visible.sync="previewVisible"
      title="模板详情"
      width="80%"
      top="5vh"
      :close-on-click-modal="false"
      custom-class="template-detail-dialog"
    >
      <div v-if="currentTemplate">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
          <el-descriptions-item label="模板名称">
            {{ currentTemplate.templateName }}
          </el-descriptions-item>
          <el-descriptions-item label="模板编码">
            {{ currentTemplate.templateCode }}
          </el-descriptions-item>
          <el-descriptions-item label="射孔方式">
            {{ currentTemplate.perforationMethod || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="文档类型">
            {{ currentTemplate.docType }}
          </el-descriptions-item>
          <el-descriptions-item label="模板文件">
            {{ currentTemplate.fileName || '未上传' }}
          </el-descriptions-item>
          <el-descriptions-item label="文件大小">
            {{ formatSize(currentTemplate.fileSize) }}
          </el-descriptions-item>
          <el-descriptions-item label="文档中心 FILE_ID" :span="2">
            <span class="mono">{{ currentTemplate.fileId || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="使用次数">
            {{ currentTemplate.useCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="章节节点数">
            {{ currentTemplate.nodeCount || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="页眉" :span="2">
            {{ currentTemplate.headerText || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentTemplate.remark || '—' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 预览标签页 -->
        <el-tabs v-model="previewActiveTab">
          <!-- 章节骨架 -->
          <el-tab-pane label="章节骨架" name="skeleton">
            <div v-if="sectionNodes.length" class="preview-content">
              <div class="structure-tree">
                <div
                  v-for="n in sectionNodes"
                  :key="n.key"
                  class="tree-node"
                  :class="'level-' + n.level"
                >
                  <span class="node-no">{{ n.no }}</span>
                  <span class="node-title">{{ n.title }}</span>
                </div>
              </div>
            </div>
            <el-alert
              v-else
              type="info"
              :closable="false"
              title="该模板尚未解析出章节骨架（骨架来自内置批注模板，属正常情况）"
            />
          </el-tab-pane>

          <!-- 文档预览 -->
          <el-tab-pane name="docx">
            <template slot="label">
              <span>文档预览</span>
              <span v-if="!currentTemplate.fileId" class="tab-badge">无文件</span>
            </template>
            <div v-if="!currentTemplate.fileId" class="preview-no-file">
              <i class="el-icon-document"></i>
              <p>该模板尚未上传文件，无法预览</p>
            </div>
            <div v-else class="preview-docx-wrapper">
              <div v-if="previewDocxLoading" class="preview-loading">
                <i class="el-icon-loading"></i>
                <span>正在加载文档预览...</span>
              </div>
              <!-- 预览失败：优先走数据绑定，v-html 只作为渲染期的兜底容器 -->
              <div v-if="previewError" class="preview-error">
                <i class="el-icon-warning"></i>
                <div class="preview-error-body">
                  <p class="preview-error-text">{{ previewError }}</p>
                  <p v-if="isDocCenterDown" class="preview-error-hint">
                    提示：该模板文件存放在文档中心，本机/当前网络无法访问时且服务端未缓存副本，就无法预览。
                    必要时重新上传一次模板文件即可生成本地副本。
                  </p>
                  <el-button size="mini" type="primary" plain :loading="previewDocxLoading" @click="retryDocxPreview">
                    重试
                  </el-button>
                </div>
              </div>
              <!-- Excel 模板：多 sheet 可切换 -->
              <excel-sheet-preview
                v-if="previewKind === 'xlsx'"
                :source="previewExcelSource"
                max-height="56vh"
              />
              <!-- docx-preview 渲染目标 -->
              <div v-show="previewKind !== 'xlsx'" ref="docxPreviewBox" class="docx-preview-box"></div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :disabled="!currentTemplate || !currentTemplate.fileId"
          @click="handleDownload(currentTemplate)"
        >
          下载模板文件
        </el-button>
      </span>
    </el-dialog>

    <!-- 上传弹窗 -->
    <el-dialog
      :visible.sync="uploadVisible"
      title="上传射孔方式模板"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="uploadForm" label-width="100px" size="small">
        <el-form-item label="射孔方式" required>
          <el-select
            v-model="uploadForm.method"
            placeholder="请选择射孔方式"
            style="width: 100%"
            :disabled="!!uploadForm.lockedMethod"
          >
            <el-option
              v-for="m in PERFORATION_METHODS"
              :key="m"
              :label="m"
              :value="m"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模板名称">
          <el-input
            v-model="uploadForm.templateName"
            :placeholder="uploadForm.method ? uploadForm.method + '压裂工程设计模板' : '留空自动生成'"
          />
        </el-form-item>
        <el-form-item label="模板文件" required>
          <el-upload
            ref="uploader"
            :auto-upload="false"
            :limit="1"
            accept=".docx,.doc,.xls,.xlsx"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            drag
            style="width: 100%"
          >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">将 docx / xlsx 文件拖到此处，或<em>点击选择</em></div>
            <div class="el-upload__tip" slot="tip">
              文件会先存入文档中心，再登记到模板库；同一射孔方式重复上传将覆盖原模板
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="uploadForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <el-alert
        v-if="uploadForm.lockedMethod"
        type="warning"
        :closable="false"
        :title="'将替换「' + uploadForm.lockedMethod + '」已有的模板文件'"
        style="margin-bottom: 10px"
      />
      <span slot="footer" class="dialog-footer">
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="submitUpload">
          {{ uploading ? '上传中...' : '确定上传' }}
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  getDocTemplateList,
  getPerforationMethods,
  uploadPerforationTemplate,
  updateDocTemplate,
  deleteDocTemplate,
  downloadDocTemplate,
  previewDocTemplate
} from '@/api/doc-template'
import ExcelSheetPreview from '@/components/shared/ExcelSheetPreview.vue'

const PERFORATION_METHODS = ['全程固井', '半程固井', '滑套压裂']

export default {
  name: 'TemplateList',
  components: { ExcelSheetPreview },
  data() {
    return {
      PERFORATION_METHODS,
      searchKeyword: '',
      filterMethod: '',
      tableLoading: false,
      tableData: [],
      methodStatus: [],
      previewVisible: false,
      currentTemplate: null,
      sectionNodes: [],
      /** 文档预览形态：'docx' | 'xlsx' */
      previewKind: 'docx',
      /** Excel 预览源（ArrayBuffer） */
      previewExcelSource: null,
      previewActiveTab: 'skeleton', // 'skeleton' | 'docx'
      previewDocxLoading: false,
      /** 预览失败原因（文本直接插值，不走 v-html，避免文件名里的尖括号破坏结构） */
      previewError: '',
      /** 并发保护：切模板/重试时旧请求的结果要丢弃 */
      previewReqId: 0,
      uploadVisible: false,
      uploading: false,
      uploadForm: {
        method: '',
        lockedMethod: '',
        templateName: '',
        remark: '',
        file: null
      }
    }
  },
  computed: {
    /** 失败原因是否为「文档中心不可达 + 无本地副本」 */
    isDocCenterDown() {
      return !!this.previewError && this.previewError.indexOf('文档中心') >= 0
    },
    filteredData() {
      const kw = (this.searchKeyword || '').trim().toLowerCase()
      return this.tableData.filter(row => {
        if (this.filterMethod && row.perforationMethod !== this.filterMethod) return false
        if (!kw) return true
        return (
          (row.templateName || '').toLowerCase().includes(kw) ||
          (row.fileName || '').toLowerCase().includes(kw)
        )
      })
    }
  },
  watch: {
    // 切换到「文档预览」标签时触发加载
    previewActiveTab(tab) {
      if (tab === 'docx' && this.currentTemplate && this.currentTemplate.templateId) {
        this.loadDocxPreview(this.currentTemplate.templateId)
      }
    }
  },
  created() {
    this.loadAll()
  },
  methods: {
    async loadAll() {
      await Promise.all([this.loadData(), this.loadMethods()])
    },

    loadMethods() {
      return getPerforationMethods()
        .then(res => {
          this.methodStatus = res.data || []
        })
        .catch(() => {
          this.methodStatus = PERFORATION_METHODS.map(m => ({ method: m, uploaded: false }))
        })
    },

    loadData() {
      this.tableLoading = true
      return getDocTemplateList()
        .then(res => {
          this.tableData = res.data || []
        })
        .catch(err => {
          this.$message.error(err.message || '加载模板失败')
          this.tableData = []
        })
        .finally(() => {
          this.tableLoading = false
        })
    },

    toggleMethodFilter(method) {
      this.filterMethod = this.filterMethod === method ? '' : method
    },

    /* ---------------- 上传 ---------------- */

    openUpload(method, row) {
      this.uploadForm = {
        method: method || '',
        lockedMethod: method || '',
        templateName: row ? row.templateName : '',
        remark: '',
        file: null
      }
      this.uploadVisible = true
      this.$nextTick(() => {
        if (this.$refs.uploader) this.$refs.uploader.clearFiles()
      })
    },

    handleFileChange(file) {
      this.uploadForm.file = file.raw
      if (!this.uploadForm.method && file.name) {
        this.uploadForm.templateName = this.uploadForm.templateName || ''
      }
    },

    handleFileRemove() {
      this.uploadForm.file = null
    },

    submitUpload() {
      if (!this.uploadForm.method) {
        this.$message.warning('请选择射孔方式')
        return
      }
      if (!this.uploadForm.file) {
        this.$message.warning('请选择模板文件')
        return
      }
      this.uploading = true
      uploadPerforationTemplate({
        file: this.uploadForm.file,
        method: this.uploadForm.method,
        templateName: this.uploadForm.templateName,
        remark: this.uploadForm.remark,
        userId: 'default'
      })
        .then(() => {
          this.$message.success('上传成功，已归档到文档中心')
          this.uploadVisible = false
          this.loadAll()
        })
        .catch(err => {
          this.$message.error(err.message || '上传失败')
        })
        .finally(() => {
          this.uploading = false
        })
    },

    /* ---------------- 列表操作 ---------------- */

    handlePreview(row) {
      this.currentTemplate = { ...row }
      this.previewError = ''
      this.previewReqId++   // 作废上一个模板的异步结果
      this.previewKind = 'docx'
      this.previewExcelSource = null
      try {
        this.sectionNodes = row.sectionsJson ? JSON.parse(row.sectionsJson) : []
      } catch (e) {
        this.sectionNodes = []
      }
      this.previewActiveTab = 'skeleton'
      this.previewVisible = true
    },

    // 切换到 docx 预览标签时加载文档
    async loadDocxPreview(templateId) {
      if (!templateId || !this.$refs.docxPreviewBox) return
      const box = this.$refs.docxPreviewBox
      const reqId = ++this.previewReqId
      const stillCurrent = () => reqId === this.previewReqId
      this.previewError = ''
      this.previewExcelSource = null
      box.innerHTML = '<div class="preview-loading"><i class="el-icon-loading"></i><span>正在加载文档预览...</span></div>'
      this.previewDocxLoading = true
      try {
        const { blob, fileName } = await previewDocTemplate(templateId)
        if (!stillCurrent()) return
        // 模板文件不一定是 docx：历史上 accept 只放开了 .docx/.doc，现在也允许 Excel
        const name = fileName || (this.currentTemplate && this.currentTemplate.fileName) || ''
        const ext = String(name.split('.').pop() || '').toLowerCase()
        if (['xls', 'xlsx', 'csv'].includes(ext)) {
          box.innerHTML = ''
          this.previewExcelSource = await blob.arrayBuffer()
          this.previewKind = 'xlsx'
          return
        }
        this.previewKind = 'docx'
        const docxPreview = await import(/* webpackChunkName: "docx-preview" */ 'docx-preview')
        if (!stillCurrent()) return
        box.innerHTML = ''
        await docxPreview.renderAsync(blob, box, null, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: true,
          breakPages: true,
          experimental: true
        })
      } catch (e) {
        if (!stillCurrent()) return
        console.error('[docx-preview] 加载/渲染失败', e)
        this.previewKind = 'docx'
        this.previewError = e && e.message ? e.message : '预览加载失败'
        box.innerHTML = `<div class="preview-error"><i class="el-icon-warning"></i><span>${this.previewError}</span></div>`
      } finally {
        if (stillCurrent()) this.previewDocxLoading = false
      }
    },

    // 手动重试（文档中心临时不可达时不必关弹窗重开）
    retryDocxPreview() {
      if (this.currentTemplate && this.currentTemplate.templateId) {
        this.loadDocxPreview(this.currentTemplate.templateId)
      }
    },

    handleDownload(row) {
      if (!row || !row.fileId) {
        this.$message.warning('该模板尚未上传文件')
        return
      }
      downloadDocTemplate(row.templateId)
        .then(blob => {
          const url = window.URL.createObjectURL(new Blob([blob]))
          const link = document.createElement('a')
          link.href = url
          link.download = row.fileName || 'template.docx'
          link.click()
          window.URL.revokeObjectURL(url)
        })
        .catch(() => {
          this.$message.error('下载失败，请检查文档中心连通性')
        })
    },

    handleStatusChange(row) {
      updateDocTemplate(row.templateId, { status: row.status })
        .then(() => {
          this.$message.success('状态已更新')
        })
        .catch(() => {
          row.status = row.status === '1' ? '0' : '1'
        })
    },

    handleDelete(row) {
      this.$confirm(
        `确定删除模板「${row.templateName}」吗？删除后生成文档将回退到默认模板。`,
        '警告',
        { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
      )
        .then(() => deleteDocTemplate(row.templateId))
        .then(() => {
          this.$message.success('已删除')
          this.loadAll()
        })
        .catch(err => {
          if (err && err.message) this.$message.error(err.message)
        })
    },

    /* ---------------- 格式化 ---------------- */

    formatSize(size) {
      if (!size) return '—'
      if (size < 1024) return size + ' B'
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
      return (size / 1024 / 1024).toFixed(2) + ' MB'
    }
  }
}
</script>

<style scoped>
.template-list-container {
  padding: 20px;
}

/* 射孔方式概览卡 */
.method-cards {
  display: flex;
  gap: 15px;
  margin-bottom: 18px;
}

.method-card {
  flex: 1;
  padding: 14px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafbfc;
  cursor: pointer;
  transition: all 0.2s;
}

.method-card:hover {
  border-color: #c0c4cc;
}

.method-card.uploaded {
  background: #f0f9eb;
  border-color: #c2e7b0;
}

.method-card.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
}

.card-head {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.card-head i {
  margin-right: 6px;
  font-size: 17px;
}

.method-card.uploaded .card-head i {
  color: #67c23a;
}

.method-card:not(.uploaded) .card-head i {
  color: #e6a23c;
}

.card-line {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-line.muted,
.muted {
  color: #909399;
}

.card-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 工具栏 */
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

.template-name {
  color: #409eff;
  cursor: pointer;
}

.template-name:hover {
  text-decoration: underline;
}

.danger-text {
  color: #f56c6c;
}

.mono {
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

/* 章节骨架 */
.preview-content {
  margin-top: 18px;
}

.structure-tree {
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
  max-height: 340px;
  overflow-y: auto;
}

.tree-node {
  padding: 3px 0;
  font-size: 13px;
  color: #606266;
}

.tree-node.level-1 {
  font-weight: 600;
  color: #303133;
  margin-top: 6px;
}

.tree-node.level-2 {
  padding-left: 20px;
}

.tree-node.level-3 {
  padding-left: 40px;
  color: #909399;
}

.node-no {
  display: inline-block;
  min-width: 40px;
  color: #909399;
}

h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #303133;
}

/* 标签页徽标（无文件时显示） */
.tab-badge {
  margin-left: 4px;
  padding: 1px 5px;
  font-size: 10px;
  color: #909399;
  background: #f4f4f5;
  border-radius: 10px;
  vertical-align: middle;
}

/* 无文件时的占位提示 */
.preview-no-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #909399;
}

.preview-no-file i {
  font-size: 48px;
  margin-bottom: 12px;
}

.preview-no-file p {
  font-size: 14px;
  margin: 0;
}

/* docx 预览加载中 */
.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}

/* docx 预览错误 */
.preview-error {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  padding: 40px 24px;
  color: #f56c6c;
  font-size: 14px;
  line-height: 1.7;
  text-align: left;
}
.preview-error i {
  flex: none;
  margin-top: 3px;
}
.preview-error-body {
  flex: 1 1 auto;
  max-width: 760px;
}
.preview-error-body p {
  margin: 0 0 10px;
  word-break: break-all;
}
.preview-error-text {
  color: #f56c6c;
}
.preview-error-hint {
  color: #909399;
  font-size: 13px;
  word-break: normal;
}

/* docx 预览容器 */
.preview-docx-wrapper {
  background: #f0f2f5;
  padding: 12px 0;
  min-height: 60vh;
  max-height: 70vh;
  overflow-y: auto;
}

.docx-preview-box {
  padding: 0 12px;
}

/**
 * ⚠️ docx-preview 0.1.20 的 DOM 结构与旧版不同：
 *   wrapper 节点 class = `<className>-wrapper`（即 .docx-wrapper）
 *   页面节点   class = `<className>`（即 .docx），外面**还套了一层**
 *   所以这里是 .docx-wrapper-wrapper > section.docx-wrapper，旧选择器
 *   `.docx-wrapper > section.docx` 完全命中不到 → 页面没有白底和页间距。
 * 用后代选择器兜住两种结构。
 */
::v-deep .docx-wrapper,
::v-deep .docx-wrapper-wrapper {
  background: #f0f2f5;
  padding: 0;
}

::v-deep .docx-wrapper section,
::v-deep .docx-wrapper-wrapper section {
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
  margin-bottom: 14px;
  background: #fff;
  max-width: 100%;
  overflow-x: auto;
}

/* 详情弹窗加大：docx 页面较宽，900px 会横向裁掉右侧内容 */
::v-deep .template-detail-dialog .el-dialog__body {
  max-height: 76vh;
  overflow-y: auto;
  padding-top: 8px;
}
</style>
