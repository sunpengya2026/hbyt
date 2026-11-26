<template>
  <div class="excel-sheet-preview">
    <!-- 只有一个 sheet 时不显示切换条，避免多余交互 -->
    <div v-if="sheetNames.length > 1" class="esp__sheetbar">
      <span class="esp__sheetbar-label">工作表</span>
      <el-radio-group v-model="sheetIndex" size="mini" @change="loadSheet">
        <el-radio-button
          v-for="(name, i) in sheetNames"
          :key="name + '#' + i"
          :label="i"
        >
          {{ name }}
        </el-radio-button>
      </el-radio-group>
      <span class="esp__sheetbar-count">共 {{ sheetNames.length }} 个</span>
    </div>

    <el-table
      v-if="rows.length"
      :data="rows"
      border
      size="mini"
      :max-height="maxHeight"
      class="esp__table"
    >
      <el-table-column
        v-for="col in cols"
        :key="col"
        :prop="col"
        :label="col"
        show-overflow-tooltip
      />
    </el-table>
    <div v-else class="esp__empty">
      <template v-if="loading">解析中…</template>
      <template v-else-if="error">{{ error }}</template>
      <template v-else-if="sheetNames.length">
        工作表「{{ sheetNames[sheetIndex] || '' }}」无数据
      </template>
      <template v-else>暂无可显示的内容</template>
    </div>
  </div>
</template>

<script>
/**
 * Excel 多 sheet 预览组件
 *
 * 用法（二选一）：
 *   <excel-sheet-preview :source="arrayBufferOrBlob" />       // 组件内部负责解析
 *   <excel-sheet-preview :workbook="已解析的 workbook" />      // 外部已解析，直接复用
 *
 * 设计要点：
 *  1. 解析一次，切 sheet 时复用 workbook 本体，不重复读盘；
 *  2. 默认停在第一个「有内容」的 sheet —— 业务方上传的表第 1 个 sheet 常是空壳，
 *     停在空壳上会让人误以为文件坏了；
 *  3. 列头用 Excel 原生列号 A/B/C…，数据按位置对齐。业务表表头常在第 5~6 行，
 *     按「第一行当表头」解析会整体错位，所以列头只表示位置，不做语义解读；
 *  4. 用 header:1 取二维数组而非对象数组：表头有空列时对象模式会吞掉后面的列。
 */
export default {
  name: 'ExcelSheetPreview',

  props: {
    /** ArrayBuffer / Blob / Uint8Array，任一可被 xlsx 读取的来源 */
    source: { type: [Object, ArrayBuffer, Uint8Array], default: null },
    /** 已解析好的 workbook（传了它就不再用 source） */
    workbook: { type: Object, default: null },
    /** 表格区最大高度，透传给 el-table */
    maxHeight: { type: [String, Number], default: '70vh' },
    /** 最多渲染多少行，防止超大表卡死页面 */
    maxRows: { type: Number, default: 500 }
  },

  data() {
    return {
      loading: false,
      error: '',
      sheetNames: [],
      sheetIndex: 0,
      cols: [],
      rows: [],
      // 非响应式的重对象挂在实例上，避免被 Vue 深度劫持拖慢切 sheet
      _wb: null,
      _XLSX: null
    }
  },

  watch: {
    source() {
      this.init()
    },
    workbook(wb) {
      if (wb) {
        this.applyWorkbook(wb)
      } else if (this.source) {
        this.init()
      }
    }
  },

  created() {
    if (this.workbook) {
      this.applyWorkbook(this.workbook)
    } else if (this.source) {
      this.init()
    }
  },

  methods: {
    /** 对外暴露：重新解析 source */
    init() {
      if (!this.source) return Promise.resolve()
      this.loading = true
      this.error = ''
      this.sheetNames = []
      this.sheetIndex = 0
      this.cols = []
      this.rows = []
      return this.ensureLib()
        .then((XLSX) => {
          const wb = XLSX.read(this.source, { type: 'array', cellDates: true })
          this.loading = false
          this.applyWorkbook(wb)
        })
        .catch((e) => {
          this.loading = false
          this.error = 'Excel 解析失败：' + ((e && e.message) || e)
        })
    },

    /**
     * 确保 xlsx 库已加载。
     * 走 workbook prop 的外部调用方（如工作台附件预览）自己解析好了工作簿，
     * 但铺表仍然要用 XLSX.utils，所以这里必须懒加载一次，不能假定 _XLSX 已就绪。
     */
    ensureLib() {
      /* [安全清理-中风险] 已移除 xlsx 依赖，禁用前端 Excel 解析
      if (this._XLSX) return Promise.resolve(this._XLSX)
      if (!this._libPromise) {
        this._libPromise = import(/ * webpackChunkName: "xlsx" * / 'xlsx').then((mod) => {
          this._XLSX = mod.default || mod
          return this._XLSX
        })
      }
      return this._libPromise
      */
      return Promise.reject(new Error('xlsx 依赖已按安全要求移除'))
    },

    /** 把 workbook 挂上并跳到第一个非空 sheet */
    applyWorkbook(wb) {
      this._wb = wb
      this.sheetNames = (wb && wb.SheetNames) || []
      const idx = this.findFirstNonEmptySheet(wb)
      this.sheetIndex = idx >= 0 ? idx : 0
      if (!this.sheetNames.length) return
      // 库可能还没加载完（workbook prop 场景），加载完再铺表
      this.ensureLib()
        .then(() => this.loadSheet(this.sheetIndex))
        .catch((e) => {
          this.error = 'Excel 解析失败：' + ((e && e.message) || e)
        })
    },

    /**
     * 取第一个有实际内容的 sheet 下标（找不到返回 -1）。
     * 空壳判定：`!ref` 为空，或范围只有一个单元格（`!ref` 可能是 "A1"，
     * 也可能是 "A1:A1" —— 前者不带冒号，只按 split(':') 判断会漏）。
     */
    findFirstNonEmptySheet(wb) {
      if (!wb || !wb.SheetNames) return -1
      for (let i = 0; i < wb.SheetNames.length; i++) {
        const ws = wb.Sheets[wb.SheetNames[i]]
        if (!ws || !ws['!ref']) continue
        const range = String(ws['!ref']).split(':')
        const first = range[0]
        const last = range.length > 1 ? range[1] : range[0]
        if (first === last) continue // 只有一格，视为空壳
        return i
      }
      return -1
    },

    /** 载入指定下标的 sheet */
    loadSheet(idx) {
      const XLSX = this._XLSX
      const wb = this._wb
      const name = this.sheetNames[idx]
      this.cols = []
      this.rows = []
      if (!XLSX || !wb || !name) return
      const ws = wb.Sheets[name]
      if (!ws) return
      try {
        const matrix = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: '',
          blankrows: true
        })
        if (!matrix.length) return
        // 列数取全表最宽的一行，避免后面的列被短行截断
        const colCount = matrix.reduce((m, r) => Math.max(m, r.length), 0)
        if (!colCount) return
        const cols = []
        for (let c = 0; c < colCount; c++) cols.push(XLSX.utils.encode_col(c))
        const rows = matrix.slice(0, this.maxRows).map((r, ri) => {
          const o = { '#': ri + 1 }
          for (let c = 0; c < colCount; c++) {
            const v = r[c]
            o[cols[c]] = v === null || v === undefined ? '' : v
          }
          return o
        })
        this.cols = cols
        this.rows = rows
      } catch (e) {
        this.cols = []
        this.rows = []
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.excel-sheet-preview {
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

/* sheet 切换条 */
.esp__sheetbar {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0 0 10px;
  margin-bottom: 2px;
  border-bottom: 1px solid #ebeef5;

  &-label {
    flex: none;
    font-size: 12px;
    color: #909399;
    line-height: 28px;
  }

  &-count {
    flex: none;
    margin-left: auto;
    font-size: 12px;
    color: #c0c4cc;
    line-height: 28px;
    white-space: nowrap;
  }

  ::v-deep .el-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-height: 88px;
    overflow-y: auto;
    flex: 1 1 auto;
    min-width: 0;
  }

  ::v-deep .el-radio-button__inner {
    border-radius: 3px;
    border-left: 1px solid #dcdfe6;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.esp__table {
  flex: 1 1 auto;
  min-height: 0;
  margin-top: 8px;

  ::v-deep .el-table__header th {
    background: #f5f7fa;
    color: #606266;
    font-weight: 600;
  }
}

.esp__empty {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: #909399;
  font-size: 13px;
}
</style>
