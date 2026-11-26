<template>
  <el-card class="wm-card" shadow="never" :class="{ 'wm-card--ready': readyCount === totalRequired && totalRequired > 0 }">
    <div slot="header" class="wm-card__header">
      <div class="wm-card__title">
        <i :class="module.icon"></i>
        <span class="wm-card__name">{{ module.title }}</span>
        <el-tag
          :type="readyCount === totalRequired ? 'success' : 'warning'"
          size="mini"
          effect="plain"
        >
          {{ readyCount }}/{{ totalRequired }} 项必需
        </el-tag>
      </div>
      <div class="wm-card__actions">
        <el-button size="mini" icon="el-icon-refresh" :loading="loading" @click="$emit('refresh')">刷新</el-button>
        <!--
          模块自定义动作按钮（如「分段射孔方案」的「进入射孔方案」），位于刷新按钮右侧。
          用户的动作顺序是「先刷新确认数据齐不齐 → 再进下游调整」，
          所以按钮靠右、且材料未收齐时置灰并给出缺什么。
          module.action 声明按钮文案、图标、生效所需必需项数、未就绪提示。
        -->
        <el-tooltip
          v-if="module.action"
          :disabled="actionEnabled"
          :content="actionDisabledTip"
          placement="top-end"
        >
          <span class="wm-card__action-slot">
            <el-button
              size="mini"
              :type="actionEnabled ? 'primary' : 'default'"
              :icon="module.action.icon"
              :disabled="!actionEnabled"
              @click="$emit('module-action', module.action.key)"
            >{{ module.action.label }}</el-button>
          </span>
        </el-tooltip>
      </div>
    </div>

    <div v-loading="loading" class="wm-card__body">
      <!-- 模块作用说明 -->
      <div class="wm-purpose">
        <i class="el-icon-info"></i>
        <span>{{ module.purpose }}</span>
      </div>

      <!-- 支撑章节 -->
      <div class="wm-sections">
        <span class="wm-sections__label">支撑章节</span>
        <el-tag
          v-for="(s, i) in module.sections"
          :key="i"
          size="mini"
          effect="plain"
          class="wm-sections__tag"
        >{{ s }}</el-tag>
      </div>

      <!--
        自动生成的章节：不需要本模块上传任何材料，由模板制式 / 系统常量 / 规则算出。
        单独一行灰字而不是混进上面的标签，是为了让用户一眼分清
        「我要交材料才能填的」和「系统自己会填的」，避免误以为这些章节漏了。
      -->
      <div v-if="autoSections && autoSections.length" class="wm-sections wm-sections--auto">
        <span class="wm-sections__label">
          <i class="el-icon-magic-stick"></i> 自动生成（无需上传）
        </span>
        <span
          v-for="(s, i) in autoSections"
          :key="i"
          class="wm-sections__auto-item"
        >{{ s }}</span>
      </div>

      <!-- 输入材料清单 -->
      <div class="wm-inputs">
        <!-- 文档中心管理的必需材料（如压裂地质设计）：只展示状态，上传入口在「设计文档」区 -->
        <div v-if="module.docCenterRequired" class="wm-input-row wm-input-row--doc">
          <div class="wm-input-row__main">
            <div class="wm-input-row__head">
              <span class="wm-input-row__label">{{ module.docCenterRequired.label }}</span>
              <el-tag type="danger" size="mini" effect="plain">必需</el-tag>
              <el-tag
                :type="extraReady > 0 ? 'success' : 'info'"
                size="mini"
                effect="plain"
              >{{ extraReady > 0 ? '已在文档中心' : '未上传' }}</el-tag>
            </div>
            <div class="wm-input-row__desc">{{ module.docCenterRequired.desc }}</div>
            <div class="wm-input-row__reuse">
              <i class="el-icon-link"></i>
              <span>{{ module.docCenterRequired.hint }}</span>
            </div>
          </div>
          <div class="wm-input-row__op">
            <el-button size="mini" icon="el-icon-bottom" @click="$emit('go-doc-center')">前往上传</el-button>
          </div>
        </div>

        <div
          v-for="inp in module.inputs"
          :key="inp.key"
          class="wm-input-row"
          :class="{ 'wm-input-row--variant': !!inp.variant }"
        >
          <div class="wm-input-row__main">
            <div class="wm-input-row__head">
              <span class="wm-input-row__label">{{ inp.label }}</span>
              <el-tag v-if="inp.required" type="danger" size="mini" effect="plain">必需</el-tag>
              <el-tag v-else type="info" size="mini" effect="plain">可选</el-tag>
              <span v-if="filesOf(inp).length && inp.variant !== 'DOC_PUMP'" class="wm-input-row__count">
                已收 {{ filesOf(inp).length }} 个
              </span>
            </div>
            <div class="wm-input-row__desc">{{ inp.desc }}</div>
            <div v-if="inp.note" class="wm-input-row__note">
              <i class="el-icon-warning-outline"></i> {{ inp.note }}
            </div>

            <!-- 内置模板档位：勾选 + 直接预览整张表（不需要上传文件） -->
            <div v-if="inp.variant === 'PRETEST'" class="wm-variant">
              <div class="wm-variant__pick">
                <span class="wm-variant__tips">选择档位：</span>
                <el-radio-group
                  :value="variantOf(inp)"
                  size="small"
                  @input="v => onPickVariant(inp, v)"
                >
                  <el-radio-button
                    v-for="v in variantOptions"
                    :key="v.key"
                    :label="v.key"
                  >{{ v.label }}</el-radio-button>
                </el-radio-group>
                <el-button
                  v-if="inp.targetSection"
                  type="text"
                  size="mini"
                  class="wm-variant__sec"
                  @click="$emit('jump-section', inp.targetSection)"
                >
                  <i class="el-icon-link"></i> {{ inp.targetSection }}
                </el-button>
              </div>

              <!-- 预览：选中的档位摘要 + 可展开全表 -->
              <div v-if="currentVariant" class="wm-preview">
                <div class="wm-preview__bar">
                  <span class="wm-preview__sum">
                    共 <b>{{ currentVariant.rows.length }}</b> 个泵注阶段 ·
                    总液量 <b>{{ fmt(currentVariant.totalFluid) }}</b> m³ ·
                    总时间 <b>{{ fmt(currentVariant.totalTime) }}</b> min ·
                    最高排量 <b>{{ fmt(currentVariant.maxRate) }}</b> m³/min
                  </span>
                  <el-button
                    type="text"
                    size="mini"
                    @click="showTable = !showTable"
                  >
                    <i :class="showTable ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                    {{ showTable ? '收起表格' : '预览表格' }}
                  </el-button>
                </div>

                <div v-show="showTable" class="wm-preview__wrap">
                  <table class="wm-preview__table">
                    <thead>
                      <tr>
                        <th
                          v-for="c in columns"
                          :key="c.key"
                          :style="{ width: c.width + 'px' }"
                        >{{ c.label }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(r, ri) in currentVariant.rows" :key="ri">
                        <td v-for="c in columns" :key="c.key" align="center">
                          {{ fmt(r[c.key]) }}
                        </td>
                      </tr>
                      <tr class="wm-preview__total">
                        <td colspan="3" align="center">合计</td>
                        <td align="center">{{ fmt(currentVariant.totalFluid) }}</td>
                        <td align="center">-</td>
                        <td align="center">{{ fmt(currentVariant.totalTime) }}</td>
                        <td align="center">-</td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="wm-preview__foot">
                    <i class="el-icon-document"></i>
                    数据来源：《小压测试.xlsx》{{ currentVariant.label }} 工作表；
                    生成时整表写入「{{ inp.targetSection }}」，可在编辑器中微调数值。
                  </div>
                </div>
              </div>
            </div>

            <!--
              泵注程序：只读展示 + 下载。
              数据源是「泵注程序功能页保存的那一版」（COMM_WB_PUMP_TABLE / COMM_WB_PUMP_ROW），
              上传与编辑都在功能页做，工作台这里不设上传入口。
            -->
            <div v-if="inp.variant === 'DOC_PUMP'" class="wm-doc-pump">
              <div class="wm-doc-pump__bar">
                <template v-if="pumpLoading">
                  <i class="el-icon-loading"></i>
                  <span>正在读取已保存的泵注程序…</span>
                </template>
                <template v-else-if="pumpError">
                  <i class="el-icon-warning-outline wm-doc-pump__warn"></i>
                  <span class="wm-doc-pump__err">{{ pumpError }}</span>
                </template>
                <template v-else-if="pumpHasData">
                  <span class="wm-doc-pump__sum">
                    共 <b>{{ pump.stages.length }}</b> 段
                    <template v-if="pumpFilledStages < pump.stages.length">
                      （<b>{{ pumpFilledStages }}</b> 段有明细）
                    </template>
                    · 合计 <b>{{ pumpTotalRows }}</b> 行 ·
                    版本 <b>v{{ pump.versionNo }}</b>
                    <template v-if="pump.updateDate">
                      · 保存于 {{ String(pump.updateDate).slice(0, 16).replace('T', ' ') }}
                    </template>
                  </span>
                </template>
                <template v-else>
                  <i class="el-icon-info wm-doc-pump__warn"></i>
                  <span class="wm-doc-pump__sum">本井还没有保存过泵注程序</span>
                </template>

                <span class="wm-doc-pump__ops">
                  <el-button
                    v-if="pumpHasData"
                    type="text"
                    size="mini"
                    @click="showPumpTable = !showPumpTable"
                  >
                    <i :class="showPumpTable ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
                    {{ showPumpTable ? '收起明细' : '预览明细' }}
                  </el-button>
                  <el-button
                    v-if="pumpHasData"
                    type="text"
                    size="mini"
                    icon="el-icon-download"
                    @click="$emit('export-pump')"
                  >下载 Excel（分 sheet）</el-button>
                  <el-button
                    type="text"
                    size="mini"
                    icon="el-icon-refresh"
                    :loading="pumpLoading"
                    @click="$emit('load-pump', true)"
                  >刷新</el-button>
                </span>
              </div>

              <!-- 没有保存过：给出去泵注功能页的入口（上传只能在那里做） -->
              <div v-if="!pumpLoading && !pumpHasData && !pumpError" class="wm-doc-pump__hint">
                <i class="el-icon-info"></i> {{ pumpEmptyHint }}
                <el-button
                  type="text"
                  size="mini"
                  @click="$emit('module-action', 'go-pump')"
                >进入泵注程序</el-button>
              </div>

              <!-- 段签：每段一个标签，点选后下方只看该段，避免几十行堆在一起 -->
              <div v-if="pumpHasData" class="wm-doc-pump__tabs">
                <span
                  v-for="(s, si) in pump.stages"
                  :key="si"
                  class="wm-doc-pump__tab"
                  :class="{
                    'is-active': si === pumpActiveIdx,
                    'is-empty': pumpDetailOf(s).length === 0
                  }"
                  @click="pumpActiveIdx = si"
                >
                  第{{ s.stageNo }}段
                  <em v-if="s.plugDepth != null">桥塞 {{ fmtDepth(s.plugDepth) }}m</em>
                  <em v-if="s.refStageNo != null">引用第{{ s.refStageNo }}段</em>
                  <em class="wm-doc-pump__tab-rows">{{ pumpDetailOf(s).length }} 行</em>
                </span>
              </div>

              <div v-show="showPumpTable && pumpHasData" class="wm-doc-pump__wrap">
                <div v-if="pumpActiveStage" :key="pumpActiveIdx" class="wm-doc-pump__stage">
                  <div class="wm-doc-pump__cap">
                    <i class="el-icon-s-grid"></i>
                    第 {{ pumpActiveStage.stageNo }} 段
                    <template v-if="pumpActiveStage.plugDepth != null">
                      （桥塞位置{{ fmtDepth(pumpActiveStage.plugDepth) }}m）
                    </template>
                    <span class="wm-doc-pump__cap-meta">
                      <template v-if="pumpActiveStage.startDepth != null && pumpActiveStage.endDepth != null">
                        井段 {{ fmtDepth(pumpActiveStage.startDepth) }} ~ {{ fmtDepth(pumpActiveStage.endDepth) }} m ·
                      </template>
                      {{ pumpActiveRows.length }} 行明细
                    </span>
                  </div>

                  <!-- 引用段 / 未填段：说清楚为什么是空的，别让用户以为是加载失败 -->
                  <div v-if="!pumpActiveRows.length" class="wm-doc-pump__empty">
                    <i class="el-icon-warning-outline"></i>
                    <template v-if="pumpActiveStage.refStageNo != null">
                      本段引用第 {{ pumpActiveStage.refStageNo }} 段泵注程序，没有独立明细。
                    </template>
                    <template v-else>
                      本段没有保存明细数据，请在泵注程序功能页补充后保存。
                    </template>
                  </div>

                  <div v-else class="wm-doc-pump__scroll">
                    <table class="wm-doc-pump__table">
                      <thead>
                        <tr>
                          <th v-for="(h, hi) in pumpHeaders" :key="hi">{{ h }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="r in pumpActiveRows" :key="r.seq">
                          <td class="is-num">{{ r.seq }}</td>
                          <td>{{ r.name || '-' }}</td>
                          <td class="is-num">{{ fmtNum(r.fluid) }}</td>
                          <td class="is-num">{{ fmtNum(r.ratio) }}</td>
                          <td class="is-num">{{ fmtNum(r.rate) }}</td>
                          <td class="is-num">{{ fmtNum(r.liquidVol) }}</td>
                          <td class="is-num">{{ fmtNum(r.minutes) }}</td>
                          <td>{{ r.note || '-' }}</td>
                          <td>{{ r.proppant || '-' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div v-if="pumpHasData" class="wm-doc-pump__foot">
                <i class="el-icon-document"></i>
                数据取自泵注程序功能页保存的版本（v{{ pump.versionNo }}），
                与报告里「{{ inp.targetSection }}」一章同源；下载为一段一个工作表。
              </div>
            </div>

            <!-- 复用来源：已收集的材料会在下游功能页自动带入，无需重复上传 -->
            <div v-if="filesOf(inp).length && inp.variant !== 'DOC_PUMP'" class="wm-input-row__reuse">
              <i class="el-icon-refresh-right"></i>
              <span>已收集 {{ filesOf(inp).length }} 份，进入射孔方案 / 压裂智能体时自动带入</span>
            </div>
          </div>

          <div v-if="!inp.variant" class="wm-input-row__op">
            <el-upload
              :action="''"
              :show-file-list="false"
              :accept="inp.accept"
              :before-upload="(f) => beforeUpload(f, inp)"
              :http-request="(o) => doUpload(o, inp)"
              multiple
            >
              <el-button size="mini" :type="filesOf(inp).length ? 'default' : 'primary'" plain>
                <i class="el-icon-upload2"></i> {{ filesOf(inp).length ? '补传' : '上传' }}
              </el-button>
            </el-upload>
          </div>

          <!--
            已上传文件列表。
            ⚠️ DOC_PUMP 要排除：泵注程序的数据源已改为泵注功能页保存的结构化表，
               历史遗留的「结果表 xlsx」附件与页面内容无关，留着会让用户以为是新数据源。
          -->
          <div v-if="filesOf(inp).length && inp.variant !== 'DOC_PUMP'" class="wm-files">
            <div v-for="f in filesOf(inp)" :key="f.id" class="wm-file">
              <i :class="fileIcon(f.fileName)"></i>
              <span class="wm-file__name" :title="f.fileName">{{ f.fileName }}</span>
              <span class="wm-file__size">{{ fmtSize(f.fileSize) }}</span>
              <span class="wm-file__time">{{ f.uploadTime || '' }}</span>
              <el-button type="text" size="mini" @click="$emit('preview', f)">预览</el-button>
              <el-button type="text" size="mini" @click="$emit('download', f)">下载</el-button>
              <el-button type="text" size="mini" class="wm-danger" @click="$emit('remove', f)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script>
import { PRETEST_VARIANTS, PRETEST_COLUMNS, PRETEST_DEFAULT, fmtCell } from '../preTestVariants'

export default {
  name: 'WellModuleCard',
  props: {
    module: { type: Object, required: true },
    /** 该模块已收集的附件（含 attachmentType 字段） */
    files: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    /**
     * 模块外部已满足的必需项数量。
     * 基础资料模块的地质设计文档存在文档中心（COMM_WB_WELL_DOC），不在附件表，
     * 由父组件统计后通过这两个 prop 传入，否则进度会永远差 1 项。
     */
    extraReady: { type: Number, default: 0 },
    extraRequired: { type: Number, default: 0 },
    /**
     * 档位选择结果 { PRETEST: '12方' }。
     *
     * 用 prop 回传而不是组件内部 state：选择结果要落 localStorage（按井隔离），
     * 由父组件统一读写，组件保持无状态，便于「智能体页改档位 → 回到工作台」双向同步。
     */
    variants: { type: Object, default: () => ({}) },
    /**
     * 泵注程序数据（variant === 'DOC_PUMP' 时使用）。
     *
     * 数据在父组件取（父组件知道 wbWellId，且下载也在父组件做），
     * 这里只负责渲染，保持卡片无状态。
     *
     * 结构 = 后端 PumpTableRecord：
     * { tableId, wellName, versionNo, updateDate, stages: [
     *     { stageNo, refStageNo, plugDepth, startDepth, endDepth,
     *       rows: [{ rowNo, stageName, stageGroup, fluid, ratio, rate,
     *                liquidVol, minutes, note, proppant }] } ] }
     *
     * ⚠️ rows[0] 可能是表头占位行（stageName="阶段"），渲染前必须用
     *    pumpDetailOf() 剔除，否则表里会多出一行列名。
     * ⚠️ 没有保存过时后端返回 data=null，不是空对象。
     */
    pumpPreview: { type: Object, default: null },
    pumpLoading: { type: Boolean, default: false },
    /** 读取失败时的说明文案 */
    pumpError: { type: String, default: '' }
  },
  data() {
    return {
      /** 内置模板档位数据（12方 / 15方），与后端 spec 同源 */
      variantList: PRETEST_VARIANTS,
      columns: PRETEST_COLUMNS,
      /** 是否展开表格预览 */
      showTable: false,
      /** 泵注明细是否展开 */
      // 默认展开：本模块的唯一用途就是「看泵注表」，收起反而多一次点击
      showPumpTable: true,
      /** 当前查看的段下标（段表动辄 20+ 行，一次只渲染一段才不会把卡片拉爆） */
      pumpActiveIdx: 0
    }
  },
  computed: {
    /** 泵注表数据（prop 别名）—— 结构见后端 PumpTableRecord */
    pump() {
      return this.pumpPreview
    },
    /** 本井是否已有保存过的泵注表 */
    pumpHasData() {
      return !!(this.pump && this.pump.stages && this.pump.stages.length)
    },
    /** 明细表头（与后端 PumpTableExcelService 的输出列一致） */
    pumpHeaders() {
      return ['序号', '阶段', '净液量(m³)', '砂比(%)', '排量(m³/min)', '砂液量(m³)', '时间(min)', '液体类型', '支撑剂']
    },
    /** 所有段的真实明细行数合计（已剔除表头占位行） */
    pumpTotalRows() {
      if (!this.pumpHasData) return 0
      return this.pump.stages.reduce((n, s) => n + this.pumpDetailOf(s).length, 0)
    },
    /** 有明细的段数（区别于总段数：引用段/未填段的明细是空的） */
    pumpFilledStages() {
      if (!this.pumpHasData) return 0
      return this.pump.stages.filter(s => this.pumpDetailOf(s).length > 0).length
    },
    /** 当前选中段 */
    pumpActiveStage() {
      if (!this.pumpHasData) return null
      const i = Math.min(this.pumpActiveIdx, this.pump.stages.length - 1)
      return this.pump.stages[i] || null
    },
    /** 当前段的明细行（已剔除表头占位行） */
    pumpActiveRows() {
      const s = this.pumpActiveStage
      if (!s) return []
      const out = []
      this.pumpDetailOf(s).forEach((r, i) => {
        out.push({
          seq: i + 1,
          name: r.stageName || '',
          fluid: r.fluid,
          ratio: r.ratio,
          rate: r.rate,
          liquidVol: r.liquidVol,
          minutes: r.minutes,
          note: r.note || '',
          proppant: r.proppant || ''
        })
      })
      return out
    },
    /** 没有保存过泵注表时给用户的说明 */
    pumpEmptyHint() {
      if (this.pumpError) return ''
      if (this.pumpHasData) return ''
      return '本井还没有保存过泵注程序。请点「进入泵注程序」，在功能页上传 Excel 或逐格填写后保存，回到这里即可查看和下载。'
    },
    /**
     * 该模块里「不需要上传材料、系统自动生成」的章节。
     *
     * 数据源是 wellModules.js 的 autoSections。模板里不直接读 module.autoSections，
     * 是因为老模块可能没声明该字段（undefined），直接 v-for 会报错。
     */
    autoSections() {
      return (this.module && this.module.autoSections) || []
    },
    /** 兼容模板里 `v-for="v in variants"` 的写法，同时避免与同名 prop 冲突 */
    variantOptions() {
      return this.variantList
    },
    totalRequired() {
      const docCenter = this.module.docCenterRequired ? 1 : 0
      return (this.module.inputs || []).filter(i => i.required).length + docCenter + this.extraRequired
    },
    readyCount() {
      const inner = (this.module.inputs || []).filter(inp => {
        if (!inp.required) return false
        return this.filesOf(inp).length > 0
      }).length
      const docCenter = this.module.docCenterRequired && this.extraReady > 0 ? 1 : 0
      return inner + docCenter + Math.min(this.extraReady, this.extraRequired)
    },
    /** 当前档位对应的模板数据（用于摘要与预览表格） */
    currentVariant() {
      // 只有 PRETEST 变体才有「档位」概念；DOC_PUMP 走 pump 数据，
      // 这里返回 null 以免模板里 v-if="currentVariant" 误渲染 PRETEST 的摘要。
      if (!this.variants || !this.variants.PRETEST) {
        const hasPre = (this.module.inputs || []).some(i => i.variant === 'PRETEST')
        if (!hasPre) return null
      }
      const key = this.variants.PRETEST || PRETEST_DEFAULT
      return this.variantList.find(v => v.key === key) || this.variantList[0] || null
    },
    /**
     * 模块动作按钮是否可点。
     *
     * 判据：必需项是否收齐（readyCount === totalRequired），并可被 module.action.needAll=false 放开。
     * 例外：模块声明了 action.optional（如分段射孔方案的伽马曲线是选填），不影响必需项计数本身。
     */
    actionEnabled() {
      if (!this.module.action) return false
      if (this.module.action.needAll === false) return true
      return this.totalRequired > 0 && this.readyCount >= this.totalRequired
    },
    /** 悬停提示：告诉用户还缺什么，而不是只说「不可用」 */
    actionDisabledTip() {
      if (this.actionEnabled) return ''
      const missing = (this.module.inputs || [])
        .filter(inp => inp.required && !this.filesOf(inp).length)
        .map(inp => inp.label)
      if (!missing.length) {
        return this.module.action.tip || '数据未收齐，暂不能进入'
      }
      return `还差 ${missing.length} 项必需材料：${missing.join('、')}`
    }
  },
  methods: {
    /** 取某个输入项当前的档位值 */
    variantOf(inp) {
      return this.variants[inp.variant] || PRETEST_DEFAULT
    },
    /** 勾选档位：交给父组件保存（父组件负责落 localStorage） */
    onPickVariant(inp, val) {
      this.$emit('pick-variant', { type: inp.variant, value: val })
    },
    /** 表格单元格格式化：空值显示 - */
    fmt(v) {
      return fmtCell(v)
    },
    /** 桥塞位置：整数去掉 .0，半米保留一位小数 */
    fmtDepth(v) {
      const n = Number(v)
      if (!isFinite(n)) return ''
      return Number.isInteger(n) ? String(n) : n.toFixed(1)
    },

    /**
     * 取某段的真实明细行，剔除表头占位行。
     *
     * <p>⚠️ 库里 {@code rows[0]} 常常是 {@code stageName="阶段" / note="备注" /
     * proppant="支撑剂"} 这一行列名——它是前端表格表头落到数据里的产物。
     * 而且它的 liquidVol/minutes 实测是 <b>0.0 而不是 null</b>，
     * 所以判据必须用「关键数值全为 0 或空」，不能只判 null。</p>
     */
    pumpDetailOf(stage) {
      if (!stage || !stage.rows) return []
      const HEADER_WORDS = ['阶段', '序号', '液体', '液体类型']
      const zero = v => v === null || v === undefined || Math.abs(Number(v)) < 1e-9
      return stage.rows.filter(r => {
        if (!r) return false
        const name = String(r.stageName || '').trim()
        if (HEADER_WORDS.indexOf(name) < 0) return true
        // 命中列名 → 再确认它没有任何施工量，才判定为表头行
        return !(zero(r.fluid) && zero(r.ratio) && zero(r.rate)
          && zero(r.liquidVol) && zero(r.minutes))
      })
    },

    /** 明细数值格式化：null/空显示 -，整数去 .0 */
    fmtNum(v) {
      if (v === null || v === undefined || v === '') return '-'
      const n = Number(v)
      if (!isFinite(n)) return String(v)
      if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
      return String(Math.round(n * 100) / 100)
    },
    filesOf(inp) {
      const key = String(inp.key || '').toUpperCase()
      return (this.files || []).filter(f => String(f.attachmentType || '').toUpperCase() === key)
    },
    beforeUpload(file, inp) {
      const name = file.name || ''
      const dot = name.lastIndexOf('.')
      const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
      const accept = (inp.accept || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      if (accept.length && !accept.includes(ext)) {
        this.$message.error(`「${inp.label}」只接受 ${accept.join(' / ')} 格式，当前文件为 ${ext || '未知格式'}`)
        return false
      }
      const maxMB = 100
      if (file.size > maxMB * 1024 * 1024) {
        this.$message.error(`文件超过 ${maxMB}MB 上限`)
        return false
      }
      return true
    },
    doUpload(option, inp) {
      this.$emit('upload', { file: option.file, input: inp })
    },
    fmtSize(n) {
      const v = Number(n) || 0
      if (v < 1024) return v + ' B'
      if (v < 1024 * 1024) return (v / 1024).toFixed(1) + ' KB'
      return (v / 1024 / 1024).toFixed(1) + ' MB'
    },
    fileIcon(name) {
      const n = String(name || '').toLowerCase()
      if (/\.(docx?|wps)$/.test(n)) return 'el-icon-document'
      if (/\.(xlsx?|csv)$/.test(n)) return 'el-icon-s-grid'
      if (/\.pdf$/.test(n)) return 'el-icon-tickets'
      if (/\.(png|jpe?g|bmp|gif|webp)$/.test(n)) return 'el-icon-picture-outline'
      return 'el-icon-files'
    }
  }
}
</script>

<style lang="scss" scoped>
.wm-card {
  margin-bottom: 14px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;

  &--ready {
    border-color: #b3e19d;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 2px;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #303133;

    i {
      color: #409eff;
      font-size: 16px;
    }
  }

  &__name {
    font-size: 14px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  }

  /* tooltip 包裹用的 span：disabled 的 button 不触发鼠标事件，
     必须靠外层 span 才能正确显示「还差哪几项」的提示 */
  &__action-slot {
    display: inline-flex;
  }

  &__body {
    padding-top: 4px;
  }
}

.wm-purpose {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  background: #f4f8ff;
  border-left: 3px solid #409eff;
  border-radius: 3px;
  font-size: 12px;
  line-height: 1.65;
  color: #5a6b83;

  i {
    color: #409eff;
    margin-top: 2px;
  }
}

.wm-sections {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 4px;

  &__label {
    font-size: 12px;
    color: #909399;
  }

  &__tag {
    font-weight: 400;
  }

  /* 自动生成章节行：灰字 + 分隔符，与上面需要材料的标签形成层级差 */
  &--auto {
    margin-top: -2px;
    margin-bottom: 6px;
    gap: 0;

    .wm-sections__label {
      color: #b1b6bd;

      i {
        margin-right: 2px;
      }
    }
  }

  &__auto-item {
    font-size: 12px;
    line-height: 1.7;
    color: #a8abb2;

    /* 用中点分隔，比再套一层 el-tag 更轻，避免和支撑章节抢视觉 */
    &::after {
      content: '·';
      margin: 0 5px;
      color: #dcdfe6;
    }

    &:last-child::after {
      content: '';
      margin: 0;
    }
  }
}

.wm-inputs {
  margin-top: 6px;
}

.wm-input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    'main op'
    'files files';
  gap: 6px 12px;
  padding: 10px 0;
  border-top: 1px dashed #ebeef5;

  &:first-child {
    border-top: none;
  }

  &__main {
    grid-area: main;
    min-width: 0;
  }

  &__op {
    grid-area: op;
    align-self: start;
    white-space: nowrap;

    /* vue-loader15 只认 ::v-deep；/deep/ 会被 Sass 当选择器解析并报
       "SassError: expected selector" */
    ::v-deep .el-button {
      padding-left: 10px;
      padding-right: 10px;
    }
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__label {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
  }

  &__count {
    font-size: 12px;
    color: #67c23a;
  }

  &__desc {
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.6;
    color: #606266;
  }

  &__note {
    margin-top: 2px;
    font-size: 12px;
    line-height: 1.6;
    color: #e6a23c;

    i {
      margin-right: 2px;
    }
  }

  /* 复用来源提示：材料已在工作台收过，下游页面自动带入 */
  &__reuse {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    margin-top: 4px;
    padding: 3px 8px;
    border-radius: 4px;
    background: #f0f9eb;
    font-size: 12px;
    line-height: 1.6;
    color: #529b2e;
    white-space: normal;
    word-break: break-word;

    i {
      font-size: 12px;
      line-height: 1.6;
      flex: 0 0 auto;
    }

    span {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
}

/* 文档中心管理的材料行：视觉上与附件上传行区分，提示入口在别处 */
.wm-input-row--doc {
  background: #fafcff;

  .wm-input-row__reuse {
    background: #ecf5ff;
    color: #409eff;
  }
}

/* 内置模板档位行：没有上传按钮，内容独占整行 */
.wm-input-row--variant {
  grid-template-columns: 1fr;
  grid-template-areas:
    'main'
    'files';
}

/* ---------- 内置模板：档位勾选 + 表格预览 ---------- */
.wm-variant {
  margin-top: 8px;
  padding: 8px 10px;
  background: #fffbf2;
  border: 1px solid #f7e3ba;
  border-radius: 5px;

  &__pick {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__tips {
    font-size: 12px;
    color: #a08a63;
    flex: 0 0 auto;
  }

  &__sec {
    font-size: 12px;
    color: #8a6d3b;
    padding: 0;

    i {
      margin-right: 2px;
    }
  }
}

.wm-preview {
  margin-top: 8px;

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__sum {
    font-size: 12px;
    line-height: 1.7;
    color: #8a6d3b;
    white-space: normal;
    word-break: break-word;

    b {
      color: #d48806;
      font-weight: 600;
    }
  }

  /* 表格可能很宽（7 列），横向滚动而不是把卡片撑破 */
  &__wrap {
    margin-top: 6px;
    border: 1px solid #f0e2c8;
    border-radius: 4px;
    background: #fff;
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    color: #5a4a2c;

    th,
    td {
      padding: 4px 6px;
      border-bottom: 1px solid #f5eddf;
      border-right: 1px solid #f5eddf;
      white-space: nowrap;

      &:last-child {
        border-right: none;
      }
    }

    th {
      background: #fdf6e8;
      color: #8a6d3b;
      font-weight: 600;
      text-align: center;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    tbody tr:hover td {
      background: #fffdf7;
    }
  }

  /* 合计行：与正文字体区分，加粗并去掉 hover 干扰 */
  &__total td {
    background: #fdf6e8 !important;
    font-weight: 600;
    color: #8a6d3b;
  }

  &__foot {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 6px 8px;
    background: #fffdf7;
    border-top: 1px solid #f0e2c8;
    font-size: 12px;
    line-height: 1.6;
    color: #a08a63;
    white-space: normal;
    word-break: break-word;

    i {
      flex: 0 0 auto;
      line-height: 1.6;
    }
  }
}

/* ---------- 泵注程序：读生成文档 + 按段预览 ---------- */
.wm-doc-pump {
  margin-top: 8px;
  padding: 8px 10px;
  background: #f6f9ff;
  border: 1px solid #d6e4ff;
  border-radius: 5px;

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12px;
    line-height: 1.7;
    color: #5a6b83;
  }

  &__sum {
    white-space: normal;
    word-break: break-word;

    b {
      color: #3D5FEF;
      font-weight: 600;
    }
  }

  /* 文件名可能很长（带时间戳/版本号），限宽 + 省略，完整名放 title */
  &__src {
    display: inline-block;
    max-width: 240px;
    vertical-align: bottom;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__ops {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;
  }

  &__warn {
    color: #e6a23c;
    margin-right: 4px;
  }

  &__err {
    color: #d48806;
  }

  &__hint {
    margin-top: 6px;
    padding: 6px 8px;
    background: #fffbf2;
    border: 1px solid #f7e3ba;
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.65;
    color: #a08a63;
    white-space: normal;
    word-break: break-word;

    i {
      margin-right: 3px;
    }
  }

  /* 段签：一段一个，点选切换。比下拉更好扫——能一眼看出有几段、桥塞在哪 */
  &__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  &__tab {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 3px 9px;
    border: 1px solid #d6e4ff;
    border-radius: 12px;
    background: #fff;
    font-size: 12px;
    color: #5a6b83;
    cursor: pointer;
    user-select: none;
    transition: all 0.15s;

    em {
      font-style: normal;
      font-size: 11px;
      color: #a3b1c6;
    }

    &:hover {
      border-color: #3D5FEF;
      color: #3D5FEF;
    }

    &.is-active {
      background: #3D5FEF;
      border-color: #3D5FEF;
      color: #fff;

      em {
        color: rgba(255, 255, 255, 0.78);
      }
    }

    /*
     * 无明细的段（引用段 / 只在泵注页填了桥塞深度）：
     * 用虚线边框区分，避免用户以为「这段点不开是坏了」。
     */
    &.is-empty {
      border-style: dashed;
      background: #fbfcfe;
      color: #9aa9bd;

      em {
        color: #b8c4d4;
      }

      &.is-active {
        background: #6b8ce0;
        border-color: #6b8ce0;
        border-style: solid;
        color: #fff;

        em {
          color: rgba(255, 255, 255, 0.78);
        }
      }
    }
  }

  /* 引用段 / 未保存明细时的空态说明 */
  &__empty {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    padding: 14px 12px;
    font-size: 12px;
    line-height: 1.7;
    color: #a08a63;
    background: #fffbf2;
    white-space: normal;
    word-break: break-word;

    i {
      flex: 0 0 auto;
      line-height: 1.7;
      color: #e6a23c;
    }
  }

  &__wrap {
    margin-top: 8px;
  }

  &__stage {
    border: 1px solid #d6e4ff;
    border-radius: 4px;
    background: #fff;
    overflow: hidden;
  }

  &__cap {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 8px;
    background: #eef4ff;
    font-size: 12px;
    font-weight: 600;
    color: #33475f;

    i {
      color: #3D5FEF;
    }
  }

  &__cap-meta {
    font-weight: 400;
    color: #8fa1b8;
  }

  /* 12 列的表在窄屏必然溢出，横向滚动而不是把卡片撑破 */
  &__scroll {
    max-height: 300px;
    overflow: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    color: #33475f;
    white-space: nowrap;

    th,
    td {
      padding: 4px 8px;
      border-bottom: 1px solid #eef2f8;
      border-right: 1px solid #eef2f8;
      text-align: center;

      &:last-child {
        border-right: none;
      }
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f6f9ff;
      color: #5a6b83;
      font-weight: 600;
    }

    /* 数字列等宽右对齐，便于竖着比对液量/排量 */
    td.is-num {
      font-variant-numeric: tabular-nums;
      color: #33475f;
    }

    tbody tr:hover td {
      background: #f9fbff;
    }
  }

  &__foot {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.6;
    color: #8fa1b8;
    white-space: normal;
    word-break: break-word;

    i {
      flex: 0 0 auto;
      line-height: 1.6;
    }
  }
}

.wm-files {
  grid-area: files;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}

.wm-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 3px;
  font-size: 12px;
  color: #606266;

  i {
    color: #909399;
  }

  &__name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #303133;
  }

  &__size,
  &__time {
    flex: 0 0 auto;
    color: #909399;
  }
}

.wm-danger {
  color: #f56c6c;
}
</style>
