<template>
  <div class="doc-parser-container">
    <div class="page-header">
      <h2><i class="el-icon-document"></i></h2>
      <div>
        <h2>文档解析技能包</h2>
        <p class="page-desc">从 Word 文档中提取图片和表格数据</p>
      </div>
    </div>

    <!-- 功能选择 -->
    <div class="function-tabs">
      <el-tabs v-model="activeTab" type="card">
        <!-- 图片提取 -->
        <el-tab-pane label="图片提取" name="images">
          <div class="tab-content">
            <el-row :gutter="20">
              <!-- 上传区域 -->
              <el-col :span="8">
                <el-card shadow="hover" class="upload-card">
                  <div slot="header">
                    <span><i class="el-icon-picture-outline"></i> 上传文档</span>
                  </div>
                  <el-upload
                    ref="imageUpload"
                    class="upload-area"
                    drag
                    action="#"
                    :auto-upload="false"
                    :on-change="handleImageFileChange"
                    :on-remove="handleImageFileRemove"
                    :file-list="imageFileList"
                    accept=".docx"
                  >
                    <div class="upload-content">
                      <i class="el-icon-upload"></i>
                      <div class="upload-text">拖拽 Word 文档到此处</div>
                      <div class="upload-tip">支持 .docx 格式</div>
                    </div>
                  </el-upload>

                  <el-form label-width="100px" style="margin-top: 20px">
                    <el-form-item label="执行 OCR">
                      <el-switch v-model="performOcr" />
                      <span class="form-tip">识别图片中的文字</span>
                    </el-form-item>
                  </el-form>

                  <div class="upload-actions">
                    <el-button
                      type="primary"
                      :disabled="!imageFile"
                      :loading="extractingImages"
                      @click="extractImages"
                    >
                      <i class="el-icon-picture-outline"></i> 提取图片
                    </el-button>
                    <el-button @click="resetImageExtract">重置</el-button>
                  </div>
                </el-card>
              </el-col>

              <!-- 结果展示 -->
              <el-col :span="16">
                <el-card shadow="hover" class="result-card">
                  <div slot="header">
                    <span><i class="el-icon-picture-outline"></i> 提取结果</span>
                    <el-tag v-if="imageResult" type="success" size="small" style="margin-left: 10px">
                      {{ imageResult.totalImages }} 张图片
                    </el-tag>
                  </div>

                  <div v-if="!imageResult" class="empty-result">
                    <i class="el-icon-picture-outline"></i>
                    <p>请上传文档并点击提取按钮</p>
                  </div>

                  <div v-else class="image-results">
                    <!-- 结果统计 -->
                    <el-alert
                      :title="imageResult.summary"
                      type="success"
                      :closable="false"
                      show-icon
                      style="margin-bottom: 20px"
                    />

                    <!-- 图片列表 -->
                    <div v-if="imageResult.images && imageResult.images.length > 0" class="image-grid">
                      <div
                        v-for="(img, index) in imageResult.images"
                        :key="index"
                        class="image-item"
                      >
                        <div class="image-preview">
                          <img v-if="img.imageBytes" :src="getImageSrc(img)" alt="图片" />
                          <div v-else class="image-placeholder">
                            <i class="el-icon-picture-outline"></i>
                          </div>
                        </div>
                        <div class="image-info">
                          <div class="image-index">图片 {{ index + 1 }}</div>
                          <div class="image-meta">
                            <span v-if="img.width">{{ img.width }} x {{ img.height }}</span>
                          </div>
                          <div v-if="img.ocrText" class="ocr-text">
                            {{ img.ocrText.substring(0, 100) }}{{ img.ocrText.length > 100 ? '...' : '' }}
                          </div>
                          <div class="image-actions">
                            <el-button type="text" size="small" @click="downloadImage(img, index)">
                              <i class="el-icon-download"></i> 下载
                            </el-button>
                            <el-button type="text" size="small" @click="viewOcrText(img)">
                              <i class="el-icon-document"></i> OCR
                            </el-button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- 表格提取 -->
        <el-tab-pane label="表格提取" name="tables">
          <div class="tab-content">
            <el-row :gutter="20">
              <!-- 上传区域 -->
              <el-col :span="8">
                <el-card shadow="hover" class="upload-card">
                  <div slot="header">
                    <span><i class="el-icon-s-grid"></i> 上传文档</span>
                  </div>
                  <el-upload
                    ref="tableUpload"
                    class="upload-area"
                    drag
                    action="#"
                    :auto-upload="false"
                    :on-change="handleTableFileChange"
                    :on-remove="handleTableFileRemove"
                    :file-list="tableFileList"
                    accept=".docx"
                  >
                    <div class="upload-content">
                      <i class="el-icon-upload"></i>
                      <div class="upload-text">拖拽 Word 文档到此处</div>
                      <div class="upload-tip">支持 .docx 格式</div>
                    </div>
                  </el-upload>

                  <div class="upload-actions" style="margin-top: 20px">
                    <el-button
                      type="primary"
                      :disabled="!tableFile"
                      :loading="extractingTables"
                      @click="extractTables"
                    >
                      <i class="el-icon-s-grid"></i> 提取表格
                    </el-button>
                    <el-button @click="resetTableExtract">重置</el-button>
                  </div>
                </el-card>
              </el-col>

              <!-- 结果展示 -->
              <el-col :span="16">
                <el-card shadow="hover" class="result-card">
                  <div slot="header">
                    <span><i class="el-icon-s-grid"></i> 提取结果</span>
                    <div v-if="tableResult" class="header-actions">
                      <el-button type="text" size="small" @click="exportAllTables('csv')">
                        <i class="el-icon-document"></i> 导出CSV
                      </el-button>
                      <el-button type="text" size="small" @click="exportAllTables('md')">
                        <i class="el-icon-document"></i> 导出MD
                      </el-button>
                      <el-button type="text" size="small" @click="exportAllTables('json')">
                        <i class="el-icon-document"></i> 导出JSON
                      </el-button>
                    </div>
                  </div>

                  <div v-if="!tableResult" class="empty-result">
                    <i class="el-icon-s-grid"></i>
                    <p>请上传文档并点击提取按钮</p>
                  </div>

                  <div v-else class="table-results">
                    <!-- 结果统计 -->
                    <el-alert
                      :title="tableResult.summary"
                      type="success"
                      :closable="false"
                      show-icon
                      style="margin-bottom: 20px"
                    />

                    <!-- 表格列表 -->
                    <div v-if="tableResult.tables && tableResult.tables.length > 0">
                      <div
                        v-for="(table, index) in tableResult.tables"
                        :key="index"
                        class="table-item"
                      >
                        <div class="table-header">
                          <div class="table-title">
                            <strong>{{ table.title }}</strong>
                            <el-tag size="mini" type="info" style="margin-left: 10px">
                              {{ table.rowCount }} 行 x {{ table.colCount }} 列
                            </el-tag>
                          </div>
                          <div class="table-actions">
                            <el-button type="text" size="small" @click="exportSingleTable(index, 'csv')">
                              CSV
                            </el-button>
                            <el-button type="text" size="small" @click="exportSingleTable(index, 'md')">
                              MD
                            </el-button>
                            <el-button type="text" size="small" @click="copyTableData(table)">
                              复制
                            </el-button>
                          </div>
                        </div>

                        <!-- 表格展示 -->
                        <div class="table-container">
                          <table class="data-table">
                            <thead v-if="table.headers">
                              <tr>
                                <th v-for="(header, hIndex) in table.headers" :key="hIndex">
                                  {{ header }}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="(row, rIndex) in table.rows" :key="rIndex">
                                <td v-for="(cell, cIndex) in row" :key="cIndex">
                                  {{ cell }}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- OCR 详情弹窗 -->
    <el-dialog title="OCR 识别结果" :visible.sync="ocrDialogVisible" width="600px">
      <div class="ocr-dialog-content">
        <pre>{{ currentOcrText }}</pre>
      </div>
      <span slot="footer">
        <el-button @click="copyOcrText">复制</el-button>
        <el-button type="primary" @click="ocrDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { extractDocumentImagesApi, extractDocumentTablesApi } from '@/api/annotation'

export default {
  name: 'DocParser',
  data() {
    return {
      activeTab: 'images',

      // 图片提取
      imageFile: null,
      imageFileList: [],
      performOcr: false,
      extractingImages: false,
      imageResult: null,

      // 表格提取
      tableFile: null,
      tableFileList: [],
      extractingTables: false,
      tableResult: null,

      // OCR 弹窗
      ocrDialogVisible: false,
      currentOcrText: ''
    }
  },
  created() {
    // 根据 URL 参数设置默认 Tab
    const tab = this.$route.query.tab
    if (tab === 'tables') {
      this.activeTab = 'tables'
    } else if (tab === 'images') {
      this.activeTab = 'images'
    }
  },
  methods: {
    // ========== 图片提取 ==========

    handleImageFileChange(file, fileList) {
      this.imageFileList = fileList.slice(-1)
      this.imageFile = {
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },

    handleImageFileRemove() {
      this.imageFile = null
      this.imageFileList = []
      this.imageResult = null
    },

    async extractImages() {
      if (!this.imageFile) {
        this.$message.warning('请先上传文档')
        return
      }

      this.extractingImages = true

      try {
        const formData = new FormData()
        formData.append('file', this.imageFile.raw, this.imageFile.name)
        formData.append('performOcr', this.performOcr.toString())

        const res = await extractDocumentImagesApi(formData)

        if (res.code === 0 || res.code === 200) {
          this.imageResult = res.data
          this.$message.success('图片提取完成，共 ' + res.data.totalImages + ' 张图片')
        } else {
          throw new Error(res.message)
        }

      } catch (e) {
        console.error('图片提取失败:', e)
        this.$message.error('图片提取失败: ' + (e.message || '请检查文档格式'))
      } finally {
        this.extractingImages = false
      }
    },

    resetImageExtract() {
      this.imageFile = null
      this.imageFileList = []
      this.imageResult = null
      this.performOcr = false
    },

    getImageSrc(img) {
      if (img.imageBytes) {
        // 处理 base64 字符串或字节数组
        let bytes
        if (typeof img.imageBytes === 'string') {
          // Base64 字符串
          const binary = atob(img.imageBytes)
          const array = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i)
          }
          bytes = array
        } else {
          // 字节数组
          bytes = new Uint8Array(img.imageBytes)
        }
        const blob = new Blob([bytes], { type: img.contentType || 'image/png' })
        return URL.createObjectURL(blob)
      }
      return ''
    },

    downloadImage(img, index) {
      if (!img.imageBytes) {
        this.$message.warning('图片数据不可用')
        return
      }

      // 处理 base64 字符串或字节数组
      let bytes
      if (typeof img.imageBytes === 'string') {
        const binary = atob(img.imageBytes)
        const array = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          array[i] = binary.charCodeAt(i)
        }
        bytes = array
      } else {
        bytes = new Uint8Array(img.imageBytes)
      }

      const blob = new Blob([bytes], { type: img.contentType || 'image/png' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `image_${index + 1}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      this.$message.success('图片已下载')
    },

    viewOcrText(img) {
      if (img.ocrText) {
        this.currentOcrText = img.ocrText
      } else {
        this.currentOcrText = '此图片未执行 OCR 识别'
      }
      this.ocrDialogVisible = true
    },

    copyOcrText() {
      navigator.clipboard.writeText(this.currentOcrText)
      this.$message.success('已复制到剪贴板')
    },

    // ========== 表格提取 ==========

    handleTableFileChange(file, fileList) {
      this.tableFileList = fileList.slice(-1)
      this.tableFile = {
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },

    handleTableFileRemove() {
      this.tableFile = null
      this.tableFileList = []
      this.tableResult = null
    },

    async extractTables() {
      if (!this.tableFile) {
        this.$message.warning('请先上传文档')
        return
      }

      this.extractingTables = true

      try {
        const formData = new FormData()
        formData.append('file', this.tableFile.raw, this.tableFile.name)

        const res = await extractDocumentTablesApi(formData)

        if (res.code === 0 || res.code === 200) {
          this.tableResult = res.data
          this.$message.success('表格提取完成，共 ' + res.data.totalTables + ' 个表格')
        } else {
          throw new Error(res.message)
        }

      } catch (e) {
        console.error('表格提取失败:', e)
        this.$message.error('表格提取失败: ' + (e.message || '请检查文档格式'))
      } finally {
        this.extractingTables = false
      }
    },

    resetTableExtract() {
      this.tableFile = null
      this.tableFileList = []
      this.tableResult = null
    },

    exportSingleTable(index, format) {
      this.$message.info('导出功能开发中...')
    },

    exportAllTables(format) {
      if (!this.tableResult) return

      // 合并所有表格数据
      let content = ''
      let extension = ''
      let mimeType = ''

      if (format === 'csv') {
        extension = 'csv'
        mimeType = 'text/csv'
        content = this.tableResult.tables.map(t =>
          `# ${t.title}\n` + this.convertTableToCsv(t)
        ).join('\n\n')
      } else if (format === 'md') {
        extension = 'md'
        mimeType = 'text/markdown'
        content = this.tableResult.tables.map(t =>
          `## ${t.title}\n\n` + this.convertTableToMarkdown(t)
        ).join('\n\n---\n\n')
      } else if (format === 'json') {
        extension = 'json'
        mimeType = 'application/json'
        content = JSON.stringify(this.tableResult.tables, null, 2)
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tables.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      this.$message.success('已导出所有表格')
    },

    convertTableToCsv(table) {
      let csv = ''
      if (table.headers) {
        csv += table.headers.join(',') + '\n'
      }
      if (table.rows) {
        csv += table.rows.map(row => row.join(',')).join('\n')
      }
      return csv
    },

    convertTableToMarkdown(table) {
      let md = ''
      if (table.headers) {
        md += '| ' + table.headers.join(' | ') + ' |\n'
        md += '| ' + table.headers.map(() => '---').join(' | ') + ' |\n'
      }
      if (table.rows) {
        md += table.rows.map(row => '| ' + row.join(' | ') + ' |').join('\n')
      }
      return md
    },

    copyTableData(table) {
      const text = this.convertTableToMarkdown(table)
      navigator.clipboard.writeText(text)
      this.$message.success('表格已复制到剪贴板')
    }
  }
}
</script>

<style scoped>
.doc-parser-container {
  padding: 16px 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 120px);
}

.page-header {
  background: #fff;
  color: #303133;
  padding: 16px 20px;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-header::before {
  content: '';
  width: 4px;
  height: 20px;
  background: #409eff;
  border-radius: 2px;
}

.page-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.page-desc {
  margin: 4px 0 0 16px;
  color: #909399;
  font-size: 12px;
}

.tab-content {
  padding: 16px 0;
}

/* 卡片通用样式 */
.doc-parser-container >>> .el-card {
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

.doc-parser-container >>> .el-card__header {
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  padding: 12px 16px;
}

.doc-parser-container >>> .el-card__header span {
  font-weight: 500;
  color: #303133;
}

/* 上传卡片 */
.upload-card {
  height: 100%;
}

.upload-area {
  width: 100%;
}

.upload-area ::v-deep .el-upload-dragger {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.upload-content {
  text-align: center;
}

.upload-content i {
  font-size: 40px;
  color: #c0c4cc;
  margin-bottom: 10px;
}

.upload-text {
  font-size: 14px;
  color: #606266;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

.upload-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;
}

.form-tip {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

/* 结果卡片 */
.result-card {
  min-height: 360px;
}

.empty-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 280px;
  color: #909399;
}

.empty-result i {
  font-size: 48px;
  margin-bottom: 12px;
  color: #c0c4cc;
}

/* 图片网格 */
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.image-item {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
  transition: all 0.2s;
}

.image-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.image-preview {
  height: 140px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-placeholder {
  color: #c0c4cc;
  font-size: 40px;
}

.image-info {
  padding: 10px;
}

.image-index {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.image-meta {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.ocr-text {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  max-height: 50px;
  overflow: hidden;
}

.image-actions {
  display: flex;
  gap: 6px;
}

/* 表格结果 */
.table-results {
  max-height: 560px;
  overflow-y: auto;
}

.table-item {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 16px;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-title strong {
  font-weight: 500;
  color: #303133;
}

.table-actions {
  display: flex;
  gap: 6px;
}

.table-container {
  overflow-x: auto;
  padding: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 8px 10px;
  text-align: left;
  border: 1px solid #ebeef5;
  white-space: nowrap;
}

.data-table th {
  background: #fafafa;
  font-weight: 500;
  color: #606266;
}

.data-table tr:hover {
  background: #f5f7fa;
}

/* OCR 弹窗 */
.ocr-dialog-content {
  max-height: 380px;
  overflow-y: auto;
}

.ocr-dialog-content pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
  line-height: 1.6;
}

/* 头部操作 */
.header-actions {
  float: right;
}

/* Tab 样式 */
.doc-parser-container >>> .el-tabs__header {
  background: #fff;
  border-radius: 4px 4px 0 0;
  border: 1px solid #e8e8e8;
  border-bottom: none;
  margin: 0;
  padding: 12px 16px 0;
}

.doc-parser-container >>> .el-tabs__nav-wrap::after {
  display: none;
}

.doc-parser-container >>> .el-tabs__item {
  color: #909399;
  font-weight: 400;
}

.doc-parser-container >>> .el-tabs__item.is-active {
  color: #409eff;
  font-weight: 500;
}

.doc-parser-container >>> .el-tabs__content {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-top: none;
  border-radius: 0 0 4px 4px;
  padding: 16px;
}

/* Alert 样式 */
.doc-parser-container >>> .el-alert {
  border-radius: 4px;
}
</style>
