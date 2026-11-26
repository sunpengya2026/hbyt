<template>
  <div class="well-workbench">
    <!-- 面包屑 -->
    <div class="ww-breadcrumb">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ name: 'Workbench' }">工作台</el-breadcrumb-item>
        <el-breadcrumb-item>{{ wellName || '单井工作台' }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 井信息头 -->
    <div class="ww-hero" style="width:100%;box-sizing:border-box;display:flex;flex-direction:row;flex-wrap:nowrap;align-items:center;justify-content:space-between;">
      <div class="ww-hero__left" style="flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:14px;overflow:hidden;">
        <div class="ww-hero__icon"><i class="el-icon-s-data"></i></div>
        <div class="ww-hero__info">
          <div class="ww-hero__name">
            {{ wellName || '未命名井' }}
            <el-tag v-if="offline" type="warning" size="mini" effect="plain">未关联井库</el-tag>
          </div>
          <div class="ww-hero__meta">
            <span>井号 ID：{{ wellId || '-' }}</span>
            <span v-if="wbBlockName">区块：{{ wbBlockName }}</span>
            <span v-if="wbPerforationMethod">射孔方式：{{ wbPerforationMethod }}</span>
            <span v-if="detail.wellType">井型：{{ detail.wellType }}</span>
            <span v-if="detail.status">状态：{{ detail.status }}</span>
          </div>
        </div>
      </div>
      <div class="ww-hero__actions" style="flex:0 0 auto;margin-left:auto;display:flex;align-items:center;gap:8px;flex-wrap:nowrap;white-space:nowrap;">
        <!--
          头部只保留三个出口：返回 / 智能提取 / 压裂智能体。
          「刷新数据」与「进入射孔方案」已移除：
          - 刷新：卡片各自带刷新按钮，全局刷新在材料上传后由 loadAttachments 自动触发；
          - 射孔方案：「分段射孔方案」卡片右上角已有「进入射孔方案」按钮，
            材料收齐才亮，比放在页头更贴合使用时机。
          「进入智能提取」= 免上传一步直达：本井地质设计自动带入 → 严格提取 → 编辑器展示原文；
          「进入压裂智能体」= 保留智能体原样式（步骤条 + 对话 + 手动执行）。
        -->
        <el-button size="small" icon="el-icon-arrow-left" @click="goBackToTree">返回对象树</el-button>
        <el-button
          size="small"
          type="primary"
          icon="el-icon-magic-stick"
          :loading="extracting"
          :disabled="!wbWellId"
          @click="goExtract()"
        >进入智能提取</el-button>
        <el-button size="small" type="success" icon="el-icon-cpu" @click="goAgent">进入压裂智能体</el-button>
      </div>
    </div>

    <!-- 生成进度 / 就绪总览 -->
    <div class="ww-progress-bar">
      <div class="ww-progress-bar__left">
        <span class="ww-progress-bar__label">材料收集进度</span>
        <el-progress
          :percentage="overallPercent"
          :status="overallPercent === 100 ? 'success' : undefined"
          :stroke-width="10"
          style="width: 220px"
        />
        <span class="ww-progress-bar__detail">
          必需材料 {{ readyCount }}/{{ requiredCount }}
          <template v-if="missingList.length">
            · 缺：{{ missingList.slice(0, 3).join('、') }}<template v-if="missingList.length > 3">等 {{ missingList.length }} 项</template>
          </template>
        </span>
      </div>
      <div class="ww-progress-bar__right">
        <el-tooltip content="所有必需材料齐备后才建议生成，否则对应章节会是占位内容" placement="top">
          <span class="ww-progress-bar__hint"><i class="el-icon-question"></i></span>
        </el-tooltip>
        <!--
          「一键从知识库提取」（2026-11-05）。
          原「生成压裂工程设计」按钮已删除 —— 生成入口统一收到右侧「进入压裂智能体」，
          页头不再重复放一个语义相近的按钮，避免用户分不清该点哪个。

          这里的按钮只做一件事：按「文档名称（井号）+ 文档类型」模糊匹配，
          把知识库里属于本井的材料自动落到下面各模块的对应槽位。
        -->
        <el-button
          size="small"
          type="primary"
          icon="el-icon-magic-stick"
          :loading="kbMatching"
          :disabled="!wbWellId || !wellName"
          @click="openKbExtract"
        >
          一键从知识库提取
        </el-button>
        <el-button size="small" icon="el-icon-setting" @click="rulesVisible = true">
          生成规则
        </el-button>
      </div>
    </div>

    <!-- 模块导航 -->
    <div class="ww-modnav">
      <div
        v-for="m in modules"
        :key="m.key"
        class="ww-modnav__item"
        :class="{ 'is-ready': moduleStatus[m.key] && moduleStatus[m.key].ready }"
        @click="scrollToModule(m.key)"
      >
        <i :class="m.icon"></i>
        <span class="ww-modnav__name">{{ m.title }}</span>
        <!--
          泵注程序的徽标换成「段」口径（2026-11-15）：
          原来的「材料齐备 6/6」在泵注这一格没有意义 —— 泵注表的数值全是公式派生的，
          用户真正想知道的是「这口井要写几段 / 已经明确几段 / 已有几段数据」。
            ① 设计段数：地质设计「压裂点参数表」按「分段」列去重
            ② 已明确：分段射孔方案里已经定下来的段数（封隔器位置那套表）
            ③ 已有数据：已保存的泵注程序里有内容的段数
          取不到时如实显示「-」，不伪装成 0。
        -->
        <span v-if="m.key === 'pump'" class="ww-modnav__badge ww-modnav__badge--stage">
          <!--
            用 slot 而不是 :content —— content 是纯文本，里面的 \n 不会被当换行，
            三条说明会挤成一长串横贯整屏。slot 里渲染 div + white-space: pre-line 才分行。
          -->
          <el-tooltip placement="bottom">
            <div slot="content" class="ww-stage-tip" v-html="pumpStageTipHtml"></div>
            <span class="ww-modnav__stage-mask"></span>
          </el-tooltip>
          <span class="ww-modnav__stage-text">{{ pumpStageBadge }}</span>
        </span>
        <span v-else class="ww-modnav__badge">
          {{ moduleStatus[m.key] ? moduleStatus[m.key].got : 0 }}/{{ moduleStatus[m.key] ? moduleStatus[m.key].need : 0 }}
        </span>
      </div>
    </div>

    <!--
      泵注段数的逐段明细（2026-11-15）。
      徽标只给三个总数，用户看不出「差的那几段是哪几段」——比如设计 9 段、
      射孔方案只定了 8 段，到底是哪一段没定？所以把逐段状态摊开放在导航下面一行。
      数据全都来自已加载的三个来源（不额外发请求），没数据时整行不渲染。
    -->
    <div v-if="pumpStageRows.length" class="ww-stage-strip">
      <span class="ww-stage-strip__label">
        <i class="el-icon-s-grid"></i>
        泵注分段明细
      </span>
      <div class="ww-stage-strip__list">
        <span
          v-for="s in pumpStageRows"
          :key="s.stageNo"
          class="ww-stage-chip"
          :class="{
            'is-design': s.designed,
            'is-known': s.known,
            'is-data': s.hasData
          }"
          :title="s.tip"
        >
          第 {{ s.stageNo }} 段
          <em v-if="s.hasData">✓</em>
        </span>
      </div>
      <span class="ww-stage-strip__legend">
        灰=仅设计 · 蓝=已明确 · 绿=已有数据
      </span>
    </div>

    <!-- 材料收集区：按功能模块划分，每个模块对应文档的一组章节 -->
    <div
      v-for="m in modules"
      :id="'wm-' + m.key"
      :key="m.key"
      class="ww-module-anchor"
    >
      <well-module-card
        :module="m"
        :files="moduleFiles(m)"
        :loading="moduleLoading(m)"
        :extra-ready="m.key === 'base' ? (docGeoCount > 0 ? 1 : 0) : 0"
        :variants="variantPicks"
        :pump-preview="pumpPreview"
        :pump-loading="pumpLoading"
        :pump-error="pumpError"
        @upload="handleModuleUpload"
        @remove="handleModuleRemove"
        @preview="previewAtt"
        @download="downloadAtt"
        @refresh="loadAttachments"
        @go-doc-center="scrollToDocCenter"
        @pick-variant="handlePickVariant"
        @jump-section="scrollToSection"
        @module-action="handleModuleAction"
        @load-pump="loadPumpPreview"
        @export-pump="exportPumpProgram"
      />
    </div>

    <!-- 模块 7：输出与归档 -->
    <el-card id="ww-out-archive" class="ww-card ww-card--full" shadow="never">
      <div slot="header" class="ww-card__header">
        <span><i class="el-icon-folder-opened"></i> 输出与归档</span>
      </div>
      <div class="ww-card__body">
        <div class="ww-out-grid">
          <div class="ww-out-item">
            <div class="ww-out-item__head">
              <i class="el-icon-medal"></i>
              <span>设计模板（含批注提示词）</span>
            </div>
            <div class="ww-out-item__desc">
              三套模板对应三种射孔方式（全程固井 / 半程固井 / 滑套压裂），章节结构一致、制式内容不同。
            </div>
            <div class="ww-out-item__actions">
              <el-button size="mini" icon="el-icon-view" @click="goTemplates">查看模板</el-button>
              <el-button size="mini" icon="el-icon-upload2" @click="handleTemplateUpload">上传新模板</el-button>
            </div>
          </div>

          <div id="ww-doc-center" class="ww-out-item">
            <div class="ww-out-item__head">
              <i class="el-icon-tickets"></i>
              <span>生成的工程设计文档</span>
            </div>
            <div class="ww-out-item__desc">
              生成结果自动存入文档中心（类型：系统生成文档），与源文档分开归档，避免污染检索。
            </div>
            <div class="ww-out-item__actions">
              <el-button size="mini" icon="el-icon-refresh" @click="$refs.docPanel && $refs.docPanel.reload && $refs.docPanel.reload()">
                刷新列表
              </el-button>
            </div>
          </div>
        </div>

        <!-- 文档中心面板：源文档与生成结果 -->
        <well-document-panel
          ref="docPanel"
          class="ww-doc-panel"
          :wb-well-id="wbWellId"
          :well-name="wellName"
          :user-id="userId"
          @change="handleDocChange"
        />
      </div>
    </el-card>

    <!-- 生成规则说明弹窗（数据源 wellModules.js 的 GENERATION_RULES） -->
    <el-dialog
      title="压裂工程设计文档生成规则"
      :visible.sync="rulesVisible"
      width="720px"
      append-to-body
    >
      <el-table :data="generationRules" size="small" border>
        <el-table-column prop="label" label="规则项" width="130" align="center" />
        <el-table-column prop="value" label="规则内容" />
      </el-table>
      <div class="ww-rules-tip">
        <i class="el-icon-info"></i>
        以上规则在生成时由后端自动套用，无需逐份填写；数值类规则（簇底深 / 封隔器 / 桥塞）只对「分段射孔方案」生效。
      </div>
      <span slot="footer">
        <el-button size="small" @click="rulesVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <!--
      一键从知识库提取（2026-11-05）
      ────────────────────────────────────────────────────────────
      匹配口径：文档名称里的「井号」+ 材料类型关键词，两条都要对得上。
      结果按「落到哪个模块」分组展示，用户可以逐条取消勾选，
      确认后才会真正下载并登记到工作台（附件槽位 / 文档中心）。
    -->
    <el-dialog
      title="一键从知识库提取"
      :visible.sync="kbVisible"
      width="920px"
      top="5vh"
      append-to-body
      :close-on-click-modal="false"
      class="kb-extract-dialog"
    >
      <div v-loading="kbMatching" element-loading-text="正在读取知识库并匹配文档…">
        <!-- 匹配口径说明 -->
        <el-alert type="info" :closable="false" show-icon class="kb-extract__alert">
          <div slot="title" class="kb-extract__alert-title">
            匹配口径：文档名称 <b>含井号「{{ wellName }}」</b> + <b>材料类型关键词</b>
          </div>
          <div class="kb-extract__alert-desc">
            知识库：{{ kbDatasetName || '压裂知识库' }}
            ·  共扫描 {{ kbDocs.length }} 份文档
            ·  命中本井 {{ kbSelfCount }} 份
            <span v-if="kbNeighborCount"> ·  其他井（可作邻井参考）{{ kbNeighborCount }} 份</span>
            <el-checkbox
              v-model="kbShowAll"
              class="kb-extract__showall"
            >显示未匹配文档{{ kbHiddenCount ? '（' + kbHiddenCount + '）' : '' }}</el-checkbox>
          </div>
        </el-alert>

        <div v-if="kbError" class="kb-extract__error">
          <i class="el-icon-warning-outline"></i> {{ kbError }}
        </div>

        <el-empty
          v-else-if="!kbMatching && !kbRows.length"
          description="知识库里没有找到与本井相关的文档"
          :image-size="90"
        >
          <el-button size="small" @click="goKnowledge">去知识库上传</el-button>
        </el-empty>

        <!-- 结果按模块分组 -->
        <template v-else>
          <div v-for="g in kbGroups" :key="g.key" class="kb-extract__group">
            <div class="kb-extract__group-head">
              <i :class="g.icon"></i>
              <span class="kb-extract__group-name">{{ g.title }}</span>
              <el-tag size="mini" effect="plain" type="info">{{ g.rows.length }} 份</el-tag>
              <span class="kb-extract__group-desc">{{ g.purpose }}</span>
            </div>
            <el-table :data="g.rows" size="mini" border class="kb-extract__table">
              <el-table-column width="44" align="center">
                <template slot-scope="{ row }">
                  <el-checkbox v-model="row.picked" />
                </template>
              </el-table-column>
              <el-table-column prop="doc.name" label="知识库文档" min-width="240" show-overflow-tooltip>
                <template slot-scope="{ row }">
                  <i class="el-icon-document kb-extract__file-icon"></i>
                  <span>{{ row.doc.name }}</span>
                  <el-tag v-if="row.isSelf" size="mini" type="success" effect="plain" class="kb-extract__tag">本井</el-tag>
                  <el-tag v-else-if="row.hitWell" size="mini" type="warning" effect="plain" class="kb-extract__tag">{{ row.hitWell }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="落位槽位" width="180">
                <template slot-scope="{ row }">
                  <el-select
                    v-model="row.inputKey"
                    size="mini"
                    :disabled="row.moduleKey === 'base' && row.inputKey === '__DOC_CENTER__'"
                    @change="onKbRowInputChange(row, $event)"
                  >
                    <el-option
                      v-for="opt in kbSlotOptions(row)"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="label" label="识别类型" width="130" show-overflow-tooltip />
              <el-table-column prop="reason" label="匹配依据" min-width="200" show-overflow-tooltip />
              <el-table-column label="大小" width="80" align="center">
                <template slot-scope="{ row }">{{ fmtSize(row.doc.size) }}</template>
              </el-table-column>
            </el-table>
          </div>
        </template>

        <!-- 进度 -->
        <div v-if="kbImporting || kbProgress.total > 0" class="kb-extract__progress">
          <el-progress
            :percentage="kbProgressPercent"
            :status="kbProgressPercent === 100 ? 'success' : undefined"
            :stroke-width="12"
          />
          <span class="kb-extract__progress-text">{{ kbProgressText }}</span>
        </div>
      </div>

      <span slot="footer">
        <el-button size="small" @click="kbVisible = false" :disabled="kbImporting">关闭</el-button>
        <el-button size="small" icon="el-icon-refresh" :disabled="kbMatching || kbImporting" @click="scanKnowledgeBase">重新匹配</el-button>
        <el-button
          size="small"
          type="primary"
          icon="el-icon-download"
          :loading="kbImporting"
          :disabled="!kbPickedCount || kbImporting"
          @click="doKbImport"
        >
          提取并落位{{ kbPickedCount ? '（' + kbPickedCount + '）' : '' }}
        </el-button>
      </span>
    </el-dialog>

    <!-- 附件预览弹窗 -->
    <el-dialog
      :title="'预览：' + (previewRow ? previewRow.fileName : '')"
      :visible.sync="previewVisible"
      width="820px"
      top="4vh"
      append-to-body
      class="attachment-preview-dialog"
    >
      <div v-loading="previewLoading" :class="['att-preview-wrap', previewCategory === 'xlsx' ? 'att-preview-wrap--xlsx' : '']">
        <!-- 图片预览 -->
        <div v-if="previewCategory === 'image'" class="att-preview__image">
          <img :src="previewImageUrl" alt="图片预览" />
        </div>
        <!-- Word 预览 -->
        <div v-else-if="previewCategory === 'docx'" ref="docxPreviewBox" class="att-preview__docx"></div>
        <!-- Excel 预览：多 sheet 可切换 -->
        <excel-sheet-preview
          v-else-if="previewCategory === 'xlsx'"
          :workbook="previewExcelWb"
          max-height="70vh"
        />
        <!-- PDF 预览 -->
        <div v-else-if="previewCategory === 'pdf'" class="att-preview__pdf">
          <iframe :src="previewPdfUrl" frameborder="0" title="PDF 预览" />
        </div>
        <!-- TXT / CSV 预览 -->
        <div v-else-if="previewCategory === 'txt' || previewCategory === 'csv'" class="att-preview__text">
          <pre>{{ previewText }}</pre>
        </div>
        <!-- 旧版 .doc 无法预览 -->
        <div v-else-if="previewCategory === 'doc'" class="att-preview__unsupported">
          <i class="el-icon-warning-outline"></i>
          <p>旧版 .doc 格式暂不支持在线预览，请下载后查看，或另存为 .docx 再上传</p>
        </div>
        <!-- 不支持的格式 -->
        <div v-else-if="previewCategory === 'unsupported' || previewCategory === 'other'" class="att-preview__unsupported">
          <i class="el-icon-document"></i>
          <p>此格式暂不支持预览，请下载后查看</p>
        </div>
      </div>
    </el-dialog>
    </div>
</template>

<script>
/**
 * 单井工作台
 * 从工作台对象树中点击某个井号后进入，聚合展示该井的：
 *  井基础信息 / API 数据 / 邻井数据 / 技术标准
 *
 * 路由参数 wellId 若以 `local~` 开头，表示该井号尚未关联井库记录，
 * 此时只展示本地已有的信息，不请求后端接口。
 */
import {
  getWellDetail, getWellApiData, getNeighborData, getTechnicalStandards, getWbWellDetail,
  getAttachments, uploadAttachment, deleteAttachment, downloadAttachmentUrl,
  getObjectTree
} from '@/api/workbench'
// 知识库代理（后端 /v1/ragflow/*）。前端不直连 RagFlow，也不持有 api-key。
import {
  getRagWorkbenchDatasetApi, getRagDocumentsApi, downloadRagDocumentApi
} from '@/api/ragflow'
// 用命名空间引入而不是解构：`api/wellDoc` → `utils/request` → `router` → `layout`
// 这条链很长，而本页本身又是 router 的惰性 chunk，webpack4 下可能先执行本模块、
// 后执行 wellDoc 的导出赋值，此时解构拿到的会是 undefined，
// 调用时报「Object(...) is not a function」。改成运行时从命名空间取方法即可规避。
import * as wellDocApi from '@/api/wellDoc'
// ⚠️ 大文件跨路由传递走内存单例，不走 sessionStorage（4.7MB 文件转 base64 约 6.3MB，
//    超过 5MB 配额 → setItem 必抛 QuotaExceededError）
import { handoffExtractTask } from '@/utils/extractHandoff'
import WellDocumentPanel from './components/WellDocumentPanel'
import WellModuleCard from './components/WellModuleCard'
import ExcelSheetPreview from '@/components/shared/ExcelSheetPreview.vue'
import { MODULES, GENERATION_RULES } from './wellModules'
import { loadPreTestVariant, savePreTestVariant, getPreTestVariant } from './preTestVariants'
import { getCurrentPumpTable, pumpTableExportUrl, fetchGeologicalStageCount, fetchPerforationStages } from '@/api/pump-table'
import {
  classifyAll, ruleOf, fmtSize, wellAliases
} from './kbMatch'

const LOCAL_PREFIX = 'local~'

export default {
  name: 'WellWorkbench',
  components: { WellDocumentPanel, WellModuleCard, ExcelSheetPreview },
  data() {
    return {
      loading: { detail: false, api: false, neighbor: false, standard: false },
      /** 功能模块配置（来自 wellModules.js，单一数据源） */
      modules: MODULES,
      generationRules: GENERATION_RULES,
      rulesVisible: false,
      /** 文档中心里地质设计文档数量，由 WellDocumentPanel 回传 */
      docGeoCount: 0,
      detail: {},
      /** 工作台井号详情（区块名称、射孔方式以这里为准） */
      wbDetail: {},
      apiData: null,
      apiError: '',
      neighborData: null,
      standardData: null,
      /** 附件管理（类型由模块配置 wellModules.js 决定） */
      attachments: [],
      attachmentUploading: false,
      /**
       * 内置模板档位选择结果 { PRETEST: '12方' }。
       *
       * 按井存 localStorage，进压裂智能体时通过 query 带过去，
       * 两边（工作台勾选 / 智能体页切换）都写这里，保持同一份事实。
       */
      variantPicks: {},
      /**
       * 泵注程序预览数据（来自本井工程设计文档「六、施工泵注程序」）。
       *
       * 结构 { sourceFileName, tableCount, message, stages: [...] }，null = 还没读。
       * 只在「泵注程序」模块存在时才请求——进页面就读会白白拖慢首屏，
       * 因为要下载整份 docx 再解析。
       */
      pumpPreview: null,
      pumpLoading: false,
      pumpError: '',
      /** 已发起过预览请求（避免井号变化后重复拉取） */
      pumpLoadedFor: '',

      /* ---- 泵注段数口径（导航徽标用）---- */
      /**
       * 地质设计「压裂点参数表」段数。
       * null = 还没读或没取到（与「0 段」严格区分）。
       */
      geoStageCount: null,
      /** 取不到时的原因，放进 tooltip 让用户知道为什么显示「-」 */
      geoStageMessage: '',
   /** 分段射孔方案已明确的段数（SEG_PLAN.segPlan 行数）；null = 没读过 */
   perfStageCount: null,
   /** 分段射孔方案已明确的段号数组（做逐段明细用） */
   perfStageNos: [],
      /** 附件预览 */
      previewVisible: false,
      previewLoading: false,
      previewRow: null,
      previewCategory: '', // 'image'|'docx'|'xlsx'|'pdf'|'txt'|'csv'|'unsupported'
      previewImageUrl: '',
      previewPdfUrl: '',
      /** 解析好的工作簿本体，交给 ExcelSheetPreview（切 sheet 复用，不重复读盘） */
      previewExcelWb: null,
      previewText: '',
      /** 「进入智能提取」正在下载本井地质设计（防连点） */
      extracting: false,

      /* --------------------- 一键从知识库提取 --------------------- */
      /** 提取弹窗是否可见 */
      kbVisible: false,
      /** 正在读取知识库 + 做匹配 */
      kbMatching: false,
      /** 匹配失败原因（知识库不可达等） */
      kbError: '',
      /** 知识库 ID / 名称（压裂知识库） */
      kbDatasetId: '',
      kbDatasetName: '',
      /** 知识库原始文档列表 */
      kbDocs: [],
      /** 匹配结果（每一项含 picked / moduleKey / inputKey / label / reason…） */
      kbRows: [],
      /** 正在下载并登记到工作台 */
      kbImporting: false,
      /** 是否显示「井号未命中」的文档（默认隐藏，避免无关井组文档干扰） */
      kbShowAll: false,
      /** 导入进度 { done, total, ok, fail, current } */
      kbProgress: { done: 0, total: 0, ok: 0, fail: 0, current: '' }
    }
  },

  computed: {
    wellId() {
      return this.$route.params.wellId || ''
    },

    /**
     * 工作台井号 ID（COMM_WB_WELL.WB_WELL_ID）。
     * 文档关联以「工作台井号」为准，而不是井库 ID —— 同一个井库记录可能在工作台
     * 被多个人各建一份，文档应挂在各自的井号下。
     * 来源优先级：路由 query.wbWellId → 对象树跳转时写入的 sessionStorage。
     */
    wbWellId() {
      const fromQuery = this.$route.query.wbWellId
      if (fromQuery) return String(fromQuery)
      try {
        const cached = sessionStorage.getItem('wbSelectedWell')
        if (cached) {
          const obj = JSON.parse(cached)
          if (obj && obj.wbWellId && (!this.wellId || obj.wellId === this.realWellId || !obj.wellId)) {
            return String(obj.wbWellId)
          }
        }
      } catch (e) {
        // 忽略解析失败
      }
      return ''
    },

    userId() {
      try {
        const cached = sessionStorage.getItem('wbSelectedWell')
        if (cached) {
          const obj = JSON.parse(cached)
          if (obj && obj.userId) return String(obj.userId)
        }
      } catch (e) {
        // 忽略
      }
      return ''
    },

    offline() {
      return !this.wellId || this.wellId.indexOf(LOCAL_PREFIX) === 0
    },

    /** 实体 ID（去掉 local~ 前缀） */
    realWellId() {
      return this.offline ? '' : this.wellId
    },

    selectedWell() {
      return this.$store.state.well.selectedWell || {}
    },

    wellName() {
      return this.detail.wellName || this.selectedWell.wellName || ''
    },

    /**
     * sessionStorage 里上一次记下的井名。
     *
     * <p>为什么需要它：{@code wellName} 计算属性依赖 {@code detail}，而 detail 是
     * 异步加载的（离线井压根不走接口）。用户刷新后立刻点「进入压裂智能体」，
     * 此时 {@code wellName} 仍是空串，若直接写进 sessionStorage 就会把井名
     * **永久覆盖成空**，返回单井工作台时离线分支拿到空值，标题退化成「未命名井」。</p>
     *
     * <p>只认同一口井的缓存（按 wbWellId 比对），避免切井后串名。</p>
     */
    cachedWellName() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (!raw) return ''
        const o = JSON.parse(raw)
        if (o && (!o.wbWellId || String(o.wbWellId) === String(this.wbWellId))) {
          return String(o.wellName || o.name || '')
        }
      } catch (e) { /* ignore */ }
      return ''
    },

    /** 缓存里记的井库 ID，用于 goAgent 的串井校验 */
    cachedWellId() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (!raw) return ''
        const o = JSON.parse(raw)
        if (o && String(o.wbWellId) === String(this.wbWellId)) return String(o.wellId || '')
      } catch (e) { /* ignore */ }
      return ''
    },

    /** 是否有任意加载在进行 */
    isLoading() {
      return Object.values(this.loading).some(v => v === true)
    },

    /** 区块名称：工作台井号关联 CODING_NAME 解析结果优先 */
    wbBlockName() {
      return this.wbDetail.blockName || this.selectedWell.block || ''
    },

    /** 射孔方式：工作台井号字段优先 */
    wbPerforationMethod() {
      return this.wbDetail.perforationMethod || this.selectedWell.perforationMethod || ''
    },

    detailEntries() {
      // 井库详情里的 block 是原始编码（如 0300100011000008128），
      // 用工作台井号关联到的区块名称替换，避免页面暴露编码。
      const source = { ...this.detail }
      if (this.wbBlockName) source.block = this.wbBlockName
      const entries = this.pickEntries(source)
      // 射孔方式不在井库详情里，从工作台井号补一条
      if (this.wbPerforationMethod) {
        entries.push({
          label: '射孔方式',
          value: this.wbPerforationMethod,
          group: '数据'
        })
      }
      return entries
    },

    apiEntries() {
      return this.pickEntries(this.apiData)
    },

    /** 把扁平的 kv 按前缀分组（如 api / design / geo） */
    apiGroups() {
      const entries = this.apiEntries
      if (!entries.length) return []
      const groups = []
      const map = {}
      entries.forEach(item => {
        const name = item.group || '数据'
        if (!map[name]) {
          map[name] = { name, items: [] }
          groups.push(map[name])
        }
        map[name].items.push(item)
      })
      return groups
    },

    neighborRows() {
      return this.toRows(this.neighborData)
    },

    neighborColumns() {
      const rows = this.neighborRows
      if (!rows.length) return []
      return Object.keys(rows[0]).slice(0, 8)
    },

    standardRows() {
      return this.toRows(this.standardData)
    },

    standardColumns() {
      const rows = this.standardRows
      if (!rows.length) return []
      return Object.keys(rows[0]).slice(0, 6)
    },

    /* ------------------- 模块化材料收集进度 ------------------- */

    /** 所有模块的取数状态：{ 模块key: { got, need, ready } } */
    moduleStatus() {
      const map = {}
      this.modules.forEach(m => {
        const inputs = m.inputs || []
        const requiredKeys = inputs.filter(i => i.required).map(i => String(i.key).toUpperCase())
        // 由文档中心管理的必需项（如基础资料的压裂地质设计）不在附件表，需额外计入
        const extra = m.docCenterRequired ? 1 : 0
        const need = requiredKeys.length + extra
        let got = requiredKeys.filter(k => this.attachments.some(
          a => String(a.attachmentType || '').toUpperCase() === k
        )).length
        if (extra) got += this.docGeoCount > 0 ? 1 : 0
        map[m.key] = { got, need, ready: need > 0 && got >= need }
      })
      return map
    },

    requiredCount() {
      return Object.values(this.moduleStatus).reduce((s, v) => s + v.need, 0)
    },

    /* ------------------- 泵注程序：按「段」看进度 ------------------- */

    /**
     * 已保存的泵注程序里「有数据」的段号集合。
     *
     * 判据是有实际明细行：只存了段号、rows 为空的段不算「已有数据」——
     * 那种段打开泵注页看到的还是「本段还没有泵注数据」。
     * 引用段（refStageNo 指向别的段）本身不存行，算不算有数据要看它引用的那段：
     * 引用源有数据，这段点开就能看到表，所以也算有数据。
     */
    pumpDataStageNos() {
      const stages = (this.pumpPreview && this.pumpPreview.stages) || []
      const hasRows = {}
      stages.forEach(s => {
        if (s && s.rows && s.rows.length) hasRows[Number(s.stageNo)] = true
      })
      const out = {}
      stages.forEach(s => {
        if (!s) return
        if (s.rows && s.rows.length) out[Number(s.stageNo)] = true
        else if (s.refStageNo && hasRows[Number(s.refStageNo)]) out[Number(s.stageNo)] = true
      })
      return out
    },

    pumpStageWithData() {
      return Object.keys(this.pumpDataStageNos).length
    },

    /**
     * 逐段明细：把「设计 / 已明确 / 有数据」三段状态摊到每一段上。
     *
     * <p>段号取三个来源的并集 —— 只看设计段数会漏掉「设计里没这一段、但射孔方案已经定了」的情况，
     * 那恰恰是用户要补的地方，不能因为设计里没有就不显示。
     *
     * <p>三者都没数据时返回空数组，模板整行不渲染，不占版面。
     */
    pumpStageRows() {
      const dataNos = this.pumpDataStageNos
      const knownNos = {}
      ;(this.perfStageNos || []).forEach(n => { knownNos[Number(n)] = true })

      const all = {}
      if (this.geoStageCount) {
        for (let i = 1; i <= Number(this.geoStageCount); i++) all[i] = true
      }
      Object.keys(knownNos).forEach(n => { all[Number(n)] = true })
      Object.keys(dataNos).forEach(n => { all[Number(n)] = true })

      const nos = Object.keys(all).map(Number).sort((a, b) => a - b)
      return nos.map(n => {
        const designed = !this.geoStageCount || n <= Number(this.geoStageCount)
        const known = !!knownNos[n]
        const hasData = !!dataNos[n]
        const miss = []
        if (!known) miss.push('射孔方案里还没定这一段')
        if (!hasData) miss.push('泵注程序里还没有这一段的数据')
        return {
          stageNo: n,
          designed,
          known,
          hasData,
          tip: `第 ${n} 段：` + (miss.length ? miss.join('；') : '已就绪')
        }
      })
    },

    /** 徽标文案：设计 N 段 · 已明确 M 段 · 已有数据 K 段 */
    pumpStageBadge() {
      const fmt = v => (v == null ? '-' : v)
      const design = fmt(this.geoStageCount)
      const known = fmt(this.perfStageCount)
      const data = this.pumpPreview ? this.pumpStageWithData : '-'
      return `设计 ${design} 段 · 已明确 ${known} 段 · 有数据 ${data} 段`
    },

    /** 徽标 tooltip：解释三个数字各自取自哪，取不到时给出原因 */
    pumpStageTip() {
      const lines = [
        '设计段数：地质设计「压裂点参数表」按「分段」列去重',
        '已明确段数：分段射孔方案里已定下来的段（封隔器位置那套表）',
        '有数据段数：已保存的泵注程序里有明细行的段（引用段跟随引用源）'
      ]
      if (this.geoStageCount == null && this.geoStageMessage) {
        lines.push('设计段数未取到：' + this.geoStageMessage)
      }
      if (this.perfStageCount == null) {
        lines.push('已明确段数未取到：本井还没有保存过分段射孔方案')
      }
      if (!this.pumpPreview) {
        lines.push('有数据段数未取到：本井还没有保存过泵注程序')
      }
      return lines.join('\n')
    },

    /**
     * tooltip 的 HTML 版。
     *
     * <p>为什么不用 {@code :content}：它是纯文本，写进去的 {@code \n} 不会被当换行，
     * 三条说明会挤成一长串横贯整屏（实测在 1680 宽下就是这样）。
     * 这里逐行拼 {@code <div>}，配合 {@code .ww-stage-tip} 的行距，才能真正分行。
     *
     * <p>内容全部是本文件内的常量字符串 + 后端返回的错误消息，
     * 对错误消息做转义，避免任何来源的文本破坏结构。
     */
    pumpStageTipHtml() {
      const esc = s => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return this.pumpStageTip.split('\n')
        .map(line => {
          // 「xxx未取到：原因」这类行弱化显示，正常说明行保持常规
          const isWarn = line.indexOf('未取到') >= 0
          return '<div class="' + (isWarn ? 'is-warn' : '') + '">' + esc(line) + '</div>'
        })
        .join('')
    },

    readyCount() {
      return Object.values(this.moduleStatus).reduce((s, v) => s + Math.min(v.got, v.need), 0)
    },

    overallPercent() {
      if (!this.requiredCount) return 0
      return Math.round((this.readyCount / this.requiredCount) * 100)
    },

    /** 缺失的必需材料（给顶部进度条提示用） */
    missingList() {
      const names = []
      this.modules.forEach(m => {
        (m.inputs || []).forEach(inp => {
          if (!inp.required) return
          const k = String(inp.key).toUpperCase()
          const has = this.attachments.some(a => String(a.attachmentType || '').toUpperCase() === k)
          if (!has) names.push(`${m.title}·${inp.label}`)
        })
        // 文档中心管理的必需项（当前只有基础资料的地质设计）
        if (m.docCenterRequired && this.docGeoCount === 0) {
          names.push(`${m.title}·${m.docCenterRequired.label}`)
        }
      })
      return names
    },

    /* ---------------- 一键从知识库提取 ---------------- */

    /** 命中的文档数（本井 / 其他井） */
    kbSelfCount() {
      return this.kbRows.filter(r => r.isSelf).length
    },

    kbNeighborCount() {
      return this.kbRows.filter(r => !r.isSelf && r.hitWell).length
    },

    /** 已勾选数量 */
    kbPickedCount() {
      return this.kbRows.filter(r => r.picked).length
    },

    /** 按模块分组（保持 MODULES 的顺序，空模块不展示） */
    kbGroups() {
      const byKey = {}
      const visible = this.kbVisibleRows
      visible.forEach(r => {
        if (!byKey[r.moduleKey]) byKey[r.moduleKey] = []
        byKey[r.moduleKey].push(r)
      })
      const groups = []
      this.modules.forEach(m => {
        const rows = byKey[m.key]
        if (rows && rows.length) {
          groups.push({
            key: m.key,
            title: m.title,
            icon: m.icon,
            purpose: m.purpose,
            rows
          })
        }
      })
      return groups
    },

    /**
     * 实际展示的行。
     *
     * 默认只展示「本井」和「同为工作台井号的其它井」—— 知识库里往往躺着大量
     * 与本井毫无关系的井组文档（安13-7、郑59-7…），全列出来只会干扰勾选。
     * 想看到全部候选，打开「显示未匹配文档」开关。
     */
    kbVisibleRows() {
      if (this.kbShowAll) return this.kbRows
      return this.kbRows.filter(r => r.isSelf || r.hitWell)
    },

    /** 被开关隐藏掉的行数（用于提示「还有 N 份未匹配」） */
    kbHiddenCount() {
      return this.kbRows.length - this.kbVisibleRows.length
    },

    kbProgressPercent() {
      const { done, total } = this.kbProgress
      if (!total) return 0
      return Math.min(100, Math.round((done / total) * 100))
    },

    kbProgressText() {
      const { done, total, ok, fail, current } = this.kbProgress
      if (!total) return ''
      const parts = [`${done}/${total}`]
      if (ok) parts.push(`成功 ${ok}`)
      if (fail) parts.push(`失败 ${fail}`)
      if (current && done < total) parts.push(`正在处理：${current}`)
      return parts.join(' · ')
    }
  },

  created() {
    this.loadAll()
    this.initVariantPicks()
    // 泵注程序预览：延后 1.2s 再读。
    // 它要下载整份 docx 再解析，和首屏那几路请求（详情/附件/邻井/标准）抢带宽会明显拖慢首屏；
    // 用户在泵注模块里也能手动点「重新读取」，晚一点不影响使用。
    setTimeout(() => { this.loadPumpPreview() }, 1200)
    // 泵注段数（设计 N 段 / 已明确 M 段）：要下载并解析地质设计 docx，
    // 比泵注预览更重，所以再往后排，串行执行不叠加带宽。
    setTimeout(() => { this.loadPumpStageStats() }, 3600)
  },

  /**
   * 从编辑器「保存到文档中心 → 去查看」跳过来时，把页面滚到文档列表。
   *
   * <p>为什么要滚：文档面板挂在单井工作台下半部分，用户落进来第一眼看到的是
   * 井信息表单和模块卡片，会以为「跳错页了/没存上」。带 {@code query.goDoc=1}
   * 进来就说明他刚保存完、想看结果，直接送到列表前最省事。
   *
   * <p>为什么用 setTimeout 而不是 $nextTick：{@code loadAll()} 在 created 里发起，
   * 文档列表数据回来后才撑开高度。$nextTick 只能保证 DOM 挂载，那时面板还只有
   * 一个空表格、高度不够，滚过去会停在页面中部偏上的位置。等 400ms 让首屏数据落定。
   *
   * <p>为什么滚 {@code .ww-doc-panel} 而不是 {@code #ww-doc-center}（2026-11-09 修）：
   * {@code #ww-doc-center} 只是「生成的工程设计文档」那张小说明卡，真正要看的表格在它下面
   * 的 {@code .well-document-panel} 里。按小卡居中 → 表格被顶到屏幕外，用户看到的
   * 还是两张说明卡，会以为「列表没出来」。直接按整块面板 {@code block:'start'} 对齐，
   * 表格首屏可见；再留 12px 上边距，别贴着顶部导航。
   */
  mounted() {
    const q = (this.$route && this.$route.query) || {}
    if (q.goDoc !== '1') return
    setTimeout(() => {
      const panel = document.querySelector('.ww-doc-panel')
      if (panel && panel.scrollIntoView) {
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // 补偿顶部固定导航高度，避免表头被压住
        window.scrollBy(0, -12)
        return
      }
      const el = document.getElementById('ww-doc-center')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 600)
  },

  watch: {
    /** 井号变化（切换井 / 从对象树跳转）时重新读取该井的档位选择 */
    wbWellId() {
      this.initVariantPicks()
      // 泵注预览是按井的文档抽出来的，换井必须清空：
      // 不清会短暂显示上一口井的泵注表，用户很容易当成当前井的数据
      this.resetPumpPreview()
      // 段数口径同理：先清成「-」，再重新取；延迟一点避免和首屏请求抢带宽
      this.geoStageCount = null
      this.geoStageMessage = ''
      this.perfStageCount = null
      this.perfStageNos = []
      setTimeout(() => { this.loadPumpPreview(true) }, 600)
      setTimeout(() => { this.loadPumpStageStats() }, 1800)
    }
  },

  methods: {
    /* ------------------- 泵注程序预览（读工程设计文档第六章） ------------------- */

    /**
     * 读取本井「泵注程序功能页保存的那一版」，按段预览。
     *
     * 数据源是结构化表 COMM_WB_PUMP_TABLE / COMM_WB_PUMP_ROW（用户在泵注功能页
     * 上传 Excel 或逐格填写后点保存的结果），**不是**生成出来的工程设计文档。
     * 工作台只读，所有写入都在泵注功能页完成。
     *
     * 触发时机：首屏加载完成后自动读一次，或用户点「重新读取」。
     * 挪到首屏之后再读，避免和详情/附件/邻井等多路请求抢带宽。
     */
    async loadPumpPreview(force) {
      const wbId = this.wbWellId
      if (!wbId) return
      if (this.pumpLoading) return
      // 已读过且不是强制刷新，直接返回
      if (!force && this.pumpLoadedFor === wbId && this.pumpPreview) return

      this.pumpLoading = true
      this.pumpError = ''
      try {
        /*
         * 直接用 current 接口（返回 PumpTableRecord 原始结构），
         * 不再走 previewPumpProgram —— 那个读的是工程设计文档第六章。
         * 这里要的是「用户确认过的那一版」，两者可能不一致。
         */
        const res = await getCurrentPumpTable(wbId)
        if (res && res.code === 0) {
          this.pumpPreview = res.data || null
          this.pumpLoadedFor = wbId
        } else {
          this.pumpPreview = null
          this.pumpError = (res && res.message) || '读取泵注程序失败'
        }
      } catch (e) {
        this.pumpPreview = null
        this.pumpError = this.errText(e) || '读取泵注程序失败'
      } finally {
        this.pumpLoading = false
      }
    },

    /** 换井时清空泵注预览状态 */
    resetPumpPreview() {
      this.pumpPreview = null
      this.pumpError = ''
      this.pumpLoadedFor = ''
    },

    /**
     * 读泵注段数口径的两个数：设计段数 + 已明确段数。
     *
     * <p><b>为什么单独一路请求</b>：设计段数要下载并解析整份地质设计 docx（本机还要走
     * 本地副本降级），比首屏任何一路都重，绝不能塞进 {@code loadAll()}。
     * 所以排在泵注预览之后再跑，且失败只让徽标显示「-」，不弹错误 ——
     * 工作台的主职责是收集材料，段数只是辅助信息，不该因此打断用户。
     *
     * <p><b>两个数各管什么</b>：
     * <ul>
     *   <li>设计段数 → 地质设计「压裂点参数表」按「分段」列去重（口径与泵注页一致）；</li>
     *   <li>已明确段数 → 分段射孔方案 {@code SEG_PLAN.segPlan} 的行数。
     *       这是「已经定下来、能直接拿来施工」的段数，和设计段数不一定相等：
     *       设计 9 段而射孔方案只做了 8 段，说明有一段还没布置。</li>
     * </ul>
     */
    async loadPumpStageStats() {
      const wbId = this.wbWellId
      if (!wbId) return

      // ① 设计段数（失败置 null，徽标显示「-」而不是 0）
      try {
        const res = await fetchGeologicalStageCount(wbId)
        const r = (res && res.data) || {}
        const n = Number(r.stageCount || 0)
        if (String(this.wbWellId) !== String(wbId)) return  // 期间换井了，丢弃结果
        if (n > 0) {
          this.geoStageCount = n
          this.geoStageMessage = ''
        } else {
          this.geoStageCount = null
          this.geoStageMessage = r.message || '地质设计里没取到压裂点参数表'
        }
      } catch (e) {
        this.geoStageCount = null
        this.geoStageMessage = this.errText(e) || '段数接口不可用'
      }

      // ② 已明确段数（没有射孔方案就是 null，不是 0）
      try {
        const stages = await fetchPerforationStages(wbId)
        if (String(this.wbWellId) !== String(wbId)) return
        this.perfStageCount = stages && stages.length ? stages.length : null
        this.perfStageNos = (stages || []).map(s => Number(s.stageNo)).filter(n => !isNaN(n))
      } catch (e) {
        this.perfStageCount = null
        this.perfStageNos = []
      }
    },

    /**
     * 下载泵注程序 Excel（一段一个 sheet）。
     *
     * 导出的是「泵注功能页保存的那一版」，与上面预览同源，
     * 走 /v1/agent/pump/tables/export.xlsx（不是 /v1/agent/pump/export.xlsx）。
     */
    exportPumpProgram() {
      const wbId = this.wbWellId
      if (!wbId) {
        this.$message.warning('未识别到当前井号，无法导出')
        return
      }
      const p = this.pumpPreview
      const stages = (p && p.stages) || []
      if (!stages.length) {
        this.$message.warning('本井还没有保存过泵注程序，请先进入泵注程序功能页填写或上传')
        return
      }
      /*
       * ⚠️ 井名要三级兜底：文件名用服务端 Content-Disposition 里的值，
       *    传空会让后端回落成「本井」。
       *    ① wellName：依赖异步 /v1/wells/{wellId}，深链只带 wbWellId 时永远空串；
       *    ② wbDetail.wellName：只依赖 wbWellId，深链场景唯一可靠来源；
       *    ③ cachedWellName：sessionStorage 上次记下的名字。
       */
      const name = (this.wellName
        || (this.wbDetail && this.wbDetail.wellName)
        || this.cachedWellName
        || '').trim()
      const url = pumpTableExportUrl(wbId, name)
      /*
       * 用隐藏 <a download> 而不是 window.open：
       *   - window.open 会被浏览器弹窗拦截（尤其非用户手势上下文），表现为「点了没反应」；
       *   - <a download> 走原生下载，响应带 Content-Disposition 时文件名以服务端为准。
       */
      const a = document.createElement('a')
      a.href = url
      a.download = ''
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      this.$message.success(`正在下载 ${stages.length} 个段的泵注程序工作表…`)
    },

    /** 从异常里取最有用的一句话（axios 报错结构不统一，逐层兜底） */
    errText(e) {
      if (!e) return ''
      if (typeof e === 'string') return e
      if (e.message && !/^Request failed/.test(e.message)) return e.message
      const d = e.response && e.response.data
      if (d && d.message) return d.message
      return e.message || ''
    },

    /* ------------------- 内置模板档位选择 ------------------- */

    /** 从 localStorage 读回本井已选的档位 */
    initVariantPicks() {
      this.variantPicks = { PRETEST: loadPreTestVariant(this.wbWellId) }
    },

    /** 卡片里勾选档位：立刻落盘，后续生成直接取用 */
    handlePickVariant({ type, value }) {
      this.variantPicks = { ...this.variantPicks, [type]: value }
      savePreTestVariant(this.wbWellId, value)
      const v = getPreTestVariant(value)
      if (v) {
        this.$message.success(
          `已选择「${v.label}」档：${v.rows.length} 个阶段，总液量 ${v.totalFluid} m³ / ${v.totalTime} min`
        )
      }
    },

    /** 点击「六、施工泵注程序」跳到对应模块锚点（章节暂无锚点时滚到泵注程序模块） */
    scrollToSection() {
      const el = document.getElementById('wm-pump')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },

    /**
     * 模块卡片头部的扩展动作按钮（配置在 wellModules.js 的 module.action）。
     *
     * go-perforation → 复用 goPerforation()，与页头按钮同一条跳转链路、同样的 sessionStorage。
     * go-pump        → 进入泵注程序编写页，只需要井号，不带材料。
     */
    handleModuleAction(key) {
      if (key === 'go-perforation') {
        this.goPerforation()
        return
      }
      if (key === 'go-pump') {
        this.goPumpProgram()
        return
      }
      this.$message.warning(`未识别的模块动作：${key}`)
    },

    /* ------------------- 模块化材料收集 ------------------- */

    /** 取某模块的附件列表 */
    moduleFiles(m) {
      const keys = (m.inputs || []).map(i => String(i.key).toUpperCase())
      return this.attachments.filter(a => keys.includes(String(a.attachmentType || '').toUpperCase()))
    },

    moduleLoading() {
      return this.attachmentUploading
    },

    /** 模块卡片上传回调 */
    async handleModuleUpload({ file, input }) {
      const wbWellId = this.wbWellId || (this.selectedWell ? this.selectedWell.wbWellId : '')
      if (!wbWellId) {
        this.$message.error('未找到井号 ID，无法上传')
        return
      }
      // 同一材料重复上传视为覆盖提示
      const exist = this.attachments.filter(
        a => String(a.attachmentType || '').toUpperCase() === String(input.key).toUpperCase()
      )
      if (exist.length && input.required) {
        try {
          await this.$confirm(
            `「${input.label}」已有 ${exist.length} 个文件，继续上传将追加新文件（不会覆盖）。是否继续？`,
            '提示',
            { type: 'info' }
          )
        } catch (e) {
          return
        }
      }
      const formData = new FormData()
      formData.append('file', file)
      formData.append('wbWellId', wbWellId)
      formData.append('attachmentType', input.key)
      formData.append('userId', this.userId)
      this.attachmentUploading = true
      try {
        const res = await uploadAttachment(formData)
        if (res && (res.code === 0 || res.code === 200 || res.code === 'OK')) {
          this.$message.success(`「${input.label}」上传成功`)
          await this.loadAttachments()
        } else {
          this.$message.error(res.message || '上传失败')
        }
      } catch (e) {
        this.$message.error('上传失败')
      } finally {
        this.attachmentUploading = false
      }
    },

    async handleModuleRemove(row) {
      await this.deleteAtt(row)
    },

    /** 文档中心列表变化：更新地质设计文档计数 */
    handleDocChange(payload) {
      const byType = (payload && payload.byType) || {}
      this.docGeoCount = Number(byType.GEOLOGICAL_DESIGN || 0)
    },

    /** 滚动到指定模块 */
    scrollToModule(key) {
      const el = document.getElementById('wm-' + key)
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },

    /**
     * 跳到「输出与归档 → 设计文档」区。
     * 地质设计文档统一由文档中心管理，模块卡片里只展示状态、不放上传入口，
     * 避免同一份文件出现两个上传口。
     */
    scrollToDocCenter() {
      const el = document.getElementById('ww-doc-center')
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      this.$nextTick(() => {
        this.$message.info('请在「设计文档」中上传或选择压裂地质设计')
      })
    },

    goTemplates() {
      // ⚠️ 路径必须是 /template/list（2026-11-05 修 404）。
      // 原写法 '/template/index' 在路由表里不存在 → 匹配到通配 '*' → redirect('/404')，
      // 用户看到的就是 404 页。而且 vue-router 3 对重定向是 resolve 而非 reject，
      // 原来的 .catch() 永远进不去，那句「请在模板管理中维护…」的提示从来没生效过。
      //
      // 另外注意：vue-router 3.0.x 的 push() 在「重复导航到当前位置」时返回 undefined
      // 而不是 Promise，直接 .catch() 会抛 TypeError: reading 'catch'。
      // 所以这里先接返回值再判断。
      const r = this.$router.push({ path: '/template/list' })
      if (r && typeof r.catch === 'function') r.catch(() => {})
    },

    handleTemplateUpload() {
      // 先提示再跳，用户看不清提示就被带走了；改成跳转后由模板管理页承载上传入口，
      // 这里只说明「要按射孔方式分别上传」即可。
      this.$message.info('模板按射孔方式（全程固井 / 半程固井 / 滑套压裂）分别上传，已跳转到模板管理')
      this.goTemplates()
    },

    loadAll() {
      if (this.offline) {
        // 未关联井库：只用本地 / store 中的信息兜底。
        // ⚠️ wellName 三级兜底：Vuex（selectedWell，可能因 Cookie 过期/清缓存而空）
        //    → sessionStorage 里本井的旧值（cachedWellName）→ 空。
        //    少了第二级，「从智能体/编辑器返回」时标题会退化成「未命名井」。
        this.detail = {
          wellName: this.selectedWell.wellName || this.cachedWellName || '',
          block: this.selectedWell.block || '',
          perforationMethod: this.selectedWell.perforationMethod || '',
          wellType: this.selectedWell.wellType || ''
        }
        this.loadAttachments()
        return
      }
      this.loadDetail()
      this.loadWbDetail()
      this.loadApiData()
      this.loadNeighborData()
      this.loadTechnicalStandards()
      this.loadAttachments()
    },

    /**
     * 加载工作台井号详情：拿关联解析后的区块名称和射孔方式。
     * 井库详情接口 /v1/wells/{wellId} 的 block 是原始编码，不能直接展示。
     */
    async loadWbDetail() {
      if (!this.wbWellId) {
        this.wbDetail = {}
        return
      }
      try {
        const res = await getWbWellDetail(this.wbWellId, { userId: this.userId })
        this.wbDetail = (res && res.data) || {}
      } catch (e) {
        this.wbDetail = {}
      }
    },

    async loadDetail() {
      this.loading.detail = true
      try {
        const res = await getWellDetail(this.realWellId)
        this.detail = (res && res.data) || {}
      } catch (e) {
        this.detail = {}
      } finally {
        this.loading.detail = false
      }
    },

    async loadApiData() {
      this.loading.api = true
      this.apiError = ''
      try {
        const res = await getWellApiData(this.realWellId)
        this.apiData = (res && res.data) || null
      } catch (e) {
        this.apiData = null
        this.apiError = (e && e.message) || '提取 API 数据失败'
      } finally {
        this.loading.api = false
      }
    },

    async loadNeighborData() {
      this.loading.neighbor = true
      try {
        const res = await getNeighborData(this.realWellId)
        this.neighborData = (res && res.data) || null
      } catch (e) {
        this.neighborData = null
      } finally {
        this.loading.neighbor = false
      }
    },

    async loadTechnicalStandards() {
      this.loading.standard = true
      try {
        const res = await getTechnicalStandards(this.realWellId)
        this.standardData = (res && res.data) || null
      } catch (e) {
        this.standardData = null
      } finally {
        this.loading.standard = false
      }
    },

    /* ------------------------- 附件管理 ------------------------- */

    async loadAttachments() {
      const wbWellId = this.wbWellId || (this.selectedWell ? this.selectedWell.wbWellId : '')
      if (!wbWellId) return
      try {
        const res = await getAttachments(wbWellId)
        if (res && (res.code === 0 || res.code === 200 || res.code === 'OK')) {
          this.attachments = res.data || []
        }
      } catch (e) { /* ignore */ }
    },

    beforeAttachmentUpload(file) {
      const maxSize = 50 * 1024 * 1024 // 50MB
      if (file.size > maxSize) {
        this.$message.error('文件大小不能超过50MB')
        return false
      }
      const allowed = /\.(docx?|xlsx?|pdf|txt|csv|jpe?g|png|gif|bmp|webp)$/i
      if (!allowed.test(file.name)) {
        this.$message.error('仅支持 Word / Excel / PDF / TXT / CSV / 图片 格式')
        return false
      }
      return true
    },

    async deleteAtt(row) {
      try {
        await this.$confirm(`确定删除附件"${row.fileName}"？`, '提示', { type: 'warning' })
        const res = await deleteAttachment(row.attachmentId)
        if (res && (res.code === 0 || res.code === 200 || res.code === 'OK')) {
          this.$message.success('删除成功')
          this.loadAttachments()
        } else {
          this.$message.error(res.message || '删除失败')
        }
      } catch (e) {
        if (e !== 'cancel') this.$message.error('删除失败')
      }
    },

    downloadAtt(row) {
      window.open(downloadAttachmentUrl(row.attachmentId), '_blank')
    },

    /* ------------------------- 附件预览 ------------------------- */

    getFileCategory(fileName) {
      if (!fileName) return 'other'
      const lower = fileName.toLowerCase()
      if (/\.(jpe?g|png|gif|bmp|webp|svg)$/.test(lower)) return 'image'
      if (/\.docx$/.test(lower)) return 'docx'
      if (/\.doc$/.test(lower)) return 'doc'   // 旧版 Word，docx-preview 无法渲染
      if (/\.xlsx?$/.test(lower)) return 'xlsx'
      if (/\.csv$/.test(lower)) return 'csv'
      if (/\.txt$/.test(lower)) return 'txt'
      if (/\.pdf$/.test(lower)) return 'pdf'
      return 'other'
    },

    getFileIcon(fileName) {
      const cat = this.getFileCategory(fileName)
      const icons = {
        image: 'el-icon-picture-outline',
        docx: 'el-icon-document',
        doc: 'el-icon-document',
        xlsx: 'el-icon-s-grid',
        csv: 'el-icon-s-data',
        txt: 'el-icon-tickets',
        pdf: 'el-icon-notebook-2',
        other: 'el-icon-question'
      }
      return icons[cat] || icons.other
    },

    getFileTypeLabel(fileName) {
      if (!fileName) return '-'
      const lower = fileName.toLowerCase()
      if (lower.endsWith('.docx')) return 'DOCX'
      if (lower.endsWith('.doc')) return 'DOC'
      if (lower.endsWith('.xlsx')) return 'XLSX'
      if (lower.endsWith('.xls')) return 'XLS'
      if (lower.endsWith('.csv')) return 'CSV'
      if (lower.endsWith('.txt')) return 'TXT'
      if (lower.endsWith('.pdf')) return 'PDF'
      if (/\.(jpe?g|png|gif|bmp|webp)$/.test(lower)) {
        const ext = lower.match(/\.(jpe?g|png|gif|bmp|webp)/)[1].toUpperCase()
        return ext
      }
      const parts = fileName.split('.')
      return parts.length > 1 ? parts.pop().toUpperCase() : '-'
    },

    canPreview(row) {
      return ['image', 'docx', 'xlsx', 'pdf', 'csv', 'txt'].includes(this.getFileCategory(row.fileName))
    },

    async previewAtt(row) {
      this.previewRow = row
      this.previewVisible = true
      this.previewLoading = true
      this.previewCategory = ''
      this.previewImageUrl = ''
      this.previewPdfUrl = ''
      this.previewExcelWb = null
      this.previewText = ''

      try {
        const cat = this.getFileCategory(row.fileName)
        this.previewCategory = cat

        // 下载文件内容
        const url = downloadAttachmentUrl(row.attachmentId)
        const token = localStorage.getItem('token') || ''
        const res = await fetch(url, {
          headers: token ? { Authorization: token } : {}
        })
        if (!res.ok) throw new Error('下载失败')

        if (cat === 'image') {
          const blob = await res.blob()
          this.previewImageUrl = URL.createObjectURL(blob)
        } else if (cat === 'pdf') {
          const blob = await res.blob()
          // 强制 application/pdf，避免后端返回 octet-stream 时浏览器直接下载
          const pdfBlob = new Blob([blob], { type: 'application/pdf' })
          this.previewPdfUrl = URL.createObjectURL(pdfBlob)
        } else if (cat === 'docx') {
          const blob = await res.blob()
          await this.$nextTick()
          const box = this.$refs.docxPreviewBox
          if (box) {
            box.innerHTML = '<div style="padding:16px;color:#999;"><i class="el-icon-loading"></i> 正在加载文档...</div>'
            const docxPreview = await import(/* webpackChunkName: "docx-preview" */ 'docx-preview')
            box.innerHTML = ''
            await docxPreview.renderAsync(blob, box, null, {
              className: 'docx-wrapper',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: true,
              breakPages: true,
              experimental: true
            })
          }
        } else if (cat === 'xlsx') {
          /* [安全清理-中风险] 已移除 xlsx 依赖，Excel 预览改为不支持
          const arrayBuffer = await res.arrayBuffer()
          const XLSX = await import(/ * webpackChunkName: "xlsx" * / 'xlsx')
          // 解析成 workbook 后交给 ExcelSheetPreview，由它挑第一个非空 sheet 并负责切换
          this.previewExcelWb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
          */
          this.$message.warning('Excel 预览已按安全要求禁用（xlsx 依赖已移除）')
          this.previewCategory = 'unsupported'
        } else if (cat === 'csv' || cat === 'txt') {
          const text = await res.text()
          this.previewText = text.slice(0, 10000) // 最多显示1万字符
        }
      } catch (e) {
        this.$message.error('预览加载失败：' + (e.message || e))
        this.previewCategory = 'unsupported'
      } finally {
        this.previewLoading = false
      }
    },

    getTypeLabel(type) {      const map = {
        MSE: 'MSE曲线',
        CASING_COLLAR: '套管接箍',
        TOTAL_HC: '全烃值',
        GAMMA: '伽马曲线',
        OTHER: '其他'
      }
      return map[type] || type
    },

    getTypeTag(type) {
      const map = {
        MSE: 'warning',
        CASING_COLLAR: '',
        TOTAL_HC: 'success',
        GAMMA: 'info',
        OTHER: ''
      }
      return map[type] || ''
    },

    formatSize(bytes) {
      if (!bytes) return '-'
      if (bytes < 1024) return bytes + ' B'
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
      return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    },

    formatTime(ts) {
      if (!ts) return '-'
      const d = new Date(ts)
      const p = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
    },

    /* ------------------------- 数据结构适配 ------------------------- */

    /** 扁平对象 → [{label, value, group}]，最多 40 条 */
    pickEntries(data) {
      if (!data || typeof data !== 'object') return []
      if (Array.isArray(data)) return []
      const out = []
      Object.keys(data).forEach(key => {
        const value = data[key]
        if (value === null || value === undefined || value === '') return
        if (typeof value === 'object') return
        out.push({
          label: this.prettify(key),
          value: String(value),
          group: this.groupOf(key)
        })
      })
      return out.slice(0, 40)
    },

    /** 数组 / 嵌套对象 → 表格行 */
    toRows(data) {
      if (!data) return []
      let list = data
      if (!Array.isArray(list)) {
        // 形如 { list: [...] } 或 { records: [...] }
        const arrKey = Object.keys(list).find(k => Array.isArray(list[k]))
        if (arrKey) {
          list = list[arrKey]
        } else {
          // 对象数组化：{a:{...}, b:{...}}
          const objValues = Object.keys(list)
            .map(k => list[k])
            .filter(v => v && typeof v === 'object')
          list = objValues.length ? objValues : []
        }
      }
      return list
        .filter(item => item && typeof item === 'object')
        .slice(0, 200)
        .map(item => {
          const row = {}
          Object.keys(item).forEach(k => {
            const v = item[k]
            if (v === null || v === undefined) row[this.prettify(k)] = ''
            else if (typeof v === 'object') row[this.prettify(k)] = JSON.stringify(v)
            else row[this.prettify(k)] = String(v)
          })
          return row
        })
    },

    groupOf(key) {
      if (/^(api|interface)/i.test(key)) return 'API 接口数据'
      if (/^(design|plan)/i.test(key)) return '设计数据'
      if (/^(geo|geolog)/i.test(key)) return '地质数据'
      return '数据'
    },

    /** 驼峰 / 下划线 → 可读中文友好标签 */
    prettify(key) {
      const zh = {
        wellId: '井号 ID',
        wellName: '井名',
        wellNumber: '井号',
        wellType: '井型',
        wellSort: '井别',
        block: '区块',
        blockCode: '区块编码',
        depth: '井深',
        targetLayer: '目的层',
        horizontalLength: '水平段长',
        fracturingStages: '压裂段数',
        status: '状态',
        createTime: '创建时间',
        updateTime: '更新时间',
        perforationMethod: '射孔方式'
      }
      if (zh[key]) return zh[key]
      return String(key)
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^\w/, c => c.toUpperCase())
    },

    /**
     * 返回对象树（工作台首页）。
     * 带上 wellId 作为 query，首页可据此把原井号重新选中/定位，
     * 避免用户返回后又要从头翻对象树。
     */
    goBackToTree() {
      const q = {}
      if (this.wbWellId) q.wbWellId = this.wbWellId
      this.$router.push({ name: 'Workbench', query: q })
    },

    /**
     * 「进入智能提取」→ 直接进文档编辑器，展示「严格提取」的结果。
     *
     * 中间那个上传页（/report-extract）不再出现：本井要提取的文件就是文档中心里
     * 已归档的压裂地质设计，页面上再让用户拖一次纯属多余。所以这里一步做完：
     *   1) 按 wbWellId 查文档中心的压裂地质设计（取最新一条）
     *   2) 下载成 File（**不转 base64**）
     *   3) handoffExtractTask()：File 进内存单例，sessionStorage 只存元信息
     *   4) 跳 /report-editor，编辑器 created() 取回任务与 File 后跑 runStrictExtract()
     *
     * ⚠️ 第 3 步曾经是把 File 转成 dataUrl 再 JSON 塞 sessionStorage。压裂地质设计
     *    动辄 4~5MB，base64 后约 6MB+，超过 sessionStorage 约 5MB 的配额，
     *    setItem 必抛 QuotaExceededError —— 用户看到「该文件较大，浏览器缓存
     *    空间不足，请先关闭一些标签页后重试」，但关标签页毫无作用。详见
     *    utils/extractHandoff.js 顶部说明。
     *
     * `strict-extract` 是纯提取：只把原文的文字 / 图片 / 表格取出来铺进编辑框，
     * 不调大模型、不调生成接口、不改写一个字。
     *
     * 注意与「进入压裂智能体」区分：那个保留智能体原样式（步骤条 + 对话 + 手动执行）。
     */
    async goExtract() {
      const name = String(this.wellName || '').trim()
      const id = this.wbWellId || ''
      if (!id) {
        this.$message.warning('该井号缺少工作台 ID，无法自动带入文档')
        return
      }
      if (this.extracting) return

      this.extracting = true
      try {
        // 1) 找本井的压裂地质设计（只要当前有效的版本）
        //    运行时取方法，避免模块初始化顺序导致的 undefined（见文件顶部 import 处注释）
        const listWellDocs = wellDocApi.listWellDocs
        const downloadWellDoc = wellDocApi.downloadWellDoc
        if (typeof listWellDocs !== 'function' || typeof downloadWellDoc !== 'function') {
          throw new Error('文档中心接口未就绪，请刷新页面后重试')
        }
        const res = await listWellDocs(id, { docType: 'GEOLOGICAL_DESIGN', onlyCurrent: true })
        const list = (res && res.data) || []
        const doc = list.find(d => d.docType === 'GEOLOGICAL_DESIGN') ||
          list.find(d => /地质/.test(d.fileName || '')) || list[0] || null
        if (!doc) {
          this.$message.warning('本井还没有归档的压裂地质设计，请先在「文档中心」上传')
          return
        }

        // 2) 下载原文
        const blob = await downloadWellDoc(doc.docId)
        const fileName = doc.fileName || (name + '压裂地质设计.docx')
        const file = new File([blob], fileName, {
          type: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })

        // 3) 交出任务：**文件本体留在内存**，sessionStorage 只存纯字符串元信息。
        //
        // ⚠️ 旧版先 readFileAsDataUrl 再 JSON 塞 sessionStorage —— 4.7MB 的 docx
        //    转 base64 约 6.3MB（+33%），而 sessionStorage 只有约 5MB 配额，
        //    setItem 必然抛 QuotaExceededError，用户看到「该文件较大，浏览器缓存
        //    空间不足，请先关闭一些标签页」—— 但关标签页根本没用，因为**物理上
        //    就不够**，换个浏览器、清空全部缓存也一样。
        //    既然这两页是同一个 SPA 内的路由跳转，根本不需要把文件"存"起来，
        //    内存交接即可，还省掉一次 base64 编解码的 CPU 与内存开销。
        const outName = (name || fileName.replace(/\.docx?$/i, '')) + '压裂工程设计文档.docx'
        handoffExtractTask({
          fileName: outName,
          wellName: name,
          sourceFileName: fileName,
          annotations: [],              // 无模版 → 不做批注筛选，原文全量提取
          mode: 'strict-extract',       // 纯提取：不走大模型
          isStreaming: true,
          fromExtract: true
        }, file, null)
        // 不再写第二份 `editorDocument`：它不带源文件，无法真正兜底提取，
        // 却要再占一份存储，反而把主任务挤掉。
        try {
          sessionStorage.setItem('wbSelectedWell', JSON.stringify({ wbWellId: id, wellName: name }))
        } catch (e) { /* ignore */ }

        // 4) 进编辑器（它会自动执行 runStrictExtract）
        try {
          await this.$router.push({ name: 'ReportEditor' })
        } catch (err) {
          console.warn('[workbench] 命名路由跳转失败，回退路径跳转', err)
          await this.$router.push('/report-editor/list')
        }
      } catch (e) {
        console.error('[workbench] 自动带入文档失败', e)
        const msg = (e && e.isServerMessage && e.message) ? e.message : (e.message || '未知错误')
        this.$message.error('自动带入失败：' + msg)
      } finally {
        this.extracting = false
      }
    },

    /**
     * 进入「射孔方案」。
     * 本页模块卡片收集的 MSE / 套管接箍 / 全烃值 / 伽马曲线都按 attachmentType
     * 存在 COMM_WB_ATTACHMENT 里，射孔页会按同一套类型编码自动回填，
     * 因此这里只传井号，不需要再带上文件 ID 列表。
     */
    goPerforation() {
      const id = this.wbWellId || ''
      if (!id) {
        this.$message.warning('该井号缺少工作台 ID，无法进入射孔方案')
        return
      }
      // ⚠️ wellName 是 computed（detail.wellName || selectedWell.wellName || '')，
      // 详情接口还没回来时是空串。直接透传会让射孔页收到 wellName=''，
      // 标题退化成裸井号、导出文件名也丢井名。
      // 这里回退到「井号本身」（详情未就绪时至少不是空），并让缓存补一次完整列表把名字纠回来。
      const name = String(this.wellName || '').trim()
      const fallbackName = name || (this.selectedWell && this.selectedWell.wellName) || id
      try {
        sessionStorage.setItem('wbSelectedWell', JSON.stringify({
          wbWellId: id,
          wellId: this.realWellId || '',
          wellName: fallbackName,
          userId: this.userId || ''
        }))
      } catch (e) { /* ignore */ }
      this.$router.push({
        name: 'PerforationAgent',
        query: { wbWellId: id, wellName: fallbackName }
      })
      // 井号列表缓存是异步补的：射孔页 created 里先按 query 的井号起来，
      // 随后 restoreWellsFromSession() 再合并完整列表，不阻塞跳转。
      this.cacheWellOptionsForAgent()
    },

    /**
     * 把工作台全部井号写进 sessionStorage.wbWellOptions，供射孔页/泵注页的「井号」下拉切换。
     *
     * ⚠️ 这个缓存原先只有工作台首页（workbench/index.vue 的 openPerforationAgent）会写，
     * 而从「单井工作台 → 进入射孔方案」这条更常用的入口进不去 —— 射孔页拿不到列表，
     * 下拉里只有当前这一口井，用户无法换井（换井回填 / 换井下载全都测不到）。
     * 这里补上同一个 key，两条入口行为一致。
     */
    async cacheWellOptionsForAgent() {
      try {
        const res = await getObjectTree({})
        const data = (res && res.data) || res || {}
        const wells = Array.isArray(data.wells) ? data.wells : []
        if (!wells.length) return
        const opts = wells.map(w => ({
          wbWellId: w.wbWellId || w.id || '',
          wellName: w.wellName || w.name || ''
        })).filter(w => w.wbWellId)
        if (!opts.length) return
        sessionStorage.setItem('wbWellOptions', JSON.stringify(opts))
        this.onWellOptionsCached && this.onWellOptionsCached(opts)
      } catch (e) {
        // 缓存失败不影响跳转，射孔页会退化成「只有当前井」
        console.warn('[工作台] 缓存井号列表失败', e && e.message)
      }
    },

    /**
     * 进入「泵注程序」编写页。
     * 本页模块卡片上传的「正式压裂泵注程序结果表」按 attachmentType = PUMP_MAIN
     * 存在 COMM_WB_ATTACHMENT 里，泵注页进页面时会按同一套类型编码自动拉最新一份
     * 并解析展示（和射孔页回填 MSE / 伽马曲线一个范式），所以这里同样只传井号。
     * 页内参数与手动覆盖按井存 localStorage，桥塞深度自己去射孔结果里取。
     */
    goPumpProgram() {
      const id = this.wbWellId || ''
      if (!id) {
        this.$message.warning('该井号缺少工作台 ID，无法进入泵注程序')
        return
      }
      try {
        sessionStorage.setItem('wbSelectedWell', JSON.stringify({
          wbWellId: id,
          wellId: this.realWellId || '',
          wellName: this.wellName || '',
          userId: this.userId || ''
        }))
      } catch (e) { /* ignore */ }
      this.$router.push({
        name: 'PumpProgram',
        query: { wbWellId: id, wellName: this.wellName || '' }
      })
    },

    /**
     * 进入「压裂智能体」：内置模板骨架 + 内置数据来源规则，
     * 不用上传模板，直接从本井关联的地质设计文档提取并生成正文。
     * 保留智能体原有交互（步骤条 + 对话 + 手动点「开始智能提取并生成」）。
     */
    goAgent() {
      // ⚠️ 井名不能直接用 this.wellName 收尾。
      //   计算属性是 `detail.wellName || selectedWell.wellName || ''`，而 detail 是
      //   异步加载的（offline 井甚至不走接口）。用户点得快、或刚刷新完就点「进入压裂
      //   智能体」，this.wellName 还是空串 —— 直接写进 sessionStorage.wbSelectedWell
      //   会把「井名」这一格**永久覆盖成空**，返回单井工作台时离线分支拿到空 wellName，
      //   标题就变成「未命名井」（本机实测就是这个现象）。
      //   所以按「计算属性 → 详情 → Vuex → sessionStorage 里的旧值」逐级兜底。
      //
      // 补一道「串井」校验：cachedWellName 只按 wbWellId 比对，若两个 ID 被拼错
      // （实测过把 A 井的 wbWellId 配 B 井的 wellId 送进来的情况），缓存里的井名
      // 会盖掉真实井名。所以只有在缓存里的 wellId 与当前 realWellId 不冲突时才用它。
      const cachedId = this.cachedWellId
      const cacheUsable = !cachedId || !this.realWellId || cachedId === this.realWellId
      const name = String(
        this.wellName ||
        (this.detail && this.detail.wellName) ||
        this.selectedWell.wellName ||
        (cacheUsable ? this.cachedWellName : '') ||
        ''
      ).trim()

      // ⚠️ wbWellId 与 wellId 是两套 ID，必须分开取：
      //   wbWellId = COMM_WB_WELL.ID（工作台井号，文档挂它下面）
      //   wellId   = 井库记录 ID（可能为空 → 用 local~ 前缀表示「未关联井库」）
      //   `this.wbWellId || this.wellId` 这种写法会把 `local~W_xxx` 当成 wbWellId，
      //   后面按 wbWellId 查文档时必然查不到。
      const id = this.wbWellId || this.realWellId || ''
      // 井库 ID：离线井（local~ 前缀 / 空）一律写空串，让下游走 local~ 兜底；
      // 只有真关联了井库才写实体 ID，避免下游拿 local~W_xxx 去查 /v1/wells/{id}
      // 而命中「井不存在」。
      const realId = this.offline ? '' : (this.realWellId || '')

      // 编辑器 / 智能体页都靠这个 sessionStorage 记住当前井。
      // 必须写全 4 个字段：智能体页返回时用 wellId 还原 params，缺了就退化成离线井。
      try {
        sessionStorage.setItem('wbSelectedWell', JSON.stringify({
          wbWellId: id,
          wellId: realId,
          wellName: name,
          userId: this.userId || ''
        }))
      } catch (e) { /* ignore */ }
      this.$router.push({
        name: 'FracturingAgent',
        query: {
          wbWellId: id,
          wellName: name,
          // 把本页勾选的压前测试档位带过去，智能体页无需重新选
          preTestVariant: this.variantPicks.PRETEST || loadPreTestVariant(id),
          // 射孔方式 = 文档类型（全程固井 / 半程固井 / 滑套压裂）：
          // 智能体页据此切换制式，并把它作为「第 3 个判断条件」传给后端
          perforationMethod: this.wbPerforationMethod || ''
        }
      })
    },

    /* ============================================================
     *  一键从知识库提取
     *
     *  链路：知识库文档列表 → 按「井号 + 类型关键词」匹配 → 用户勾选确认
     *        → 逐份下载原件 → 按落位槽位登记到工作台
     *
     *  落位有两种去处，必须分开处理：
     *    - __DOC_CENTER__：地质设计 / 本井工程设计 → 文档中心 COMM_WB_WELL_DOC
     *      （复用「上传文档」接口，传 docType 区分类型）
     *    - 其它 inputKey：MSE / 套管接箍 / 全烃值 …… → 附件表 COMM_WB_ATTACHMENT
     *      （复用上传附件接口，传 attachmentType）
     *  两者都对文件本体做一次「下载 → 再上传」，不做跨系统引用：
     *  知识库的 RagFlow 文档 ID 与文档中心 fileId 是两套体系，
     *  混用会让后续预览/下载/版本管理都找不到文件。
     * ============================================================ */

    /** 打开弹窗并立即开始匹配 */
    openKbExtract() {
      if (!this.wbWellId) {
        this.$message.warning('该井号缺少工作台 ID，无法提取')
        return
      }
      if (!this.wellName) {
        this.$message.warning('井名为空，无法按井号匹配知识库文档')
        return
      }
      this.kbVisible = true
      this.kbRows = []
      this.kbProgress = { done: 0, total: 0, ok: 0, fail: 0, current: '' }
      this.scanKnowledgeBase()
    },

    /** 读取知识库文档列表并分类 */
    async scanKnowledgeBase() {
      this.kbMatching = true
      this.kbError = ''
      try {
        // 1) 工作台默认知识库（压裂知识库）
        const dsRes = await getRagWorkbenchDatasetApi()
        const ds = (dsRes && dsRes.data) || {}
        this.kbDatasetId = ds.datasetId || ''
        this.kbDatasetName = ds.name || '压裂知识库'
        if (!this.kbDatasetId) {
          throw new Error('未配置工作台默认知识库')
        }

        // 2) 文档列表（一次多取一些，300 份足够覆盖单井匹配范围）
        const docRes = await getRagDocumentsApi(this.kbDatasetId, 1, 300)
        const data = (docRes && docRes.data) || {}
        this.kbDocs = data.list || []

        // 3) 需要工作台全部井名，用来识别「这其实是别的井的文档」
        const allWellNames = await this.fetchAllWellNames()

        // 4) 分类
        const rows = classifyAll(this.kbDocs, this.wellName, allWellNames, this.modules)
        // 默认只勾「本井」+ 类型明确命中的；其他井的默认不勾，由用户自己决定
        rows.forEach(r => {
          r.picked = r.isSelf
        })
        this.kbRows = rows

        if (!rows.length) {
          this.$message.info('知识库里没有可识别的文档')
        }
      } catch (e) {
        this.kbError = (e && e.message) || '读取知识库失败'
        this.kbRows = []
      } finally {
        this.kbMatching = false
      }
    },

    /**
     * 取工作台全部井名。
     * 来源是对象树接口，失败时退化为「只有本井」——匹配精度略降但不阻断流程。
     */
    async fetchAllWellNames() {
      try {
        const res = await getObjectTree({ userId: this.userId || 'default' })
        const wells = ((res && res.data) || {}).wells || []
        const names = wells.map(w => w.wellName).filter(Boolean)
        if (this.wellName && names.indexOf(this.wellName) < 0) names.push(this.wellName)
        return names
      } catch (e) {
        return this.wellName ? [this.wellName] : []
      }
    },

    /** 某个结果行可选的落位槽位（该模块下所有 input + 文档中心） */
    kbSlotOptions(row) {
      const mod = this.modules.find(m => m.key === row.moduleKey)
      if (!mod) return [{ value: row.inputKey, label: row.label }]
      const opts = []
      if (mod.key === 'base') {
        opts.push({ value: '__DOC_CENTER__', label: '文档中心 · 设计文档' })
      }
      ;(mod.inputs || []).forEach(inp => {
        opts.push({ value: inp.key, label: inp.label })
      })
      // 兜底：当前值不在选项里也保留，避免 select 显示空
      if (!opts.some(o => o.value === row.inputKey)) {
        opts.unshift({ value: row.inputKey, label: row.label })
      }
      return opts
    },

    /** 用户手动改落位槽位：同步刷新识别类型文字 */
    onKbRowInputChange(row, value) {
      const rule = ruleOf(value)
      if (value === '__DOC_CENTER__') {
        row.label = '设计文档'
      } else if (rule) {
        row.label = rule.label
      }
    },

    /** 从知识库下载 + 登记到工作台 */
    async doKbImport() {
      const picked = this.kbRows.filter(r => r.picked)
      if (!picked.length) return

      this.kbImporting = true
      this.kbProgress = { done: 0, total: picked.length, ok: 0, fail: 0, current: '' }
      const failures = []

      for (let i = 0; i < picked.length; i++) {
        const row = picked[i]
        this.kbProgress.current = row.doc.name
        try {
          // 1) 下载知识库原件
          const blob = await this.downloadKbDoc(row.doc)
          const file = new File([blob], row.doc.name, {
            type: blob.type || 'application/octet-stream'
          })

          // 2) 按槽位登记
          if (row.moduleKey === 'base' && row.inputKey === '__DOC_CENTER__') {
            await this.importToDocCenter(row, file)
          } else {
            await this.importToAttachment(row, file)
          }
          this.kbProgress.ok += 1
          row.imported = true
        } catch (e) {
          this.kbProgress.fail += 1
          failures.push(`${row.doc.name}：${(e && e.message) || '失败'}`)
          row.imported = false
        } finally {
          this.kbProgress.done += 1
        }
      }

      this.kbImporting = false
      this.kbProgress.current = ''

      // 3) 刷新页面数据（附件 / 文档中心）
      await this.loadAttachments()
      this.$nextTick(() => {
        if (this.$refs.docPanel && this.$refs.docPanel.reload) this.$refs.docPanel.reload()
      })

      if (failures.length) {
        this.$alert(failures.join('\n'), `部分文档提取失败（${failures.length} 份）`, {
          type: 'warning',
          customClass: 'kb-extract__fail-dialog'
        })
        this.$message.warning(`已落位 ${this.kbProgress.ok} 份，失败 ${failures.length} 份`)
      } else {
        this.$message.success(`已从知识库落位 ${this.kbProgress.ok} 份文档`)
        this.kbVisible = false
      }
    },

    /** 下载知识库文档为 Blob（走知识库代理接口，前端不直连 RagFlow） */
    async downloadKbDoc(doc) {
      const blob = await downloadRagDocumentApi(this.kbDatasetId, doc.id, doc.name)
      // axios responseType=blob 时拿到的就是 Blob；有些拦截器会包一层 data
      const body = (blob && blob.data instanceof Blob) ? blob.data : blob
      if (!(body instanceof Blob)) {
        throw new Error('知识库返回内容不是文件')
      }
      // 后端失败时会返回 JSON 错误体（很小），这里识别出来给出可读提示
      if (body.size < 2048 && /json/i.test(body.type || '')) {
        const text = await body.text()
        try {
          const j = JSON.parse(text)
          throw new Error(j.message || '知识库下载失败')
        } catch (err) {
          if (err instanceof Error && err.message !== 'Unexpected end of JSON input') throw err
          throw new Error('知识库下载失败')
        }
      }
      return body
    },

    /** 落到文档中心（COMM_WB_WELL_DOC） */
    async importToDocCenter(row, file) {
      const res = await wellDocApi.uploadWellDoc(this.wbWellId, file, {
        docType: row.docType || 'OTHER',
        wellName: this.wellName,
        remark: `从知识库提取（原始文档：${row.doc.name}）`,
        userId: this.userId || 'default'
      })
      if (!(res && (res.code === 0 || res.code === 200 || res.code === 'OK'))) {
        throw new Error((res && res.message) || '登记文档中心失败')
      }
    },

    /** 落到附件槽位（COMM_WB_ATTACHMENT） */
    async importToAttachment(row, file) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('wbWellId', this.wbWellId)
      formData.append('attachmentType', row.inputKey)
      formData.append('userId', this.userId || 'default')
      const res = await uploadAttachment(formData)
      if (!(res && (res.code === 0 || res.code === 200 || res.code === 'OK'))) {
        throw new Error((res && res.message) || '登记附件失败')
      }
    },

    /** 跳知识库页（弹窗内无结果时的出口） */
    goKnowledge() {
      this.kbVisible = false
      const r = this.$router.push({ path: '/knowledge/list' })
      if (r && typeof r.catch === 'function') r.catch(() => {})
    },

    /** 文件大小格式化（模板里用） */
    fmtSize
  }
}
</script>

<style lang="scss" scoped>
.well-workbench {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  /* 完整高度链路（2026-11 起 AppMain 不再带 padding，改为统一铺浅灰底）：
     100vh - 56px(horizontal-navbar) - 16px(自身 padding-top)
     - 16px(自身 padding-bottom) - 12px(自身底部 gap)
     → 56 + 16 + 16 + 12 = 100px，取 100px。
     改 AppMain 的 padding 时必须同步改这里，否则底部会多出/少掉一块空白。 */
  height: calc(100vh - 100px);
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  padding: 16px 20px;
}

/* 面包屑 */
.ww-breadcrumb {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 头部信息 */
.ww-hero {
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(90deg, #ecf5ff 0%, #f7fbff 100%);
  border: 1px solid #d9ecff;
  border-radius: 6px;
}

.ww-hero__left {
  flex: 1 1 auto;        /* 关键：占据剩余空间，把按钮推到最右 */
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  overflow: hidden;
}

.ww-hero__icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #409eff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.ww-hero__info {
  flex: 1 1 0%;
  min-width: 0;
  overflow: hidden;
}

.ww-hero__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  min-width: 0;
  flex-wrap: wrap;
  line-height: 1.4;
}

.ww-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin-top: 6px;
  font-size: 12px;
  color: #606266;
  min-width: 0;
  line-height: 1.7;
}

.ww-hero__actions {
  flex-shrink: 0;        /* 不被压缩 */
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
  margin-left: auto;     /* 兜底：强制推到最右 */
}

/* 卡片栅格：flex 两列等高 */
.ww-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;   /* 关键：不允许换行，否则会上下堆叠 */
  gap: 12px;
  flex-shrink: 0;
  min-width: 0;
  align-items: stretch;
}

/* 每个在 ww-row 内的卡片 */
.ww-card--flex {
  flex: 1 1 0%;
  min-width: 0;
  width: auto;         /* 覆盖 .ww-card 的 width:100% */
  overflow: hidden;
}

/* 独占整行的卡片（设计文档 / 附件管理），宽度撑满 */
.ww-card--full {
  width: 100%;
  min-width: 0;
  flex-shrink: 0;
  overflow: hidden;
}

/* 独立行卡片（技术标准、附件管理）：铺满整行 */
.ww-card {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  min-width: 0;
  width: 100%;
}

/* 内容超限时卡内滚动 */
.ww-scroll {
  display: flex;
  flex-direction: column;
  max-height: 340px;
  overflow: hidden;
}

.ww-scroll .ww-card__body {
  flex: 1 1 auto;
  min-height: 120px;
  max-height: none;
  overflow: auto;
}

.ww-card__header {
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

.ww-card__body {
  min-height: 120px;
  max-height: 320px;
  overflow: auto;
}

/* 「输出与归档」是**容器卡片**，里面装着两张说明卡片（设计模板 / 生成工程设计）
 * 和一整个文档中心面板。容器自己绝不能再滚动：
 *   - 一旦这里 overflow:auto + max-height:320px，它会把内部 460px 高的
 *     文档面板压扁，面板内部的表格也跟着溢出 → 右侧出现
 *     「容器滚动条 + 面板滚动条 + 表格滚动条」三根套娃，看起来像阶梯。
 * 正确做法：容器按内容自然撑开，只在最内层的 el-table 里滚动。
 * 注意两点：
 *   ① 必须用 ID 覆盖而不是改 .ww-card__body —— 后者是「单行小卡片」的通用规则；
 *   ② DOM 实际层次是 #ww-out-archive > .el-card__body > .ww-card__body，
 *      el-card 会自动插一层 .el-card__body，选择器不能少这一级。
 */
#ww-out-archive .ww-card__body {
  max-height: none;
  overflow: visible;
}

.ww-alert {
  margin-bottom: 10px;
}

/* kv 列表 */
.ww-group + .ww-group {
  margin-top: 12px;
}

.ww-group__title {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  padding: 4px 0;
  border-bottom: 1px dashed #ebeef5;
  margin-bottom: 6px;
}

.ww-kv {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  /* API 数据只剩半幅宽，键值对按单列排（半宽下多列会被挤成断行） */
  grid-template-columns: 1fr;
  gap: 2px;

  li {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
    line-height: 1.9;
    border-bottom: 1px solid #fafafa;
  }
}

.ww-kv__k {
  /* 标签按内容自适应，最多占 46%：以前固定 42% + nowrap 会让长标签被截成省略号 */
  flex: 0 1 auto;
  max-width: 46%;
  color: #909399;
  word-break: break-word;
}

.ww-kv__v {
  flex: 1 1 auto;
  min-width: 0;
  color: #303133;
  word-break: break-word;
}

/* 附件管理 */
.attachment-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 8px;
  margin-bottom: 12px;
}

.ww-op-btns {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

::v-deep .ww-op-btns {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

::v-deep .attachment-panel .el-upload {
  display: inline-block;
  flex-shrink: 0;
}

::v-deep .attachment-panel .el-table {
  width: 100%;
  max-width: 100%;
}

/* 文件类型标签 */
.file-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}
.file-type-badge i { font-size: 12px; }
.file-type--image { background: #f0f9eb; color: #67c23a; }
.file-type--docx  { background: #ecf5ff; color: #409eff; }
.file-type--xlsx  { background: #fdf6ec; color: #e6a23c; }
.file-type--csv   { background: #fdf6ec; color: #e6a23c; }
.file-type--txt   { background: #f4f4f5; color: #909399; }
.file-type--pdf   { background: #fef0f0; color: #f56c6c; }
.file-type--other { background: #f4f4f5; color: #909399; }

/* 预览弹窗 */
.attachment-preview-dialog .el-dialog__body { padding: 12px 16px; }
.att-preview-wrap { min-height: 400px; max-height: 72vh; overflow: auto; }
/* Excel 预览：sheet 条与表格由 ExcelSheetPreview 自带样式，这里只管容器撑开 */
.att-preview-wrap--xlsx { display: flex; flex-direction: column; }
.att-preview__image { text-align: center; }
.att-preview__image img { max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 4px; }
.att-preview__docx { overflow: auto; max-height: 70vh; }
::v-deep .att-preview__docx .docx-wrapper { box-shadow: none !important; }
.att-preview__pdf iframe {
  width: 100%;
  height: 70vh;
  border: none;
  border-radius: 4px;
  background: #fff;
}
.att-preview__text pre {
  margin: 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 70vh;
  overflow: auto;
}
.att-preview__empty { padding: 40px; text-align: center; color: #999; }
.att-preview__unsupported { padding: 60px 0; text-align: center; color: #c0c4cc; }
.att-preview__unsupported i { font-size: 48px; margin-bottom: 12px; }
.att-preview__unsupported p { margin: 0; font-size: 14px; }

/* ===================== 模块化材料收集 ===================== */

.ww-progress-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0 0 14px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.ww-progress-bar__left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.ww-progress-bar__label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.ww-progress-bar__detail {
  font-size: 12px;
  color: #909399;
}

.ww-progress-bar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ww-progress-bar__hint {
  color: #909399;
  cursor: help;
}

.ww-modnav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.ww-modnav__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  transition: all .18s;

  i { color: #909399; }

  &:hover {
    border-color: #409eff;
    color: #409eff;
    i { color: #409eff; }
  }

  &.is-ready {
    border-color: #b3e19d;
    background: #f0f9eb;
    color: #529b2e;
    i { color: #67c23a; }
  }
}

.ww-modnav__badge {
  padding: 0 4px;
  font-size: 11px;
  color: #909399;
  background: #f5f7fa;
  border-radius: 8px;
}

/**
 * 泵注格的三段式徽标（设计 N 段 · 已明确 M 段 · 有数据 K 段）。
 *
 * 文案比原来的「6/6」长得多，所以：
 * ① 字号收到 11px、字距压一点，整串不放空格分隔符以外的填充；
 * ② white-space: nowrap —— 一旦折行，徽标会撑成两行把导航项拉高，
 *    整条导航高度不一致比文字略宽更难看；
 * ③ 允许导航项自身换行（.ww-modnav 已是 flex-wrap: wrap），
 *    窄屏下这一格整体掉到第二行，不会挤压其他模块；
 * ④ 数字用等宽字体，避免「6/6」→「9 段」刷新时左右跳动。
 */
.ww-modnav__badge--stage {
  position: relative;
  padding: 0 6px;
  font-size: 11px;
  letter-spacing: -0.2px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  cursor: help;
}

/**
 * 透明的 hover 感应层，铺满徽标。
 *
 * el-tooltip 只会给「直接子元素」绑事件，而这里徽标的直接子元素若是文字 span，
 * 它的盒模型会被徽标的 padding 切开 —— 鼠标停在徽标的内边距上就不触发 tooltip。
 * 所以放一个绝对定位的透明层专门收事件，文字单独一层只负责显示。
 */
.ww-modnav__stage-mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: block;
}

.ww-modnav__stage-text {
  position: relative;
  z-index: 0;
}

/* 泵注徽标的 tooltip 正文：逐行 div 渲染，行距与最大宽度都收紧，避免横贯整屏 */
.ww-stage-tip {
  max-width: 360px;
  line-height: 1.65;
  font-size: 12px;

  .is-warn {
    color: #e6a23c;
    margin-top: 4px;
  }
}

/**
 * 泵注分段明细条：导航下面一行，逐段摊开「设计 / 已明确 / 有数据」。
 * 灰色=只在地质设计里出现；蓝色=射孔方案已定；绿色=泵注程序已有数据。
 */
.ww-stage-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: -6px 0 14px;
  padding: 6px 10px;
  background: #fafbfc;
  border: 1px dashed #e4e7ed;
  border-radius: 4px;
  font-size: 11px;
  color: #909399;
}

.ww-stage-strip__label {
  flex-shrink: 0;
  font-weight: 600;
  color: #606266;

  i { margin-right: 3px; color: #c0c4cc; }
}

.ww-stage-strip__list {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.ww-stage-chip {
  padding: 1px 7px;
  border-radius: 9px;
  background: #f0f2f5;
  border: 1px solid #e4e7ed;
  color: #a8abb2;
  white-space: nowrap;

  em { font-style: normal; margin-left: 2px; }

  &.is-known {
    background: #ecf5ff;
    border-color: #b3d8ff;
    color: #409eff;
  }

  &.is-data {
    background: #f0f9eb;
    border-color: #b3e19d;
    color: #529b2e;
  }
}

.ww-stage-strip__legend {
  flex-shrink: 0;
  color: #c0c4cc;
}

.ww-module-anchor {
  scroll-margin-top: 12px;
}

.ww-out-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

@media (max-width: 1200px) {
  .ww-out-grid { grid-template-columns: 1fr; }
}

.ww-out-item {
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 5px;
  background: #fcfcfd;
}

.ww-out-item__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;

  i { color: #409eff; }
}

.ww-out-item__desc {
  margin: 6px 0 10px;
  font-size: 12px;
  line-height: 1.65;
  color: #606266;
}

.ww-out-item__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ww-doc-panel {
  margin-top: 4px;
}

.ww-rules-tip {
  margin-top: 10px;
  padding: 8px 10px;
  background: #f4f8ff;
  border-radius: 3px;
  font-size: 12px;
  color: #5a6b83;

  i { color: #409eff; margin-right: 4px; }
}

/* ============================================================
 *  一键从知识库提取弹窗
 *  弹窗挂在 body 上（append-to-body），scoped 会加上 data-v 属性，
 *  因此这里只能写弹窗「内部」的元素，不能写 .el-dialog 本身。
 *  外层宽度/位置通过 dialog 的 width / top 属性控制。
 * ============================================================ */
.kb-extract__alert {
  margin-bottom: 12px;
}

.kb-extract__alert-title {
  font-size: 13px;
  color: #303133;

  b { color: #409eff; }
}

.kb-extract__alert-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
}

.kb-extract__showall {
  margin-left: 12px;

  ::v-deep .el-checkbox__label {
    font-size: 12px;
    padding-left: 6px;
    color: #909399;
  }
}

.kb-extract__error {
  padding: 12px 14px;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  font-size: 12px;
  color: #f56c6c;

  i { margin-right: 6px; }
}

.kb-extract__group {
  margin-bottom: 14px;
}

.kb-extract__group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #303133;

  > i {
    color: #409eff;
    font-size: 14px;
  }
}

.kb-extract__group-name {
  font-weight: 600;
}

.kb-extract__group-desc {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kb-extract__table {
  width: 100%;
}

.kb-extract__file-icon {
  color: #909399;
  margin-right: 4px;
}

.kb-extract__tag {
  margin-left: 6px;
}

.kb-extract__progress {
  margin-top: 6px;
  padding: 10px 12px;
  background: #f7fbff;
  border: 1px solid #e4eefc;
  border-radius: 4px;
}

.kb-extract__progress-text {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #606266;
  word-break: break-all;
}
</style>


