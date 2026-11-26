<template>
  <div class="extraction-container">
    <!-- 带参跳转提示：井号已自动带入，无需再次输入 -->
    <el-alert
      v-if="presetWellName"
      class="preset-alert"
      type="success"
      :closable="true"
      show-icon
    >
      <template slot="title">
        已带入井号：<strong>{{ presetWellName }}</strong>，文件名将为
        <strong>{{ presetWellName }}压裂工程设计文档.docx</strong>
      </template>
    </el-alert>

    <!-- 上传区域 -->
    <div class="panel">
      <div class="panel-header">
        <span><i class="el-icon-magic-stick"></i> 智能提取并生成文档</span>
        <span class="panel-sub">上传源文件与带批注的模版，按批注内容从源文件中提取并生成新文档</span>
      </div>
      <div class="panel-body">
        <div class="upload-grid">
          <!-- 源文件（一个或多个） -->
          <div class="upload-card">
            <div class="card-header">
              <span class="card-title"><i class="el-icon-document"></i> 源文件（数据来源）</span>
              <el-tag type="success" size="mini">可多选</el-tag>
            </div>
            <el-upload
              ref="sourceUpload"
              class="upload-area"
              drag
              action="#"
              multiple
              :auto-upload="false"
              :on-change="handleSourceChange"
              :on-remove="handleSourceRemove"
              :file-list="sourceFileList"
              accept=".docx,.doc,.pdf,.txt,.png,.jpg,.jpeg"
            >
              <div class="upload-content">
                <i class="el-icon-upload"></i>
                <div class="upload-text">将文件拖到此处，或<em>点击上传</em></div>
                <div class="upload-tip">支持 Word、PDF、TXT、图片，可一次选择多个</div>
              </div>
            </el-upload>

            <!-- 已选源文件列表 -->
            <div class="file-list" v-if="sourceFiles.length > 0">
              <div v-for="(file, index) in sourceFiles" :key="file.uid || index" class="file-item">
                <i :class="getFileIcon(file.name)"></i>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <el-button
                  type="text"
                  size="small"
                  class="remove-btn"
                  @click="removeSourceFile(index)"
                >
                  <i class="el-icon-close"></i>
                </el-button>
              </div>
              <div class="file-count">共 {{ sourceFiles.length }} 个源文件</div>
            </div>
          </div>

          <!-- 模版（含批注） -->
          <div class="upload-card">
            <div class="card-header">
              <span class="card-title"><i class="el-icon-document-copy"></i> 模版（含批注）</span>
              <el-tag type="warning" size="mini">单个 .docx</el-tag>
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
              :limit="1"
            >
              <div class="upload-content">
                <i class="el-icon-upload"></i>
                <div class="upload-text">将模版拖到此处，或<em>点击上传</em></div>
                <div class="upload-tip">模版中的批注将作为提取依据（.docx）</div>
              </div>
            </el-upload>

            <div class="file-list" v-if="templateFile">
              <div class="file-item">
                <i class="el-icon-document-copy file-word"></i>
                <span class="file-name">{{ templateFile.name }}</span>
                <span class="file-size">{{ formatFileSize(templateFile.size) }}</span>
                <el-button type="text" size="small" class="remove-btn" @click="removeTemplateFile">
                  <i class="el-icon-close"></i>
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <el-button
            type="primary"
            size="large"
            :loading="preparing"
            :disabled="!canGenerate || preparing"
            @click="startExtract"
          >
            <i class="el-icon-magic-stick"></i>
            严格提取（第一步）
          </el-button>
          <el-button size="large" :disabled="preparing" @click="resetForm">
            <i class="el-icon-refresh"></i> 重置
          </el-button>
        </div>

        <div class="action-tip" v-if="preparing">
          <i class="el-icon-loading"></i>
          {{ prepareStatus }}
        </div>
        <div class="action-tip" v-else>
          <i class="el-icon-info"></i>
          第一步（严格提取）：从源文件中原样提取文字 / 图片 / 表格，<strong>不调用大模型、不使用提示词改写内容</strong>
        </div>
      </div>
    </div>

    <!-- 井名输入对话框 -->
    <el-dialog
      title="请输入井名"
      :visible.sync="wellDialogVisible"
      width="440px"
      :close-on-click-modal="false"
      append-to-body
      @closed="onWellDialogClosed"
    >
      <div class="well-dialog-body">
        <p class="well-dialog-label">井名</p>
        <el-input
          ref="wellNameInput"
          v-model="wellName"
          placeholder="例如：HW-101"
          clearable
          maxlength="50"
          @keyup.enter.native="confirmWellName"
        />
        <div class="well-dialog-hint">
          <i class="el-icon-info"></i>
          文件名将命名为「<strong>井名+压裂工程设计文档</strong>」
        </div>
        <div class="well-dialog-preview" v-if="wellName && wellName.trim()">
          生成文件名：<strong>{{ wellName.trim() }}压裂工程设计文档.docx</strong>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="wellDialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="preparing" @click="confirmWellName">
          <i class="el-icon-magic-stick"></i> 开始提取
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { readAnnotationsApi } from '@/api/annotation'
// ⚠️ 大文件跨路由传递走内存单例，不走 sessionStorage（5MB 配额扛不住 base64 膨胀 33%）
import { handoffExtractTask } from '@/utils/extractHandoff'

export default {
  name: 'Extraction',
  data() {
    return {
      // 源文件（多个）
      sourceFiles: [],
      sourceFileList: [],
      // 模版（单个）
      templateFile: null,
      templateFileList: [],
      // 前置处理状态
      preparing: false,
      prepareStatus: '',
      // 井名输入
      wellDialogVisible: false,
      wellName: '',
      // 是否由外部（工作台对象树等）带参跳转而来 —— 用于区分「预填」与「用户手输」
      presetWellName: ''
    }
  },
  watch: {
    // 同一路由下 query 变化（例如已在本页，又从工作台点了另一个井号）也要重新预填
    '$route.query.wellName'(val) {
      this.applyRouteWellName(val, this.$route.query.from)
    }
  },
  created() {
    // 支持从工作台对象树等入口带井名跳转：/report-extract/index?wellName=郑58-5B-3平2&from=workbench
    this.applyRouteWellName(this.$route.query.wellName, this.$route.query.from)
  },
  computed: {
    /** 「严格提取」按钮是否可点：源文件 + 带批注模版两者齐备才可提取 */
    canGenerate() {
      return this.sourceFiles.length > 0 && !!this.templateFile
    }
  },
  methods: {
    /**
     * 读取 URL query 中的井名并预填。
     * 带参跳转进来时，用户上传完文件点「严格提取」就不用再手输井名了。
     * @param {string} wellName query 中的井名
     * @param {string} from     来源标识（workbench 时给一次提示）
     */
    applyRouteWellName(wellName, from) {
      const name = String(wellName || '').trim()
      if (!name) return
      this.wellName = name
      this.presetWellName = name
      if (from === 'workbench') {
        this.$message({
          type: 'success',
          message: `已带入井号「${name}」，上传源文件与模版后直接开始提取即可`,
          duration: 4000
        })
      }
    },

    /* ---------------- 源文件 ---------------- */
    handleSourceChange(file, fileList) {
      this.sourceFileList = fileList
      // 按 uid 去重，避免重复添加
      const exists = this.sourceFiles.some(f => f.uid === file.uid)
      if (!exists) {
        this.sourceFiles.push({
          uid: file.uid,
          name: file.name,
          size: file.size,
          raw: file.raw
        })
      }
    },

    handleSourceRemove(file, fileList) {
      this.sourceFileList = fileList
      this.sourceFiles = this.sourceFiles.filter(f => f.uid !== file.uid)
    },

    removeSourceFile(index) {
      const target = this.sourceFiles[index]
      if (!target) return
      this.sourceFiles.splice(index, 1)
      this.sourceFileList = this.sourceFileList.filter(f => f.uid !== target.uid)
    },

    /* ---------------- 模版 ---------------- */
    handleTemplateChange(file, fileList) {
      // 只保留最后一个
      this.templateFileList = fileList.slice(-1)
      this.templateFile = {
        uid: file.uid,
        name: file.name,
        size: file.size,
        raw: file.raw
      }
    },

    handleTemplateRemove() {
      this.templateFileList = []
      this.templateFile = null
    },

    removeTemplateFile() {
      this.templateFileList = []
      this.templateFile = null
    },

    /* ---------------- 严格提取（第一步，不走大模型） ---------------- */
    // 第一步：严格从源文件中提取文字 / 图片 / 表格。
    // 说明：此步骤只做「原文提取」，不调用任何大模型、不使用提示词改写内容，
    //       提取到的文字与图片保持文档原样。
    //
    // 点击按钮时先弹出「井名」输入框，确认后再跳转编辑器执行提取。
    startExtract() {
      if (this.sourceFiles.length === 0) {
        this.$message.warning('请至少上传一个源文件')
        return
      }
      if (!this.templateFile) {
        this.$message.warning('请上传含批注的模版文件')
        return
      }
      // 打开井名输入对话框（不立即提取）
      // 若由工作台带参跳转而来，保留预填井名；否则清空等待用户输入
      if (!this.presetWellName) {
        this.wellName = ''
      } else {
        this.wellName = this.presetWellName
      }
      this.wellDialogVisible = true
      this.$nextTick(() => {
        const input = this.$refs.wellNameInput
        if (input && input.focus) input.focus()
      })
    },

    // 对话框关闭后清理
    onWellDialogClosed() {
      // 保留用户已输入的井名，方便再次打开
    },

    // 确认井名 → 跳转编辑器执行严格提取
    async confirmWellName() {
      const well = (this.wellName || '').trim()
      if (!well) {
        this.$message.warning('请输入井名')
        return
      }
      if (this.preparing) return

      this.preparing = true
      this.prepareStatus = '正在读取模版批注...'
      try {
        // 读取模版批注：批注文本决定「提取什么」（如「只提取井名的信息」）
        let annotations = []
        try {
          const tplForm = new FormData()
          tplForm.append('file', this.templateFile.raw, this.templateFile.name)
          const annRes = await readAnnotationsApi(tplForm)
          annotations = (annRes && annRes.data) || []
        } catch (e) {
          console.warn('[extract] 读取模版批注失败（不影响提取）', e)
        }

        this.prepareStatus = '正在准备源文件...'

        // 文件命名：井名 + 压裂工程设计文档
        const fileName = well + '压裂工程设计文档.docx'
        const primarySource = this.sourceFiles[0]

        // 3) 交出任务：**文件本体留在内存**，sessionStorage 只存纯字符串元信息。
        //    ⚠️ 旧版把文件转成 dataUrl 塞进 sessionStorage，大文件（4.7MB → base64 约 6.3MB）
        //    必然超过 5MB 配额而失败。既然这两页是同一个 SPA 内的路由跳转，
        //    用内存交接即可，还省掉一次 base64 编解码 —— 见 utils/extractHandoff.js。
        handoffExtractTask({
          fileName,
          wellName: well,
          sourceFileName: primarySource.name,
          annotations,             // 批注：决定提取范围/规则
          mode: 'strict-extract', // 关键：纯提取模式，不走大模型
          isStreaming: true,
          fromExtract: true
        }, primarySource.raw, this.templateFile ? this.templateFile.raw : null)

        sessionStorage.setItem('editorDocument', JSON.stringify({
          fileName,
          wellName: well,
          annotations,
          isStreaming: true,
          fromExtract: true,
          mode: 'strict-extract'
        }))

        this.wellDialogVisible = false

        try {
          await this.$router.push({ name: 'ReportEditor' })
        } catch (err) {
          console.warn('[extract] 命名路由跳转失败，回退路径跳转', err)
          await this.$router.push('/report-editor/list')
        }
      } catch (e) {
        console.error('[extract] 准备任务失败', e)
        this.$message.error('准备文件失败：' + (e.message || '未知错误'))
      } finally {
        this.preparing = false
        this.prepareStatus = ''
      }
    },

    // 兼容旧入口（若被调用，等价于严格提取）
    async startExtractAndGenerate() {
      return this.startExtract()
    },

    /* ---------------- 工具方法 ---------------- */
    resetForm() {
      this.sourceFiles = []
      this.sourceFileList = []
      this.templateFile = null
      this.templateFileList = []
      // 重置时清掉带参跳转带来的预填井名，回到「手动输入」状态
      this.wellName = ''
      this.presetWellName = ''
      if (this.$refs.sourceUpload) this.$refs.sourceUpload.clearFiles()
      if (this.$refs.templateUpload) this.$refs.templateUpload.clearFiles()
      this.$message.info('已重置')
    },

    getFileIcon(filename) {
      const ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
      if (['doc', 'docx'].includes(ext)) return 'el-icon-document file-word'
      if (ext === 'pdf') return 'el-icon-document file-pdf'
      if (['png', 'jpg', 'jpeg'].includes(ext)) return 'el-icon-picture file-image'
      return 'el-icon-document'
    },

    formatFileSize(size) {
      if (!size) return ''
      if (size < 1024) return size + ' B'
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
      return (size / (1024 * 1024)).toFixed(1) + ' MB'
    }
  }
}
</script>

<style scoped>
.extraction-container {
  padding: 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 120px);
}

/* 带参跳转提示条 */
.preset-alert {
  margin-bottom: 12px;
}

/* 面板 */
.panel {
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  margin-bottom: 16px;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fafafa;
}

.panel-sub {
  font-weight: 400;
  font-size: 12px;
  color: #8c8c8c;
}

.panel-body {
  padding: 16px;
}

/* 上传两列 */
.upload-grid {
  display: flex;
  gap: 16px;
}

.upload-card {
  flex: 1;
  min-width: 0;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 12px;
  background: #fff;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.card-title {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.upload-area {
  width: 100%;
}

.upload-content {
  padding: 18px 0;
}

.upload-content i {
  font-size: 40px;
  color: #c0c4cc;
  line-height: 1.4;
}

.upload-text {
  font-size: 13px;
  color: #606266;
  margin-top: 6px;
}

.upload-text em {
  color: #3D5FEF;
  font-style: normal;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 文件列表 */
.file-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 13px;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}

.file-size {
  color: #8c8c8c;
  font-size: 12px;
  flex-shrink: 0;
}

.remove-btn {
  color: #909399;
  padding: 0 4px;
}

.remove-btn:hover {
  color: #f5222d;
}

.file-count {
  font-size: 12px;
  color: #8c8c8c;
  text-align: right;
}

.file-word { color: #3D5FEF; }
.file-pdf { color: #ff4d4f; }
.file-image { color: #52c41a; }

/* 操作按钮 */
.action-buttons {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-tip {
  margin-top: 14px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.action-tip i {
  margin-right: 6px;
  color: #3D5FEF;
}

::v-deep .el-upload-dragger {
  padding: 0;
}

::v-deep .el-upload-list {
  display: none;
}

/* 井名输入对话框 */
.well-dialog-body {
  padding: 4px 2px;
}

.well-dialog-label {
  margin: 0 0 8px;
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}

.well-dialog-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.well-dialog-hint i {
  color: #3D5FEF;
  margin-right: 4px;
}

.well-dialog-preview {
  margin-top: 10px;
  padding: 8px 10px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #303133;
}

.well-dialog-preview strong {
  color: #3D5FEF;
}
</style>
