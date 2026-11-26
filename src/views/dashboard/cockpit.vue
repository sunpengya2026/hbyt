<template>
  <div class="cockpit" v-loading="loading" element-loading-text="正在汇总驾驶舱数据…">
    <!-- ============ 顶部：标题 + 刷新 ============ -->
    <div class="ck-header">
      <div class="ck-title-wrap">
        <h2 class="ck-title">压裂设计驾驶舱</h2>
        <span class="ck-sub">
          全域运行态势总览
          <template v-if="updatedAt">
            · 更新于 {{ updatedAt }}
          </template>
        </span>
      </div>
      <div class="ck-actions">
        <span class="ck-auto-tip">
          <i :class="autoRefresh ? 'el-icon-success' : 'el-icon-remove-outline'"></i>
          {{ autoRefresh ? '30 秒自动刷新' : '自动刷新已暂停' }}
        </span>
        <el-button size="mini" icon="el-icon-refresh" :loading="loading" @click="loadAll(true)">
          立即刷新
        </el-button>
        <el-switch v-model="autoRefresh" active-color="#3D5FEF" @change="toggleAuto" />
      </div>
    </div>

    <!-- ============ 第一排：四个核心 KPI ============ -->
    <div class="ck-kpi-row">
      <!-- 工作台井数 -->
      <div class="kpi-card kpi-blue" @click="$router.push('/workbench/index')">
        <div class="kpi-head">
          <span class="kpi-name">工作台井数</span>
          <i class="el-icon-s-platform kpi-icon"></i>
        </div>
        <div class="kpi-main">
          <span class="kpi-num">{{ well.total }}</span>
          <span class="kpi-unit">口</span>
        </div>
        <div class="kpi-foot">
          <span class="dot dot-warn"></span>待生成 {{ well.pending }}
          <span class="sep">·</span>
          <span class="dot dot-run"></span>生成中 {{ well.generating }}
          <span class="sep">·</span>
          <span class="dot dot-ok"></span>已生成 {{ well.done }}
        </div>
        <div class="kpi-bar">
          <div
            v-for="s in wellBars"
            :key="s.status"
            class="kpi-bar-seg"
            :style="{ width: s.pct + '%', background: s.color }"
            :title="s.status + ' ' + s.count + ' 口'"
          ></div>
        </div>
      </div>

      <!-- 待生成文档 -->
      <div class="kpi-card kpi-orange">
        <div class="kpi-head">
          <span class="kpi-name">待生成文档</span>
          <i class="el-icon-time kpi-icon"></i>
        </div>
        <div class="kpi-main">
          <span class="kpi-num">{{ doc.pendingWells }}</span>
          <span class="kpi-unit">口井</span>
        </div>
        <div class="kpi-foot">
          共 {{ doc.wellTotal }} 口井中尚未产出设计文档
        </div>
        <div class="kpi-bar">
          <div
            class="kpi-bar-seg"
            :style="{ width: (100 - doc.doneRate) + '%', background: '#ff9f0a' }"
          ></div>
        </div>
      </div>

      <!-- 已完成 -->
      <div class="kpi-card kpi-green">
        <div class="kpi-head">
          <span class="kpi-name">已完成</span>
          <i class="el-icon-circle-check kpi-icon"></i>
        </div>
        <div class="kpi-main">
          <span class="kpi-num">{{ doc.doneWells }}</span>
          <span class="kpi-unit">口井</span>
        </div>
        <div class="kpi-foot">
          完成率 {{ doc.doneRate }}%
          <span class="sep">·</span>
          生成件 {{ doc.generated }} 份
          <span class="sep">·</span>
          材料 {{ doc.manual }} 份
        </div>
        <div class="kpi-bar">
          <div class="kpi-bar-seg" :style="{ width: doc.doneRate + '%', background: '#34c759' }"></div>
        </div>
      </div>

      <!-- 知识库文档 -->
      <div class="kpi-card kpi-purple" @click="$router.push('/knowledge/list')">
        <div class="kpi-head">
          <span class="kpi-name">知识库文档</span>
          <i class="el-icon-collection kpi-icon"></i>
        </div>
        <div class="kpi-main">
          <span class="kpi-num">{{ knowledge.docTotal }}</span>
          <span class="kpi-unit">份</span>
        </div>
        <div class="kpi-foot">
          {{ knowledge.datasetCount }} 个知识库
          <span class="sep">·</span>
          {{ formatNum(knowledge.chunkTotal) }} 个分块
        </div>
        <div class="kpi-bar">
          <div class="kpi-bar-seg" style="width: 100%; background: #7c3aed;"></div>
        </div>
      </div>
    </div>

    <!-- ============ 第二排：知识库 + 文档构成 + 最新井 ============ -->
    <div class="ck-row ck-row-last">
      <div class="ck-col-8">
        <div class="panel panel-full">
          <div class="panel-head">
            <span class="panel-title"><i class="el-icon-folder-opened"></i> 知识库概况</span>
            <el-button type="text" size="mini" @click="$router.push('/knowledge/list')">
              管理 <i class="el-icon-arrow-right"></i>
            </el-button>
          </div>
          <div class="panel-body panel-scroll">
            <div v-if="knowledge.available === false" class="empty-hint">
              {{ knowledge.message || '知识库服务不可用' }}
            </div>
            <div
              v-for="d in knowledge.datasets"
              :key="d.id"
              class="kb-item"
            >
              <div class="kb-main">
                <div class="kb-name" :title="d.name">{{ d.name }}</div>
                <div class="kb-meta">
                  {{ d.documentCount }} 份文档
                  <span class="sep">·</span>
                  {{ formatNum(d.chunkCount) }} 分块
                </div>
              </div>
              <div class="kb-bar-wrap">
                <div class="kb-bar" :style="{ width: kbPercent(d.documentCount) + '%' }"></div>
              </div>
            </div>
            <div v-if="knowledge.available !== false && !knowledge.datasets.length" class="empty-hint">
              暂无知识库
            </div>
          </div>
        </div>
      </div>

      <div class="ck-col-8">
        <div class="panel panel-full">
          <div class="panel-head">
            <span class="panel-title"><i class="el-icon-document"></i> 文档构成</span>
            <span class="panel-badge">共 {{ doc.total }} 份</span>
          </div>
          <div class="panel-body">
            <div class="dist-list">
              <div v-for="t in doc.byType" :key="t.type" class="dist-item">
                <div class="dist-label">{{ t.label }}</div>
                <div class="dist-track">
                  <div class="dist-fill" :style="{ width: typePercent(t.count) + '%' }"></div>
                </div>
                <div class="dist-count">{{ t.count }}</div>
              </div>
              <div v-if="!doc.byType || !doc.byType.length" class="empty-hint">
                暂无文档
              </div>
            </div>
            <div class="dist-divider"></div>
            <div class="source-row">
              <div v-for="s in doc.bySource" :key="s.source" class="source-chip">
                <span class="source-dot" :style="{ background: sourceColor(s.source) }"></span>
                {{ s.label }}
                <b>{{ s.count }}</b>
              </div>
            </div>

            <!-- 文档类型说明：条目少时补足信息，避免面板下半截空着 -->
            <div class="type-legend">
              <div class="legend-title">类型说明</div>
              <div class="legend-item"><i class="lg lg-geo"></i>压裂地质设计：作为生成的输入材料</div>
              <div class="legend-item"><i class="lg lg-eng"></i>压裂工程设计：最终交付的设计文件</div>
              <div class="legend-item"><i class="lg lg-tpl"></i>设计模板：含字段批注的骨架文档</div>
              <div class="legend-item"><i class="lg lg-gen"></i>系统生成文档：由本系统产出</div>
            </div>
          </div>
        </div>
      </div>

      <div class="ck-col-8">
        <div class="panel panel-full">
          <div class="panel-head">
            <span class="panel-title"><i class="el-icon-time"></i> 最近加入的井</span>
            <el-button type="text" size="mini" @click="$router.push('/workbench/index')">
              工作台 <i class="el-icon-arrow-right"></i>
            </el-button>
          </div>
          <div class="panel-body panel-scroll">
            <div
              v-for="(w, i) in well.recent"
              :key="i"
              class="well-item"
            >
              <div class="well-left">
                <span class="well-name">{{ w.wellName }}</span>
                <span class="well-block">{{ w.wellBlock || '未标注区块' }}</span>
              </div>
              <el-tag size="mini" :type="statusTagType(w.wellStatus)">
                {{ w.wellStatus || '未标注' }}
              </el-tag>
            </div>
            <div v-if="!well.recent || !well.recent.length" class="empty-hint">
              工作台还没有井
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDashboardOverviewApi } from '@/api/dashboard'

export default {
  name: 'DashboardCockpit',

  data() {
    return {
      loading: false,
      autoRefresh: true,
      updatedAt: '',
      timer: null,
      // 兜底空结构：接口失败时页面仍能渲染出零值骨架，不白屏
      well: { total: 0, pending: 0, generating: 0, done: 0, failed: 0, byStatus: [], recent: [] },
      doc: { total: 0, doneWells: 0, pendingWells: 0, doneRate: 0, generated: 0, manual: 0, byType: [], bySource: [] },
      knowledge: { available: null, datasetCount: 0, docTotal: 0, chunkTotal: 0, datasets: [] }
    }
  },

  computed: {
    /** 井状态堆叠条：按状态着色 */
    wellBars() {
      const list = this.well.byStatus || []
      const total = this.well.total || 0
      if (!total) return []
      return list.map(s => ({
        status: s.status,
        count: s.count,
        pct: Math.round(s.count * 1000 / total) / 10,
        color: this.statusColor(s.status)
      }))
    }
  },

  mounted() {
    this.loadAll()
    this.timer = setInterval(() => {
      if (this.autoRefresh && !this.loading) this.loadAll()
    }, 30000)
  },

  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  methods: {
    async loadAll(manual) {
      if (this.loading) return
      this.loading = true
      try {
        const res = await getDashboardOverviewApi()
        // 后端统一返回 {code, message, data}
        const d = (res && res.data) || {}
        if (d.well && !d.well.error) this.well = Object.assign({}, this.well, d.well)
        if (d.doc && !d.doc.error) this.doc = Object.assign({}, this.doc, d.doc)
        if (d.knowledge) this.knowledge = Object.assign({}, this.knowledge, d.knowledge)
        this.updatedAt = this.nowStr()
        // 手动刷新时给个明确反馈；自动刷新不打扰
        if (manual) this.$message({ message: '数据已刷新', type: 'success', duration: 1200 })
      } catch (e) {
        // 自动刷新失败不弹窗（否则内网抖动时会一直弹），只在手动刷新时提示
        if (manual) {
          this.$message.error('驾驶舱数据加载失败：' + (e.message || '接口不可达'))
        }
      } finally {
        this.loading = false
      }
    },

    toggleAuto(val) {
      if (val) {
        this.$message({ message: '已开启 30 秒自动刷新', type: 'info', duration: 1200 })
      }
    },

    nowStr() {
      const d = new Date()
      const p = n => (n < 10 ? '0' + n : '' + n)
      return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
    },

    formatNum(n) {
      if (n === null || n === undefined || n === '') return '0'
      const v = Number(n)
      if (isNaN(v)) return String(n)
      return v >= 10000 ? (v / 10000).toFixed(1) + ' 万' : String(v)
    },

    kbPercent(docCount) {
      const list = this.knowledge.datasets || []
      const max = list.reduce((m, x) => Math.max(m, x.documentCount || 0), 0) || 1
      return Math.max(2, Math.round((docCount || 0) * 100 / max))
    },

    typePercent(count) {
      const total = this.doc.total || 1
      return Math.max(2, Math.round((count || 0) * 100 / total))
    },

    /** 井状态 → 颜色。失败用红，已完成用绿，其余按语义区分 */
    statusColor(st) {
      const s = st || ''
      if (s.indexOf('失败') >= 0) return '#f56c6c'
      if (s.indexOf('生成中') >= 0) return '#3D5FEF'
      if (s.indexOf('已生成') >= 0 || s.indexOf('已完成') >= 0) return '#34c759'
      if (s.indexOf('待生成') >= 0) return '#ff9f0a'
      return '#c0c4cc'
    },

    statusTagType(st) {
      const s = st || ''
      if (s.indexOf('失败') >= 0) return 'danger'
      if (s.indexOf('生成中') >= 0) return ''
      if (s.indexOf('已生成') >= 0 || s.indexOf('已完成') >= 0) return 'success'
      return 'warning'
    },

    sourceColor(code) {
      const c = (code || '').toUpperCase()
      if (c === 'GENERATED') return '#34c759'
      if (c === 'MIGRATED') return '#7c3aed'
      return '#3D5FEF'
    }
  }
}
</script>

<style scoped lang="scss">
.cockpit {
  padding: 16px 20px 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 84px);
  box-sizing: border-box;
}

/* ---------- 顶部 ---------- */
.ck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;

  .ck-title-wrap {
    display: flex;
    align-items: baseline;
  }

  .ck-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1d1d1f;
    letter-spacing: 0.5px;
  }

  .ck-sub {
    margin-left: 12px;
    font-size: 12px;
    color: #909399;
  }

  .ck-actions {
    display: flex;
    align-items: center;

    .ck-auto-tip {
      font-size: 12px;
      color: #909399;
      margin-right: 12px;

      i {
        margin-right: 3px;
      }
    }

    .el-switch {
      margin-left: 10px;
    }
  }
}

/* ---------- KPI 卡片 ---------- */
.ck-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.kpi-card {
  position: relative;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
  /* 底部留给 3px 色条，padding-bottom 为 0 让色条贴底 */
  padding: 16px 18px 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;

  &[class*='kpi-']:hover {
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .kpi-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .kpi-name {
    font-size: 13px;
    color: #606266;
    font-weight: 500;
  }

  .kpi-icon {
    font-size: 20px;
    opacity: 0.85;
  }

  .kpi-main {
    margin-top: 8px;
    display: flex;
    align-items: baseline;
  }

  .kpi-num {
    font-size: 32px;
    font-weight: 700;
    line-height: 1.1;
    color: #1d1d1f;
    font-variant-numeric: tabular-nums;
  }

  .kpi-unit {
    margin-left: 5px;
    font-size: 12px;
    color: #909399;
  }

  .kpi-foot {
    margin-top: 6px;
    font-size: 12px;
    color: #909399;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    .sep {
      margin: 0 4px;
      color: #dcdfe6;
    }

    .dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-right: 3px;
      vertical-align: middle;
    }

    .dot-warn {
      background: #ff9f0a;
    }

    .dot-run {
      background: #409eff;
    }

    .dot-ok {
      background: #34c759;
    }
  }

  .kpi-bar {
    display: flex;
    height: 3px;
    /* 负边距把色条拉到卡片左右边缘，margin-top:auto 让它始终贴底 */
    margin: auto -18px 0;
    background: #f5f7fa;

    .kpi-bar-seg {
      height: 100%;
      transition: width 0.5s ease;
    }
  }

  /* 四色主题：只染图标与顶部数字左边的细线 */
  &.kpi-blue .kpi-icon {
    color: #0071e3;
  }

  &.kpi-orange .kpi-icon {
    color: #ff9f0a;
  }

  &.kpi-green .kpi-icon {
    color: #34c759;
  }

  &.kpi-purple .kpi-icon {
    color: #7c3aed;
  }

  &.kpi-blue {
    cursor: pointer;
  }

  &.kpi-purple {
    cursor: pointer;
  }
}

/* ---------- 栅格 ---------- */
.ck-row {
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
  /* 子列拉伸等高，三块面板才能对齐 */
  align-items: stretch;

  &:last-child {
    margin-bottom: 0;
  }
}

/*
 * 第二排现在是收尾的一排（压裂日动态 / 机组作业动态 / 区块覆盖已下线），
 * 给一个最小高度避免面板过矮；内容不足时靠面板自身留白，不强制撑满整屏。
 */
.ck-row-last {
  min-height: 300px;
}

.ck-col-8 {
  flex: 0 0 calc((100% - 28px) / 3);
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ---------- 面板 ---------- */
.panel {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 并排面板等高：ck-row 是 flex，子项 stretch，panel 内部再撑满 */
.panel-full {
  flex: 1 1 auto;
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f2f5;

  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;

    i {
      margin-right: 6px;
      color: #409eff;
    }
  }

  .panel-badge {
    font-size: 12px;
    color: #606266;
    background: #f4f6f9;
    border-radius: 10px;
    padding: 2px 9px;

    &.stale {
      color: #e6a23c;
      background: #fdf6ec;
    }
  }
}

.panel-body {
  padding: 14px 16px;
  flex: 1;
  min-height: 0;
}

.panel-scroll {
  overflow-y: auto;
  /* 保底高度，避免内容很少时面板塌成一条；内容超出时正常滚动 */
  max-height: 342px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #c0c4cc;
  }
}

/* ---------- 知识库 ---------- */
.kb-item {
  padding: 7px 0;

  .kb-main {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .kb-name {
    font-size: 13px;
    color: #303133;
    max-width: 62%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kb-meta {
    font-size: 12px;
    color: #909399;
    white-space: nowrap;

    .sep {
      margin: 0 3px;
      color: #dcdfe6;
    }
  }

  .kb-bar-wrap {
    margin-top: 5px;
    height: 4px;
    background: #f5f7fa;
    border-radius: 2px;
    overflow: hidden;
  }

  .kb-bar {
    height: 100%;
    background: linear-gradient(90deg, #b18cff, #7c3aed);
    border-radius: 2px;
    transition: width 0.5s ease;
  }
}

/* ---------- 文档构成 ---------- */
.dist-item {
  display: flex;
  align-items: center;
  margin-bottom: 9px;

  .dist-label {
    flex: 0 0 108px;
    font-size: 12px;
    color: #606266;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dist-track {
    flex: 1;
    height: 8px;
    background: #f5f7fa;
    border-radius: 4px;
    overflow: hidden;
  }

  .dist-fill {
    height: 100%;
    background: linear-gradient(90deg, #79bbff, #409eff);
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .dist-count {
    flex: 0 0 34px;
    text-align: right;
    font-size: 12px;
    font-weight: 600;
    color: #303133;
  }
}

.dist-divider {
  height: 1px;
  background: #f0f2f5;
  margin: 12px 0;
}

.source-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.source-chip {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: #606266;
  background: #f7f9fc;
  border-radius: 12px;
  padding: 4px 10px;

  .source-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 5px;
  }

  b {
    margin-left: 5px;
    color: #303133;
  }
}

/* 类型说明：填充面板剩余空间，避免条目少时大片留白 */
.type-legend {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed #f0f2f5;

  .legend-title {
    font-size: 12px;
    color: #909399;
    margin-bottom: 7px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    font-size: 12px;
    color: #606266;
    line-height: 1.9;
  }

  .lg {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    margin-right: 7px;
    flex: 0 0 auto;
  }

  .lg-geo {
    background: #79bbff;
  }

  .lg-eng {
    background: #409eff;
  }

  .lg-tpl {
    background: #b18cff;
  }

  .lg-gen {
    background: #34c759;
  }
}

/* ---------- 最近加入的井 ---------- */
.well-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #f0f2f5;

  &:last-child {
    border-bottom: none;
  }

  .well-left {
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .well-name {
    font-size: 13px;
    color: #303133;
    font-weight: 500;
  }

  .well-block {
    font-size: 11px;
    color: #c0c4cc;
    margin-top: 1px;
  }
}

/* ---------- 空态 ---------- */
.empty-hint {
  padding: 22px 0;
  text-align: center;
  font-size: 12px;
  color: #c0c4cc;
}

/* ---------- 响应式：窄屏退化为两列 / 单列 ---------- */
@media screen and (max-width: 1400px) {
  .ck-kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .ck-col-8 {
    flex: 0 0 calc((100% - 14px) / 2);
  }
}

@media screen and (max-width: 900px) {
  .ck-kpi-row {
    grid-template-columns: 1fr;
  }

  .ck-row {
    flex-direction: column;
  }

  .ck-col-8 {
    flex: 1 1 auto;
  }
}
</style>
