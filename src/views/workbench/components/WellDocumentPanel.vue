<template>
  <el-card class="wd-card" shadow="never">
    <div slot="header" class="wd-card__header">
      <span><i class="el-icon-folder-opened"></i> 设计文档</span>
      <div class="wd-card__actions">
        <el-tag v-if="mockMode" size="mini" type="warning" effect="plain">本地模拟存储</el-tag>
        <span class="wd-card__count">共 {{ docs.length }} 份</span>
        <el-button
          size="mini"
          icon="el-icon-refresh"
          :loading="loading"
          @click="load"
        >刷新</el-button>
        <el-button
          size="mini"
          type="primary"
          icon="el-icon-upload2"
          :loading="uploading"
          @click="openUpload"
        >上传文档</el-button>
      </div>
    </div>
    <!-- 文档列表：整个「输出与归档」区**只允许这里滚动**。
         外层卡片与 el-card__body 都已改成 overflow:visible，
         所以这一处 max-height 是唯一滚动容器，右侧只会出现一根滚动条。
         高度给到 420（约 10 行），太矮会让「已归档 7 份」就得滚。 -->
    <div class="wd-card__body">
      <el-table
        v-loading="loading"
        :data="docs"
        size="mini"
        border
        max-height="420"
        empty-text="暂无文档，可通过右上角「上传文档」上传地质设计、模板或生成结果"
      >
        <el-table-column label="类型" width="96" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="typeTag(row.docType)" size="mini" effect="plain">
              {{ row.docTypeName || row.docType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" min-width="180" show-overflow-tooltip align="center">
          <template slot-scope="{ row }">
            <i :class="fileIcon(row.fileExt)" class="wd-file-icon"></i>
            <span>{{ row.fileName }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="88" align="center">
          <template slot-scope="{ row }">
            <span class="wd-nowrap">{{ fmtSize(row.fileSize) }}</span>
          </template>
        </el-table-column>
        <!-- 版本号统一展示三段式（1.0.0 起）。
             后端已把 VERSION_TAG 算好下发；老库未执行 DDL 时该字段为空，
             这里再用 versionNo 兜一层（与 WellDocumentService#tagOf 同一条公式，
             保证界面、导出、列表看到的是同一个版本号）。 -->
        <el-table-column label="版本" width="86" align="center">
          <template slot-scope="{ row }">
            <span class="wd-nowrap">v{{ row.versionTag || ('1.0.' + ((row.versionNo || 1) - 1)) }}</span>
            <el-tag v-if="row.isCurrent === '1'" size="mini" type="success" effect="plain" style="margin-left:2px;">当前</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="docSource" label="来源" width="86" align="center">
          <template slot-scope="{ row }">
            <span class="wd-nowrap">{{ sourceText(row.docSource) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createDate" label="上传时间" width="150" align="center">
          <template slot-scope="{ row }">
            <span class="wd-nowrap">{{ row.createDate }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="right">
          <template slot-scope="{ row }">
            <div class="ww-op-btns">
              <el-button
                type="text"
                size="mini"
                :disabled="!row.previewable"
                @click="preview(row)"
              >预览</el-button>
              <el-button type="text" size="mini" @click="download(row)">下载</el-button>
              <el-button type="text" size="mini" class="wd-del" @click="remove(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 上传对话框 -->
    <el-dialog
      title="上传文档到工作台"
      :visible.sync="dialogVisible"
      width="520px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form label-width="88px" size="small">
        <el-form-item label="关联井号">
          <span class="wd-static">{{ wellName || '（未指定）' }}</span>
        </el-form-item>
        <el-form-item label="文档类型">
          <el-select v-model="form.docType" style="width: 100%">
            <el-option
              v-for="t in docTypes"
              :key="t.code"
              :label="t.name"
              :value="t.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择文件">
          <el-upload
            ref="upload"
            drag
            :auto-upload="false"
            :limit="1"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
            :file-list="fileList"
            accept=".doc,.docx,.pdf,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
          >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">将文件拖到此处，或<em>点击选择</em></div>
            <div slot="tip" class="el-upload__tip">
              支持 docx / doc / pdf / xls / xlsx / 图片，单文件不超过 100MB
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
        <el-form-item v-if="uploading" label="进度">
          <el-progress :percentage="progress" :stroke-width="10" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="dialogVisible = false">取消</el-button>
        <el-button
          size="small"
          type="primary"
          :loading="uploading"
          :disabled="!form.file"
          @click="doUpload"
        >开始上传</el-button>
      </span>
    </el-dialog>

    <!-- 预览抽屉 -->
    <el-drawer
      :visible.sync="previewVisible"
      :with-header="true"
      size="62%"
      :title="previewTitle"
      append-to-body
      @closed="clearPreview"
    >
      <div v-loading="previewLoading" class="wd-preview">
        <iframe
          v-if="previewKind === 'iframe'"
          :src="previewUrl"
          class="wd-preview__frame"
          frameborder="0"
        />
        <div v-else-if="previewKind === 'docx'" ref="docxBox" class="wd-preview__docx"></div>
        <!-- Excel：多 sheet 可切换（组件内部一次解析，切 sheet 复用 workbook） -->
        <excel-sheet-preview
          v-else-if="previewKind === 'xlsx'"
          :source="previewExcelSource"
          max-height="68vh"
        />
        <el-empty
          v-else-if="previewKind === 'none'"
          :image-size="80"
          description="该格式暂不支持在线预览，请下载后查看"
        />
      </div>
    </el-drawer>
  </el-card>
</template>

<script>
/**
 * 工作台「设计文档」区块
 *
 * 承载三类文档的上传 / 下载 / 预览：
 *   压裂地质设计、设计模板（含批注）、系统生成的压裂工程设计
 *
 * 存储位置是文档中心（后端 doc-center 配置），本地只留业务关联：
 *   COMM_WB_WELL_DOC（井号 ↔ 文件）
 *   COMM_FILE_INDEX（平台统一文件索引）
 *
 * 预览策略：
 *   pdf / 图片 → 浏览器原生渲染（iframe / img）
 *   docx       → docx-preview 前端渲染，不依赖 Office 服务
 *   xls/xlsx   → ExcelSheetPreview 组件，支持多 sheet 切换
 */
import ExcelSheetPreview from '@/components/shared/ExcelSheetPreview.vue'
import {
  getDocTypes,
  getDocCenterStatus,
  listWellDocs,
  listDocsByWellName,
  uploadWellDoc,
  downloadWellDoc,
  previewWellDoc,
  deleteWellDoc
} from '@/api/wellDoc'

export default {
  name: 'WellDocumentPanel',
  components: { ExcelSheetPreview },
  props: {
    /** 工作台井号 ID（COMM_WB_WELL.WB_WELL_ID），空则只按井名归档 */
    wbWellId: { type: String, default: '' },
    /** 井号名称 */
    wellName: { type: String, default: '' },
    /** 当前用户 */
    userId: { type: String, default: '' }
  },

  data() {
    return {
      loading: false,
      docs: [],
      docTypes: [],
      mockMode: false,

      dialogVisible: false,
      uploading: false,
      progress: 0,
      fileList: [],
      form: { docType: 'GEOLOGICAL_DESIGN', remark: '', file: null },

      previewVisible: false,
      previewLoading: false,
      previewKind: 'none',
      previewUrl: '',
      previewTitle: '',
      /** Excel 预览源（ArrayBuffer），交给 ExcelSheetPreview 解析 */
      previewExcelSource: null
    }
  },

  created() {
    this.loadTypes()
    this.checkStatus()
    this.load()
  },

  beforeDestroy() {
    this.clearPreview()
  },

  methods: {
    async loadTypes() {
      try {
        const res = await getDocTypes()
        this.docTypes = (res && res.data) || []
      } catch (e) {
        this.docTypes = [
          { code: 'GEOLOGICAL_DESIGN', name: '压裂地质设计' },
          { code: 'ENGINEERING_DESIGN', name: '压裂工程设计' },
          { code: 'DESIGN_TEMPLATE', name: '设计模板（含批注）' },
          { code: 'GENERATED_REPORT', name: '系统生成文档' },
          { code: 'OTHER', name: '其他资料' }
        ]
      }
    },

    async checkStatus() {
      try {
        const res = await getDocCenterStatus()
        this.mockMode = !!(res && res.data && res.data.mock)
      } catch (e) {
        this.mockMode = false
      }
    },

    async load() {
      if (!this.wbWellId && !this.wellName) {
        this.docs = []
        this.$emit('change', { total: 0, byType: {} })
        return
      }
      this.loading = true
      try {
        const res = this.wbWellId
          ? await listWellDocs(this.wbWellId)
          : await listDocsByWellName(this.wellName)
        this.docs = (res && res.data) || []
      } catch (e) {
        this.docs = []
      } finally {
        this.loading = false
        // 向父组件回传按类型统计，供单井工作台判定「基础资料」是否齐备
        const byType = {}
        this.docs.forEach(d => {
          const t = String(d.docType || 'OTHER').toUpperCase()
          byType[t] = (byType[t] || 0) + 1
        })
        this.$emit('change', { total: this.docs.length, byType })
      }
    },

    /** 供父组件主动刷新 */
    reload() {
      this.load()
    },

    /* ------------------------- 上传 ------------------------- */

    openUpload() {
      this.form = { docType: 'GEOLOGICAL_DESIGN', remark: '', file: null }
      this.fileList = []
      this.progress = 0
      this.dialogVisible = true
      this.$nextTick(() => {
        if (this.$refs.upload) this.$refs.upload.clearFiles()
      })
    },

    onFileChange(file, fileList) {
      // 只保留最后一个，避免多次选择叠加
      this.form.file = file.raw
      this.fileList = fileList.slice(-1)
    },

    onFileRemove() {
      this.form.file = null
      this.fileList = []
    },

    async doUpload() {
      if (!this.form.file) return
      this.uploading = true
      this.progress = 0
      try {
        await uploadWellDoc(
          this.wbWellId,
          this.form.file,
          {
            docType: this.form.docType,
            wellName: this.wellName,
            remark: this.form.remark,
            userId: this.userId
          },
          p => { this.progress = p }
        )
        this.$message.success('上传成功，已归档到文档中心')
        this.dialogVisible = false
        await this.load()
      } catch (e) {
        this.$message.error((e && e.message) || '上传失败')
      } finally {
        this.uploading = false
      }
    },

    /* ------------------------- 下载 / 预览 ------------------------- */

    download(row) {
      downloadWellDoc(row.docId).then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = row.fileName || 'document'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 3000)
      }).catch(() => {
        this.$message.error('下载失败')
      })
    },

    async preview(row) {
      const ext = String(row.fileExt || '').toLowerCase()
      this.previewTitle = row.fileName || '文档预览'
      this.previewVisible = true
      this.previewLoading = true
      this.previewKind = 'none'
      this.clearObjectUrl()

      try {
        const { blob } = await previewWellDoc(row.docId)

        if (ext === 'pdf') {
          this.previewUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
          this.previewKind = 'iframe'
        } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) {
          this.previewUrl = URL.createObjectURL(blob)
          this.previewKind = 'iframe'
        } else if (ext === 'docx') {
          this.previewKind = 'docx'
          await this.renderDocx(blob)
        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
          // 传 ArrayBuffer 而不是 Blob：xlsx 库 type:'array' 更稳，也不会被 vue 深度劫持
          this.previewExcelSource = await blob.arrayBuffer()
          this.previewKind = 'xlsx'
        } else {
          this.previewKind = 'none'
        }
      } catch (e) {
        this.previewKind = 'none'
      } finally {
        this.previewLoading = false
      }
    },

    /** docx → HTML（docx-preview），样式尽量贴近 Word 排版 */
    async renderDocx(blob) {
      const docxPreview = await import(/* webpackChunkName: "docx-preview" */ 'docx-preview')
      const box = this.$refs.docxBox
      if (!box) return
      box.innerHTML = ''
      await docxPreview.renderAsync(blob, box, null, {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true,
        breakPages: true,
        experimental: true
      })
    },

    clearPreview() {
      this.clearObjectUrl()
      this.previewKind = 'none'
      this.previewTitle = ''
      this.previewExcelSource = null
      if (this.$refs.docxBox) this.$refs.docxBox.innerHTML = ''
    },

    clearObjectUrl() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
        this.previewUrl = ''
      }
    },

    /* ------------------------- 删除 ------------------------- */

    remove(row) {
      this.$confirm(
        `确定删除「${row.fileName}」吗？删除后文档中心文件仍保留，可在文件治理中追溯。`,
        '删除文档',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
      ).then(async () => {
        try {
          await deleteWellDoc(row.docId, this.userId)
          this.$message.success('已删除')
          this.load()
        } catch (e) {
          this.$message.error((e && e.message) || '删除失败')
        }
      }).catch(() => {})
    },

    /* ------------------------- 展示工具 ------------------------- */

    fmtSize(bytes) {
      const n = Number(bytes || 0)
      if (n <= 0) return '-'
      if (n < 1024) return n + ' B'
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
      return (n / 1024 / 1024).toFixed(2) + ' MB'
    },

    typeTag(docType) {
      switch (docType) {
        case 'GEOLOGICAL_DESIGN':
          return 'warning'
        case 'ENGINEERING_DESIGN':
          return 'success'
        case 'DESIGN_TEMPLATE':
          return 'info'
        case 'GENERATED_REPORT':
          return ''
        default:
          return 'info'
      }
    },

    sourceText(src) {
      if (src === 'GENERATED') return '系统生成'
      if (src === 'MIGRATED') return '迁移'
      return '手工上传'
    },

    fileIcon(ext) {
      const e = String(ext || '').toLowerCase()
      if (e === 'pdf') return 'el-icon-document'
      if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(e)) return 'el-icon-picture-outline'
      return 'el-icon-document'
    }
  }
}
</script>

<style lang="scss" scoped>
.wd-card {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  min-width: 0;
  /* 本组件是「输出与归档」里的内嵌面板，父容器不限高，
   * 所以这里不能写 height:100%：父高是 auto 时 100% 会退化成 auto，
   * 但一旦祖先链上有人限高（曾被 .ww-card__body 的 max-height:320px 压过），
   * 本卡片就会被压扁、el-card__body 溢出，从而冒出第二根滚动条。
   * 高度交给内容自然决定，滚动只发生在最内层的 el-table 里。 */
  height: auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.wd-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  color: #303133;

  i {
    color: #409eff;
    margin-right: 4px;
  }
}

.wd-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

/* 表格区跟随内容高度；本面板不做外层滚动（滚动交给最内层 el-table） */
.wd-card__body {
  flex: 0 0 auto;
  min-width: 0;
  overflow: visible;
  padding: 16px;   /* 与附件管理卡片一致：表格四周留白，形成"双层"视觉 */
  box-sizing: border-box;
}

/* 表格跟随容器宽度，不撑破网格列 */
.wd-card ::v-deep .el-table {
  width: 100%;
}

/* el-card__body：统一 flex 布局。
 * ⚠️ 这里不能写 overflow:hidden：面板高度已改为 auto，
 * 若仍 hidden，内容超出时会**被裁掉且无滚动条**（比多根滚动条更难查）。
 * 也不能出现 auto/scroll —— 那就是第二根滚动条本身。 */
.wd-card ::v-deep .el-card__body {
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
  padding: 0;   /* 留白交给 .wd-card__body，避免双重内边距 */
}

/* 表格宽度撑满卡片；列宽已压缩，无需横向滚动 */
.wd-card ::v-deep .el-table__body-wrapper {
  overflow-x: hidden;
}

/* 表头与整体容器同样禁止横向溢出，避免出现滚动条 */
.wd-card ::v-deep .el-table__header-wrapper {
  overflow-x: hidden;
}

.wd-card ::v-deep .el-table--scrollable-x .el-table__body-wrapper {
  overflow-x: hidden;
}

/* 覆盖 el-table 内部用于占位的 gutter，防止额外横向宽度 */
.wd-card ::v-deep .el-table__body {
  width: 100% !important;
}

.wd-card ::v-deep .el-table__header {
  width: 100% !important;
}

/* 单元格与表头样式对齐附件管理表 */
.wd-card ::v-deep .el-table th.el-table__cell {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
  padding: 8px 0;
}

.wd-card ::v-deep .el-table td.el-table__cell {
  padding: 9px 0;
}

.wd-card ::v-deep .el-table .cell {
  padding: 0 8px;
  line-height: 1.5;
}

.wd-card__count {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.wd-card ::v-deep .ww-op-btns {
  display: flex;
  align-items: center;
  gap: 0;
  justify-content: flex-end;
  white-space: nowrap;
}

/* 操作按钮紧凑化：去掉 el-button 之间的默认 margin */
.wd-card ::v-deep .ww-op-btns .el-button {
  margin-left: 0;
  padding: 0 3px;
  font-size: 12px;
}

/* 单元格内容不折行（与附件管理表一致） */
.wd-card ::v-deep .wd-nowrap {
  white-space: nowrap;
}

.wd-file-icon {
  color: #909399;
  margin-right: 4px;
}

.wd-del {
  color: #f56c6c;
}

.wd-static {
  color: #606266;
}

.wd-preview {
  height: 100%;
  padding: 0 12px 12px;
  overflow: auto;
}

.wd-preview__frame {
  width: 100%;
  height: 100%;
  min-height: 70vh;
  border: none;
  background: #525659;
}

.wd-preview__docx {
  background: #f0f2f5;
  padding: 12px 0;
  min-height: 70vh;

  ::v-deep .docx-wrapper {
    background: #f0f2f5;
    padding: 0;

    > section.docx {
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
      margin-bottom: 14px;
    }
  }
}
</style>
