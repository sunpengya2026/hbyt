<template>
  <div class="report-editor-container">
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button icon="el-icon-arrow-left" size="small" @click="goBack">返回</el-button>
        <el-divider direction="vertical" />
        <el-button-group>
          <el-button size="small" icon="el-icon-document" @click="handleSave" :loading="saving">
            保存
          </el-button>
          <el-button size="small" icon="el-icon-video-play" type="primary"
                     :loading="exporting" :disabled="exporting" @click="handleExportWord">
            {{ exporting ? '导出中...' : '导出Word' }}
          </el-button>
        </el-button-group>
      </div>
      <div class="toolbar-right">
        <el-button size="small" icon="el-icon-magic-stick" style="color: #52c41a;" @click="handleAiRewrite">
          AI续写
        </el-button>
        <el-button size="small" icon="el-icon-connection" style="color: #722ed1;" @click="handleAiFillData">
          <i class="el-icon-connection"></i>
          AI智能填充
        </el-button>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-main">
      <!-- ===== 左侧章节导航（点击定位 + 生成方式 + 完成度） ===== -->
      <div v-if="outline.length" :class="['outline-panel', { collapsed: outlineCollapsed }]">
        <div class="outline-head">
          <div class="outline-head-main">
            <i class="el-icon-notebook-2"></i>
            <span class="outline-head-title">章节导航</span>
            <span class="outline-head-count">{{ outlineStats.total }}</span>
          </div>
          <i
            :class="['outline-toggle', outlineCollapsed ? 'el-icon-s-unfold' : 'el-icon-s-fold']"
            :title="outlineCollapsed ? '展开章节导航' : '收起章节导航'"
            @click="outlineCollapsed = !outlineCollapsed"
          ></i>
        </div>

        <!-- 收起态：竖排提示 + 完成度百分比，展开后自动隐藏 -->
        <div v-if="outlineCollapsed" class="outline-collapsed-tip">
          <span v-if="!outlineFromDom" class="oc-percent">{{ outlineStats.percent }}%</span>
          <span class="oc-text">章节导航</span>
        </div>

        <!-- 射孔方式：决定用哪套模板章节做导航骨架 -->
        <div v-if="!outlineCollapsed" class="outline-perf">
          <span class="op-label">射孔方式</span>
          <el-select
            :value="perforationMethod"
            size="mini"
            class="op-select"
            @change="handlePerforationChange"
          >
            <el-option
              v-for="m in perforationMethods"
              :key="m"
              :label="m"
              :value="m"
            ></el-option>
          </el-select>
        </div>

        <div v-if="!outlineFromDom" class="outline-progress">
          <div class="outline-progress-bar">
            <div class="outline-progress-inner" :style="{ width: outlineStats.percent + '%' }"></div>
          </div>
          <span class="outline-progress-text">
            <template v-if="outlineMode === 'spec'">有内容 {{ outlineStats.filled }}/{{ outlineStats.total }}</template>
            <template v-else>完成度 {{ outlineStats.percent }}%</template>
          </span>
        </div>
        <!-- 提取覆盖率：只统计「需要源文档供数」的章，模板条文章不计入分母。
             否则用户会以为「1/11 = 只提取到第一章」，其实是那 5 章本来就由模板生成。 -->
        <div v-if="outlineMode === 'spec' && outlineStats.dataTotal" class="outline-substat">
          源文档覆盖 {{ outlineStats.dataFilled }}/{{ outlineStats.dataTotal }}
          <em class="outline-substat-hint">（另有 {{ outlineStats.tmplTotal }} 章由模板生成）</em>
        </div>

        <el-scrollbar class="outline-scroll" ref="outlineScroll">
          <div class="outline-list">
            <div
              v-for="node in outline"
              :key="node.uid"
              :class="[
                'outline-item',
                'lv-' + node.level,
                {
                  active: activeSectionUid === node.uid,
                  empty: node.statusKey === 'empty' || (!node.filled && node.statusKey !== 'group'),
                  pending: node.pending
                }
              ]"
              :style="{ paddingLeft: 12 + (node.level - 1) * 14 + 'px' }"
              :title="node.titleFull + '　·　' + node.genLabel"
              @click="scrollToSection(node)"
            >
              <span class="outline-no">{{ node.no }}</span>
              <span class="outline-text">{{ node.title }}</span>
              <span :class="['outline-dot', node.statusKey]"></span>
            </div>
          </div>
        </el-scrollbar>

        <div class="outline-legend">
          <template v-if="outlineMode === 'spec'">
            <span><i class="lg lg-ok"></i>正文有内容</span>
            <span><i class="lg lg-empty"></i>待源文档提取</span>
            <span><i class="lg lg-tmpl"></i>模板生成</span>
            <span><i class="lg lg-group"></i>模板子条目</span>
          </template>
          <template v-else-if="!outlineFromDom">
            <span><i class="lg lg-ok"></i>已生成</span>
            <span><i class="lg lg-empty"></i>占位待补</span>
            <span><i class="lg lg-pending"></i>待开发</span>
          </template>
          <template v-else>
            <span><i class="lg lg-ok"></i>源文档章节</span>
          </template>
        </div>
      </div>

      <div class="panel editor-panel">
        <div class="panel-header">
          <span>文档编辑器 - {{ wellName }}</span>
          <div>
            <el-button size="small" icon="el-icon-upload2" @click="handleImport">
              导入文档
            </el-button>
          </div>
        </div>

        <!-- 富文本工具栏 -->
        <div class="rich-toolbar">
          <el-button-group class="toolbar-group">
            <el-button size="mini" @click="execCommand('undo')" title="撤销">
              <i class="el-icon-refresh-left"></i>
            </el-button>
            <el-button size="mini" @click="execCommand('redo')" title="重做">
              <i class="el-icon-refresh-right"></i>
            </el-button>
          </el-button-group>

          <div class="toolbar-divider"></div>

          <el-button-group class="toolbar-group">
            <el-button size="mini" @click="execCommand('bold')" title="加粗">
              <i class="el-icon-batch-delete"></i>
            </el-button>
            <el-button size="mini" @click="execCommand('italic')" title="斜体">
              <i class="el-icon-edit"></i>
            </el-button>
            <el-button size="mini" @click="execCommand('underline')" title="下划线">
              <i class="el-icon-minus"></i>
            </el-button>
          </el-button-group>

          <div class="toolbar-divider"></div>

          <el-button-group class="toolbar-group">
            <el-button size="mini" @click="formatBlock('h1')" title="标题1">H1</el-button>
            <el-button size="mini" @click="formatBlock('h2')" title="标题2">H2</el-button>
          </el-button-group>

          <div class="toolbar-divider"></div>

          <el-button-group class="toolbar-group">
            <el-button size="mini" @click="execCommand('insertUnorderedList')" title="无序列表">
              <i class="el-icon-s-unfold"></i>
            </el-button>
            <el-button size="mini" @click="execCommand('insertOrderedList')" title="有序列表">
              <i class="el-icon-s-operation"></i>
            </el-button>
          </el-button-group>

          <div class="toolbar-divider"></div>

          <el-button-group class="toolbar-group">
            <el-button size="mini" @click="insertTable" title="表格">
              <i class="el-icon-s-grid"></i>
            </el-button>
            <el-button size="mini" @click="insertImage" title="图片">
              <i class="el-icon-picture"></i>
            </el-button>
          </el-button-group>

          <div class="toolbar-divider"></div>

          <el-button size="mini" style="color: #3D5FEF;" @click="showAnnotationDialog" title="添加标注">
            <i class="el-icon-price-tag"></i> 标注
          </el-button>

          <el-button size="mini" style="color: #722ed1;" @click="handleAiFillData" title="AI智能填充数据">
            <i class="el-icon-connection"></i> AI填充
          </el-button>
        </div>

        <!-- 流式提取生成进度条（编辑框外的「生成说明」区） -->
        <div v-if="isStreaming" class="stream-banner">
          <div class="stream-banner-left">
            <i class="el-icon-loading stream-icon"></i>
            <span class="stream-status">{{ streamingStatus || '正在提取并生成...' }}</span>
          </div>
          <div class="stream-banner-right">
            <el-progress
              :percentage="streamingProgress"
              :stroke-width="10"
              :show-text="false"
              style="width: 180px;"
            />
            <span class="stream-percent">{{ streamingProgress }}%</span>
          </div>
        </div>

        <!-- 说明性状态条已移除：文档级「生成文档说明」不再展示，
             只保留下方按章节的「生成说明」条（sec-info）。 -->

        <!-- ===== 当前章节「生成说明」条（点击左侧导航 / 滚动正文时更新） ===== -->
        <div v-if="activeSection" class="sec-info">
          <div class="sec-info-head">
            <span class="sec-info-title">{{ activeSection.titleFull }}</span>
            <span :class="['sec-info-tag', activeSection.statusKey]">{{ activeSection.genLabel }}</span>
            <span v-if="!outlineFromDom" :class="['sec-info-pct', activeSection.statusKey]">{{ activeSection.percent }}%</span>
          </div>
          <!-- 兜底模式（源文档原文）没有完成度概念，只显示来源说明 -->
          <div class="sec-info-line">
            <span class="sec-info-key">数据来源</span>
            <span class="sec-info-val">{{ activeSection.genDesc }}</span>
          </div>
          <div v-if="!outlineFromDom" class="sec-info-line">
            <span class="sec-info-key">完成情况</span>
            <span class="sec-info-val">{{ activeSection.fillText }}</span>
          </div>
          <div v-if="outlineFromDom" class="sec-info-line">
            <span class="sec-info-key">完成情况</span>
            <span class="sec-info-val">源文档原文，可直接在右侧编辑</span>
          </div>
          <!-- 操作提示按「数据章 / 模板章」区分：
               数据章没内容 = 源文档确实没提取到，需要人工补；
               模板章没内容 = 本来就不在地质设计里，由模板条文生成，不是漏项。 -->
          <div v-if="outlineMode === 'spec' && !activeSection.filled" class="sec-info-line">
            <span class="sec-info-key">操作</span>
            <span v-if="activeSection.dataDriven" class="sec-info-val warning">
              源文档中未提取到本章内容：可在右侧补写，或检查上传的压裂地质设计是否包含该章
            </span>
            <span v-else class="sec-info-val">
              本章由「{{ perforationMethod }}」模板条文 / 内置标准数据生成，不依赖上传材料；导出 Word 时自动补全，也可在此手工补写
            </span>
          </div>
          <div v-if="activeSection.gen === 'LLM'" class="sec-info-line">
            <span class="sec-info-key">备注</span>
            <span class="sec-info-val warning">该章节由大模型生成，内容需人工复核</span>
          </div>
        </div>

        <!-- 编辑器正文（只放正文内容：封面 + 章节正文；不含任何状态/说明/统计） -->
        <div
          class="editor-content"
          contenteditable="true"
          ref="editorContent"
          v-html="safeEditorContent"
          @input="handleContentChange"
          @paste="handleEditorPaste"
          @drop.prevent"
          @scroll="handleEditorScroll"
          @wheel="unlockScrollSpy"
          @touchstart="unlockScrollSpy"
          @keydown="unlockScrollSpy"
        ></div>
      </div>
    </div>

    <!-- 标注类型选择对话框 -->
    <el-dialog title="选择标注类型" :visible.sync="annotationDialogVisible" width="400px">
      <div class="annotation-options">
        <div
          v-for="tag in annotationTags"
          :key="tag.type"
          :class="['annotation-option', { selected: selectedAnnotationType === tag.type }]"
          @click="selectedAnnotationType = tag.type"
        >
          <span :class="['annotation-tag', tag.class]">{{ tag.label }}</span>
          <span class="annotation-desc">{{ tag.description }}</span>
        </div>
      </div>
      <span slot="footer">
        <el-button @click="annotationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="insertAnnotation">添加标注</el-button>
      </span>
    </el-dialog>

    <!-- AI智能填充对话框 -->
    <el-dialog
      title="AI智能填充数据"
      :visible.sync="aiFillDialogVisible"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="ai-fill-container">
        <!-- 自动填充进度 -->
        <div v-if="aiLoading && autoFillStatus" class="auto-fill-progress">
          <el-progress :percentage="autoFillProgress" :format="p => p + '%'" />
          <p class="auto-fill-status">{{ autoFillStatus }}</p>
        </div>

        <!-- 步骤指示（非自动模式） -->
        <div class="ai-steps" v-if="!aiLoading">
          <el-steps :active="aiCurrentStep" finish-status="success" simple>
            <el-step title="分析批注" description="识别需要填充的数据" />
            <el-step title="生成SQL" description="调用大模型生成查询" />
            <el-step title="执行查询" description="查询数据库" />
            <el-step title="填充数据" description="替换文档内容" />
          </el-steps>
        </div>

        <!-- 待填充批注列表 -->
        <div class="pending-annotations" v-if="aiCurrentStep === 0 && !aiLoading">
          <h4>待填充的API批注（共 {{ pendingAnnotations.length }} 条）</h4>
          <el-table :data="pendingAnnotations" border size="small" max-height="300">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="annotationText" label="批注位置内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="query" label="查询语句" min-width="150" show-overflow-tooltip>
              <template slot-scope="scope">
                <span>{{ scope.row.query || '自动生成' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="dataSource" label="状态" width="100">
              <template slot-scope="scope">
                <el-tag v-if="scope.row.result" type="success" size="mini">已填充</el-tag>
                <el-tag v-else type="info" size="mini">待填充</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template slot-scope="scope">
                <el-button type="text" size="mini" @click="editAnnotationQuery(scope.$index, scope.row)">
                  编辑查询
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- SQL生成结果 -->
        <div class="sql-result" v-if="aiCurrentStep >= 1 && !aiLoading">
          <h4>生成的SQL</h4>
          <el-input
            type="textarea"
            v-model="currentSql"
            :rows="4"
            placeholder="SQL语句将显示在这里"
            style="font-family: monospace;"
          />
          <div class="sql-actions" v-if="aiCurrentStep === 1">
            <el-button type="primary" size="small" @click="executeAiQuery" :loading="aiLoading">
              执行查询
            </el-button>
            <el-button size="small" @click="regenerateSql" :loading="aiLoading">
              重新生成
            </el-button>
            <el-button size="small" type="text" @click="aiCurrentStep = 0">
              返回修改
            </el-button>
          </div>
        </div>

        <!-- 查询结果 -->
        <div class="query-result" v-if="aiCurrentStep >= 2">
          <h4>查询结果</h4>
          <div v-if="queryResults.length > 0" class="result-data">
            <p class="result-summary">
              <el-tag type="success" size="small">查询成功</el-tag>
              返回 {{ queryResults.length }} 条数据
            </p>
            <el-table :data="queryResults" border size="small" max-height="200">
              <el-table-column
                v-for="(val, key) in queryResults[0]"
                :key="key"
                :prop="key"
                :label="key"
                min-width="120"
              />
            </el-table>
          </div>
          <div v-else-if="queryError" class="result-error">
            <el-alert type="error" :title="queryError" show-icon :closable="false" />
          </div>
          <div v-else class="result-loading">
            <el-skeleton :rows="3" animated />
          </div>
        </div>

        <!-- 填充预览 -->
        <div class="fill-preview" v-if="aiCurrentStep >= 3">
          <h4>填充预览</h4>
          <el-input
            type="textarea"
            v-model="fillPreview"
            :rows="3"
            readonly
            placeholder="填充内容预览"
          />
          <p class="preview-tip">
            <i class="el-icon-info"></i>
            勾选要填充的字段后点击"确认填充"将替换文档中的内容
          </p>
        </div>
      </div>

      <span slot="footer">
        <el-button @click="aiFillDialogVisible = false">取消</el-button>
        <el-button v-if="aiCurrentStep < 3" type="primary" @click="nextAiStep" :disabled="!canProceed">
          下一步
        </el-button>
        <el-button v-if="aiCurrentStep >= 2" type="success" @click="confirmFillData">
          确认填充
        </el-button>
      </span>
    </el-dialog>

    <!-- 编辑查询对话框 -->
    <el-dialog
      title="编辑数据查询"
      :visible.sync="editQueryDialogVisible"
      width="700px"
    >
      <el-form :model="editQueryForm" label-width="100px">
        <el-form-item label="批注内容">
          <el-input v-model="editQueryForm.annotationText" readonly />
        </el-form-item>
        <el-form-item label="自然语言查询">
          <el-input
            type="textarea"
            v-model="editQueryForm.query"
            :rows="3"
            placeholder="用自然语言描述要查询的数据，如：查询这口井的压裂段数"
          />
        </el-form-item>
        <el-form-item label="指定表（可选）">
          <el-select
            v-model="editQueryForm.tables"
            multiple
            filterable
            placeholder="可选择相关表"
            style="width: 100%"
          >
            <el-option
              v-for="table in availableTables"
              :key="table"
              :label="table"
              :value="table"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="editQueryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveQueryAndClose" :loading="aiLoading">
          生成SQL
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { sanitizeRichText } from '@/utils/sanitize-rich-text'
import { naturalLanguageQuery, getAllTables, generateSql, executeSql } from '@/api/database'
// ⚠️ 大文件跨路由传递走内存单例，不走 sessionStorage（5MB 配额扛不住 base64）
import { takeExtractTask } from '@/utils/extractHandoff'
// ⚠️ 智能体生成的正文同样可能超过 5MB，走内存单例 + token；兼容旧版 sessionStorage 数据
import { takeAgentDocument } from '@/utils/agentHandoff'
import {
  readDocumentContentApi,
  streamGenerateApi,
  extractDocumentImagesApi,
  extractDocumentTablesApi,
  exportWordWithMetaApi
} from '@/api/annotation'
import {
  PERFORATION_METHODS,
  DEFAULT_PERFORATION_METHOD,
  TEMPLATE_SECTIONS,
  TEMPLATE_SPEC_MAP,
  DATA_DRIVEN_SECTIONS,
  matchTemplateTitle,
  matchTemplateTitleLevel,
  isCaptionText,
  normalizeHeadingText,
  loadPerforationMethod,
  savePerforationMethod
} from './perforationTemplate'

/**
 * 判断一个字符串「像井名」而不是「井库 ID」。
 *
 * <p>井名形态：「安13-7-3平3」「郑58-5B-3平1」；井库 ID 形态：「HB00022534」。
 * 编辑器历史上被传过 {@code query.wellId = 井名}，存进 {@code this.wellId} 后
 * 又经 {@code resolveWbWellId()} 回流成路由 params，导致单井工作台拿井名
 * 去查井库、后端返回「井不存在」。</p>
 *
 * <p>口径刻意宽松（宁可误判成井名）：井库 ID 不含中文、不以「井」结尾、不带空格。
 * 误判代价只是退化成本地井（local~ 前缀），远小于跳进必然报错的页面。</p>
 *
 * @param {String} s 待判定值
 * @returns {Boolean} true = 看起来是井名，不能当井库 ID / 工作台井号用
 */
function isWellNameLike(s) {
  const v = String(s == null ? '' : s).trim()
  if (!v) return true
  if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(v)) return true
  if (/井$/.test(v)) return true
  if (/\s/.test(v)) return true
  return false
}

export default {
  name: 'ReportEditor',
  data() {
    return {
      wellId: null,
      wellName: '文档编辑器',
      fileName: '',
      fileData: null,
      annotations: [],
      editorContent: '',
      defaultEditorContent: '',
      saving: false,
      exporting: false,
      /** 最近一次「保存到文档中心」成功后的 fileId（文档中心/本地存储的标识） */
      savedDocId: '',
      loading: false,
      annotationDialogVisible: false,
      selectedAnnotationType: 'tag-api',
      annotationTags: [
        { type: 'tag-api', label: 'API数据', class: 'tag-api', description: '来自系统API接口的数据' },
        { type: 'tag-source', label: '邻井数据', class: 'tag-source', description: '来自邻井或历史文档的数据' },
        { type: 'tag-calc', label: '计算推导', class: 'tag-calc', description: '通过计算得出的数据' },
        { type: 'tag-std', label: '技术标准', class: 'tag-std', description: '来自知识库技术标准' }
      ],

      // AI智能填充相关
      aiFillDialogVisible: false,
      aiCurrentStep: 0,
      aiLoading: false,
      pendingAnnotations: [],
      currentSql: '',
      currentQuery: '',
      currentAnnotationIndex: -1,
      queryResults: [],
      queryError: '',
      fillPreview: '',
      availableTables: [],
      autoFillProgress: 0,
      autoFillStatus: '',

      // 编辑查询表单
      editQueryDialogVisible: false,
      editQueryForm: {
        index: -1,
        annotationText: '',
        query: '',
        tables: []
      },

      // 流式生成相关
      isStreaming: false,
      streamingProgress: 0,
      streamingStatus: '',
      totalSections: 0,
      generatedSections: [],
      currentSectionIndex: -1,  // 当前正在生成的章节索引
      currentSectionContent: '',   // 当前章节的累积内容（用于逐字输出）

      // 生成文档说明（编辑框外展示：状态 / 统计 / 提取规则）
    // 文档级说明区（生成文档说明）已移除，仅保留按章节的 sec-info


      // ===== 左侧章节导航 =====
      sectionReports: [],        // 后端 sectionReport 原始数据（key/no/title/level/generation/length）
      // 文档级元信息：只有智能体链路带回（wellGroup / targetLayer），
      // 严格提取链路为空对象。用于把模板附图标题里的 {#wellGroup}{#targetLayer} 换成真值。
      agentMeta: {},
      outline: [],               // 章节导航树（前序遍历扁平数组，含状态/百分比）
      outlineCollapsed: false,   // 导航是否收起
      activeSectionUid: '',      // 当前高亮章节（滚动定位用 uid）
      outlineStats: { total: 0, filled: 0, percent: 0 }, // 总体完成度
      scrollSpyLockUntil: 0,     // 点击定位后的锁定时间戳，避免滚动监听打架
      clickPinnedUid: '',        // 点击目标章节（用户滚动前一直保持高亮它）
      outlineFromDom: false,     // true = 兜底模式（从正文 DOM 抓标题，无生成方式/完成度）

      // ===== 射孔方式（决定导航用哪套模板章节） =====
      perforationMethod: '',       // 全程固井 / 半程固井 / 滑套压裂
      perforationMethods: PERFORATION_METHODS,
      outlineMode: 'spec',         // spec = 按模板章节（空章保留） | dom = 抓全文标题（旧兜底）
      // 正文接口返回的原始标题序列（[{text,len,img}]），用于「章节是否有内容」的参考口径。
      // 严格提取出来的正文常常是纯 <p>（没有 h1 标题），此时只能靠它判断章节有没有内容。
      sourceHeadings: [],

      // SSE 事件监听器
      streamEventSource: null,

      // 严格提取（第一步）结果
      strictExtractedHtml: '',      // 原文正文 HTML（原样）
      strictExtractedImages: [],    // 原文图片（base64，原样；不含封面图标）
      coverIconImage: null,         // 封面图标（宝石花）：模板批注「首页图标（图标1）」要的那张，只上封面不进正文
      strictExtractedTables: [],    // 原文表格（结构化，原样）
      leftoverImages: [],           // 未能定位到正文的图片（末尾兜底展示）
      extractedFromImages: [],
      strictAnnotations: [],        // 模版批注（决定提取范围/规则）
      strictFilterByWell: false,    // 批注是否要求「只提取井名的信息」
      strictTableAnalysis: []       // 表格分析结果（每张表：是否含井号、命中行数），用于结果页提示
    }
  },
  computed: {
    safeEditorContent() {
      return sanitizeRichText(this.editorContent)
    },
    // 当前高亮的章节节点（用于正文上方的「生成说明」条）
    activeSection() {
      if (!this.activeSectionUid) return null
      return this.outline.find(n => n.uid === this.activeSectionUid) || null
    },
    // 当前操作人（写审计字段用）
    userId() {
      const u = this.$store && this.$store.getters ? this.$store.getters.name : ''
      return u || (this.$store && this.$store.getters && this.$store.getters.userId) || 'default'
    },
    canProceed() {
      switch (this.aiCurrentStep) {
        case 0:
          return this.pendingAnnotations.length > 0
        case 1:
          return this.currentSql && !this.currentSql.startsWith('UNABLE_TO_GENERATE')
        case 2:
          return this.queryResults.length > 0
        default:
          return true
      }
    }
  },
  async created() {
    const params = this.$route.params
    /*
     * 🔴 params.wellId 只接受「井库 ID」（如 HB00022534），绝不能吃进井名。
     *
     * 历史上 fracturing-agent.vue 的 goEditor() 把井名当 wellId 传过来
     * （`query: { wellId: this.wellName }`），于是这里存下「安13-7-3平3」；
     * 后续 resolveWbWellId() 的第三级兜底 `return this.wellId` 又把它当
     * 工作台井号用，返回单井工作台时变成路由 params.wellId →
     * 页面请求 /v1/wells/安13-7-3平3 → 后端返回「井不存在」。
     *
     * 源头已在智能体侧修掉，这里再设一道闸：井名一律不进 wellId，
     * 井名改从 query.wellName 取。宁可丢井库信息，也不能跳到必然报错的页面。
     */
    const rawWellId = params.wellId || (this.$route.query && this.$route.query.wellId) || ''
    this.wellId = isWellNameLike(rawWellId) ? '' : String(rawWellId)
    if (!this.wellId && (this.$route.query && this.$route.query.wellName)) {
      this.wellName = this.$route.query.wellName
    }

    // 射孔方式：导航章节要按「所选射孔方式对应的模板章节」生成，
    // 必须在任何建导航逻辑之前就定下来（各入口都会调 buildOutlineFromTemplate）。
    // 优先级：本地记住的选择 > 工作台选井里带的 PERFORATION_METHOD > 全程固井。
    this.initPerforationMethod()

    // 优先处理「智能提取」任务。
    // ⚠️ 源文件**不在 sessionStorage 里**（4.7MB 文件转 base64 约 6.3MB，超过 5MB 配额
    //    必然写失败，用户看到的「浏览器缓存空间不足」就是这个）。文件走内存单例，
    //    sessionStorage 只存纯字符串元信息，两者用 token 关联 —— 见 utils/extractHandoff.js。
    const handoff = takeExtractTask()
    if (handoff) {
      try {
        const task = handoff.task
        // 把 File 挂回 task，下游 runStrictExtract 仍按 task.sourceFile 取用，不改签名
        if (handoff.file) task.sourceFile = { name: handoff.file.name }
        this.fileName = task.fileName || '提取结果.docx'
        // 井名优先取任务中显式传入的 wellName（文件名为「井名+压裂工程设计文档」）
        this.wellName = task.wellName || this.fileName.replace(/\.docx$/i, '')
        // 模版批注：决定「提取什么」（如「只提取井名的信息」）
        this.strictAnnotations = task.annotations || []
        this.strictFilterByWell = this.detectWellOnlyAnnotation(this.strictAnnotations)
        // 清理，避免刷新后重复触发
        sessionStorage.removeItem('editorDocument')

        this.isStreaming = true
        this.streamingProgress = 0
        this.streamingStatus = '正在提交源文件，准备提取...'
        this.generatedSections = []
        this.currentSectionIndex = -1
        this.currentSectionContent = ''
        this.renderStreamingSections()

        if (task.mode === 'strict-extract') {
          // 第一步：严格提取（原文文字 + 图片 + 表格，不走大模型）
          this.runStrictExtract(task, handoff.file)
        } else {
          // 旧链路（模版批注驱动、走 SSE generate）：源文件走 task.sourceFiles，
          // 与本次内存交接无关，直接调用即可。
          this.runExtractStream(task)
        }
      } catch (e) {
        console.error('解析流式任务失败', e)
        this.$message.error('任务数据异常，请返回重试')
      }

      this.loadAvailableTables()
      return
    }

    // 压裂设计智能体生成的结果（最高优先级）
    // 智能体已经按内置模板骨架把正文排好（含章节顺序 / 字体 / 表格 / 图片），
    // 这里只负责把它放进编辑框、把「字段抽取 / 章节填充」说明放到框外。
    //
    // 🔴 数据来源有两个（2026-11-16）：
    //    a) 新版智能体页：大对象在内存单例里，sessionStorage 只存 token
    //       → takeAgentDocument() 按 token 取回，避免 5MB 配额撑爆
    //    b) 旧版智能体页（线上未刷新的标签页）：整个 payload 就存在
    //       sessionStorage['agentEditorDocument'] 里 → 同一函数里兼容解析
    const agentData = takeAgentDocument()
    if (agentData) {
      try {
        this.loadAgentResultView(agentData)
      } catch (e) {
        console.error('加载智能体结果失败', e)
        this.$message.error('智能体结果数据异常')
      }
      this.loadAvailableTables()
      return
    }

    // 从 sessionStorage 加载文档数据
    // 优先级：地质设计文档 > 提取结果 > 普通文档
    const geologicalData = sessionStorage.getItem('geologicalEditorDocument')
    const extractionData = sessionStorage.getItem('extractionEditorData')
    const editorData = geologicalData || extractionData || sessionStorage.getItem('editorDocument')

    if (editorData) {
      try {
        const data = JSON.parse(editorData)
        this.fileName = data.fileName || data.wellName + '_地质设计.docx'
        this.fileData = data.fileData
        this.annotations = data.annotations || []
        this.wellName = data.wellName || (this.fileName ? this.fileName.replace('.docx', '') : '未命名')

        // 检查是否是提取结果
        if (data.isExtractionResult) {
          // 提取结果模式 - 显示提取结果预览
          this.loadExtractionResultView(data.extractionResult, data)
          // 清理 sessionStorage
          sessionStorage.removeItem('extractionEditorData')
        } else if (data.isGeologicalDoc) {
          // 地质设计文档直接加载内容
          await this.loadDocumentContent()
          // 显示提取结果信息
          if (data.extractionResult) {
            this.$message.info('已加载地质设计文档，共提取 ' + data.extractionResult.items.length + ' 个字段')
          }
          // 清理 sessionStorage
          sessionStorage.removeItem('geologicalEditorDocument')
        } else if (data.isStreaming) {
          // 检查是否是流式生成
          this.isStreaming = true
          this.generatedSections = data.sections || []
          // 显示已有的章节
          this.renderStreamingSections()
          // 监听流式事件
          this.startListeningStream()
          // 从 sessionStorage 加载批注
          this.pendingAnnotations = this.annotations
            .filter(a => a.dataSource === 'api')
            .map((a, index) => ({
              index,
              annotationText: a.content,
              dataSource: 'api',
              query: a.query || this.generateQueryFromContent(a.content),
              result: null
            }))
        } else {
          // 普通文档（非流式）
          await this.loadDocumentContent()
          // 从 sessionStorage 加载批注
          this.pendingAnnotations = this.annotations
            .filter(a => a.dataSource === 'api')
            .map((a, index) => ({
              index,
              annotationText: a.content,
              dataSource: 'api',
              query: a.query || this.generateQueryFromContent(a.content),
              result: null
            }))
        }

        // 清理 sessionStorage（如果是普通文档的话）
        if (!data.isStreaming && !data.isGeologicalDoc && !data.isExtractionResult) {
          sessionStorage.removeItem('editorDocument')
        }
      } catch (e) {
        console.error('加载文档数据失败', e)
      }
    }

    if (params.fileName) {
      this.wellName = params.fileName.replace('.docx', '')
    }

    if (this.wellId) {
      this.wellName = `${this.wellId}压裂工程设计`
    }

    // 加载可用表列表
    this.loadAvailableTables()
  },
  methods: {
    handleEditorPaste(event) {
      event.preventDefault()
      const clipboard = event.clipboardData
      if (!clipboard) return
      const html = clipboard.getData('text/html')
      if (html) {
        document.execCommand('insertHTML', false, sanitizeRichText(html))
      } else {
        document.execCommand('insertText', false, clipboard.getData('text/plain'))
      }
    },

    /**
     * 加载「压裂设计智能体」生成结果。
     *
     * 智能体已经把正文按内置模板骨架排好（章节顺序 / 标题层级 / 表格 / 图片全在 bodyHtml 里），
     * 这里**不再做任何章节重组**，只做两件事：
     *   1) bodyHtml 原样放进编辑框 —— 编辑框内只放正文；
     *   2) 字段抽取 / 章节填充 / 警告等文档级说明**不再展示**（原 genNotes 已移除），
     *      页面只保留跟随章节切换的 sec-info 说明条。
     * 封面、目录、页眉页脚在导出时由后端按模板补全，编辑器里不出现。
     */
    loadAgentResultView(data) {
      this.wellName = this.cleanWellName(data.wellName || '') || data.wellName || '未命名'
      this.fileName = data.fileName || this.agentDocBaseName(this.wellName)
      this.editorContent = data.bodyHtml || ''
      this.defaultEditorContent = this.editorContent
      // 井组 / 目的层：模板附图标题里的占位符要用它替换
      this.agentMeta = {
        wellGroup: data.wellGroup || '',
        targetLayer: data.targetLayer || ''
      }

      // 封面宝石花图标（导出时回传，后端画到封面左上角，不进正文）
      if (data.coverIcon) {
        this.coverIconImage = {
          base64: data.coverIcon,
          contentType: data.coverIconContentType || 'image/png',
          widthCm: data.coverIconWidthCm,
          heightCm: data.coverIconHeightCm
        }
      }
      if (data.wbWellId) {
        this.wellId = this.wellId || data.wbWellId
      }

      // ---- 编辑框外说明 ----
      const fields = data.fieldReport || []
      const secs = data.sectionReport || []

      // ---- 左侧章节导航 ----
      // 两种数据源：
      //   a) 智能体生成（有 sectionReport）→ buildOutline，章节来自后端上报；
      //   b) 严格提取 / 导入文档（sectionReport 为空）→ buildOutlineFromTemplate，
      //      章节来自「所选射孔方式对应的模板章节」，正文里没有的章节保留为空项。
      // ⚠️ buildOutline 内部会把 sectionReport 存到 this.sectionReports，
      //    这里必须用同一个数组引用，否则 nextTick 里二次 buildOutline(undefined) 会清空导航。
      this.sectionReports = secs
      if (secs.length) {
        this.buildOutline(secs)
      }
      this.applyAgentNotes(data)

      // 正文渲染完成后再校正一次：buildOutline 时 v-html 还没上屏，
      // 拿不到 heading 节点就无法做占位切片，必须在 nextTick 里重算。
      // ⚠️ 重算后完成度会变（占位章节被识别出来），说明区必须跟着重写，
      //    否则「导航显示 29/33 88%」与「说明写 30/33 91%」两套数字并存。
      this.$nextTick(() => {
        if (this.sectionReports.length) {
          this.buildOutline(this.sectionReports)
          if (this.outline.length) this.activeSectionUid = this.outline[0].uid
        } else {
          // 没有 sectionReport：按射孔方式模板建导航
          this.buildOutlineFromTemplate()
        }
        this.applyAgentNotes(data)
      })

      this.$message.success('智能体已生成正文，可直接编辑或导出')
    },

    /**
     * 生成智能体结果的「编辑框外说明」。
     *
     * 抽成独立方法的原因：说明里的章节统计必须读 outlineStats，而 outlineStats
     * 只有在 v-html 上屏、DOM 切片跑完（applyPlaceholderFlags）后才准确。
     * 所以 loadAgentResultView 会调两次：首次先给个粗略值，nextTick 里重算后再刷新一次。
     */
    applyAgentNotes(data) {
      const fields = (data && data.fieldReport) || []
      const found = fields.filter(f => f.found).length
      const missed = fields.filter(f => !f.found).map(f => f.label || f.key)

      // 章节来源：有 sectionReport = 智能体上报；否则按射孔方式模板骨架
      const isSpec = !this.sectionReports.length
      const secNote = isSpec
        ? {
            type: 'info',
            label: '章节',
            text: '按「' + this.perforationMethod + '」模板章节生成导航：共 ' + this.outlineStats.total +
              ' 个章节，正文有内容 ' + this.outlineStats.filled + ' 个；' +
              '其中需源文档供数的 ' + this.outlineStats.dataTotal + ' 章已覆盖 ' + this.outlineStats.dataFilled +
              ' 章，其余 ' + this.outlineStats.tmplTotal + ' 章由模板条文 / 内置数据生成'
          }
        : {
            type: 'success',
            label: '智能体',
            text: '已按内置模板骨架生成正文：' + this.outline.length + ' 个章节节点，' +
              this.outlineStats.filled + '/' + this.outlineStats.total +
              ' 个末级章节已填充（完成度 ' + this.outlineStats.percent + '%）'
          }

      const notes = [
        { type: 'info', label: '井号', text: this.wellName },
        secNote,
        {
          type: found === fields.length ? 'success' : 'warning',
          label: '字段抽取',
          text: '共 ' + fields.length + ' 个字段，命中 ' + found + ' 个' +
            (missed.length ? '；未命中：' + missed.slice(0, 8).join('、') + (missed.length > 8 ? ' 等' : '') : '')
        }
      ]
      if ((data && data.warnings || []).length) {
        notes.push({
          type: 'warning',
          label: '提示',
          text: data.warnings.slice(0, 5).join('；')
        })
      }
      notes.push({
        type: 'info',
        label: '使用',
        text: isSpec
          ? '点击左侧「章节导航」可跳转到任一章节。橙点 = 需源文档供数但未提取到，建议人工补写；蓝灰点 = 由模板条文/内置数据生成，导出时自动补全。切换射孔方式会按对应模板重排章节'
          : '点击左侧「章节导航」可跳转到任一章节；编辑框内只有正文，封面、目录、页眉页脚在导出 Word 时由后端按模板补全'
      })
      this.setGenNotes(notes)
    },

    // 加载提取结果视图
    // 编辑框内只放「提取结果表」；标题/统计/提示等放到框外说明区。
    loadExtractionResultView(extractionResult, data) {
      const items = extractionResult.items || []
      const wellName = extractionResult.wellName || data.wellName || '地质设计'

      const gotCount = items.filter(i => i.fieldValue).length

      // ---- 正文：只有一张字段表 ----
      let html = '<table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse;">'
      html += '<thead style="background: #f5f7fa;"><tr>'
      html += '<th style="width: 20%;">字段名称</th>'
      html += '<th style="width: 40%;">提取值</th>'
      html += '<th style="width: 20%;">来源章节</th>'
      html += '<th style="width: 10%;">置信度</th>'
      html += '<th style="width: 10%;">提取方式</th>'
      html += '</tr></thead><tbody>'

      items.forEach(item => {
        const valueClass = item.fieldValue ? '' : ' class="missing-value"'
        const value = item.fieldValue || '<span style="color: #ff4d4f;">未提取</span>'
        const confidenceColor = item.confidence === '高' ? '#52c41a' : (item.confidence === '中' || item.confidence === '中(LLM)' ? '#faad14' : '#8c8c8c')
        const methodLabel = item.extractionMethod === 'auto' ? '自动' : (item.extractionMethod === 'llm' ? 'AI' : '手动')
        const methodColor = item.extractionMethod === 'auto' ? '#52c41a' : (item.extractionMethod === 'llm' ? '#3D5FEF' : '#8c8c8c')

        html += '<tr>'
        html += '<td><strong>' + this.escapeHtml(item.fieldName) + '</strong></td>'
        html += '<td' + valueClass + '>' + value + '</td>'
        html += '<td>' + this.escapeHtml(item.sourceSection || '-') + '</td>'
        html += '<td style="color: ' + confidenceColor + ';">' + this.escapeHtml(item.confidence || '-') + '</td>'
        html += '<td style="color: ' + methodColor + ';">' + methodLabel + '</td>'
        html += '</tr>'
      })

      html += '</tbody></table>'
      this.editorContent = html

      // ---- 说明（编辑框外）----
      this.setGenNotes([
        { type: 'info', label: '井名', text: wellName },
        { type: 'success', label: '提取字段', text: '共 ' + items.length + ' 个字段，已提取 ' + gotCount + ' 个，未提取 ' + (items.length - gotCount) + ' 个' },
        { type: 'info', label: '提示', text: '在地质设计提取页面可以生成完整的地质设计文档' }
      ])
      this.$message.success('已加载提取结果，共 ' + items.length + ' 个字段')
      // 提取结果视图没有章节标题，导航会是空的（v-if 自动隐藏），这里调用一次保证状态干净
      this.sectionReports = []
      this.$nextTick(() => this.buildOutlineFromTemplate())
    },

    /**
     * 返回：优先回到「该井的单井工作台」。
     *
     * <p>编辑器有两条进入路径，返回的语义不同：</p>
     * <ul>
     *   <li><b>工作台链路</b>（压裂智能体 / 射孔方案 / 泵注程序 → 编辑器）：用户是从
     *       某口井的工作台点进来的，返回就该回到那口井的工作台，而不是回到全局的
     *       「地质提取」列表 —— 后者跟刚才在做的井毫无关系，等于把上下文丢了。</li>
     *   <li><b>无井链路</b>（直接打开编辑器 / 历史报告）：没有井号可回，退回智能提取页。</li>
     * </ul>
     *
     * <p>⚠️ 单井工作台路由是 {@code /workbench/well/:wellId}，其中 <b>params.wellId 是井库 ID</b>
     * （{@code scyx-jf-well-list} 的井记录），而 {@code wbWellId} 是另一套
     * 「工作台井号」（{@code COMM_WB_WELL.ID}），要走 query 单独带。
     * 两者不能混用：把 wbWellId 直接塞进 params 会让工作台去查一个不存在的井库记录。</p>
     *
     * <p>井库 ID 正常情况下就在 sessionStorage.wbSelectedWell.wellId 里（工作台选井时写入）。
     * 拿不到时（如射孔页只写了 wbWellId）用 {@code local~${wbWellId}} 兜底 ——
     * 与工作台首页 {@code openWell()} 的兜底写法一致，工作台会以「本地井号」姿态打开，
     * 文档区仍能按 wbWellId 正常挂载。</p>
     */
    goBack() {
      const wbWellId = this.resolveWbWellId()
      if (!wbWellId) {
        // 没有关联井号 → 退回智能提取页（原行为）
        this.$router.push('/report-manage/geological-extract')
        return
      }

      // 井库 ID：优先 sessionStorage（工作台选井时写入），其次路由 query
      let realWellId = ''
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (raw) {
          const o = JSON.parse(raw)
          // 只在是同一口井时才采用缓存的 wellId，避免串井
          if (o && (!o.wbWellId || String(o.wbWellId) === String(wbWellId))) {
            realWellId = o.wellId || ''
          }
        }
      } catch (e) {
        // 忽略解析失败
      }
      if (!realWellId) {
        const q = (this.$route && this.$route.query) || {}
        realWellId = q.wellId || ''
      }
      /*
       * ⚠️ 最后一道闸：realWellId 若仍是井名（历史脏数据、或上游传错），
       *    必须丢弃并退化成 local~<wbWellId> —— 否则跳到单井工作台后
       *    页面会请求 /v1/wells/安13-7-3平3，后端返回「井不存在」。
       */
      if (realWellId && isWellNameLike(realWellId)) realWellId = ''

      this.$router.push({
        name: 'WellWorkbench',
        params: { wellId: realWellId || ('local~' + wbWellId) },
        query: { wbWellId }
      })
    },

    /**
     * 保存：把当前编辑内容**真正落库**（生成 docx → 同步文档中心 → 登记到井）。
     *
     * <p><b>为什么不能沿用旧实现</b>：旧版是 {@code setTimeout(1000) → 弹「保存成功」}，
     * 一个字节都没写出去。用户点完以为存好了，回工作台列表里却什么都没有 ——
     * 这是最坏的一类 bug：给了成功的反馈，却没有成功的事实。
     *
     * <p><b>为什么复用导出接口而不是新开一个保存接口</b>：
     * 落文档中心这件事，后端只有 `/annotation/export-word` 这一条链路做全了
     * （生成 docx + FSS 三步上传 + 写 COMM_FILE_INDEX + 写 COMM_WB_WELL_DOC 版本号）。
     * 另起一套保存逻辑等于把「版本号递增 / 同名文件不覆盖 / 井号关联」再实现一遍，
     * 两边迟早会跑偏。这里复用同一条链路，只是**不再触发浏览器下载**。
     *
     * <p><b>与导出的唯一区别</b>：
     * <ul>
     *   <li>保存：只落库，不下载。成功后直接跳该井工作台，让用户在列表里看到它。</li>
     *   <li>导出：落库 + 下载。用户要的是一份本地文件。</li>
     * </ul>
     */
    async handleSave() {
      if (this.saving) return

      const dom = this.$refs.editorContent
      const html = (dom && dom.innerHTML) || this.editorContent || ''
      if (!/<(p|h[1-6]|table|img|ul|ol)[\s>]/i.test(html)) {
        this.$message.warning('当前没有可保存的内容')
        return
      }

      this.saving = true
      try {
        const payload = this.buildExportPayload(html)
        // 保存必须落库：文档中心不可达时后端会降级写本地磁盘（fallbackOnUnreachable=true），
        // 这种情况下 COMM_FILE_INDEX / COMM_WB_WELL_DOC 照样登记，列表里能看到、能预览。
        const res = await exportWordWithMetaApi(payload)
        const status = String(res.docCenterStatus || '')

        if (status.indexOf('ok:') === 0) {
          const fileId = status.substring(3)
          this.$message.success('已保存到文档中心：' + payload.fileName)
          this.savedDocId = fileId
          // 保存成功后带用户去看结果：列表在工作台单井页，能看到刚存的这份并直接预览。
          // 若拿不到井号就只提示，不做跳转（跳到无井页面反而更懵）。
          this.$confirm(
            '文档已存入文档中心，是否前往工作台列表查看？',
            '保存成功',
            { confirmButtonText: '去查看', cancelButtonText: '留在编辑器', type: 'success' }
          ).then(() => this.gotoWorkbenchDocList()).catch(() => {})
        } else if (status.indexOf('failed:') === 0) {
          // 明确区分「存了但同步失败」和「压根没存」：前者列表里可能已有登记，
          // 后者需要用户重试。混在一起说会让用户不知道要不要再点一次。
          this.$message.error('保存失败：同步文档中心出错 —— ' + status.substring(7))
        } else if (status === 'skipped') {
          this.$message.warning('已生成文档，但未同步（未开启文档中心同步）')
        } else {
          // 没有 X-Doc-Center-Status 头：后端可能走了别的分支，不能当作成功
          this.$message.warning('已提交保存，但未收到文档中心回执，请到工作台列表确认')
        }
      } catch (e) {
        console.error('[editor] 保存失败', e)
        this.$message.error('保存失败：' + (e.message || '未知错误'))
      } finally {
        this.saving = false
      }
    },

    /**
     * 跳转到「该井工作台 → 文档列表」，并把列表滚到可见位置。
     *
     * <p>这里不能只 push 路由：文档面板在单井工作台页面下方，
     * 用户落进去看到的还是井信息表单，会以为「跳错了」。
     * 用 query.goDoc=1 让目标页在 mounted 后自动滚到面板锚点。
     */
    gotoWorkbenchDocList() {
      const wbWellId = this.resolveWbWellId()
      let realWellId = ''
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (raw) {
          const o = JSON.parse(raw)
          if (o && (!o.wbWellId || String(o.wbWellId) === String(wbWellId))) {
            realWellId = o.wellId || ''
          }
        }
      } catch (e) { /* ignore */ }
      if (!realWellId) {
        const q = (this.$route && this.$route.query) || {}
        realWellId = q.wellId || ''
      }
      // 同 goBack()：井名不能当井库 ID 用，否则单井页查井库必然「井不存在」
      if (realWellId && isWellNameLike(realWellId)) realWellId = ''
      if (!wbWellId) {
        this.$message.info('该文档未关联工作台井号，请在对应井的工作台文档列表查看')
        return
      }
      this.$router.push({
        name: 'WellWorkbench',
        params: { wellId: realWellId || ('local~' + wbWellId) },
        query: { wbWellId, goDoc: '1', t: String(Date.now()) }
      })
    },

    /**
     * 解析当前编辑会话关联的工作台井号 ID（COMM_WB_WELL.ID）。
     *
     * 来源优先级：
     *   1) sessionStorage.wbSelectedWell（工作台选井时写入）
     *   2) 路由 query.wbWellId
     *   3) this.wellId（智能体链路 loadAgentResultView 里从 data.wbWellId 回填的）
     * 取不到就返回 null —— 文档仍会同步到文档中心，只是不挂井号。
     */
    resolveWbWellId() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (raw) {
          const o = JSON.parse(raw)
          if (o && o.wbWellId) return o.wbWellId
        }
      } catch (e) {
        // 忽略解析失败
      }
      const q = (this.$route && this.$route.query) || {}
      if (q.wbWellId) return q.wbWellId
      /*
       * 第三级兜底：智能体链路把 data.wbWellId 写进了 this.wellId。
       *
       * ⚠️ 这里必须排除井名。this.wellId 是被大量入口随手赋值的，
       *    一旦里面是「安13-7-3平3」这种井名，直接返回会被下游当工作台井号
       *    拼成 local~安13-7-3平3 甚至直接当井库 ID 去查 → 「井不存在」。
       *    返回 null 的结果是「文档照样存文档中心，只是不挂井号」，
       *    对用户无害；返回井名的结果是必然报错，两害相权取轻。
       */
      const fallback = String(this.wellId || '').trim()
      return fallback && !isWellNameLike(fallback) ? fallback : null
    },

    /**
     * 构造「保存 / 导出」共用的请求体。
     *
     * <p>抽出来是因为两者只差「要不要下载」，请求内容必须**逐字节一致** ——
     * 否则会出现「保存的版本」和「导出的版本」封面图或批注不一样，
     * 用户拿两份文件对比时完全没法解释。
     *
     * @param {String} html 编辑器真实 DOM 的 innerHTML（不要传 this.editorContent，
     *                      它是空的，handleContentChange 没同步）
     * @returns {Object} export-word 接口的 payload
     */
    buildExportPayload(html) {
      // 文件名：优先用已有文件名的去后缀形态，否则 井号+井压裂工程设计（与后端命名一致）
      const base = String(this.fileName || '').replace(/\.docx$/i, '').trim()
      const well = this.cleanWellName(this.wellName || '') || ''
      const name = base || (well ? (/井$/.test(well) ? well + '压裂工程设计' : well + '井压裂工程设计') : '压裂工程设计')

      // 后端按「文档格式模板」补全 11 章骨架 + 封面 + 目录 + 页眉页脚 + 字体。
      // templateCode 为空时后端取库中默认模板（再兜底内置 FRACTURING）。
      // wellName 用于填充模板占位符 {#wellName}（封面标题、页眉）。
      // annotations：把模版批注写成真正的 Word 批注（comments.xml），
      //   格式遵循参考文档：`字段：<字段名>；来源：<来源说明>`。
      const payload = {
        html,
        fileName: name + '.docx',
        templateCode: 'FRACTURING',
        wellName: well,
        docTitle: name,
        annotations: this.buildExportAnnotations(),
        annotationAuthor: '系统生成'
      }
      // 模板批注 #2「首页图标（图标1）」：把源文档封面的宝石花原图交给后端，
      // 后端会以「浮于页首左上角」的方式画在封面第一段（不占版面、不会跑到正文里去）。
      const icon = this.coverIconImage
      if (icon) {
        const src = this.buildImageSrc(icon)
        if (src) {
          payload.coverIcon = src
          payload.coverIconContentType = icon.contentType || icon.mimeType || 'image/png'
          payload.coverIconWidthCm = this.toCm(icon.widthCm != null ? icon.widthCm : icon.width)
          payload.coverIconHeightCm = this.toCm(icon.heightCm != null ? icon.heightCm : icon.height)
        }
      }
      // 同步到文档中心：落一份到数据湖文档中心，
      // 并登记 COMM_FILE_INDEX + COMM_WB_WELL_DOC（关联井号/文档类型）。
      // 文档中心不可达时后端降级写本地磁盘，登记照做 —— 这样才能在列表里看到。
      payload.syncToDocCenter = true
      payload.docType = 'GENERATED_REPORT'
      payload.userId = this.userId
      const wb = this.resolveWbWellId()
      if (wb) payload.wbWellId = wb
      return payload
    },

    /**
     * 导出当前编辑器内容为 Word（docx）
     *
     * 关键点：
     * 1. 内容从真实 DOM（$refs.editorContent.innerHTML）读取 ——
     *    handleContentChange() 是空函数，this.editorContent 不随用户输入同步，
     *    直接用它会把用户的手工编辑丢掉。
     * 2. 中文只能走 JSON body（multipart 文本字段会被 Tomcat 按 ISO-8859-1 解码成乱码）。
     * 3. 需要读响应头 X-Doc-Center-Status（文档中心同步结果），
     *    统一拦截器对 blob 只返回 data，所以走 exportWordWithMetaApi（独立 axios 实例）。
     */
    async handleExportWord() {
      if (this.exporting) return

      const dom = this.$refs.editorContent
      const html = (dom && dom.innerHTML) || this.editorContent || ''
      if (!/<(p|h[1-6]|table|img|ul|ol)[\s>]/i.test(html)) {
        this.$message.warning('当前没有可导出的内容')
        return
      }

      const name = this.buildExportPayload(html).docTitle

      this.exporting = true
      try {
        const payload = this.buildExportPayload(html)
        const res = await exportWordWithMetaApi(payload)
        const blob = res.blob
        if (!(blob instanceof Blob) || blob.size === 0) {
          throw new Error('导出内容为空')
        }

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name + '.docx'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        // 文档中心同步结果（不阻断下载）
        const status = String(res.docCenterStatus || '')
        if (status.indexOf('ok:') === 0) {
          this.$message.success('已导出并同步到文档中心：' + name + '.docx')
        } else if (status.indexOf('failed:') === 0) {
          this.$message.warning('已导出，但同步文档中心失败：' + status.substring(7))
        } else {
          this.$message.success('已导出：' + name + '.docx')
        }
      } catch (e) {
        console.error('[editor] 导出 Word 失败', e)
        this.$message.error('导出失败：' + (e.message || '未知错误'))
      } finally {
        this.exporting = false
      }
    },

    /**
     * 构造导出用的批注列表。
     *
     * 数据来源：
     *   1) strictAnnotations —— 模版里读到的真实 Word 批注（字段/来源说明）；
     *   2) pendingAnnotations / annotations —— 编辑器里已解析的批注项。
     *
     * 输出格式与参考文档一致：`字段：<字段名>；来源：<来源说明>`。
     * 每条尽量给出 anchor（锚点文本），让后端把批注挂到对应段落上。
     */
    buildExportAnnotations() {
      const out = []
      const seen = new Set()
      const push = (content, anchor, section) => {
        let text = String(content == null ? '' : content).trim()
        if (!text) return
        // 已经是「字段：…；来源：…」格式就不再包一层
        if (!/^字段\s*[:：]/.test(text)) {
          text = '字段：' + text
        }
        if (seen.has(text)) return
        seen.add(text)
        out.push({ content: text, anchor: anchor || '', section: section || '' })
      }

      // 1) 模版批注（最权威）
      ;(this.strictAnnotations || []).forEach((a) => {
        if (!a) return
        const content = a.content || a.text || a.annotationText || ''
        const anchor = a.anchor || a.anchorText || a.source || ''
        push(content, anchor, a.section || a.sectionTitle || '')
      })

      // 2) 编辑器里已解析的批注
      ;(this.pendingAnnotations || this.annotations || []).forEach((a) => {
        if (!a) return
        const content = a.annotationText || a.content || a.text || ''
        push(content, a.anchor || a.source || '', a.section || '')
      })

      return out
    },

    handleImport() {
      this.$message.info('文档导入功能开发中')
    },

    handleAiRewrite() {
      this.$message.success('AI续写功能已触发')
    },

    // 加载可用表列表
    async loadAvailableTables() {
      try {
        const res = await getAllTables()
        if (res.code === 0 || res.code === 200) {
          this.availableTables = res.data || []
        }
      } catch (e) {
        console.error('获取表列表失败', e)
      }
    },

    // 加载文档内容
    async loadDocumentContent() {
      if (!this.fileData) {
        this.$message.warning('文档数据为空')
        return
      }

      this.loading = true
      try {
        // 将 base64 转换为文件
        const file = this.base64ToFile(this.fileData, this.fileName)

        // 调用后端API读取文档内容
        const formData = new FormData()
        formData.append('file', file)

        // 【关键】把井名传给后端，让后端在服务端按井号筛选表格。
        // 否则「刷新编辑器页 / 走 editorDocument 兜底路径」时 wellName 缺失，
        // 后端会把整张表（包含所有井）原样返回。
        // 注意：wellName 必须走 URL query（multipart 文本字段中文会被 Tomcat 按 ISO-8859-1 解码成乱码）。
        const wellNameForBackend = this.cleanWellName(this.wellName || '')
        const res = await readDocumentContentApi(formData, wellNameForBackend)

        if (res.code === 0 || res.code === 200) {
          const data = res.data
          this.editorContent = data.html || this.defaultEditorContent
          this.setGenNotes([
            { type: 'info', label: '文档', text: (this.fileName || '') + ' 已加载' },
            data.markers && data.markers.length
              ? { type: 'info', label: '待填充', text: '检测到 ' + data.markers.length + ' 个待填充数据（批注）' }
              : null
          ].filter(Boolean))
          // 普通文档没有 sectionReport，用正文标题兜底建导航
          this.$nextTick(() => this.buildOutlineFromTemplate())

          // 如果有批注标记，更新pendingAnnotations
          if (data.markers && data.markers.length > 0) {
            this.pendingAnnotations = data.markers.map((m, index) => ({
              index,
              annotationText: m.text,
              dataSource: m.dataSource || 'api',
              query: m.dataQuery || this.generateQueryFromContent(m.text),
              result: null
            }))
          }

          this.$message.success(`文档加载成功，共 ${this.pendingAnnotations.length} 个待填充数据`)

          // 自动开始AI填充
          if (this.pendingAnnotations.length > 0) {
            this.$confirm('检测到 ' + this.pendingAnnotations.length + ' 个待填充数据，是否立即使用AI智能填充？', '提示', {
              confirmButtonText: '立即填充',
              cancelButtonText: '稍后手动填充',
              type: 'info'
            }).then(() => {
              this.startAutoFill()
            }).catch(() => {
              this.$message.info('您可以随时点击"AI智能填充"按钮进行填充')
            })
          }
        } else {
          this.$message.error(res.message || '加载文档失败')
          this.editorContent = this.defaultEditorContent
          this.setGenNotes([{ type: 'error', label: '加载失败', text: res.message || '加载文档失败' }])
        }
      } catch (e) {
        console.error('加载文档内容失败', e)
        this.$message.error('加载文档失败: ' + e.message)
        this.editorContent = this.defaultEditorContent
        this.setGenNotes([{ type: 'error', label: '加载失败', text: e.message || '网络异常' }])
      } finally {
        this.loading = false
      }
    },

    // base64转文件
    base64ToFile(base64Data, fileName) {
      const arr = base64Data.split(',')
      const mime = arr[0].match(/:(.*?);/)[1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new File([u8arr], fileName, { type: mime })
    },

    // ========== 智能提取并生成（流式）==========

    // 第一步：严格提取（不调用大模型 / 不使用提示词）
    // 依次调用后端「纯提取」接口，把源文件的原文内容取出并流式呈现：
    //   1) /v1/annotation/content        —— 正文（HTML，原样）
    //   2) /v1/document-parse/extract-images —— 图片（base64，原样）
    //   3) /v1/document-parse/extract-tables —— 表格（结构化，原样）
    // 注意：此步骤严禁改写内容，提取到什么就展示什么。
    async runStrictExtract(task, fileArg) {
      try {
        // ⚠️ 文件优先用内存交接传进来的 File 本体（fileArg）。
        //    旧版是从 task.sourceFile.data（dataUrl）反解，但 4.7MB 文件转 base64 约 6.3MB，
        //    超过 sessionStorage 5MB 配额，写入阶段就失败了 —— 见 utils/extractHandoff.js。
        let file = fileArg
        if (!file) {
          if (!task.sourceFile || !task.sourceFile.data) {
            throw new Error('缺少源文件数据')
          }
          file = this.base64ToFile(task.sourceFile.data, task.sourceFile.name)
        }
        const srcName = (task.sourceFile && task.sourceFile.name) || file.name

        // 1) 正文提取
        //    【关键】把井名（wellName）一并传给后端：
        //    后端 /v1/annotation/content 会在服务端直接按井号筛选表格
        //    （支持「每口井一行」的行式布局与「井号横向排列」的转置布局，
        //      并正确继承 vMerge 纵向合并单元格），
        //    因此返回的 html 里表格只保留目标井的数据。
        //    ！！注意：wellName 必须走 URL query 参数，不能放在 FormData 里 ——
        //    Tomcat 对 multipart 的文本字段默认按 ISO-8859-1 解码，中文会变乱码；
        //    query 参数按 URIEncoding=UTF-8 解码，中文正确。
        //    前端原本的本地筛选仍保留，作为幂等兜底（命中已筛过的表不会二次破坏）。
        this.streamingStatus = '正在提取正文文字...'
        this.streamingProgress = 10
        const contentForm = new FormData()
        contentForm.append('file', file, srcName)
        const wellNameForBackend = this.cleanWellName(task.wellName || this.wellName || '')
        let html = ''
        try {
          const contentRes = await readDocumentContentApi(contentForm, wellNameForBackend)
          html = (contentRes && contentRes.data && contentRes.data.html) || ''
        } catch (e) {
          console.warn('[strict-extract] 正文提取失败', e)
        }
        if (html) {
          this.strictExtractedHtml = html
        }
        this.streamingProgress = 40
        this.renderStrictExtract()

        // 2) 图片提取
        this.streamingStatus = '正在提取图片...'
        let images = []
        try {
          const imgForm = new FormData()
          imgForm.append('file', file, srcName)
          const imgRes = await extractDocumentImagesApi(imgForm, false)
          images = (imgRes && imgRes.data && imgRes.data.images) || []
        } catch (e) {
          console.warn('[strict-extract] 图片提取失败', e)
        }
        // 拆分：封面图标（宝石花）单独留存，其余图进入正文
        const split = this.splitCoverIcon(images)
        images = split.bodyImages
        this.coverIconImage = split.icon
        this.strictExtractedImages = images
        this.streamingProgress = 70
        this.streamingStatus = images.length ? `已提取 ${images.length} 张图片` : '未提取到图片'
        if (this.coverIconImage) {
          this.streamingStatus += '（封面图标 1 张已归位到封面）'
        }
        this.renderStrictExtract()
        // 3) 表格提取
        this.streamingStatus = '正在提取表格...'
        let tables = []
        try {
          const tblForm = new FormData()
          tblForm.append('file', file, srcName)
          const tblRes = await extractDocumentTablesApi(tblForm)
          tables = (tblRes && tblRes.data && tblRes.data.tables) || []
        } catch (e) {
          console.warn('[strict-extract] 表格提取失败', e)
        }
        this.strictExtractedTables = tables
        this.streamingProgress = 90
        this.streamingStatus = tables.length ? `已提取 ${tables.length} 个表格` : '未提取到表格'
        this.renderStrictExtract()
        this.streamingProgress = 100
        this.streamingStatus = '提取完成'
        this.finishStrictExtract()
      } catch (e) {
        console.error('严格提取失败', e)
        this.isStreaming = false
        this.streamingProgress = 0
        this.streamingStatus = '提取失败：' + (e.message || '网络异常')
        this.editorContent = ''
        this.setGenNotes([
          { type: 'error', label: '提取失败', text: e.message || '网络异常' },
          { type: 'info', label: '建议', text: '请返回「智能提取」页重试，或检查后端服务与网络。' }
        ])
        this.$message.error('提取失败：' + (e.message || '网络异常'))
      }
    },

    // ===================== 左侧章节导航 =====================
    /**
     * 生成方式（generation）→ 中文说明 / 状态色。
     * 字典键与后端 FracturingDesignAgent 的 generation 取值严格对应，
     * 后端新增类型时这里会走 default 分支，不会导致导航缺项。
     */
    sectionGenMeta() {
      return {
        FIELDS: { label: '字段容器', desc: '本节点的正文全部在子章节中，自身只出标题', color: 'group' },
        MIXED: { label: '混合', desc: '固定模板文字 + 源文档抽取内容组合生成', color: 'ok' },
        FIELD_TEXT: { label: '源文档抽取', desc: '从压裂地质设计中抽取对应段落文字', color: 'ok' },
        FIELD_TABLE: { label: '源文档抽表', desc: '从压裂地质设计中抽取对应表格并原样重建', color: 'ok' },
        TEMPLATE_TEXT: { label: '模板固定', desc: '取内置压裂设计模板的固定条款，井号等变量已替换', color: 'ok' },
        PUMP_PROGRAM: { label: '公式计算', desc: '依据本段合计液量与加砂量，按泵注公式自动计算生成', color: 'ok' },
        PRE_TEST_PROGRAM: { label: '模板+档位', desc: '按压前测试档位表套用模板生成泵注程序，可切换档位', color: 'ok' },
        PUMP_PROGRAM_WITH_PRETEST: { label: '小压表+结构化泵注表', desc: '先出小压测试表（内置档位模板），再按「泵注程序编写」页保存的结构化表逐段出主压裂泵注表', color: 'ok' },
        STANDARDS: { label: '标准清单', desc: '由系统内置的设计执行标准、规定和规程清单生成', color: 'ok' },
        FLUID_STANDARD: { label: '检测指标表', desc: '由系统内置的压裂液检测指标表生成', color: 'ok' },
        SOURCE_FIGURE: { label: '源文档取图', desc: '从压裂地质设计中提取对应附图，直接置入正文', color: 'ok' },
        FIGURES: { label: '附图容器', desc: '附图章节自身无正文，内容全在子章节中', color: 'group' },
        LLM: { label: '大模型生成', desc: '由大模型依据上下文生成，属于非确定性内容，需人工复核', color: 'pending' },
        USER_UPLOAD: { label: '需用户上传', desc: '系统无此图源，需人工上传图片后补入', color: 'empty' },
        PENDING_DEV: { label: '待开发', desc: '该章节计算逻辑尚未开发，当前仅保留标题与占位说明', color: 'pending' }
      }
    },

    genMeta(key) {
      const dict = this.sectionGenMeta()
      return dict[key] || { label: key || '未知', desc: '未知生成方式', color: 'group' }
    },

    /**
     * 用 level 做栈式嵌套，从 sectionReport 建出章节导航树。
     *
     * ⚠️ 不能用 key 前缀判断父子：「九、施工注意事项」的子节点 key 是 C8-1~C8-4，
     *    「十、附图及附表」的子节点 key 是 C9-1~C9-6（spec 里本身串了），
     *    按前缀汇总会把第九章的内容算到第八章头上。sectionReport 是前序遍历的顺序数组，
     *    用 level 维护一个父栈即可准确还原层级。
     */
    buildOutline(reports) {
      this.outlineFromDom = false
      const list = (reports || []).filter(r => r && r.title)
      if (!list.length) {
        this.sectionReports = []
        this.outline = []
        this.outlineStats = { total: 0, filled: 0, percent: 0 }
        this.activeSectionUid = ''
        return
      }

      // 1) 先按 level 建父子关系（父子关系仅用于汇总完成度，导航仍是扁平列表）
      const stack = []
      const nodes = list.map((r, i) => {
        const level = Number(r.level) || 1
        while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
        const parent = stack.length ? stack[stack.length - 1] : null
        const node = {
          uid: r.key ? r.key + '#' + i : 'sec-' + i,
          index: i,
          key: r.key || '',
          no: this.normalizeNo(r.no),
          title: String(r.title || '').trim(),
          level,
          generation: r.generation || '',
          length: Number(r.length || 0),
          parentUid: parent ? parent.uid : '',
          children: [],
          // 下面三项在二次遍历里计算
          descendantLength: 0,
          placeholderRatio: 0,
          filled: false
        }
        node.titleFull = (node.no ? node.no + ' ' : '') + node.title
        if (parent) parent.children.push(node)
        stack.push(node)
        return node
      })

      // 2) 汇总子孙内容长度（容器章节自身 length 恒为 0）
      const agg = node => {
        let sum = node.length
        node.children.forEach(c => { sum += agg(c) })
        node.descendantLength = sum
        return sum
      }
      nodes.filter(n => !n.parentUid).forEach(agg)

      // 2.5) 用正文 DOM 切片判定「真内容 / 纯占位」
      //      sectionReport.length 是后端 body 的字符数，占位段落也是 length>0
      //      （如「（此处图片需用户上传）」占 44 字、「无」只有 8 字），
      //      所以必须看正文里该节下是否存在 class="agent-placeholder" 的段落。
      this.applyPlaceholderFlags(nodes)

      // 3) 生成状态 + 百分比
      //    ⚠️ 必须后序（先子后父）：nodes 是前序遍历，一级容器排在自己的子节点前面，
      //       若按数组顺序算，容器取 kids 的 percent 时子节点还没赋值 → 容器恒为 empty。
      const calcNode = node => {
        node.children.forEach(calcNode)
        const meta = this.genMeta(node.generation)
        node.genLabel = meta.label
        node.genDesc = meta.desc
        node.gen = node.generation

        const hasKids = node.children.length > 0
        const charCount = node.descendantLength

        if (node.generation === 'PENDING_DEV') {
          node.statusKey = 'pending'
          node.percent = 0
          node.filled = false
          node.fillText = '该章节计算逻辑待开发，正文仅有占位说明'
        } else if (node.generation === 'USER_UPLOAD') {
          node.statusKey = 'empty'
          node.percent = 0
          node.filled = false
          node.fillText = '需人工上传图片后补入，当前为图位占位'
        } else if (hasKids) {
          // 容器章节：子节点完成度平均；若自身也有实质正文，则与「自身已填充」一起算
          const kids = node.children
          const selfOk = this.isSectionFilled(node) ? 1 : 0
          const okKids = kids.filter(k => k.percent > 0).length
          const fullOk = okKids + selfOk
          const fullTotal = kids.length + 1
          node.percent = Math.round((fullOk / fullTotal) * 100)
          node.filled = fullOk > 0
          // 全部子节点都齐了就是绿灯（自身有无正文不影响，容器本身可空）
          const allKidsOk = okKids === kids.length
          if (allKidsOk) node.percent = 100
          node.statusKey = allKidsOk ? 'ok' : (fullOk === 0 ? 'empty' : 'partial')
          node.fillText = '子章节 ' + kids.length + ' 个，已填充 ' + okKids + ' 个' +
            (selfOk ? '；本节点自身也有正文' : '；本节点自身无正文') +
            '；累计正文 ' + charCount + ' 字'
        } else {
          node.filled = this.isSectionFilled(node)
          node.percent = node.filled ? 100 : 0
          node.statusKey = node.filled ? 'ok' : (node.onlyPlaceholder ? 'empty' : 'partial')
          if (node.filled) {
            const parts = []
            if (node.charCount > 0) parts.push('正文 ' + node.charCount + ' 字')
            if (node.imgCount > 0) parts.push('图片 ' + node.imgCount + ' 张')
            node.fillText = '已填充（' + parts.join(' + ') + '）'
          } else if (node.onlyPlaceholder) {
            node.fillText = '仅有占位内容（' + node.placeholderText + '），需人工补充'
          } else if (node.charCount > 0) {
            node.fillText = '正文与占位并存，请核对后补充：' + node.placeholderText
          } else {
            node.fillText = '正文为空，未生成任何内容'
          }
        }
      }

      // 后序遍历：先算完所有子节点，再算容器
      nodes.filter(n => !n.parentUid).forEach(calcNode)

      // 4) 总体完成度：只统计叶子节点（容器不重复计数）
      const leaves = nodes.filter(n => !n.children.length)
      const filledLeaves = leaves.filter(n => n.percent > 0).length
      this.sectionReports = list
      this.outline = nodes
      this.outlineStats = {
        total: leaves.length,
        filled: filledLeaves,
        percent: leaves.length ? Math.round((filledLeaves / leaves.length) * 100) : 0
      }
      this.activeSectionUid = nodes.length ? nodes[0].uid : ''
    },

    /**
     * 初始化射孔方式。
     *
     * 优先级：
     *   1) localStorage 里记住的（用户上次手动选的，按井号优先）
     *   2) sessionStorage.wbSelectedWell.PERFORATION_METHOD（工作台选井时带的）
     *   3) 默认「全程固井」
     */
    initPerforationMethod() {
      const wbWellId = this.resolveWbWellId()
      let m = loadPerforationMethod(wbWellId)
      if (!m) {
        try {
          const raw = sessionStorage.getItem('wbSelectedWell')
          if (raw) {
            const o = JSON.parse(raw)
            const pm = o && (o.perforationMethod || o.PERFORATION_METHOD)
            if (pm && PERFORATION_METHODS.indexOf(pm) >= 0) m = pm
          }
        } catch (e) {
          // 忽略
        }
      }
      this.perforationMethod = m || DEFAULT_PERFORATION_METHOD
    },

    /** 用户切换射孔方式：重建导航并记住选择 */
    handlePerforationChange(v) {
      this.perforationMethod = v
      savePerforationMethod(v, this.resolveWbWellId())
      // 切换后按新模板重排导航（正文不变，只是章节骨架换一套）
      if (this.outlineMode === 'dom') {
        this.buildOutlineFromDom()
      } else {
        this.buildOutlineFromTemplate()
      }
      this.$message.success('已切换到「' + v + '」模板章节')
    },

    /**
     * 按「所选射孔方式对应的模板章节」建导航。
     *
     * 这是当前的主路径。设计要点：
     *
     * 1) **章节骨架来自模板，不来自正文。**
     *    正文里有什么标题只影响「填充与否」，不影响「有没有这一行」。
     *    所以未提取到的章节会保留为空项（灰点 + 「模板章节，正文暂无内容」），
     *    不会像旧的 buildOutlineFromDom 那样直接消失。
     *
     * 2) **只为一级章节定位正文标题。**
     *    模板二级/三级（「（一）作业队负责」「1、压裂施工设备及工具」）在正文里
     *    未必是 <h2>/<h3>，强行匹配容易错位。一级章节标题在正文里是稳定出现的
     *    <h1>，匹配可靠；二级/三级只作为模板结构展示，点击时滚到所属一级章节。
     *
     * 3) **正文标题匹配用「顺序游标 + 模糊匹配」。**
     *    正文标题间的先后顺序固定（一、二、三…），游标只往前推不会回退，
     *    这样可以避免「设计依据」误命中后面某个章节里的同名短语。
     */
    buildOutlineFromTemplate() {
      // 有 sectionReport（智能体生成路径）时以它为准，模板导航不覆盖
      if (this.sectionReports && this.sectionReports.length) return

      const host = this.$refs.editorContent
      if (!host) return
      // 每次重建都重新采集：用户可能在 contenteditable 里增删了内容
      this.collectSourceHeadings()
      const headings = Array.prototype.slice.call(host.querySelectorAll('h1,h2,h3,h4,h5,h6'))

      // 严格提取出来的正文常常是纯 <p>，没有 <h1> 标题 —— 这时靠 collectSourceHeadings
      // 从「像标题的段落」里认章节。两条都空才是真的正文还没上屏。
      // v-html 还没 patch 完时容器为空，会让所有章节都判成空项，这里最多重试 3 次。
      if (!headings.length && !(this.sourceHeadings || []).length && this.editorContent) {
        const n = this._tplOutlineRetry || 0
        if (n < 3) {
          this._tplOutlineRetry = n + 1
          setTimeout(() => {
            this.collectSourceHeadings()
            this.buildOutlineFromTemplate()
          }, 120)
        }
        return
      }
      this._tplOutlineRetry = 0

      // ---- 1) 展开模板章节树为前序扁平数组 ----
      const flatTpl = []
      const walkTpl = (list, parentUid, depth) => {
        (list || []).forEach(item => {
          const uid = 'tpl-' + flatTpl.length
          // ⚠️ 附图标题里的 {#wellName} / {#wellGroup} / {#targetLayer} 占位符要在
          //    导航里也替换成真值：正文（buildSkeletonBody）已经替换过，
          //    导航不换就会出现「左栏写 {#wellName}、正文写长平55B2-2」的割裂。
          const tplTitle = this.fillTemplateTitle(item.title)
          const node = {
            uid,
            index: flatTpl.length,
            key: (TEMPLATE_SPEC_MAP[item.title] || [])[0] || '',
            no: item.no || '',
            title: tplTitle,
            titleFull: (item.no || '') + tplTitle,
            level: item.level || 1,
            parentUid: parentUid || '',
            children: [],
            // 模板导航的语义：这是「应当有」的章节
            generation: '',
            genLabel: '模板章节',
            genDesc: '来自「' + this.perforationMethod + '」模板章节骨架',
            gen: '',
            length: 0,
            charCount: 0,
            imgCount: 0,
            descendantLength: 0,
            filled: false,
            percent: 0,
            statusKey: 'empty',
            fillText: '模板章节，正文暂无内容',
            headingIndex: -1,
            _srcIndex: undefined,
            _srcFrom: 0,
            _domLen: -1,
            _domImg: 0,
            _srcLen: 0,
            _srcImg: 0,
            tplLevel: item.level || 1,
            depth: depth
          }
          flatTpl.push(node)
          if (parentUid) {
            const p = flatTpl.find(x => x.uid === parentUid)
            if (p) p.children.push(node)
          }
          if (item.children && item.children.length) walkTpl(item.children, uid, depth + 1)
        })
      }
      walkTpl(TEMPLATE_SECTIONS, '', 0)

      // ---- 2) 一级章节匹配正文标题（顺序游标 + 交叉校验） ----
      // ⚠️ 2026-11-01 修复「只认出第 1 章」：
      //   源文档（压裂地质设计）的一级章节编号是 Word 自动编号列表（numPr），
      //   POI getText() 取不到 → 后端返回的 <h1> 只有「基本数据」没有「一、」，
      //   模板章名「基础数据」靠 alias 才勉强命中 1 章（测出来正好 1/11，
      //   与用户看到的「有内容 1/11」完全一致）。修法：
      //   a) alias 扩到 11 章全覆盖（见 perforationTemplate.TITLE_ALIAS）；
      //   b) 弱命中且位置比上一章还靠前 → 判定为文内提及，丢弃（防游标串节）；
      //   c) 图题/表题（表1 基础数据表）不参与匹配，否则锚点落在表题上。
      const l1 = flatTpl.filter(n => n.tplLevel === 1)
      let cursor = 0
      let lastIdx = -1
      l1.forEach(node => {
        for (let i = cursor; i < headings.length; i++) {
          const t = headings[i].textContent || ''
          const lv = matchTemplateTitleLevel(t, node.title)
          if (!lv) continue
          // 弱命中（仅包含关系）且位置比上一章靠前 —— 当作正文顺带提及，不认
          if (lv === 1 && i <= lastIdx) continue
          node.headingIndex = i
          cursor = i + 1
          lastIdx = i
          return
        }
      })

      // 一级章节都没对上（比如正文还没有标题、也没认出像标题的段落），退化为抓 DOM
      if (!l1.some(n => n.headingIndex >= 0) && !(this.sourceHeadings || []).length) {
        this.buildOutlineFromDom()
        return
      }

      // ---- 2.5) 收集「章内小节标题」作为切片终点候选 ----
      // ⚠️ 2026-11-01：原来「本节终点 = 下一个已匹配的一级章节标题」。
      //    源文档里一级章节只命中 3 章时，第 1 章的终点会一路落到第 8 章，
      //    跨度过大 → 字数虚高、且中间那些真属于后续设计章的内容全被算进基础数据。
      //    这里把「像章内小节标题」的标题也当终点候选：
      //    「3、本区块渗透率」「1）历史措施：」「（1）分段射孔方案」这类短编号标题。
      const SECTION_NO_RE = /^\s*(第[一二三四五六七八九十0-9]+[章节]|[一二三四五六七八九十]{1,3}\s*、|[（(]\s*[0-9一二三四五六七八九十]{1,3}\s*[)）]|[0-9０-９]{1,2}\s*[、.．)）]|[①②③④⑤⑥⑦⑧⑨⑩])/
      const subHeadingIdx = new Set()
      headings.forEach((h, i) => {
        const t = (h.textContent || '').replace(/[\s\u3000]+/g, '')
        if (!t || t.length > 30) return
        if (isCaptionText(t)) return
        if (SECTION_NO_RE.test(t)) subHeadingIdx.add(i)
      })

      // ---- 3) 二级/三级继承父章节的 headingIndex ----
      flatTpl.forEach(n => {
        if (n.tplLevel > 1) {
          let p = flatTpl.find(x => x.uid === n.parentUid)
          while (p && p.headingIndex < 0 && p.parentUid) {
            p = flatTpl.find(x => x.uid === p.parentUid)
          }
          if (p) n.headingIndex = p.headingIndex
        }
      })

      // ---- 4) 判定每个一级章节是否有内容 ----
      // 两条数据源配合，避免「提取结果正文没有 h1 标题」时全部判空：
      //   a) 正文接口返回的原始标题（this.sourceHeadings）→ 能直接算出章节字数；
      //   b) 正文 DOM 切片（编辑器被用户改过时以后者为准）。
      const rowHeadings = headings
      const srcList = this.sourceHeadings || []
      const hasSrc = srcList.length > 0

      l1.forEach(node => {
        // ---- 4.1 接口原始标题切片 ----
        if (hasSrc) {
          let si = -1
          let from = node._srcFrom || 0
          for (let i = from; i < srcList.length; i++) {
            if (matchTemplateTitle(srcList[i].text, node.title)) { si = i; break }
          }
          if (si >= 0) {
            node._srcFrom = si + 1
            node._srcIndex = si
          }
        }

        // ---- 4.2 DOM 切片 ----
        if (node.headingIndex >= 0) {
          const start = rowHeadings[node.headingIndex]
          // 本节终点 = 「下一个已匹配的一级章节标题」与「下一个章内小节标题」中更近的那个。
          // 只取前者的话，一级章节大量未匹配时跨度会覆盖后面几十个标题（见 2.5 注释）。
          let endIdx = -1
          l1.forEach(n => {
            if (n.headingIndex > node.headingIndex && (endIdx < 0 || n.headingIndex < endIdx)) {
              endIdx = n.headingIndex
            }
          })
          subHeadingIdx.forEach(i => {
            if (i > node.headingIndex && (endIdx < 0 || i < endIdx)) endIdx = i
          })
          const endHeading = endIdx >= 0 ? rowHeadings[endIdx] : null

          let textLen = 0
          let imgCount = 0
          let el = start.nextElementSibling
          let guard = 0
          while (el && el !== endHeading && guard < 5000) {
            guard++
            const t = (el.textContent || '').replace(/\s/g, '')
            textLen += t.length
            if (el.querySelectorAll) imgCount += el.querySelectorAll('img').length
            if (el.tagName === 'IMG') imgCount++
            el = el.nextElementSibling
          }
          node._domLen = textLen
          node._domImg = imgCount
        } else {
          node._domLen = -1   // -1 = 正文里没有这个标题
          node._domImg = 0
        }

        // 先落 DOM 口径（用户可见内容优先）
        node.charCount = node._domLen > 0 ? node._domLen : 0
        node.imgCount = node._domImg
      })

      // ---- 4.3 接口原始标题口径补充（DOM 没有该标题、或 DOM 被改过时） ----
      // 口径：本章「标题所在项」到「下一章标题所在项」之间的全部文字（含本章标题自身，
      // 数量级在几十字，不影响「有/无内容」判定）。所以终点用「已经命中模板的章节」，
      // 起点用它自己的下标，中间夹着的零散标题也算本章内容。
      if (hasSrc) {
        const srcOwners = l1.filter(n => n._srcIndex !== undefined)
          .map(n => ({ si: n._srcIndex, node: n }))
          .sort((a, b) => a.si - b.si)

        srcOwners.forEach((item, k) => {
          const node = item.node
          const stopAt = k + 1 < srcOwners.length ? srcOwners[k + 1].si : srcList.length
          let textLen = 0
          let imgCount = 0
          for (let i = item.si; i < stopAt; i++) {
            textLen += srcList[i].len || 0
            imgCount += srcList[i].img || 0
          }
          node._srcLen = textLen
          node._srcImg = imgCount
          // DOM 没取到（章节标题不在 DOM 里，或正文是纯 <p>）才用接口口径兜底
          if (!node.charCount && !node.imgCount) {
            node.charCount = textLen
            node.imgCount = imgCount
          }
        })
      }

      l1.forEach(node => {
        node.filled = node.charCount > 0 || node.imgCount > 0
      })

      // ---- 4.35 兜底：把「无标题尾部区」的附图/附表算给「九、附图及附表」 ----
      // ⚠️ 2026-11-01：压裂地质设计的附图经常没有「九、附图及附表」这个标题，
      //    只是正文最后排一串「附图1 …」+ 图片。它们会被上面 4.2 的切片算进
      //    上一个已匹配章（实证：6 张附图全记到「八、施工注意事项」名下）。
      //    这里按「顶层块里出现附图N/附表N 起始之后的内容」重新归属。
      if (this.fillAppendixFromTail) this.fillAppendixFromTail(l1)

      // ---- 4.4 区分「模板章」与「数据章」 ----
      // ⚠️ 这一层是 2026-11-01 补的口径（用户提出「只认出第一章」后的追问）：
      //    压裂地质设计只提供「一、基础数据 / 二、设计依据 / 三、压裂工程设计方案 /
      //    八、施工注意事项 / 九、附图及附表」这类**事实数据**，
      //    而「四、压裂前各项准备 / 五、压裂施工步骤 / 七、压裂、射孔后施工步骤 /
      //    十、标准规程 / 十一、压裂液检测指标」本来就不在地质设计里，
      //    它们由压裂设计模板条文 + spec 内置数据生成。
      //    所以这些章判成「空」不是提取失败，不能提示用户「去正文补写」。
      l1.forEach(node => {
        const sp = TEMPLATE_SPEC_MAP[node.title] || []
        node.specKeys = sp
        // 数据章：需要从源文档取内容（FIELDS / FIELD_TABLE / FIELD_TEXT / MIXED / FIGURES…）
        // 模板章：内容来自模板条文或 spec 内置数据，源文档本来就没有
        node.dataDriven = DATA_DRIVEN_SECTIONS.indexOf(node.title) >= 0
        if (node.filled) {
          node.statusKey = 'ok'
        } else {
          node.statusKey = node.dataDriven ? 'empty' : 'tmpl'
          node.fillText = node.dataDriven
            ? '源文档未提取到本章内容'
            : '本章由模板条文 / 内置数据生成，不依赖上传材料'
        }
      })

      // ---- 5) 生成状态：一级按自身内容，二级/三级随父级（中性展示） ----
      const calc = node => {
        node.children.forEach(calc)
        if (node.tplLevel === 1) {
          node.percent = node.filled ? 100 : 0
          if (node.filled) {
            node.fillText = '正文已有内容（约 ' + node.charCount + ' 字' +
              (node.imgCount ? '、' + node.imgCount + ' 图' : '') + '）'
          }
          // 未填充的文案已经在 4.4 里按「数据章 / 模板章」区分过，这里不覆盖
        } else {
          // 二级/三级只是模板结构：正文里没有独立小节标题，无法单独判定有无内容，
          // 所以不标「有内容」（避免父章有字就全部点亮），统一用中性灰点。
          let p = flatTpl.find(x => x.uid === node.parentUid)
          while (p && p.tplLevel > 1) p = flatTpl.find(x => x.uid === p.parentUid)
          const parentOk = !!(p && p.filled)
          node.filled = false
          node.percent = 0
          node.statusKey = 'group'
          node.fillText = parentOk
            ? '模板子条目，内容归属上层章节「' + (p ? p.titleFull : '') + '」'
            : '模板子条目，所属章节正文暂无内容'
        }
      }
      flatTpl.filter(n => !n.parentUid).forEach(calc)

      // ---- 6) 汇总：只看一级章节（模板 11 章口径，二级三级不计入） ----
      // 两套口径分开算，避免用户误读「1/11」：
      //   dataTotal/dataFilled   —— 需要源文档供数的章（提取覆盖率，这是真正的提取质量）
      //   tmplTotal              —— 由模板条文 / 内置数据生成的章（不参与提取覆盖率）
      const l1Nodes = flatTpl.filter(n => n.tplLevel === 1)
      const filledL1 = l1Nodes.filter(n => n.filled).length
      const dataNodes = l1Nodes.filter(n => n.dataDriven)
      const dataFilled = dataNodes.filter(n => n.filled).length
      this.outline = flatTpl
      this.outlineFromDom = false
      this.outlineMode = 'spec'
      this.outlineStats = {
        total: l1Nodes.length,
        filled: filledL1,
        percent: l1Nodes.length ? Math.round((filledL1 / l1Nodes.length) * 100) : 0,
        dataTotal: dataNodes.length,
        dataFilled: dataFilled,
        dataPercent: dataNodes.length ? Math.round((dataFilled / dataNodes.length) * 100) : 0,
        tmplTotal: l1Nodes.length - dataNodes.length
      }
      this.activeSectionUid = flatTpl.length ? flatTpl[0].uid : ''
    },

    /**
     * 把正文尾部的「附图 / 附表 区」归属给「九、附图及附表」。
     *
     * 背景（2026-11-01）：
     *   压裂地质设计的附图往往没有章节标题，正文最后直接排
     *   「附图1 xxx图」+ 图片 + 「附图2 yyy图」+ 图片……
     *   按「下一个一级章标题」切片的算法会把这些图算到上一个已匹配章名下
     *   （实测 6 张附图全进「八、施工注意事项」）。
     *
     * 做法：
     *   1) 在正文顶层块里找第一个「附图N / 附表N」段落，记其位置 tailStart；
     *   2) 统计 tailStart 之后所有块的文字量与图片数；
     *   3) 若「九、附图及附表」章本身没内容，就把这份量记到它名下，
     *      同时从「上一个已匹配章」里扣掉（避免一图两算）。
     *
     * @param {Array} l1 一级章节节点数组
     */
    fillAppendixFromTail(l1) {
      const host = this.$refs.editorContent
      if (!host) return
      const appendixNode = l1.find(n => n.title === '附图及附表')
      if (!appendixNode || appendixNode.filled) return   // 已匹配到标题就不用兜底

      const kids = Array.prototype.slice.call(host.children)
      // 找附图区起点：第一段以「附图1 / 附表1」开头的内容
      let tailStart = -1
      for (let i = 0; i < kids.length; i++) {
        const t = (kids[i].textContent || '').replace(/[\s\u3000]+/g, '')
        if (/^(附\s*图|附\s*表)\s*[0-9０-９一二三四五六七八九十]/.test(t)) { tailStart = i; break }
      }
      if (tailStart < 0) return

      let tailLen = 0
      let tailImg = 0
      for (let i = tailStart; i < kids.length; i++) {
        const el = kids[i]
        tailLen += (el.textContent || '').replace(/\s/g, '').length
        tailImg += el.tagName === 'IMG' ? 1 : (el.querySelectorAll ? el.querySelectorAll('img').length : 0)
      }
      if (!tailLen && !tailImg) return

      // 归属给附图章
      appendixNode.tailFrom = tailStart
      appendixNode.charCount = tailLen
      appendixNode.imgCount = tailImg
      appendixNode.filled = true

      // 从「上一个已匹配章」里扣掉这部分，避免同一批图记两遍
      let prev = null
      l1.forEach(n => {
        if (n.headingIndex >= 0 && n !== appendixNode &&
            (!prev || n.headingIndex > prev.headingIndex)) prev = n
      })
      if (prev && prev.charCount >= tailLen) {
        prev.charCount -= tailLen
        prev.imgCount = Math.max(0, prev.imgCount - tailImg)
        prev.filled = prev.charCount > 0 || prev.imgCount > 0
      }
    },

    /**
     * 从正文 DOM 采集「原始标题序列」：判断模板章节有没有内容时的参考口径。
     *
     * 严格提取出来的正文经常是纯 <p>（没有 h1），这时只看 h1 会全部判空。
     * 这里把「看起来像章节标题」的段落也收进来：
     *   1) 真标题标签 h1~h6
     *   2) <p>/<div> 里以中文/阿拉伯序号开头、且足够短的段落（如「一、基础数据」「3、渗透率」）
     *   3) 已知的章名短语（「效果预测」「井控提示」这类无编号小标题）
     * 图题/表题（图1… / 表2…）一律不收 —— 它们是内容不是标题，收进来会把切片切碎。
     * 每项记 { text, len, img }，len/img 是该标题到下一个标题之间的正文量。
     */
    collectSourceHeadings() {
      const host = this.$refs.editorContent
      if (!host) { this.sourceHeadings = []; return }

      // 无编号小标题白名单：正文里常以加粗短句出现，没有任何序号
      const BARE_HEADINGS = [
        '效果预测', '井控提示', '历史措施', '改造目的', '改造依据', '改造层段',
        '施工要求', '资料录取要求', '本区块渗透率', '邻井压裂及排采情况'
      ]

      const isHeadingLike = (el, text) => {
        const tag = (el.tagName || '').toLowerCase()
        const t = String(text || '').replace(/[\s\u3000]/g, '')
        if (!t) return false
        if (isCaptionText(t)) return false          // 图题 / 表题
        if (/^h[1-6]$/.test(tag)) return true
        if (tag !== 'p' && tag !== 'div') return false
        if (t.length > 30) return false
        if (/^(第[一二三四五六七八九十0-9]+[章节]|[一二三四五六七八九十]{1,3}、|[（(][一二三四五六七八九十]{1,3}[）)]|[0-9０-９]{1,2}\s*[、.．)）]|[①②③④⑤⑥⑦⑧⑨⑩])/.test(t)) return true
        return BARE_HEADINGS.some(h => t.replace(/[：:。.]$/, '') === h)
      }

      const kids = Array.prototype.slice.call(host.children)
      const marks = []
      // 封面结束位置：最后一个「封面特征块」的下标。
      // 封面的 4~6 行（区块名 / 文档名 / 井号括注 / 单位 / 日期）会被 isHeadingLike
      // 认成标题（真 h1），进而把封面字数算进「一、基础数据」——实测 388 字里有大半是封面。
      const COVER_RE = /(压裂地质设计|压裂工程设计|工程设计书|勘探开发研究院|股份有限公司|煤层气分公司|^[（(].{0,20}井[）)]$|^[〇二○零一二三四五六七八九十0-9]{2,4}年.{1,6}月.{1,6}日?$)/
      let coverEnd = -1
      kids.forEach((el, i) => {
        const t = (el.textContent || '').replace(/[\s\u3000]+/g, '')
        if (!t || t.length > 40) return
        if (COVER_RE.test(t)) coverEnd = i
      })

      kids.forEach((el, i) => {
        if (i <= coverEnd) return          // 跳过封面区
        const text = (el.textContent || '').replace(/[\s\u3000]+/g, ' ').trim()
        if (!text) return
        if (!isHeadingLike(el, text)) return
        marks.push({ i, text })
      })

      const list = []
      marks.forEach((m, k) => {
        const stop = k + 1 < marks.length ? marks[k + 1].i : kids.length
        let len = 0
        let img = 0
        for (let j = m.i + 1; j < stop; j++) {
          const el = kids[j]
          len += (el.textContent || '').replace(/\s/g, '').length
          img += el.querySelectorAll ? el.querySelectorAll('img').length : 0
        }
        list.push({ text: m.text, len, img })
      })
      this.sourceHeadings = list
    },

    /**
     * 兜底建导航：直接从正文 DOM 里抓 <h1>~<h6>，按 tag 定层级。
     *
     * 只在「模板章节一个都没匹配上」时才用（例如正文根本还没有标题）。
     * ⚠️ 这个模式会把封面文字、注意事项长句也当成标题，所以正常情况下不走它。
     */
    buildOutlineFromDom() {
      // 已有 sectionReport 建好的导航就不要覆盖
      if (this.sectionReports && this.sectionReports.length) return

      const host = this.$refs.editorContent
      if (!host) return
      const els = Array.prototype.slice.call(host.querySelectorAll('h1,h2,h3,h4,h5,h6'))
      if (!els.length) {
        this.outline = []
        this.outlineFromDom = false
        this.outlineMode = 'dom'
        this.outlineStats = { total: 0, filled: 0, percent: 0 }
        return
      }

      const nodes = els.map((el, i) => {
        const raw = (el.textContent || '').replace(/[\s\u3000]+/g, ' ').trim()
        if (!raw) return null
        const level = Math.min(3, Number(el.tagName.substring(1)) || 1)
        // 拆出编号：「一、」「1、」「（一）」「（1）」「第一章」等
        const m = raw.match(/^((?:第[一二三四五六七八九十0-9]+[章节]|[一二三四五六七八九十]+、|[0-9]{1,2}[、.．]|[（(][0-9一二三四五六七八九十]{1,2}[）)]|附\s*[图表]\s*[0-9]*)\s*)/)
        const no = m ? m[1].trim() : ''
        const title = m ? raw.slice(m[0].length).trim() : raw
        return {
          uid: 'dom-' + i,
          index: i,
          key: '',
          no,
          title: title || raw,
          level,
          generation: '',
          genLabel: '源文档原文',
          genDesc: '来自源文档，未经过智能体重新生成，内容按原文提取',
          gen: '',
          length: 0,
          charCount: 0,
          imgCount: 0,
          parentUid: '',
          children: [],
          descendantLength: 0,
          filled: true,
          percent: 100,
          statusKey: 'ok',
          fillText: '源文档原文，可直接编辑',
          headingIndex: i,
          titleFull: raw
        }
      }).filter(Boolean)

      // 用 level 做父栈，只为算缩进视觉层级（这里不统计完成度）
      const stack = []
      nodes.forEach(n => {
        while (stack.length && stack[stack.length - 1].level >= n.level) stack.pop()
        if (stack.length) {
          n.parentUid = stack[stack.length - 1].uid
          stack[stack.length - 1].children.push(n)
        }
        stack.push(n)
      })

      this.outline = nodes
      this.outlineFromDom = true
      this.outlineMode = 'dom'
      this.outlineStats = { total: nodes.length, filled: nodes.length, percent: 100 }
      this.activeSectionUid = nodes.length ? nodes[0].uid : ''
    },

    /**
     * 按标题节点把正文切片，逐节判断「有实质内容 / 只有占位」。
     *
     * background：后端 FracturingDesignAgent 里所有「生成不出来」的地方都走
     *   placeholder(msg) → <p class="agent-placeholder">…</p>
     * 而 sectionReport.length 统计的是整个 body 的 html 字符数，
     * 占位串本身就有 38~66 字，所以 length>0 无法区分「真内容」和「占位」。
     * 这里直接在渲染后的 DOM 里按 h1~h4 顺序切片（与后端 renderSection 同序），
     * 数出每节正文的纯文本长度与占位段落，作为完成度的权威依据。
     */
    applyPlaceholderFlags(nodes) {
      // 默认值：等 DOM 就绪后再校正
      nodes.forEach(n => {
        n.charCount = n.length
        n.placeholderCount = 0
        n.placeholderText = ''
        n.onlyPlaceholder = false
        n.hasContent = true
        n.headingIndex = -1
      })

      const host = this.$refs.editorContent
      if (!host) return

      const headings = Array.prototype.slice.call(host.querySelectorAll('h1,h2,h3,h4'))
      if (!headings.length) return

      // ---- 1) 先按标题文本给每个导航节点定位 heading 下标 ----
      // 关键：后端 sectionReport 只有 41 项，但正文里「六、泵注程序设计」下面
      // 还挂了 9 个未上报的 <h3>（第1~10段泵注程序），两边数量不等。
      // 因此不能用 "nodes[i] ↔ headings[i]"，必须按文本匹配，并用游标保证顺序单向推进。
      const norm = s => String(s || '').replace(/[\s\u3000]/g, '')
      let cursor = 0
      nodes.forEach(node => {
        const want = norm(node.titleFull)
        const wantTitle = norm(node.title)
        for (let i = cursor; i < headings.length; i++) {
          const t = norm(headings[i].textContent)
          if (t === want || t === wantTitle || (wantTitle && t.indexOf(wantTitle) >= 0 && t.length <= want.length + 8)) {
            node.headingIndex = i
            cursor = i + 1
            return
          }
        }
      })

      // ---- 2) 再按定位到的标题切出本节正文，统计纯文本与占位段落 ----
      nodes.forEach(node => {
        if (node.headingIndex < 0) return
        const start = headings[node.headingIndex]
        const endIdx = node.headingIndex + 1
        // 本节结束位置 = 下一个「已被导航节点认领的」heading，未认领的（如泵注子标题）算在本节内
        let endHeading = null
        for (let j = endIdx; j < headings.length; j++) {
          if (nodes.some(n => n.headingIndex === j)) { endHeading = headings[j]; break }
        }

        let textLen = 0
        let phCount = 0
        let imgCount = 0
        const phTexts = []
        let el = start.nextElementSibling
        while (el && el !== endHeading) {
          const phs = []
          if (el.classList && el.classList.contains('agent-placeholder')) phs.push(el)
          if (el.querySelectorAll) {
            Array.prototype.forEach.call(el.querySelectorAll('.agent-placeholder'), p => phs.push(p))
            imgCount += el.querySelectorAll('img').length
          }
          if (el.tagName === 'IMG') imgCount++
          phs.forEach(p => {
            phCount++
            const t = (p.textContent || '').trim()
            if (t && phTexts.indexOf(t) < 0) phTexts.push(t)
          })
          let t = el.textContent || ''
          phs.forEach(p => { t = t.replace(p.textContent || '', '') })
          textLen += t.replace(/\s/g, '').length
          el = el.nextElementSibling
        }

        node.charCount = textLen
        node.imgCount = imgCount
        node.placeholderCount = phCount
        node.placeholderText = phTexts.slice(0, 2).join('；')
        node.onlyPlaceholder = phCount > 0 && textLen === 0 && imgCount === 0
        node.hasContent = textLen > 0 || imgCount > 0
      })
    },

    // 单节是否算「已填充」：正文里有实质文字或有图片（占位串已被剔除），且不是待开发/待上传
    isSectionFilled(node) {
      if (!node) return false
      if (node.generation === 'PENDING_DEV' || node.generation === 'USER_UPLOAD') return false
      if (typeof node.hasContent === 'boolean') return node.hasContent
      return node.length > 0
    },

    // 后端 no 可能是 null / 空串，统一成安全字符串
    normalizeNo(no) {
      if (no === null || no === undefined) return ''
      return String(no).trim()
    },

    /**
     * 正文里的标题节点：后端 headingHtml() 产出 <h1>~<h4>，与 sectionReport 同序。
     * 但用户可能在 contenteditable 里手动增删标题，所以对不上序时退化为不定位。
     */
    collectHeadingEls() {
      const host = this.$refs.editorContent
      if (!host) return []
      return Array.prototype.slice.call(host.querySelectorAll('h1,h2,h3,h4'))
    },

    // 点击导航 → 定位正文对应标题
    scrollToSection(node) {
      if (!node) return
      this.activeSectionUid = node.uid
      // 「点击目标优先」：短章节（如「历史措施情况」正文只有「无」两个字）
      // 内容高度不足一屏，滚到底也顶不到视口上沿，若按滚动位置反算会把高亮
      // 挪到下一节，看起来像点错了。这里钉住点击目标，直到用户自己滚动为止。
      this.clickPinnedUid = node.uid
      this.scrollSpyLockUntil = Date.now() + 1200

      const host = this.$refs.editorContent
      const el = this.resolveHeadingEl(node)
      if (!host || !el) {
        // 模板章节在正文里没有对应标题（未提取到 / 是模板二级三级）：
        // 属于正常情况，不弹错，只提示一下位置。
        if (this.outlineMode === 'spec') {
          this.$message.info('「' + (node.titleFull || node.title) + '」在正文中暂无对应内容')
          return
        }
        this.$message.warning('正文中未找到该章节标题（可能已被手动修改），请直接滚动查找')
        return
      }

      // 目标位置 = 当前 scrollTop + 标题相对容器的偏移 - 顶部留白
      const rel = el.getBoundingClientRect().top - host.getBoundingClientRect().top
      const top = Math.max(0, host.scrollTop + rel - 8)
      host.scrollTo({ top, behavior: 'smooth' })

      // 兜底：smooth 不生效或被打断时，滚完再硬校正一次
      const uid = node.uid
      setTimeout(() => {
        if (this.activeSectionUid !== uid) return
        const rel2 = el.getBoundingClientRect().top - host.getBoundingClientRect().top
        if (Math.abs(rel2 - 8) > 24) {
          host.scrollTop = Math.max(0, host.scrollTop + rel2 - 8)
        }
      }, 700)

      // 高亮闪一下，方便肉眼确认落点
      el.classList.add('sec-flash')
      setTimeout(() => el.classList.remove('sec-flash'), 1300)
    },

    // 用户主动操作（滚轮 / 触摸 / 键盘）时立即解锁滚动跟随，
    // 避免「点击定位后的锁定」把用户自己滚动的高亮也压住。
    unlockScrollSpy() {
      this.scrollSpyLockUntil = 0
      this.clickPinnedUid = ''
    },

    // 正文滚动 → 高亮跟随（滚动结束 120ms 后取第一个进入视口上沿的标题）
    handleEditorScroll() {
      if (!this.outline.length) return
      if (this.scrollSpyLockUntil && Date.now() < this.scrollSpyLockUntil) return
      if (this._spyTimer) clearTimeout(this._spyTimer)
      this._spyTimer = setTimeout(this.syncActiveByScroll, 120)
    },

    syncActiveByScroll() {
      // 点击定位后钉住目标章节，直到用户自己滚动（unlockScrollSpy 会清掉它）
      if (this.clickPinnedUid) return
      const host = this.$refs.editorContent
      if (!host || !this.outline.length) return
      const hostTop = host.getBoundingClientRect().top
      // ⚠️ 不能直接用 heading 下标去索引 outline：
      //    正文里存在 sectionReport 未收录的标题（如「六、泵注程序设计」下的
      //    「1、第1段泵注程序」…共 9 个 h3），两边数量不等会整体错位。
      //    这里改成：先定位当前视口上沿对应的 heading，再按文本反查导航节点。
      const headings = this.collectHeadingEls()
      let hIdx = 0
      for (let i = 0; i < headings.length; i++) {
        const rel = headings[i].getBoundingClientRect().top - hostTop
        if (rel <= 88) hIdx = i
        else break
      }
      if (host.scrollTop + host.clientHeight >= host.scrollHeight - 4) {
        hIdx = headings.length - 1
      }
      const node = this.findOutlineByHeadingIndex(hIdx)
      if (node && node.uid !== this.activeSectionUid) {
        this.activeSectionUid = node.uid
        this.ensureOutlineVisible(node)
      }
    },

    // heading 下标 → 导航节点（取 headingIndex <= hIdx 的最后一个）
    findOutlineByHeadingIndex(hIdx) {
      let hit = null
      for (let i = 0; i < this.outline.length; i++) {
        const n = this.outline[i]
        if (typeof n.headingIndex === 'number' && n.headingIndex <= hIdx) hit = n
        else if (typeof n.headingIndex === 'number') break
      }
      return hit
    },

    // 按「标题文本」在正文里找对应元素，找不到再退回 headingIndex
    resolveHeadingEl(node) {
      const headings = this.collectHeadingEls()
      if (!headings.length) return null
      const norm = s => String(s || '').replace(/[\s\u3000]/g, '')
      const want = norm(node.titleFull)
      const wantTitle = norm(node.title)
      // 1) 精确匹配「编号+标题」或「纯标题」
      let el = headings.find(h => {
        const t = norm(h.textContent)
        return t === want || t === wantTitle
      })
      if (el) return el
      // 2) 退化：标题包含关系（后端可能对标题做了占位变量替换）
      el = headings.find(h => {
        const t = norm(h.textContent)
        return want && (t.indexOf(want) >= 0 || (wantTitle && t.indexOf(wantTitle) >= 0))
      })
      if (el) return el
      // 3) 最后退回构建时缓存的下标
      return typeof node.headingIndex === 'number' ? (headings[node.headingIndex] || null) : null
    },

    // 让高亮项在左侧导航里保持可见
    ensureOutlineVisible(node) {
      this.$nextTick(() => {
        const scroll = this.$refs.outlineScroll
        const wrap = scroll && (scroll.$el || scroll)
        if (!wrap || !node) return
        const item = wrap.querySelector('.outline-item.active')
        if (!item) return
        const r = item.getBoundingClientRect()
        const w = wrap.getBoundingClientRect()
        if (r.top < w.top || r.bottom > w.bottom) {
          item.scrollIntoView({ block: 'nearest' })
        }
      })
    },

    // 原「生成文档说明」数据入口。
    //
    // 该说明区（文档级：井名 / 原文 / 图片 / 表格 / 词句统计）已按需求移除，
    // 页面只保留每个章节自己的「生成说明」条（sec-info，跟随左侧导航切换）。
    //
    // 这里保留方法签名是为了不让十余处调用点全部改一遍，但**不再写入任何状态**，
    // 仅把 error 级别的提示转成全局 message 弹出 —— 这类提示原本就同时调了
    // $message.error（如「加载失败」「生成失败」），保留兜底避免异常被静默吞掉。
    setGenNotes(notes) {
      const errs = (notes || []).filter(n => n && n.type === 'error' && n.text)
      errs.forEach(n => this.$message.error(n.text))
    },

    /**
     * 把「源文档正文」按模板章节骨架归位，产出**完整的 42 个章节标题**。
     *
     * <p>需求来源（2026-11-08 用户）：</p>
     * <pre>
     *   「所有的章节 在正文中都需要出现 这事标题内容
     *     即使没有提取到文本内容 章节是固定的 都需要有」
     * </pre>
     *
     * <p>此前的行为：严格提取链路把 /v1/annotation/content 返回的 html 原样塞进编辑框，
     * 于是正文里只有源文档自己的编号标题（「5、历史措施及本次改造的目的…」「1）历史措施：」），
     * 模板章节标题一个都没有。而左侧导航却按模板骨架列了 35 项 —— 两边完全对不上。</p>
     *
     * <p>现在的做法（三趟扫描，都在 html 字符串上做，不经 DOM，避免 v-html 前拿不到节点）：</p>
     * <ol>
     *   <li><b>切块</b>：把源 html 按顶层块切成序列，每块记 {html, text, isHeading}；</li>
     *   <li><b>认章</b>：按模板章节树前序遍历，用 {@link matchTemplateTitleLevel} 在块序列上
     *       单向游标匹配每个节点；命中则该节点「起点」= 该块下标；</li>
     *   <li><b>归入</b>：每个块的归属 = 「它之前最近一个命中的模板节点」（未命中任何节点则为 null，
     *       即「模板外的源文档内容」，挂到其后第一个已命中章节的末尾，保证不丢内容）。</li>
     * </ol>
     *
     * <p>输出：按模板顺序逐个节点渲染 {@code <h1|h2|h3 class="heading-N">编号+标题</h1>}，
     * 后面接归入本章的块；本章一个块都没归到的，输出 {@code <p class="agent-placeholder">} 占位提示。
     * 这样「章节固定、标题必在、没内容就给占位」三条同时成立。</p>
     *
     * @param {string} srcHtml 源文档正文 html
     * @param {Array}  imgs    已提取的正文图片（严格提取链路的 images）；附图章会用到
     * @return {string} 已按模板骨架重排的正文 html
     */
    buildSkeletonBody(srcHtml, imgs) {
      const src = String(srcHtml || '')
      if (!src) return ''

      // ---------- 0) 模板章节树展平（带 parent 链，用于「父子同标题」判别） ----------
      const flat = []
      const walk = (list, parentTitle, depth) => {
        (list || []).forEach(item => {
          const t = String(item.title || '')
          const titleText = this.fillTemplateTitle(t)
          flat.push({
            no: String(item.no || ''),
            title: titleText,
            rawTitle: t,
            level: item.level || 1,
            depth,
            parentTitle: parentTitle || '',
            _anchor: -1,
            _end: -1
          })
          if (item.children && item.children.length) walk(item.children, titleText, depth + 1)
        })
      }
      walk(TEMPLATE_SECTIONS, '', 0)

      // ---------- 1) 源 html 切块 ----------
      const blocks = this.splitHtmlBlocks(src)

      // ---------- 2) 全局分配：为每个模板节点在块序列上选锚点 ----------
      //
      // ⚠️ 2026-11-10 重写。原实现是「单向游标 + 只看 matchTemplateTitleLevel 是否为 0」，
      //    在《安13-5井组压裂地质设计》上实测 41 个模板节点只有 6 个命中，其中 2 个还是错命中。
      //    三类真实故障（都已在真实源文档上复现，回归脚本 tmp/_diag_dp.py）：
      //
      //    a) 别名跨章抢占：「TITLE_ALIAS['施工注意事项'] 含 '井控提示'」——
      //       源文档的「6、井控提示：」以 lv=2 命中了一级章「八、施工注意事项」，
      //       于是「八」占用了块 55，其下 8 个节点（安全/环保/安全预案/井控要求/…）全部判空。
      //       期望是「（1）井控提示」命中，且「八」自己判空。
      //       → 已通过收窄 TITLE_ALIAS 修掉（别名只放同义写法，不放子节点标题）。
      //    b) 弱命中（lv=1）与强命中（lv=2）被一视同仁：
      //       一级「6、效果预测」靠 lv=1 抢到了源文档的「4）效果预测：」，
      //       顺带把三张压裂点参数表都吞进本章区间。
      //       → 现在 lv 直接参与打分：强命中 100 分、弱命中 40 分。
      //    c) 游标只前进、命中失败也不推进，一旦某节错位后面整片连锁失效。
      //       → 改为「候选打分 + 冲突消解」。
      //
      //    ⚠️ 关键设计（第 4 次迭代才定下来，别退回去）：
      //    **保序约束不能是「模板前序严格递增」**。模板按《压裂工程设计》排，源文档是
      //    《压裂地质设计》，两份文档章节顺序本来就不同。实测反例：
      //      模板顺序   5、历史措施情况 → 6、效果预测 → 二、1、压裂目的
      //      源文档顺序 1）历史措施(blk24) → 2）改造目的(blk26) → 4）效果预测(blk32)
      //    若要求前序严格递增，(blk32) 的「4）效果预测」会把 (blk26) 的「2）改造目的」挤掉。
      //    所以这里只施加**分组保序**：同一父节点下的兄弟之间保序、一级章之间保序，
      //    跨层级允许交错。
      const N = flat.length
      const M = blocks.length

      // ---- 2.1) 每个节点的候选锚点及分数 ----
      // 分数口径：lv=2（模板名/同义/别名命中）记 100，lv=1（弱包含）记 40；
      //   再加「覆盖度」微调（节点标题字数 / 块文本字数，上限 1），
      //   让「几乎就是纯标题」的块优先于「标题出现在长句中间」的块。
      //   ⚠️ 一级章名天然比子节点短，覆盖度偏低是正常的，不额外补偿 ——
      //     同分时让「更具体的子节点」胜出，正是我们想要的。
      const isFigNode = (n) => /^附\s*图\s*[0-9０-９一二三四五六七八九十]/.test(String(n.rawTitle || n.title || ''))

      // ---- 附图语义关键词表（2026-11-10 新增）----
      //
      // ⚠️ 附图**不能只按编号对齐**。实测《安13-5井组压裂地质设计》有 8 张附图：
      //      1 平1综合录井图 / 2 平1导向图 / 3 平2综合录井图 / 4 平2导向图
      //      5 平3综合录井图 / 6 平3导向图 / 7 井组3#煤层顶面构造图 / 8 井区3#井位部署图
      //    而模板只有 6 个位次：
      //      1 录井综合图 / 2 导向图 / 3 井组构造图 / 4 井位部署图 / 5 施工管柱示意图 / 6 井场布置图
      //    若只按编号对齐，附图3 会挂到「平2综合录井图」、附图4 挂到「平2导向图」，
      //    六张图里四张错位（实测截图就是这个形态）。
      //    正确做法：**先按语义关键词认图，编号只做兜底**。
      const FIG_KW = {
        录井综合图: ['录井综合图', '综合录井图', '录井图'],
        导向图: ['导向图'],
        构造图: ['构造图'],
        井位部署图: ['井位部署图', '井位图', '井位分布图'],
        施工管柱示意图: ['施工管柱示意图', '管柱示意图', '施工管柱图', '管柱图'],
        井场布置图: ['井场布置图', '井场平面布置图', '井场图']
      }
      // ⚠️ 不能只拿 key 做 indexOf（2026-11-10 修）。
      //    实测图片 context 是「安13-5-3平1井**综合录井图**」，
      //    而 key 写的是「**录井综合图**」—— 词序相反，indexOf 命中不了，
      //    figKwOf 返回空串 → 模板「附图1 录井综合图」这个位次一张图都认不出来、
      //    直接判空（实测就是这样）。必须把 key 自己的别名列表也遍历一遍。
      //    同时「井位部署图」与「井场布置图」都含「布置图」，靠遍历顺序抢占会互相误伤，
      //    所以「布置图」这种泛词不进别名表，只留「井场…」前缀的确定性写法。
      const figKwOf = (title) => {
        const t = String(title || '')
        if (!t) return ''
        let best = ''
        let bestLen = 0
        // 取「命中的最长别名」对应的 key，长别名优先 → 天然避免泛词抢占
        for (const k in FIG_KW) {
          for (const a of FIG_KW[k]) {
            if (a && t.indexOf(a) >= 0 && a.length > bestLen) {
              best = k
              bestLen = a.length
            }
          }
        }
        return best
      }

      const cand = flat.map((node) => {
        const list = []
        const bb = normalizeHeadingText(node.title)
        const figNo = isFigNode(node)
          ? ((String(node.rawTitle || node.title).match(/附\s*图\s*([0-9０-９一二三四五六七八九十]+)/) || [])[1] || '')
          : ''
        const figKw = figNo ? figKwOf(node.title) : ''
        for (let i = 0; i < M; i++) {
          const b = blocks[i]
          // ⚠️ 附图标题在源文档里是普通 <p>（isCaptionText 把 heading 判定一票否决了），
          //    所以附图节点必须允许非 heading 块，否则 6 个附图位永远匹配不上。
          if (!b.isHeading && !figNo) continue
          let lv = 0
          let score = 0
          if (figNo) {
            // 附图三条通路，优先级「语义关键词 > 编号」：
            //   语义命中（160）—— 模板要「构造图」，源文档那块也是「构造图」
            //   编号对齐（120）—— 语义认不出时的兜底（井场布置图这类模板有、源文档没有的）
            const bno = (String(b.text).match(/^\s*附\s*图\s*([0-9０-９一二三四五六七八九十]+)/) || [])[1] || ''
            if (!bno) continue
            const bkw = figKwOf(b.text)
            const kwHit = figKw && bkw && figKw === bkw
            const noHit = bno === figNo
            if (!kwHit && !noHit) continue
            lv = 2
            score = kwHit ? 160 : 120
          } else {
            lv = matchTemplateTitleLevel(b.text, node.title)
            if (!lv) continue
            const a = normalizeHeadingText(b.text)
            const cover = bb ? Math.min(1, bb.length / Math.max(a.length, 1)) : 0
            // ---- 深度加权（2026-11-10 新增）----
            // ⚠️ 父子同义时必须让**更具体的子节点**胜出。
            //    实测：「改造层段」同时是 SECTION_SYNONYM['压裂工程设计方案']（一级章）
            //    和 ['压裂层段']（二级子节）的别名，两者对 blk34「5）改造层段：」都命中 lv=2。
            //    一级章标题更短、cover 更低，本该让子节点赢，但一级章的组号=自己、
            //    保序约束里又不受同级约束，最终抢到位，导致「1、压裂层段」判空、
            //    父节点独占 17 个正文块。加 depth 加权（每层 +6）后子节点稳定胜出。
            //    分值量级：lv2 基准 100、cover 上限 20、depth 最多 2 层 → 12，不会越级到 160。
            score = (lv === 2 ? 100 : 40) + Math.round(cover * 20) + (node.depth || 0) * 6
          }
          list.push({ i, lv, score })
        }
        // 同一块可能被重复加入 → 去重取最高分
        const map = new Map()
        list.forEach(c => {
          const old = map.get(c.i)
          if (!old || c.score > old.score) map.set(c.i, c)
        })
        return Array.from(map.values()).sort((x, y) => y.score - x.score)
      })

      // ---- 2.2) 分组：一级章各自成组，子节点继承父节点的组号 ----
      // 组号用于 2.3 的「分组保序」判定。
      const gid = new Array(N).fill(-1)
      {
        let cur = -1
        flat.forEach((n, k) => {
          if (n.depth === 0) cur = k
          gid[k] = cur
        })
      }

      // ---- 2.3) 贪心取最高分候选 → 冲突消解 ----
      // 每个节点先拿自己最高分的候选；然后扫描所有「需要保序」的节点对，
      // 一旦发现锚点倒置，就让**分数较低的那个**退到它的次优候选（且退让后不与别人冲突）；
      // 没有可用退路就放弃该节点的锚点（宁可判空，也不要错位）。
      // 复杂度 O(N² × 候选数)，41 个节点、65 个块完全够用；行为可解释、便于排查。
      const picks = cand.map(list => (list.length ? list[0] : null))
      const mustOrder = (a, b) => gid[a] === gid[b] || (flat[a].depth === 0 && flat[b].depth === 0)

      for (let round = 0; round < N; round++) {
        let changed = false
        for (let a = 0; a < N; a++) {
          for (let b = a + 1; b < N; b++) {
            if (!picks[a] || !picks[b]) continue
            if (!mustOrder(a, b)) continue
            if (picks[a].i < picks[b].i) continue
            // 倒置：分数低者退让
            const loser = picks[a].score <= picks[b].score ? a : b
            const cur = picks[loser]
            const alt = cand[loser].find(c => {
              if (c.i === cur.i) return false
              for (let t = 0; t < N; t++) {
                if (t === loser || !picks[t]) continue
                if (!mustOrder(t, loser)) continue
                if (t < loser && picks[t].i >= c.i) return false
                if (t > loser && picks[t].i <= c.i) return false
              }
              return true
            })
            picks[loser] = alt || null
            changed = true
            break
          }
          if (changed) break
        }
        if (!changed) break
      }
      picks.forEach((p, k) => {
        if (p) {
          flat[k]._anchor = p.i
          flat[k]._anchorLv = p.lv
        }
      })

      // ---------- 3) 计算每个节点的内容区间 ----------
      // 终点 = 下一个「已命中」节点的锚点（不论层级），保证内容不重复计入。
      //
      // ⚠️ 不是所有锚点都「自己就是标题块」：
      //   「套管数据」在源文档里是不带序号的段落，靠 TITLE_ALIAS / 包含关系弱命中，
      //   这种锚点块本身就是正文，不能被当成标题跳过。
      const anchored = flat.filter(n => n._anchor >= 0).sort((a, b) => a._anchor - b._anchor)
      anchored.forEach((n, k) => {
        n._end = k + 1 < anchored.length ? anchored[k + 1]._anchor : blocks.length
        // 锚点块若「像模板标题」→ 它是标题块，正文从下一块开始；
        // 否则（弱命中，如不带序号的「套管数据」、或 h2 里写的正文句子）→ 它本身就是正文，要保留。
        n._anchorIsHeading = this.looksLikeHeadingText(blocks[n._anchor].text) ||
          /^h[1-6]$/i.test((blocks[n._anchor].html.match(/^<(h[1-6])/i) || [])[1] || '')
        // 父子同标题、锚点恰是模板标题的那种情况（「一、基本数据」）一定是标题块
        if (normalizeHeadingText(blocks[n._anchor].text) === normalizeHeadingText(n.title)) {
          n._anchorIsHeading = true
        }
      })

      // 「模板外的前置内容」：第一个锚点之前的所有块。
      //
      // ⚠️ 这段通常是**源文档的封面 + 设计人/审核人签署表**，必须丢掉：
      //    封面（书名、井号、单位、日期）和签署表在导出时由后端按模板重新生成，
      //    编辑器里再原样搬一遍，正文顶上就会挂一坨「2026年压裂工程设计 № CMY-26-」，
      //    把真正的「一、基本数据」挤到屏幕外（实测就是这个问题）。
      //
      //    只有在「前置块既不是封面形态、也不含表格」时才保留，避免误伤真正的导语段落。
      const firstAnchor = anchored.length ? anchored[0]._anchor : blocks.length
      let preambleHtml = ''
      for (let i = 0; i < firstAnchor; i++) {
        const b = blocks[i]
        if (/<table[\s>]/i.test(b.html)) continue                  // 签署表 → 丢
        if (this.looksLikeCoverText(b.text, i)) continue            // 封面文字 → 丢
        // 其余（真正的导语/说明）保留，但标题降级为普通段落，避免抢大纲级别
        preambleHtml += b.isHeading
          ? '<p>' + this.escapeHtml(b.text) + '</p>'
          : b.html
      }

      // ---------- 4) 逐节点渲染 ----------
      //
      // 附图章的图片来自独立接口（/v1/extract-images），不在正文 html 里，
      // 所以源文档的「附图1 …」标题虽然存在，却匹配不到任何 img 块。
      // 这里给附图类节点准备一个图片队列，按顺序补位：
      //   命中「附图N」节点 → 取一张图挂上去；图用完了就退化成占位提示。
      let imgSeq = 0
      const isFigureNode = (n) => /^附\s*图\s*[0-9０-９一二三四五六七八九十]/.test(String(n.rawTitle || n.title || ''))

      // ---- 附图取图：优先「按锚点编号对齐」，其次顺序兜底（2026-11-10 新增）----
      //
      // ⚠️ 原来是纯 imgQueue.shift()，与锚点语义完全脱钩。
      //    实测《安13-5井组压裂地质设计》8 张图：1平1录井 / 2平1导向 / 3平2录井 / 4平2导向
      //    / 5平3录井 / 6平3导向 / 7构造图 / 8井位部署图；模板 6 个位。
      //    锚点按语义挂对了（附图3→构造图 blk63、附图4→井位部署图 blk64），
      //    但 shift() 仍把队列前 6 张依次发出去 → 「构造图」这个位拿到的是「平2综合录井图」，
      //    六张图里四张错位。现在改成按锚点块的「附图N」编号去队列里挑对应图。
      const figNoOf = (s) => (String(s || '').match(/附\s*图\s*([0-9０-９一二三四五六七八九十]+)/) || [])[1] || ''
      // ⚠️ 后端 /v1/document-parse/extract-images 返回的图题字段是 **context**
      //    （实测值形如 `附图1 安13-5-3平1井综合录井图`，非附图图是 `基本数据` 或空串），
      //    不是 caption / name / fileName。字段取错会静默退回「按序 shift」，等于没改。
      const figCapOf = (img) => String(
        (img && (img.context || img.caption || img.name || img.fileName)) || ''
      )

      // ⚠️ 队列必须**先把非附图图片摘掉**（2026-11-10 修）。
      //    实测该文档共 10 张图，前两张是「logo(3.31cm)」和「基本数据里的一张照片」，
      //    context 分别是空串和「基本数据」，都不带「附图N」。
      //    以前直接 shift()，这两张白占两个附图位，真正要用的图片整体后移 ——
      //    结果「附图1 录井综合图」挂上了 logo。现在按 context 分流：
      //    带「附图N」的进附图队列，其余按 context 归到对应章节，归不进去的才留到文末。
      const allImgs = Array.isArray(imgs) ? imgs.slice() : []
      const figImgs = allImgs.filter(img => !!figNoOf(figCapOf(img)))
      let otherImgs = allImgs.filter(img => !figNoOf(figCapOf(img)))
      // logo：context 为空、尺寸很小的图，直接丢（源文档页眉商标，正文里没有任何意义）
      otherImgs = otherImgs.filter(img => {
        const c = figCapOf(img).trim()
        if (c) return true
        const w = parseFloat(img && img.widthCm)
        return !(w > 0 && w < 6)
      })
      const imgQueue = figImgs.length ? figImgs : allImgs

      // ---- 附图取图：**以「语义关键词」为准，编号只做兜底**（2026-11-10 重写）----
      //
      // ⚠️⚠️ 绝对不能按编号取图。源文档的「附图N」是**源文档自己的编号**，
      //    模板的「附图N」是**模板自己的位次**，两套编号只是字形相同，语义毫无关系。
      //    实测《安13-5井组压裂地质设计》：
      //      源附图1 平1录井 / 2 平1导向 / 3 平2录井 / 4 平2导向
      //      / 5 平3录井 / 6 平3导向 / 7 井组构造图 / 8 井区井位部署图
      //    模板 6 个位次：
      //      1 录井综合图 / 2 导向图 / 3 构造图 / 4 井位部署图 / 5 施工管柱图 / 6 井场布置图
      //    按编号取 → 附图3「构造图」拿到「平2录井图」、附图5「施工管柱图」拿到「平3录井图」；
      //    再加上附图1 先取走了队列里的附图1，后面全链错位，最终六个位次几乎全判空。
      //
      //    正确口径：模板位次的**语义关键词**（figKwOf(node.title)）去匹配图片 context 的关键词。
      //      模板 1 录井综合图  → 源 1/3/5 三张「综合录井图」**全部**归这一位
      //      模板 2 导向图      → 源 2/4/6 三张「导向图」**全部**归这一位
      //      模板 3 构造图      → 源 7「煤层顶面构造图」            → 唯一命中 ✅
      //      模板 4 井位部署图  → 源 8「井位部署图」                → 唯一命中 ✅
      //      模板 5 施工管柱图  → 源文档无此类图                    → 判空 ✅（正确）
      //      模板 6 井场布置图  → 源文档无此类图                    → 判空 ✅（正确）
      //
      // ⚠️ 返回**数组**不是单张（2026-11-10 修）。源文档常有「同一个语义、多口井各一张」
      //    的情况（本例 3 口井 × 录井/导向 = 6 张，模板各只给 1 个位次）。
      //    若只取第一张，剩下 4 张会掉进「文末兜底」，全部堆到最后一章
      //    「十一、压裂液检测指标」下面（实测就是这样），既错章又看不出归属。
      //    正确做法：同语义的图全部收进该位次，按源文档顺序排列。
      const takeFigImages = (node) => {
        if (!imgQueue.length) return []
        const tplKw = figKwOf(node.title)

        // ① 语义命中：把这个关键词下的图**全部**摘出来（保持源文档顺序）
        if (tplKw) {
          const got = []
          for (let i = imgQueue.length - 1; i >= 0; i--) {
            if (figKwOf(figCapOf(imgQueue[i])) === tplKw) got.unshift(imgQueue.splice(i, 1)[0])
          }
          // 模板要「施工管柱图」而源文档只有录井/导向/构造/部署 → 空数组是**正确结论**，
          // 不许拿别的图凑数（否则「施工管柱示意图」底下会挂一张录井图）。
          return got
        }

        // ② 编号兜底：模板位次的名字里认不出关键词（极少数），才退到源编号对齐
        const wantNo = node._anchor >= 0 ? figNoOf(blocks[node._anchor] && blocks[node._anchor].text) : ''
        if (wantNo) {
          const idx = imgQueue.findIndex(img => figNoOf(figCapOf(img)) === wantNo)
          // ⚠️ 有明确编号但队列里没有这张 → 返回空，**不许 shift() 兜底**：
          //    shift() 会把下一张别的图发给这一位，图题与图对不上。
          return idx >= 0 ? [imgQueue.splice(idx, 1)[0]] : []
        }

        // ③ 既无关键词也无编号 → 才允许顺序兜底
        return [imgQueue.shift()]
      }
      // 按 context 把「非附图图片」挂到对应章节：context 是源文档里的章名，
      // 用模板匹配找归属节点；找不到就留到最后兜底。
      // ⚠️ 深优先：父子同名时（「一、基本数据」与「1、基本数据」）必须挂到**子节**。
      //    源文档的图在「1、基本数据」的表格区域里，挂到容器章会让图跑到章的标题下方、
      //    与子节内容分裂成两块。判据就是 depth 更大的赢。
      //
      // ⚠️⚠️ key 必须带上 depth，**不能用裸 title**（2026-11-10 修）。
      //    模板里「基本数据」同时是一级章（depth 0）和它的第一个子节（depth 1）的标题，
      //    两者 title 字符串**一模一样**。若 Map 用裸 title 作键，深度优先选出的 d1
      //    写进 imgBySec.set('基本数据', …)，渲染时先走到 d0（「一、基本数据」），
      //    一查 get('基本数据') 就把这张图取走并 delete —— 图挂在了容器章标题下，
      //    真正的子节「1、基本数据」反而没有图，视觉上就是「图跑到了章标题正下方、
      //    与表格数据分裂」（实测就是这个形态）。
      const secKey = (n) => (n.depth || 0) + '|' + n.title
      const imgBySec = new Map()
      otherImgs.forEach(img => {
        const ctx = figCapOf(img).trim()
        if (!ctx) { imgBySec.set('__rest__', (imgBySec.get('__rest__') || []).concat(img)); return }
        let bestKey = ''
        let bestLv = 0
        let bestDepth = -1
        flat.forEach(n => {
          const lv = matchTemplateTitleLevel(ctx, n.title)
          // 同分时深度大的赢（父子同名 → 挂子节）；深度也同则先到先得
          if (lv > 0 && (lv > bestLv || (lv === bestLv && n.depth > bestDepth))) {
            bestLv = lv
            bestKey = secKey(n)
            bestDepth = n.depth
          }
        })
        const key = bestLv > 0 ? bestKey : '__rest__'
        imgBySec.set(key, (imgBySec.get(key) || []).concat(img))
      })

      let out = ''
      const missing = []
      flat.forEach(node => {
        const hTag = 'h' + Math.min(3, Math.max(1, node.level))
        const headText = this.buildSkeletonHeadingText(node.no, node.title)
        // class="heading-N" 复用编辑器既有样式；data-sec 供章节导航跳转定位
        out += '<' + hTag + ' class="heading-' + node.level + '" data-sec="' +
          this.escapeHtml(node.title) + '">' + this.escapeHtml(headText) + '</' + hTag + '>'

        // 本章若有关联的非附图图片（按 context 归位），紧跟标题输出，保证图在原章节里
        const secImgs = imgBySec.get(secKey(node))
        if (secImgs && secImgs.length) {
          secImgs.forEach(img => { out += this.renderImageBlock(img, ++imgSeq) })
          imgBySec.delete(secKey(node))
        }

        if (node._anchor < 0) {
          // 模板有、源文档没有。
          // 附图节点例外：源文档的附图标题被 isCaptionText 判为「图题」不参与锚定，
          // 但图本身在 imgQueue 里 —— 直接补图，不判缺失。
          if (isFigureNode(node) && imgQueue.length) {
            const _ims = takeFigImages(node)
            if (_ims.length) {
              _ims.forEach(_im => { out += this.renderImageBlock(_im, ++imgSeq) })
              return
            }
          }
          missing.push(node.title)
          out += '<p class="agent-placeholder">（源文档未提供该章节内容，请人工补充）</p>'
          return
        }

        // 正文片：从锚点块开始（锚点若是标题块则从下一块开始）
        let seg = ''
        let plainLen = 0
        const from = node._anchorIsHeading ? node._anchor + 1 : node._anchor

        // ⚠️ 附图节点专属收口（2026-11-10 新增）：
        //    附图的锚点块是源文档里的「附图N …」图题，isCaptionText 会一票否决它的
        //    heading 判定，于是 _anchorIsHeading=false、from 落在锚点块自己身上，
        //    下面「弱命中锚点整块保留」分支把它当正文原样输出 ——
        //    结果是「模板附图标题 + 源文档图题」两行，而图根本没挂上（实测附图1 就是这个形态）。
        //    正确做法：附图节点若锚点块是图题，就丢掉该块、改挂图片，正文从下一块起。
        let figBodyFrom = from
        // ⚠️ 附图节点「一个位次只能挂一张图」（2026-11-10 修）。
        //    附图节点有两条挂图通路：
        //      ① 这里（锚点块是图题 → 丢掉图题、改挂图片）
        //      ② 下面 hasBlock 为假时的「附图补图」分支
        //    两条都判 isFigureNode，附图2~4 的 _end 区间里还留着后续「附图N …」图题块，
        //    区间循环结束后 seg 仍为空（图题全被 isCaptionText 丢掉）→ hasBlock=false
        //    → 又进 ② 挂一张，于是同一个位次挂出两张图（实测附图2 就是这个形态：
        //    34 字 = 17×2）。用 figPlaced 标记，挂过就不再挂。
        let figPlaced = false
        if (isFigureNode(node)) {
          const ab = blocks[node._anchor]
          if (ab && isCaptionText(ab.text)) {
            figBodyFrom = node._anchor + 1
            // 同语义的多张图（3 口井的录井图等）全部挂到这一位次下
            const _ims = takeFigImages(node)
            if (_ims.length) {
              _ims.forEach(_im => { out += this.renderImageBlock(_im, ++imgSeq) })
              figPlaced = true
            }
          }
        }

        for (let i = figBodyFrom; i < node._end; i++) {
          const b = blocks[i]
          if (i === node._anchor && !node._anchorIsHeading && figBodyFrom === from) {
            // 弱命中锚点：整块原样保留
            seg += b.html
            plainLen += b.text.length
            continue
          }
          if (b.isHeading) {
            // 源文档的章内小标题：降级为加粗段落，避免与模板标题形成两套目录。
            //
            // ⚠️ 例外：图表题（「附图1 …」「表1 …」）直接丢弃。
            //    附图章的 6 个位次由模板提供标题 + 图片，源文档自己那串
            //    「附图1 … 附图6 …」再输出一遍，会变成「标题 → 源6条 → 模板6条」三份重复
            //    （实测附图章就是这个形态）。
            if (isCaptionText(b.text)) continue
            // ⚠️ 第二类例外：**本身就是某个模板章节标题**的块，也丢弃（2026-11-10 新增）。
            //    实测：源文档 blk23「5、历史措施及本次改造的目的、依据、效果预测、压裂工艺建议」
            //    因为标题里把三个词都写了，同时命中「5、历史措施情况」和「6、效果预测」；
            //    「5、历史措施情况」实际锚在紧随其后的 blk24「1）历史措施：」上，
            //    于是 blk23 落进上一节「4、邻井压裂及排采情况」的区间 [12..24)，
            //    被降级成加粗段落输出 —— 正文末尾凭空多出一行「5、历史措施及本次改造的…」，
            //    而真正的模板标题在下一段才出现，视觉上就是同一个标题写了两遍。
            //    判据：这一段能被任意模板节点以 lv=2 命中 → 它是个「章标题」，交给模板输出。
            if (this.isTemplateChapterHeading(b.text)) continue
            seg += '<p><strong>' + this.escapeHtml(b.text) + '</strong></p>'
            plainLen += b.text.length
          } else if (isCaptionText(b.text)) {
            // 图题 / 表题段落一律丢掉：
            //   a) 附图节点下 —— 图由 imgQueue 补，题也由模板标题给；
            //   b) 容器章「十、附图及附表」下 —— 源文档把 6 条「附图1 …」写成无编号的
            //      普通 <p>，既不是 h 标签也没有「一、」编号，所以逃过了 isHeading 分支，
            //      会作为容器章的正文原样输出，和下面模板的 6 个附图标题撞成两份
            //      （实测截图就是这个形态：先一串「附图1…附图6」，随后又逐条重复）。
            continue
          } else {
            seg += b.html
            plainLen += b.text.length
          }
        }
        // 判空口径：只要有任何一个非空块（哪怕只写「无」）或含图/表，就认为本章有内容。
        // ⚠️ 不能用 plainLen < 2 这类阈值：实测源文档「5、历史措施情况」正文就是一个「无」字，
        //    按长度阈值会被误判成缺失，反而给用户盖上一个「请人工补充」的假占位。
        // ⚠️ 附图节点：图片在**循环之前**就挂好了（figPlaced=true），此时 seg 必然为空
        //    （源文档的图题全被 isCaptionText 丢弃）。若只看 seg 就会「图挂上了、
        //    底下还盖一行『请人工补充』」——实测附图1~4 全是 36 字 = 17 图片块 + 19 占位。
        const hasBlock = figPlaced || seg.replace(/<p>\s*<\/p>/gi, '').trim().length > 0
        if (hasBlock) {
          out += seg
          return
        }
        // 本章没内容，但要区分两种情况：
        //   a) 容器章节（下面还挂着子节）—— 只出标题，**不盖占位**。
        //      如「三、压裂工程设计方案」本身没有正文，内容全在「1、压裂层段」等子节里，
        //      给它盖一个「请人工补充」是误导。
        //   b) 叶子章节 —— 出标题 + 占位提示，提醒用户这里有缺口。
        const isContainer = flat.some(x => x.parentTitle === node.title && x.depth === node.depth + 1)
        if (isContainer) {
          // 容器章节：只出标题（如「十、附图及附表」本身，内容在附图1~6 下）
        } else if (isFigureNode(node) && !figPlaced && imgQueue.length) {
          // 附图节点有标题但正文空 → 补图（同语义多张时全挂）
          const _ims2 = takeFigImages(node)
          if (_ims2.length) {
            _ims2.forEach(_im => { out += this.renderImageBlock(_im, ++imgSeq) })
          } else {
            missing.push(node.title)
            out += '<p class="agent-placeholder">（源文档未提供该章节内容，请人工补充）</p>'
          }
        } else {
          missing.push(node.title)
          out += '<p class="agent-placeholder">（源文档未提供该章节内容，请人工补充）</p>'
        }
        return
      })

      // 图还有剩（源文档图比模板附图位多）→ 追加到「十、附图及附表」末尾，保证不丢图
      //
      // ⚠️ 2026-11-10：非附图图片优先按 context 归到对应章节（见上 imgBySec），
      //    只有「context 认不出章节」和「该章节在模板里不存在」的才落到这里。
      const restImgs = imgQueue.concat(imgBySec.get('__rest__') || [])
      if (restImgs.length) {
        let tail = ''
        restImgs.forEach(img => { tail += this.renderImageBlock(img, ++imgSeq) })
        // 挂在骨架最后：找不到附图章就整体追加到文末
        out += '<div class="leftover-images">' + tail + '</div>'
      }
      this._skeletonImgUsed = imgSeq
      this._skeletonMissing = missing
      return preambleHtml + out
    },

    /**
     * 把模板标题里的井相关占位符换成真值。
     *
     * <p>模板 {@code TEMPLATE_SECTIONS} 的附图标题带 {@code {#wellName}} /
     * {@code {#wellGroup}} / {@code {#targetLayer}} 三种占位符。正文
     * （{@link buildSkeletonBody}）和左侧章节导航都要用替换后的标题，
     * 否则会出现「左栏 {#wellName}、正文 长平55B2-2」的割裂。</p>
     *
     * <p>⚠️ 取不到值时**保留原占位符**而不是替换成空串：
     * {@link matchTemplateTitleLevel} 靠两边的字面量对齐，
     * 保留占位符才能和同样带占位符的标题匹配上。</p>
     */
    fillTemplateTitle(title) {
      const t = String(title || '')
      if (!t) return ''
      const wg = (this.agentMeta && this.agentMeta.wellGroup) || ''
      const tl = (this.agentMeta && this.agentMeta.targetLayer) || ''
      return t
        .replace(/\{#wellName\}/g, this.cleanWellName(this.wellName || '') || '{#wellName}')
        .replace(/\{#wellGroup\}/g, wg || '{#wellGroup}')
        .replace(/\{#targetLayer\}/g, tl || '{#targetLayer}')
        .replace(/[\s\u3000]+/g, ' ')
        .trim()
    },

    /**
     * 这段文字是不是「某个模板章节的标题」。
     *
     * <p>用在 {@link buildSkeletonBody} 的正文渲染里：落在某节区间内、但其实是**下一章标题**
     * 的块要丢掉 —— 那个标题会由模板自己输出一遍，留着就是重复。</p>
     *
     * <p>⚠️ 只认 lv=2（模板名 / 同义 / 别名精确命中），不认 lv=1 弱包含：
     * 弱包含会把「安13-16井组水平井详细的排采数据与压裂数据见表1~表2。」这类正文
     * 判成标题（因为它包含「排采」），丢掉就直接丢正文了。</p>
     */
    isTemplateChapterHeading(text) {
      const t = String(text || '').trim()
      if (!t) return false
      const flat = []
      const walk = (list, depth) => {
        (list || []).forEach((item) => {
          flat.push({ title: this.fillTemplateTitle(item.title), depth })
          if (item.children && item.children.length) walk(item.children, depth + 1)
        })
      }
      walk(TEMPLATE_SECTIONS, 0)
      for (let i = 0; i < flat.length; i++) {
        if (matchTemplateTitleLevel(t, flat[i].title) >= 2) return true
      }
      return false
    },

    /**
     * 把一段 html 拆成「顶层块」序列。
     *
     * <p>不用外部分析器：源 html 是后端 {@code /v1/annotation/content} 生成的，
     * 结构规整（只含 p / h1~h4 / table / div / img / span / strong 等有限标签），
     * 用正则按顶层标签切即可，比引入 DOMParser 更省事且不依赖浏览器环境。</p>
     *
     * @return {Array<{html:string,text:string,isHeading:boolean}>}
     */
    splitHtmlBlocks(html) {
      const out = []
      const src = String(html || '')
      // 顶层块标签：p / h1~h6 / table / div / ul / ol / blockquote
      const re = /<(p|h[1-6]|table|div|ul|ol|blockquote|figure)\b[^>]*>([\s\S]*?)<\/\1>/gi
      let last = 0
      let m
      const pushLoose = (chunk) => {
        const t = String(chunk || '').trim()
        if (!t) return
        out.push({ html: t, text: this.htmlToPlain(t), isHeading: false })
      }
      while ((m = re.exec(src)) !== null) {
        if (m.index > last) pushLoose(src.slice(last, m.index))
        const tag = m[1].toLowerCase()
        const inner = m[2]
        const text = this.htmlToPlain(inner)
        if (!text && !/<(img|table)[\s>]/i.test(inner)) {
          // 空段落 / 纯图片块：保留 html 但不参与标题匹配
          out.push({ html: m[0], text: '', isHeading: false })
        } else if (/^h[1-6]$/.test(tag)) {
          // 源文档里 h2 既可能是纯标题，也可能塞了「标题 + 正文」整段
          // （实测：<h2>3、注入方式：光套管注入。</h2>），同样要拆。
          const inline = this.splitHeadingInline(text)
          if (inline) {
            out.push({ html: m[0], text: inline.heading, isHeading: true })
            out.push({ html: '<p>' + this.escapeHtml(inline.rest) + '</p>', text: inline.rest, isHeading: false })
          } else {
            out.push({ html: m[0], text, isHeading: true })
          }
        } else if (tag === 'p' && this.looksLikeHeadingText(text)) {
          // 源文档常见：<p> 里写「5、历史措施…」「1）历史措施：」，靠文本特征认成标题
          const inline = this.splitHeadingInline(text)
          if (inline) {
            // 标题与正文同段（「3、注入方式：光套管注入。」）→ 拆成「标题块 + 正文块」，
            // 这样标题能参与模板匹配，正文也不会被当成标题丢掉。
            out.push({ html: '<p>' + this.escapeHtml(inline.heading) + '</p>', text: inline.heading, isHeading: true })
            out.push({ html: '<p>' + this.escapeHtml(inline.rest) + '</p>', text: inline.rest, isHeading: false })
          } else {
            out.push({ html: m[0], text, isHeading: true })
          }
        } else {
          out.push({ html: m[0], text, isHeading: false })
        }
        last = re.lastIndex
      }
      if (last < src.length) pushLoose(src.slice(last))
      return out
    },

    /**
     * 是否「封面文字」。用于骨架化时丢弃源文档封面，避免它挤在正文最前面。
     *
     * <p>压裂设计封面固定由 6~7 行组成：年度编号行、区块名、文档名、井段说明、
     * 编制单位、日期、文档名（重复）。特征：居中、短、无正文标点、含年份/日期/单位词。
     * 再加一层保险：只在前 {@code idx < 12} 个块里生效，正文深处的短句不会被误杀。</p>
     */
    looksLikeCoverText(text, idx) {
      const t = String(text || '').replace(/[\s\u3000]+/g, ' ').trim()
      if (!t) return true
      if (idx >= 12) return false
      if (t.length > 60) return false
      // 中文数字日期 / 阿拉伯年份 / 设计书 / 单位 / 编号行
      if (/^[二〇一二三四五六七八九○零]{4}年/.test(t)) return true          // 二〇二六年十月十九日
      if (/^\d{4}\s*年/.test(t)) return true                              // 2026年压裂工程设计
      if (/№|No\.|编号/.test(t)) return true
      if (/设计书|设计文件|改造工程设计$/.test(t)) return true
      if (/(油田公司|油气工艺研究院|勘探开发分公司|采油厂|研究院)$/.test(t)) return true
      if (/^[（(]?水平井段[\s\S]*[)）]$/.test(t)) return true               // （水平井段1158-2927m，长度1769m）
      // 无标点、无编号、短 → 更像封面标题行而不是正文
      if (!/[，。；：、]/.test(t) && t.length <= 24 && !/^[0-9一二三四五六七八九十（(]/.test(t)) return true
      return false
    },

    /**
     * 文本是否「像章节标题」：短、有编号、不以句号/逗号结尾、不是图表题。
     * 与后端 SourceDocumentOutlineService.looksLikeHeading 的口径保持一致。
     *
     * <p>⚠️ 额外放行「标题与正文写在同一段」的形态（2026-11-08）：
     * 压裂地质设计里极常见 {@code 3、注入方式：光套管注入。} 这种一段带走标题+内容的排法。
     * 早先因为「以句号结尾」被一票否决，导致「3、注入方式」「4、压裂井口」两节判空；
     * 现在识别为「标题段」，由 {@link splitHeadingInline} 把冒号后的内容拆出来当正文。</p>
     */
    looksLikeHeadingText(text) {
      const t = String(text || '').replace(/[\s\u3000]+/g, ' ').trim()
      if (!t) return false
      if (t.length > 60) return false
      if (isCaptionText(t)) return false
      // 中文序号 / 阿拉伯序号 / 括号序号 / 第X章
      const hasNo = /^(第[一二三四五六七八九十0-9]+[章节]|[一二三四五六七八九十]{1,3}\s*、|[0-9]{1,2}\s*[、.．)）]|[（(]\s*[0-9一二三四五六七八九十]{1,3}\s*[)）]|[①②③④⑤⑥⑦⑧⑨⑩])/.test(t)
      if (!hasNo) return false
      if (/[。，；;]$/.test(t)) {
        // 句号结尾：只有「编号 + 短标题 + 冒号」这种前段足够短时才认（如「3、注入方式：…」）
        const m = t.match(/^([^：:]{2,20})[：:]/)
        return !!m
      }
      return true
    },

    /**
     * 把「标题与正文同段」的块拆开：{@code 3、注入方式：光套管注入。} →
     * {@code { heading: '3、注入方式', rest: '光套管注入。' }}。
     * 不是这种形态就返回 null。
     */
    splitHeadingInline(text) {
      const t = String(text || '').replace(/[\s\u3000]+/g, ' ').trim()
      const m = t.match(/^([^：:]{2,20})[：:]\s*(.+)$/)
      if (!m) return null
      return { heading: m[1].trim(), rest: m[2].trim() }
    },

    /** html → 纯文本（用于长度统计与标题匹配） */
    htmlToPlain(html) {
      return String(html || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/[\s\u3000]+/g, ' ')
        .trim()
    },

    /**
     * 章节标题文本拼装：与后端 FracturingAgent.buildHeadingText 完全同口径，
     * 保证「编辑器里看到的标题」与「导出 Word 里的标题」逐字一致。
     */
    buildSkeletonHeadingText(no, title) {
      const n = String(no || '').trim()
      if (!n) return title
      if (n.startsWith('（') || n.startsWith('(')) return n + title
      if (/^[一二三四五六七八九十]+、?$/.test(n)) return n.replace(/、$/, '') + '、' + title
      if (/^[0-9]+、?$/.test(n)) return n.replace(/、$/, '') + '、' + title
      return n + ' ' + title
    },

    // 渲染「严格提取」结果到编辑区（原文 HTML + 图片 + 表格，原样呈现）
    // 注意：视图头 / 筛选说明 / 分组标题等「说明性内容」一律走 setGenNotes()，
    //       不写进 editorContent（编辑框内只保留正文）。
    renderStrictExtract() {
      const contentHtml = this.strictExtractedHtml || ''
      const images = this.strictExtractedImages || []
      const tables = this.strictExtractedTables || []
      const contentHasTable = /<table[\s>]/i.test(contentHtml)
      this.strictTableAnalysis = []

      // 1) 把正文 html 拆成顶层块，并按「图题/图表引出句」把图片插回原位
      let bodyHtml = this.composeContentWithImages(contentHtml, images)

      // 1.5) 关键：正文 html 里内嵌的 <table> 也要按井号筛选。
      //      后端 /annotation/content 返回的 html 直接含 <table>，
      //      所以表格筛选必须作用在 html 内部，而不是只作用于「独立表格」分支。
      let inHtmlFiltered = 0
      let inHtmlTotal = 0
      if (this.strictFilterByWell && bodyHtml) {
        const res = this.filterTablesInHtml(bodyHtml)
        bodyHtml = res.html
        inHtmlFiltered = res.filtered
        inHtmlTotal = res.total
      }

      // 2) 先渲染「独立表格」分支，顺带产出 strictTableAnalysis（供说明区统计）
      let tablesHtml = ''
      if (tables.length && !contentHasTable) {
        tables.forEach((tbl) => {
          const headers = tbl.headers || []
          const allRows = tbl.rows || []
          const analysis = this.analyzeTable(headers, allRows)
          this.strictTableAnalysis.push(analysis)
          const rows = this.strictFilterByWell
            ? this.filterTableRowsByWell(allRows, headers)
            : allRows
          tablesHtml += '<div style="margin:12px 0;">'
          if (tbl.title) {
            tablesHtml += '<p style="color:#606266;font-size:13px;margin:4px 0;">' + this.escapeHtml(tbl.title) + '</p>'
          }
          tablesHtml += '<table><thead><tr>'
          headers.forEach(h => {
            tablesHtml += '<th>' + this.escapeHtml(String(h == null ? '' : h)) + '</th>'
          })
          tablesHtml += '</tr></thead><tbody>'
          rows.forEach((row) => {
            let isHit = false
            if (analysis.hasWellCol && this.strictFilterByWell) {
              const cell = (row || [])[analysis.wellCol]
              isHit = this.normWell(cell).includes(this.normWell(this.wellName || ''))
            }
            tablesHtml += isHit ? '<tr class="well-row">' : '<tr>'
            ;(row || []).forEach(cell => {
              tablesHtml += '<td>' + this.escapeHtml(String(cell == null ? '' : cell)) + '</td>'
            })
            tablesHtml += '</tr>'
          })
          tablesHtml += '</tbody></table></div>'
        })
      }

      // 3) 组装「正文」
      //    ⚠️ 2026-11-08：这里是「章节标题必须齐全」的落点。
      //    以前是 `body += bodyHtml` 原样输出源文档，正文里只有源文档自己的编号标题
      //    （「5、历史措施及本次改造的目的…」「1）历史措施：」），模板章节标题一个都没有，
      //    与左侧导航的模板骨架完全对不上。
      //    现在走 buildSkeletonBody：以 42 个模板章节为固定骨架，把源文档内容归入对应章节，
      //    匹配不到的章节照样输出标题 + 占位提示 —— 满足「章节固定、标题必在」。
      //
      // 图片传入骨架函数：附图1~6 的图来自独立接口、不在正文 html 里，
      // 由骨架函数按「附图N」节点顺序挂载；挂不完的图内部会追加到文末。
      let body = ''
      let consumedImgs = 0
      if (contentHtml) {
        body += this.buildSkeletonBody(bodyHtml, images)
        consumedImgs = this._skeletonImgUsed || 0
      } else if (!images.length) {
        body += '<p style="color:#e6a23c;">未提取到正文文字</p>'
      }
      const restImages = this.leftoverImages || []
      // ⚠️ 骨架已用掉的图片不能再补一遍，否则同一张图在正文里出现两次
      const unusedImages = restImages.length
        ? restImages
        : (consumedImgs > 0 ? images.slice(consumedImgs) : [])
      if (unusedImages.length) {
        unusedImages.forEach((img, i) => {
          body += this.renderImageBlock(img, consumedImgs + i + 1)
        })
      }
      if (tablesHtml) {
        body += tablesHtml
      }
      this.editorContent = body

      // 4) 生成「说明」项（编辑框外）
      const wellLabel = (this.wellName || '').replace(/压裂工程设计文档$/, '')
      const notes = []
      notes.push({
        type: 'info',
        label: '井名',
        text: (wellLabel || this.wellName || '-') + ' · 第一步 · 严格提取（原文原样，未使用大模型 / 提示词）'
      })
      notes.push({
        type: 'info',
        label: '原文',
        text: contentHtml
          ? ('已按模板 ' + 12 + ' 章逐节归位（模板章节标题全部保留，未提取到内容的章节显示占位提示）')
          : '（未提取到正文文字）'
      })
      notes.push({
        type: 'info',
        label: '图片',
        text: images.length ? ('共提取 ' + images.length + ' 张，优先归入「附图及附表」章节' +
          (unusedImages.length ? '（其中 ' + unusedImages.length + ' 张无对应附图位，已置于文末）' : ''))
          : '未提取到图片'
      })
      notes.push({
        type: 'info',
        label: '表格',
        text: tables.length ? ('共提取 ' + tables.length + ' 个' + (contentHasTable ? '（正文内嵌，已随正文呈现）' : ''))
          : '未提取到表格'
      })
      if (this.strictFilterByWell) {
        const list = this.strictTableAnalysis || []
        const matchedTables = list.filter(t => t.hasWellCol || t.transposed).length
        const transposedTables = list.filter(t => t.transposed).length
        notes.push({
          type: 'success',
          label: '批注规则',
          text: '已按模版批注「只提取井名的信息」分析表格：共 ' + list.length + ' 张表，识别到含井号信息的表 ' +
            matchedTables + ' 张' + (transposedTables ? '（其中转置布局 ' + transposedTables + ' 张）' : '') +
            '，保留井号 = ' + (wellLabel || this.wellName || '') +
            '（正文表 ' + inHtmlFiltered + '/' + inHtmlTotal + ' 已筛选）'
        })
      }
      this.setGenNotes(notes)

      // 严格提取（源文档原文）没有 sectionReport，用正文里现成的标题建一份纯导航，
      // 保证「左侧章节导航」在任何入口下都能用（只是没有「生成方式 / 完成度」）。
      this.$nextTick(() => this.buildOutlineFromTemplate())
    },

    /**
     * 智能体生成的文档基名（不含扩展名）：`井号 + 井压裂工程设计`。
     * 与后端 FracturingAgentController 的命名规则一致，避免编辑器文件名与
     * 导出下载文件名差一个「井」字。
     */
    agentDocBaseName(rawWell) {
      const w = this.cleanWellName(rawWell || '')
      if (!w) return '压裂工程设计.docx'
      return (/井$/.test(w) ? w + '压裂工程设计' : w + '井压裂工程设计') + '.docx'
    },

    // ── 井号匹配的公共工具 ─────────────────────────────────────────────
    // 清洗「井名」：去掉从文件名/标题带进来的后缀，只保留井号本身。
    // 例如 "郑58-5B-3平1压裂工程设计文档" / "郑58-5B-3平1地质设计" / "郑58-5B-3平1.docx"
    // → "郑58-5B-3平1"。避免把长串当作井号去匹配表格单元格（永远匹配不上）。
    cleanWellName(s) {
      let t = String(s == null ? '' : s).trim()
      if (!t) return ''
      t = t.replace(/\.(docx?|DOCX?)$/i, '')
      // 逐个剥离常见后缀（可能叠加，如「…压裂工程设计文档」）
      const suffixes = ['压裂工程设计文档', '压裂地质设计', '压裂工程设计', '工程设计文档',
        '地质设计', '工程设计', '设计文档', '压裂设计', '方案', '文档']
      let changed = true
      while (changed) {
        changed = false
        for (const sfx of suffixes) {
          if (t.length > sfx.length && t.endsWith(sfx)) {
            t = t.slice(0, -sfx.length)
            changed = true
          }
        }
      }
      return t.trim()
    },

    // 归一化：去所有空白、全角转半角、统一小写；同时去掉井号常见分隔符，
    // 让 "HW-101" / "hw 101" / "ＨＷ－１０１" / "HW101" 能互相匹配。
    normWell(s) {
      return String(s == null ? '' : s)
        .replace(/\s+/g, '')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
        .replace(/[－—–_\-\/·]/g, '')
        .toLowerCase()
    },

    // 仅用于「井号列」判定的窄匹配：井号/井名/井编号…（不含「井」的宽匹配）
    isWellHeader(h) {
      const t = String(h == null ? '' : h).replace(/\s+/g, '')
      return /井号|井名|井名称|井编号|井别|井id|well/i.test(t)
    },

    // 宽松判定：只要单元格文本明确指「井」的标识（含"井"字或 well）。
    // 用于「转置表」的行标签定位 —— 像 `井   名`（中间有空格）也能命中。
    isWellLabel(h) {
      const t = String(h == null ? '' : h).replace(/\s+/g, '')
      if (!t) return false
      return /井|well/i.test(t)
    },

    // 强判定：行标签是「井的标识」（井名/井号/井名称/井编号/well name），
    // 而不是「井别 / 目的层 / 井底深度」这类同样含"井"字的元数据行。
    isWellNameLabel(h) {
      const t = String(h == null ? '' : h).replace(/\s+/g, '')
      if (!t) return false
      // 明确排除：井别、井深、井斜、井底、井温、井径、井口、井控… 等非标识行
      if (/井\s*(别|型|深|斜|底|温|径|口|控|距|筒|架|场|位|史)/.test(t)) return false
      return /井\s*(名|号|名称|编号|id|次)|well(name|id)?/i.test(t) || /^井$/.test(t)
    },

    // 判断源文件表格是否为「转置 / 行标签式」布局：
    //   典型形态：第 1 列是行标签（地理位置 / 构造位置 / 井别 / 目的层 / 井名 / ...），
    //   井号不是某个"列"的取值，而是「井名」这一行里横向排开的多个单元格。
    //   例：
    //     | 井 名 | 郑58-5B-3平1 | 郑58-5B-3平2 |
    //     | 开钻日期 | 2025.2.12 | 2025.2.24 |
    // 定位策略（按优先级，全部候选行一起比较，取最优）：
    //   ① 行标签是「井名/井号」（isWellNameLabel）→ 最优先；
    //   ② 行标签含「井」且本行取值命中输入井号；
    //   ③ 行标签含「井」（退化，供"未匹配到该井"提示用）。
    //   特别地：`井 别`（井型）这类行标签同样含"井"字，但它是元数据行，
    //   必须让位给真正的「井 名」行 —— 所以不能"遇到第一个含井的行就 return"。
    //   ⚠ 排除表2"邻井排采"：首行首列叫「井号」，那是列表头、第 1 行是数据，
    //     不是行标签（判定：首行首列严格等于"井号/井名" → 视为列头）。
    detectTransposedWell(rows) {
      if (!rows || !rows.length) return null
      const target = this.normWell(this.wellName || '')
      const firstLabel = String((rows[0] || [])[0] == null ? '' : (rows[0] || [])[0]).replace(/\s+/g, '')
      const firstIsWellCol = /^井号$|^井名$|^井名称$|^井编号$/.test(firstLabel)

      let best = null   // { score, headerRow, matchedCols, label }
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r] || []
        const label = String(row[0] == null ? '' : row[0]).replace(/\s+/g, '')
        if (!this.isWellLabel(label)) continue
        // 排除"首行 + 首列就是标准井号列头"的情况（那是列表头，不是行标签）
        if (r === 0 && firstIsWellCol) continue
        const vals = row.slice(1).map(c => String(c == null ? '' : c).trim())
        if (!vals.filter(v => v !== '').length) continue

        const matchedCols = []
        vals.forEach((v, i) => {
          if (v && target && this.normWell(v).includes(target)) matchedCols.push(i + 1)
        })
        // 打分：强标签 +100；命中输入井号 +10；命中越多越优先
        let score = 0
        if (this.isWellNameLabel(label)) score += 100
        if (matchedCols.length) score += 10 + matchedCols.length
        const cand = { score, headerRow: r, matchedCols, hasMatch: matchedCols.length > 0, label }
        if (!best || cand.score > best.score) best = cand
      }
      return best
    },

    // ── 表格结构分析（横向 + 纵向 + 转置）──────────────────────────────
    // 形态 A「行式」：表头含「井号/井名」列，每口井占一行 → 横向定位井号列，纵向按行匹配。
    // 形态 B「转置/行标签式」：第 1 列是行标签（…/井名/…），井号横向排开在「井名」行里
    //        → 纵向定位井名行，横向匹配列，只保留该列（行标签列 + 目标井列）。
    // 返回：{ headerRow, wellCol, matchedRows, hasWellCol,
    //        transposed, matchedCols, wellLabelRow }
    analyzeTable(headers, rows) {
      const target = this.normWell(this.wellName || '')
      const hdr = (headers || []).map(h => String(h == null ? '' : h))

      // ── 形态 B：转置布局（优先判定，因为它是"井名作为行标签"，横纵颠倒）──
      const tp = this.detectTransposedWell(rows)
      if (tp && (tp.hasMatch || tp.matchedCols.length)) {
        return {
          headerRow: tp.headerRow,
          wellCol: -1,
          matchedRows: [],
          hasWellCol: false,
          transposed: true,
          matchedCols: tp.matchedCols,
          wellLabelRow: tp.headerRow,
          header: hdr
        }
      }
      // 有「井名」行标签但取值没命中输入井号 → 仍然标记为转置表（便于提示"未匹配到该井"）
      if (tp) {
        return {
          headerRow: tp.headerRow,
          wellCol: -1,
          matchedRows: [],
          hasWellCol: false,
          transposed: true,
          matchedCols: [],
          wellLabelRow: tp.headerRow,
          header: hdr
        }
      }

      // ── 形态 A：行式（井号列 + 每井一行）──
      // 横向①：标准表头里找井号列
      let wellCol = hdr.findIndex(h => this.isWellHeader(h))
      let headerRow = -1   // -1 表示用传入的 headers 作为表头

      // 横向②：表头没找到时，在前两行数据里找"看起来像表头"的行
      if (wellCol < 0 && rows && rows.length) {
        for (let r = 0; r < Math.min(2, rows.length); r++) {
          const idx = (rows[r] || []).findIndex(c => this.isWellHeader(c))
          if (idx >= 0) { wellCol = idx; headerRow = r; break }
        }
      }

      // 纵向：在井号列里逐行匹配
      const matchedRows = []
      if (wellCol >= 0 && target) {
        const start = headerRow >= 0 ? headerRow + 1 : 0
        for (let r = start; r < (rows || []).length; r++) {
          const cell = (rows[r] || [])[wellCol]
          if (this.normWell(cell).includes(target)) matchedRows.push(r)
        }
      }

      return {
        headerRow,
        wellCol,
        matchedRows,
        hasWellCol: wellCol >= 0,
        transposed: false,
        matchedCols: [],
        wellLabelRow: -1,
        header: hdr
      }
    },

    // ── 对正文 HTML 里内嵌的每个 <table> 做井号筛选 ────────────────────
    // 因为 /annotation/content 返回的 html 直接含 <table>（表格以 HTML 形式嵌入），
    // 必须在 HTML 层面解析行列、定位井号列、只保留命中行。
    // 返回：{ html: 处理后的 html, filtered: 实际做了筛选的表数, total: 表总数 }
    filterTablesInHtml(html) {
      const target = this.normWell(this.wellName || '')
      let filtered = 0
      let total = 0
      if (!html || !target) return { html, filtered: 0, total: 0 }

      const escape = (s) => this.escapeHtml(s == null ? '' : String(s))

      const newHtml = html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
        total++
        // 拆出所有行
        const rowMatches = []
        const rowRe = /<tr[\s\S]*?<\/tr>/gi
        let m
        while ((m = rowRe.exec(tableHtml)) !== null) {
          rowMatches.push({ text: m[0], start: m.index, end: m.index + m[0].length })
        }
        if (!rowMatches.length) return tableHtml

        // 解析每行的单元格纯文本，并记录单元格标签是 th 还是 td
        const parsedRows = rowMatches.map((rm) => {
          const cells = []
          const cellRe = /<(t[hd])\b[^>]*>([\s\S]*?)<\/\1>/gi
          let cm
          while ((cm = cellRe.exec(rm.text)) !== null) {
            const tag = cm[1].toLowerCase()
            const raw = cm[2]
            const text = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
            cells.push({ tag, text })
          }
          return { raw: rm.text, cells }
        })

        // ── 形态 B：转置布局（井名作为行标签，井号横向排开）──
        const plainRows = parsedRows.map(pr => pr.cells.map(c => c.text))
        const tp = this.detectTransposedWell(plainRows)
        if (tp) {
          if (!tp.hasMatch) return tableHtml   // 有井名行但没命中输入井号 → 原样返回
          filtered++
          const keepCols = new Set([0].concat(tp.matchedCols))  // 保留行标签列 + 目标井列
          const keptB = []
          parsedRows.forEach((pr, r) => {
            // 逐单元格重建：所有行统一只保留 keepCols 里的列（含第 0 行，保证列对齐）
            const openM = pr.raw.match(/^<tr\b[^>]*>/i)
            const openTag = openM ? openM[0] : '<tr>'
            const closeTag = /<\/tr>\s*$/i.test(pr.raw) ? '</tr>' : ''
            let out = openTag
            pr.cells.forEach((c, ci) => {
              if (!keepCols.has(ci)) return
              const isWellVal = tp.matchedCols.includes(ci)
              const isLabelCell = ci === 0
              let styleAttr = ''
              if (isWellVal) styleAttr = ' style="background:#eef1fe;box-shadow:inset 3px 0 0 #3D5FEF;"'
              else if (isLabelCell) styleAttr = ' style="color:#606266;font-weight:600;"'
              // th 与 td 可以混用；转置表里行标签列统一渲染成 td 更符合"键-值"阅读
              const tag = isLabelCell ? (c.tag === 'th' ? 'td' : c.tag) : c.tag
              out += '<' + tag + styleAttr + '>' + escape(c.text) + '</' + tag + '>'
            })
            out += closeTag
            keptB.push(out)
          })
          const opM = tableHtml.match(/<table\b[^>]*>/i)
          const opTag = opM ? opM[0] : '<table>'
          return opTag + keptB.join('') + '</table>'
        }

        // ── 形态 A：行式（横向定位井号列 + 纵向保留命中行）──
        // 横向：定位井号列（优先 th 行 = 表头；否则前两行）
        let wellCol = -1
        let headerRowIdx = -1
        for (let r = 0; r < Math.min(2, parsedRows.length); r++) {
          const idx = parsedRows[r].cells.findIndex(c => this.isWellHeader(c.text))
          if (idx >= 0) { wellCol = idx; headerRowIdx = r; break }
        }
        if (wellCol < 0) return tableHtml   // 这张表没有井号列 → 原样返回

        // 纵向：保留井号命中行；其余数据行删除（表头行始终保留）
        const keep = new Set()
        let hit = 0
        parsedRows.forEach((pr, r) => {
          if (r === headerRowIdx) { keep.add(r); return }
          const cell = pr.cells[wellCol]
          if (cell && this.normWell(cell.text).includes(target)) { keep.add(r); hit++ }
        })
        // 整表无命中 → 原样返回，避免误清空
        if (!hit) return tableHtml

        filtered++
        // 重建表：命中行加 class="well-row" 以便高亮；表头行原样保留
        const openTagMatch = tableHtml.match(/<table\b[^>]*>/i)
        const openTag = openTagMatch ? openTagMatch[0] : '<table>'
        const kept = []
        parsedRows.forEach((pr, r) => {
          if (!keep.has(r)) return
          if (r === headerRowIdx) { kept.push(pr.raw); return }
          const cell = pr.cells[wellCol]
          const isHit = cell && this.normWell(cell.text).includes(target)
          if (isHit) {
            kept.push(pr.raw.replace(/<tr\b/i, '<tr class="well-row"'))
          } else {
            kept.push(pr.raw)
          }
        })
        return openTag + kept.join('') + '</table>'
      })

      return { html: newHtml, filtered, total }
    },

    // 判断模版批注里是否有「只提取井名的信息」这类要求。
    // 命中任一关键词即视为「按井号筛选表格」。
    detectWellOnlyAnnotation(annotations) {
      const list = annotations || []
      const keywords = [
        // —— 结构化批注（推荐写法）——
        /筛选\s*[:：]?\s*按?[〈<【\[]?\s*井号/,
        /按\s*[〈<【\[]?\s*井号\s*[〉>】\]]?\s*列/,
        /井号\s*列\s*匹配/,
        // —— 口语写法（兼容旧批注）——
        /只提取井名/,
        /仅提取井名/,
        /只取井名/,
        /仅取井名/,
        /只要井名/,
        /仅要井名/,
        /只保留井名/,
        /仅保留井名/,
        /只保留该井/,
        /只保留此井/,
        /井名的信息/,
        /井名信息/,
        /井号的信息/,
        /提取与该井/,
        /只提取该井/,
        /仅提取该井/,
        /只提取输入的井号/,
        /只提取输入井号/,
        /该井的数据/,
        /该井的信息/,
        /该井号/,
        /输入的井号/,
        /输入井号/
      ]
      return list.some((a) => {
        if (!a) return false
        const text = [a.content, a.description, a.text].filter(Boolean).join(' ')
        return keywords.some(re => re.test(text))
      })
    },

    // 按井号筛选结构化表格数据行（与 HTML 内表格筛选共用同一套分析逻辑）。
    // 适用场景：源文件「基本数据」表里列了多口井（井号在某一列），
    //          批注要求「只提取井名的信息」→ 只保留井号匹配的那一行。
    //   1) 横向：扫描表头 / 前两行定位井号列；
    //   2) 纵向：在井号列里匹配输入井号；
    //   3) 井号归一化（大小写/空格/全角/分隔符不敏感）；
    //   4) 无井号列 或 整表无命中 → 原样返回（避免误清空）。
    //   5) 转置布局：井名是行标签、井号横向排开 → 只保留「行标签列 + 目标井列」。
    filterTableRowsByWell(rows, headers) {
      const well = (this.wellName || '').trim()
      if (!well || !rows || !rows.length) return rows

      const analysis = this.analyzeTable(headers, rows)

      // 转置布局：逐行裁剪为 [行标签列, 目标井列...]
      if (analysis.transposed) {
        if (!analysis.matchedCols.length) return rows
        const keepCols = [0].concat(analysis.matchedCols)
        return rows.map(row => keepCols
          .filter(ci => ci < (row || []).length)
          .map(ci => row[ci]))
      }

      if (!analysis.hasWellCol || !analysis.matchedRows.length) return rows

      // headerRow >= 0 表示表头在数据行里 → 该行也保留
      const keepIdx = new Set(analysis.matchedRows)
      if (analysis.headerRow >= 0) keepIdx.add(analysis.headerRow)
      return rows.filter((_, i) => keepIdx.has(i))
    },

    // 把图片按「原文档顺序 + 章节归属」插回正文对应位置。
    //
    // 背景：后端 /annotation/content 的 html 保留了图题段落（如「图2-1 施工曲线图」、
    //      「附图1 井位图」），且保留了全部标题段落（一、基础数据 / 九、附图及附表 …）；
    //      但不含 <img>，也不返回图片的绝对位置。extract-images 按文档顺序返回图片，
    //      并带上 sourceParagraph / context（图片所在段落的原文）。
    //
    // 策略（按优先级）：
    //   1) 若图片带有原文锚点（context/sourceParagraph），在正文里找最相似的段落，
    //      插到该段之后 —— 这是最精确的还原方式；
    //   2) 否则退化为「顺序 + 锚点」：把图片按文档顺序依次挂到图题块 /
    //      含图字的引出句之后（因为原文档中图片通常紧跟其图题或引出句）；
    //   3) 剩余的图片，挂到「九、附图及附表」章节下（附图类图片天然属于该章），
    //      而不是统统堆到文末；
    //   4) 实在无法归属的才落到文末「其他图片」。
    composeContentWithImages(contentHtml, images) {
      this.leftoverImages = []
      if (!contentHtml) {
        this.leftoverImages = images.slice()
        return ''
      }
      if (!images || !images.length) {
        return contentHtml
      }

      // 按顶层块切分（保留标签本身）
      const blocks = contentHtml.match(/<(h[1-6]|p|table|ul|ol|div|blockquote|figure)[^>]*>[\s\S]*?<\/\1>|<[^>]+\/>|[^<]+/gi)
      if (!blocks || !blocks.length) {
        this.leftoverImages = images.slice()
        return contentHtml
      }

      const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
      const blockText = blocks.map(b => stripTags(b))

      // 判断某个块是否是「图片应插入的锚点」
      const isFigureCaption = (t) => /^\s*(图|附图|照片|chart|figure|photo)\s*[\d０-９一二三四五六七八九十]/.test(t) || /^\s*Figure\b/i.test(t)
      const mentionsFigure = (t) => /(下图|上图|如图|见图|图片|图像|曲线图|示意图|照片|附图)/.test(t)
      const isHeadingBlock = (b) => /^<h[1-6][\s>]/i.test(b)

      // 记录每个块的所属章节标题（用于把「附图」类图片归到「九、附图及附表」）
      let curSection = ''
      const sectionOf = []
      blocks.forEach((b, i) => {
        if (isHeadingBlock(b)) curSection = blockText[i]
        sectionOf[i] = curSection
      })
      const appendixIdx = []
      blocks.forEach((b, i) => {
        if (isHeadingBlock(b) && /附图|附表|附\s*图/.test(blockText[i])) appendixIdx.push(i)
      })

      const imgQueue = images.slice()
      const placements = new Map()   // blockIndex -> [img, ...]
      const pushAt = (idx, img) => {
        if (!placements.has(idx)) placements.set(idx, [])
        placements.get(idx).push(img)
      }

      // ---- 第 1 步：用图片自带的原文锚点做精确定位 ----
      const anchorMatched = new Set()
      const sim = (a, b) => {
        const x = stripTags(a), y = stripTags(b)
        if (!x || !y) return 0
        const n = Math.min(x.length, y.length, 40)
        let hit = 0
        for (let k = 0; k < n; k++) if (x[k] === y[k]) hit++
        // 优先「包含」关系（锚点原文往往是段落的一部分）
        if (x.includes(y) || y.includes(x)) return 100 + n
        return hit / n
      }
      imgQueue.forEach((img, qi) => {
        const anchor = img.context || img.sourceParagraph || ''
        if (!anchor || stripTags(anchor).length < 4) return
        let best = -1, bestScore = 0
        for (let i = 0; i < blocks.length; i++) {
          const s = sim(anchor, blockText[i])
          if (s > bestScore) { bestScore = s; best = i }
        }
        if (best >= 0 && bestScore >= 0.55) {
          pushAt(best, img)
          anchorMatched.add(qi)
        }
      })

      const restAfterAnchor = imgQueue.filter((_, qi) => !anchorMatched.has(qi))

      // ---- 第 2 步：顺序 + 锚点（图题优先）----
      const captionIdx = []
      const mentionIdx = []
      blocks.forEach((b, i) => {
        const t = blockText[i]
        if (!t) return
        if (isFigureCaption(t)) captionIdx.push(i)
        else if (mentionsFigure(t)) mentionIdx.push(i)
      })
      const anchors = captionIdx.concat(mentionIdx)
      const anchorSet = new Set(anchors)
      const seqQueue = restAfterAnchor.slice()
      anchors.forEach((i) => {
        if (!seqQueue.length) return
        // 该锚点尚未被精确匹配占用时，才用顺序补位
        if (placements.has(i) && placements.get(i).length) return
        pushAt(i, seqQueue.shift())
      })

      // ---- 第 3 步：剩余图片 → 挂到「附图及附表」章节 ----
      if (seqQueue.length && appendixIdx.length) {
        const target = appendixIdx[appendixIdx.length - 1]
        while (seqQueue.length) pushAt(target, seqQueue.shift())
      }

      // ---- 输出 ----
      const out = []
      blocks.forEach((b, i) => {
        out.push(b)
        const list = placements.get(i)
        if (list && list.length) {
          list.forEach((img) => {
            out.push(this.renderImageBlock(img, (img.__seq = (img.__seq || 0) + 1)))
          })
        }
      })

      this.leftoverImages = seqQueue
      return out.join('')
    },

    // 渲染单个图片块（含容错）。
    // 尺寸：优先使用后端抽到的原始 cm 尺寸（data-w-cm/data-h-cm），
    //       导出 docx 时 WordExportService 会照用，从而「图片的位置与大小」与原文档一致。
    renderImageBlock(img, seq) {
      const src = this.buildImageSrc(img)
      // 原始尺寸（cm）：后端 DocumentImageService 给出 width/height（可能是 EMU 或 cm）
      const wCm = this.toCm(img.widthCm != null ? img.widthCm : img.width)
      const hCm = this.toCm(img.heightCm != null ? img.heightCm : img.height)
      let sizeAttr = ''
      let styleAttr = ''
      if (wCm && hCm && wCm > 0 && hCm > 0) {
        sizeAttr = ' data-w-cm="' + wCm.toFixed(2) + '" data-h-cm="' + hCm.toFixed(2) + '"'
        // 屏幕显示限制：太宽的图缩小显示，避免撑破编辑器（导出仍用原始尺寸）
        const dispW = Math.min(wCm, 15.9)
        styleAttr = ' style="width:' + dispW.toFixed(2) + 'cm;"'
      }
      let h = '<div class="img-block"' + (wCm && hCm ? ' data-orig-size="' + wCm.toFixed(2) + 'x' + hCm.toFixed(2) + 'cm"' : '') + '>'
      if (src) {
        h += '<img src="' + src + '" alt="图片' + seq + '"' + sizeAttr + styleAttr +
          ' onerror="this.style.display=\'none\';this.insertAdjacentHTML(\'afterend\',\'<span style=&quot;color:#f56c6c&quot;>（图片 ' + seq + ' 加载失败）</span>\')" />'
      } else {
        h += '<span style="color:#f56c6c;">（图片 ' + seq + '：后端未返回图片数据）</span>'
      }
      if (img && img.ocrText) {
        h += '<p style="color:#666;font-size:12px;">OCR：' + this.escapeHtml(img.ocrText) + '</p>'
      }
      h += '</div>'
      return h
    },

    // 把后端可能的尺寸表示（EMU / cm / px）归一到 cm。无法判断时返回 0。
    toCm(v) {
      const n = Number(v)
      if (!isFinite(n) || n <= 0) return 0
      // EMU：1 cm = 360000 EMU；典型图片宽度在 1e6~2e7 量级
      if (n > 10000) return n / 360000
      // 像素（96dpi）：1 px = 2.54/96 cm
      if (n > 100) return n * 2.54 / 96
      // 已经是 cm（原文档里常见 2.0 / 12.6 / 19.4 / 24.9）
      return n
    },

    // 从「原文图片列表」里挑出封面图标（宝石花），把它从正文图片里摘掉。
    //
    // 依据模板批注 #2「字段：首页图标（图标1）｜来源文档：源文件｜来源位置：源文件首页左上角图标｜
    // 处理：原图提取并置于本页左上角」：
    //   ① 该图在源文档里是**浮动图**（wp:anchor），所在段落只有空格没有正文文字，
    //      因此后端 extract-images 给它的 context / sourceParagraph 都是空的；
    //   ② 尺寸很小（实测 1.64×1.57cm，模板位 2.02×2.38cm）。
    // 两个条件同时满足才认，避免把「无上下文的正文大图」误判成图标。
    //
    // 老实现把这张图排除在正文之外，但**没有任何地方把它交给封面**，
    // 结果封面缺图标；若把它留在正文图片队列里，它又会因为「无锚点」被顺序补位规则
    // 塞到第一个图题（实测落在「效果预测」那段）。所以必须单独拆出来。
    splitCoverIcon(images) {
      const list = Array.isArray(images) ? images : []
      const body = []
      let icon = null
      list.forEach((img) => {
        if (icon) { body.push(img); return }
        const ctx = String(img.context || img.sourceParagraph || '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim()
        const w = this.toCm(img.widthCm != null ? img.widthCm : img.width)
        const h = this.toCm(img.heightCm != null ? img.heightCm : img.height)
        const small = w > 0 && h > 0 && w <= 4 && h <= 4
        if (!ctx && small) {
          icon = { ...img, _coverIcon: true }
        } else {
          body.push(img)
        }
      })
      return { icon, bodyImages: body }
    },

    // 把后端返回的图片对象拼成可直接用于 <img src> 的 data URL
    // 兼容多种字段命名：imageBytes / base64 / data / imageData
    buildImageSrc(img) {
      if (!img) return ''
      let raw = img.imageBytes || img.base64 || img.data || img.imageData || ''
      if (!raw) return ''
      // 若已是完整 data URL 直接返回
      if (/^data:image\//i.test(raw)) return raw
      // 去掉可能存在的换行
      raw = String(raw).replace(/\s+/g, '')
      const mime = img.contentType || img.mimeType || 'image/png'
      return `data:${mime};base64,${raw}`
    },

    // 结束「严格提取」：把结果落成可编辑内容
    finishStrictExtract() {
      this.isStreaming = false
      this.streamingProgress = 100
      this.streamingStatus = '提取完成（原文原样）'
      this.renderStrictExtract()
      this.$message.success('严格提取完成，可直接编辑')
    },

    // 由 extract.vue 跳转后调用：发起 SSE，实时把生成/提取到的文字渲染到编辑器
    async runExtractStream(task) {
      try {
        const formData = new FormData()
        // 后端 generate/stream 契约：file = 模版（提供章节结构），
        // form 字段 annotations = 章节结构 + 批注规则 + 源文件数据，
        // 后端据此按模版结构把数据填进各章节。
        if (task.templateFile && task.templateFile.data) {
          formData.append('file', this.base64ToFile(task.templateFile.data, task.templateFile.name), task.templateFile.name)
        } else if (task.sourceFiles && task.sourceFiles.length > 0) {
          // 兜底：没有模版时用第一个源文件
          const sf = task.sourceFiles[0]
          formData.append('file', this.base64ToFile(sf.data, sf.name), sf.name)
        }

        this.streamingStatus = '已提交，正在按模版结构生成并填入数据...'

        await streamGenerateApi(formData, {
          annotations: task.annotations || [],
          onEvent: (eventName, data) => {
            this.handleExtractStreamEvent(eventName, data)
          }
        })

        // 流正常结束（未收到显式 complete 时兜底）
        if (this.isStreaming) {
          this.finishExtractStream(true)
        }
      } catch (e) {
        console.error('流式提取生成失败', e)
        // 失败也要把状态落到「编辑框外说明区」，避免"内容空白"无提示
        this.isStreaming = false
        this.streamingProgress = 0
        this.streamingStatus = '生成失败：' + (e.message || '网络异常')
        this.editorContent = ''
        this.setGenNotes([
          { type: 'error', label: '生成失败', text: e.message || '网络异常' },
          { type: 'info', label: '建议', text: '请返回「智能提取」页重试，或检查后端服务与网络。' }
        ])
        this.$message.error('生成失败：' + (e.message || '网络异常'))
      }
    },

    // 处理来自 generate/stream 的 SSE 事件（标准 event/data 格式）
    handleExtractStreamEvent(eventName, data) {
      const d = data || {}

      if (eventName === 'error') {
        this.finishExtractStream(false, d.message || '生成失败')
        return
      }
      if (eventName === 'complete' || d.type === 'complete') {
        this.finishExtractStream(true, d.message)
        return
      }

      // 章节开始
      if (eventName === 'section-start' || eventName === 'section_start') {
        const seqIndex = d.index !== undefined ? d.index : this.generatedSections.length
        const title = d.title || ('章节 ' + (seqIndex + 1))
        this.ensureSection(seqIndex)
        this.generatedSections[seqIndex].title = title
        this.generatedSections[seqIndex].level = d.level || this.generatedSections[seqIndex].level || 1
        this.generatedSections[seqIndex].status = 'generating'
        this.currentSectionIndex = seqIndex
        this.currentSectionContent = this.generatedSections[seqIndex].content || ''
        this.streamingStatus = '正在提取：' + title
        this.renderStreamingSections()
        return
      }

      // 逐字/逐段内容
      if (eventName === 'chunk' || d.chunk !== undefined) {
        const seqIndex = d.index !== undefined ? d.index : this.currentSectionIndex
        this.ensureSection(seqIndex < 0 ? 0 : seqIndex)
        const i = seqIndex < 0 ? 0 : seqIndex
        this.currentSectionIndex = i
        this.currentSectionContent = (this.generatedSections[i].content || '') + (d.chunk || '')
        this.generatedSections[i].content = this.currentSectionContent
        this.generatedSections[i].status = d.isEnd ? 'completed' : 'generating'
        this.updateStreamProgress()
        this.renderStreamingSections()
        return
      }

      // 章节结束
      if (eventName === 'section-end' || eventName === 'section_end') {
        const seqIndex = d.index !== undefined ? d.index : this.currentSectionIndex
        if (this.generatedSections[seqIndex]) {
          this.generatedSections[seqIndex].status = 'completed'
        }
        this.updateStreamProgress()
        return
      }

      // 整段章节（含 content）
      if (eventName === 'section' || (d.title !== undefined && d.content !== undefined)) {
        const seqIndex = d.index !== undefined ? d.index : this.generatedSections.length
        this.ensureSection(seqIndex)
        this.generatedSections[seqIndex].title = d.title || this.generatedSections[seqIndex].title
        this.generatedSections[seqIndex].level = d.level || this.generatedSections[seqIndex].level || 1
        this.generatedSections[seqIndex].content = d.content || ''
        this.generatedSections[seqIndex].status = 'completed'
        this.updateStreamProgress()
        this.renderStreamingSections()
        return
      }

      // 初始化（章节总数）
      if (eventName === 'init' || d.totalSections !== undefined) {
        this.totalSections = d.totalSections || 0
        this.streamingStatus = '共 ' + this.totalSections + ' 个章节，开始提取...'
        this.renderStreamingSections()
        return
      }

      // 兜底：若带 message，作为状态展示
      if (d.message) {
        this.streamingStatus = d.message
      }
    },

    // 确保章节数组存在指定索引
    ensureSection(seqIndex) {
      const idx = seqIndex < 0 ? 0 : seqIndex
      while (this.generatedSections.length <= idx) {
        const i = this.generatedSections.length
        this.generatedSections.push({
          index: i,
          level: 1,
          title: '章节 ' + (i + 1),
          content: '',
          status: 'waiting'
        })
      }
    },

    updateStreamProgress() {
      const total = Math.max(this.totalSections, this.generatedSections.length, 1)
      const done = this.generatedSections.filter(
        s => s.status === 'completed' || (s.content && s.content.length > 0)
      ).length
      this.streamingProgress = Math.min(Math.round((done / total) * 100), 99)
    },

    // 结束流式：转换成可编辑文档
    async finishExtractStream(success, message) {
      this.isStreaming = false
      if (!success) {
        this.streamingProgress = 0
        this.streamingStatus = message || '生成失败'
        this.$message.error('生成失败：' + (message || ''))
        return
      }

      this.streamingProgress = 100
      this.streamingStatus = message || '生成完成'
      // 标记所有章节完成
      this.generatedSections.forEach(s => {
        if (s.content) s.status = 'completed'
      })
      // 把流式结果落成最终可编辑内容
      this.renderStreamingSections(true)
      this.$message.success('文档生成完成，可直接编辑')

      // 尝试向后端读取最终排版内容（若后端已持久化生成文档）
      if (this.fileData) {
        try {
          await this.loadDocumentContent()
        } catch (e) {
          // 忽略，保留流式生成的内容
        }
      }
    },

    // 根据批注内容生成查询
    generateQueryFromContent(content) {
      if (!content) return ''
      // 简单处理：返回批注内容作为查询提示
      return '查询' + content.replace(/[\[\]]/g, '')
    },

    // ========== 流式生成相关方法 ==========

    // 开始监听流式事件 - 监听来自 generate.vue 的 window 事件
    startListeningStream() {
      this.streamingStatus = '正在生成...'
      this.$message.info('文档正在生成中，请稍候...')

      // 监听 init 事件
      window.addEventListener('stream-init', this.onStreamInit)
      // 监听章节开始事件
      window.addEventListener('stream-section-start', this.onStreamSectionStart)
      // 监听 chunk 事件（逐字输出）
      window.addEventListener('stream-chunk', this.onStreamChunk)
      // 监听章节完成事件
      window.addEventListener('stream-section-end', this.onStreamSectionEnd)
      // 监听 section 事件（兼容旧格式）
      window.addEventListener('stream-section', this.onStreamSection)
      // 监听 complete 事件
      window.addEventListener('stream-complete', this.onStreamComplete)
      // 监听 error 事件
      window.addEventListener('stream-error', this.onStreamError)
      // 监听 section-error 事件
      window.addEventListener('stream-section-error', this.onStreamSectionError)
    },

    // 处理 init 事件
    onStreamInit(event) {
      const data = event.detail || event
      const totalSections = data.totalSections
      const taskId = data.taskId
      this.totalSections = totalSections || 0
      this.streamingStatus = '准备生成 ' + this.totalSections + ' 个章节...'
      this.streamingProgress = 0
      this.generatedSections = [] // 重置章节列表
      this.currentSectionIndex = -1 // 重置当前章节索引
      this.currentSectionContent = '' // 重置当前章节内容
      this.isStreaming = true // 标记为流式生成中
      this.renderStreamingSections()
      console.log('[Editor] 收到 init 事件，准备生成', totalSections, '个章节')
    },

    // 处理章节开始事件
    onStreamSectionStart(event) {
      const data = event.detail || event
      const seqIndex = data.index  // 顺序索引（0, 1, 2...）
      const level = data.level     // 标题级别（1, 2, 3...）
      const title = data.title
      const taskId = data.taskId

      console.log('[Editor] 章节开始 [{}]: {}', seqIndex, title)

      // 确保章节数组有足够的空间，按顺序索引插入
      // 如果索引超出当前数组长度，填充空章节
      while (this.generatedSections.length < seqIndex) {
        this.generatedSections.push({
          index: this.generatedSections.length,
          title: '章节 ' + (this.generatedSections.length + 1),
          content: '',
          status: 'waiting'  // 等待中
        })
      }

      // 添加新章节
      const section = {
        index: seqIndex,
        level: level,
        title: title,
        content: '',  // 初始为空
        status: 'generating'  // 正在生成
      }

      // 如果该位置已有章节（可能是重复事件），检查是否需要更新
      if (this.generatedSections[seqIndex]) {
        this.generatedSections[seqIndex].title = title
        this.generatedSections[seqIndex].level = level
        this.generatedSections[seqIndex].status = 'generating'
        // 不要重置 content，保留已生成的内容
      } else {
        this.generatedSections.push(section)
      }

      // 设置当前章节索引
      this.currentSectionIndex = seqIndex
      this.currentSectionContent = ''

      this.renderStreamingSections()
      this.streamingStatus = '正在生成: ' + title
    },

    // 处理 chunk 事件（逐字输出）
    onStreamChunk(event) {
      const data = event.detail || event
      const chunk = data.chunk
      const isEnd = data.isEnd
      const seqIndex = data.index  // 顺序索引（0, 1, 2...）

      // console.log('[Editor] 收到 chunk [{}]: {}...', seqIndex, chunk.substring(0, 10))

      // 确保章节数组有足够的空间
      while (this.generatedSections.length < seqIndex) {
        this.generatedSections.push({
          index: this.generatedSections.length,
          title: '章节 ' + (this.generatedSections.length + 1),
          content: '',
          status: 'waiting'
        })
      }

      // 确保当前章节存在
      if (!this.generatedSections[seqIndex]) {
        this.generatedSections.push({
          index: seqIndex,
          title: '章节 ' + (seqIndex + 1),
          content: '',
          status: 'generating'
        })
      }

      // 设置当前章节（如果还没有设置）
      if (this.currentSectionIndex < 0 || this.currentSectionIndex !== seqIndex) {
        this.currentSectionIndex = seqIndex
        // 如果当前章节已有内容，需要同步 currentSectionContent
        this.currentSectionContent = this.generatedSections[seqIndex].content || ''
      }

      // 累加内容到当前章节
      this.currentSectionContent += chunk
      this.generatedSections[seqIndex].content = this.currentSectionContent
      this.generatedSections[seqIndex].status = 'generating'

      // 避免频繁渲染，可以考虑节流
      this.renderStreamingSections()

      // 如果是最后一块，更新状态
      if (isEnd) {
        this.generatedSections[seqIndex].status = 'completed'
        this.streamingProgress = Math.round((this.getCompletedCount() / Math.max(this.totalSections, 1)) * 100)
        this.streamingStatus = '已完成 ' + this.getCompletedCount() + ' 个章节'
      }
    },

    // 获取已完成章节数量
    getCompletedCount() {
      return this.generatedSections.filter(s => s.status === 'completed' || s.content.length > 0).length
    },

    // 处理章节完成事件
    onStreamSectionEnd(event) {
      const data = event.detail || event
      const seqIndex = data.index
      const title = data.title

      console.log('[Editor] 章节完成 [{}]: {}', seqIndex, title)

      // 更新章节状态
      if (this.generatedSections[seqIndex]) {
        this.generatedSections[seqIndex].status = 'completed'
      }

      this.streamingProgress = Math.round((this.getCompletedCount() / Math.max(this.totalSections, 1)) * 100)
      this.streamingStatus = '已生成 ' + this.getCompletedCount() + '/' + this.totalSections + ' 个章节'
    },

    // 处理 section 事件（兼容旧格式）
    onStreamSection(event) {
      const data = event.detail || event
      const index = data.index
      const title = data.title
      const content = data.content
      const taskId = data.taskId
      const section = { index: index, title: title, content: content }
      this.generatedSections.push(section)
      this.renderStreamingSections()
      this.streamingProgress = Math.round((this.generatedSections.length / Math.max(this.totalSections, 1)) * 100)
      this.streamingStatus = '已生成 ' + this.generatedSections.length + '/' + this.totalSections + ': ' + title
      console.log('[Editor] 收到 section 事件:', title)
    },

    // 处理章节错误事件
    onStreamSectionError(event) {
      const data = event.detail || event
      const title = data.title
      const error = data.error
      console.error('[Editor] 章节错误:', title, error)
      this.$message.warning('章节 ' + title + ' 生成失败: ' + error)
    },

    // 处理 complete 事件
    onStreamComplete(event) {
      const data = event.detail || event
      const message = data.message
      this.streamingStatus = '生成完成！'
      this.streamingProgress = 100
      this.isStreaming = false
      this.$message.success('文档生成完成！')
      this.cleanupStreamListener()
      console.log('[Editor] 收到 complete 事件')
    },

    // 处理 error 事件
    onStreamError(event) {
      const data = event.detail || event
      const message = data.message
      this.streamingStatus = '生成失败: ' + message
      this.$message.error('生成失败: ' + message)
      this.cleanupStreamListener()
      console.error('[Editor] 收到 error 事件:', message)
    },

    // 清理流式监听
    cleanupStreamListener() {
      window.removeEventListener('stream-init', this.onStreamInit)
      window.removeEventListener('stream-section-start', this.onStreamSectionStart)
      window.removeEventListener('stream-chunk', this.onStreamChunk)
      window.removeEventListener('stream-section-end', this.onStreamSectionEnd)
      window.removeEventListener('stream-section', this.onStreamSection)
      window.removeEventListener('stream-complete', this.onStreamComplete)
      window.removeEventListener('stream-error', this.onStreamError)
      window.removeEventListener('stream-section-error', this.onStreamSectionError)
    },

    // base64 转文件
    base64ToFile(base64Data, fileName) {
      const arr = base64Data.split(',')
      const mime = arr[0].match(/:(.*?);/)[1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new File([u8arr], fileName, { type: mime })
    },

    // 处理流式事件
    processStreamEvent(data) {
      if (data.type === 'init') {
        this.totalSections = data.totalSections || 0
        this.streamingStatus = `准备生成 ${this.totalSections} 个章节...`
        this.streamingProgress = 0
      } else if (data.type === 'section') {
        // 收到新章节
        const section = data.section
        this.generatedSections.push(section)
        this.renderStreamingSections()
        this.streamingProgress = Math.round((this.generatedSections.length / Math.max(this.totalSections, 1)) * 100)
        this.streamingStatus = `已生成 ${this.generatedSections.length}/${this.totalSections}: ${section.title}`
      } else if (data.type === 'complete') {
        this.streamingStatus = '生成完成！'
        this.streamingProgress = 100
        this.isStreaming = false
        this.$message.success('文档生成完成！')
        // 清理监听
        this.cleanupStreamListener()
      } else if (data.type === 'error') {
        this.streamingStatus = '生成失败'
        this.$message.error('生成失败: ' + data.message)
        this.cleanupStreamListener()
      }
    },

    // 渲染流式章节内容
    // final = true 时渲染为最终可编辑内容（无光标、无进度提示）
    // 原则：editorContent 只放「章节正文」；进度/等待状态由顶部进度条与 sec-info 承担。
    renderStreamingSections(final = false) {
      let html = ''

      // 如果没有章节，显示等待状态
      if (this.generatedSections.length === 0) {
        if (final) {
          this.editorContent = ''
          this.setGenNotes([{ type: 'warning', label: '结果', text: '未提取到内容' }])
          return
        }
        this.editorContent = ''
        this.setGenNotes([
          { type: 'info', label: '状态', text: this.streamingStatus || '正在等待生成开始' },
          { type: 'info', label: '进度', text: (this.streamingProgress || 0) + '%' },
          { type: 'info', label: '章节', text: '预计生成 ' + (this.totalSections || '?') + ' 个章节' }
        ])
        return
      }

      // 按顺序渲染章节（正文）
      for (let i = 0; i < this.generatedSections.length; i++) {
        const section = this.generatedSections[i]
        // 跳过空章节
        if (!section) continue

        // 获取标题级别（默认为1）
        const level = section.level || section.index + 1 || 1
        let tag = 'h1'
        if (level === 2) tag = 'h2'
        else if (level === 3) tag = 'h3'
        else if (level >= 4) tag = 'h4'

        // 章节标题（正文的一部分）
        const titleClass = 'heading-' + level
        html += '<' + tag + ' class="' + titleClass + '" style="color: #2c3e50; margin-top: 24px;">' +
          this.escapeHtml(section.title || ('章节 ' + (i + 1))) + '</' + tag + '>'

        // 内容区域：**不能再整体 escapeHtml**。
        // 后端生成的章节内容里可能带 <table>（"1、基本数据" / "2、套管数据" 的数据表），
        // 整体转义会把表格变成「<table>…</table>」这样的可见乱码文字，表格彻底不显示。
        // 现在改为：保留允许的块级标签（table/thead/tbody/tr/td/th/p/br…），
        // 其余标签一律剥离并转义文本，避免把 <script>/<img onerror> 之类带进编辑区。
        const sectionHtml = this.sanitizeSectionHtml(section.content || '')
        html += sectionHtml
      }

      this.editorContent = html

      // 状态 / 进度 / 等待提示 → 编辑框外说明区
      const notes = []
      if (!final && this.generatedSections.length < this.totalSections) {
        notes.push({
          type: 'info',
          label: '等待',
          text: '还有 ' + (this.totalSections - this.generatedSections.length) + ' 个章节等待生成'
        })
      }
      if (this.isStreaming) {
        notes.push({ type: 'info', label: '状态', text: this.streamingStatus || '生成中...' })
        notes.push({ type: 'info', label: '进度', text: (this.streamingProgress || 0) + '%' })
        notes.push({ type: 'info', label: '章节', text: '已完成 ' + this.getCompletedCount() + '/' + this.totalSections + ' 个章节' })
      } else if (!final) {
        notes.push({ type: 'success', label: '完成', text: (this.streamingStatus || '文档生成完成！') + '（共生成 ' + this.getCompletedCount() + ' 个章节）' })
      }
      if (notes.length) this.setGenNotes(notes)

      // 流式生成同样没有 sectionReport，用正文标题兜底建导航（生成过程中也持续更新）
      this.$nextTick(() => this.buildOutlineFromTemplate())
    },

    // 章节内容 → 安全 HTML。
    // 章节内容中「表格必须保留为真表格」，其余一律按纯文本处理：
    //   1) 先做「白名单反选」：把不属于白名单的标签整段剥掉（连同 script/style 的内容）；
    //   2) 再把白名单标签原样保留，标签外的文本做实体转义；
    //   3) 若内容里压根没有块级标签，按原始文本处理（保留换行 → <br>），并包一层段落。
    // 白名单只留排版必需的结构标签，避免拖入 <img>/<a>/<style> 等外部资源与样式污染。
    sanitizeSectionHtml(raw) {
      let s = String(raw || '').trim()
      if (!s) return ''
      const ALLOWED = 'table|thead|tbody|tfoot|tr|td|th|caption|p|br|div|span|strong|b|em|i|u|sup|sub|ul|ol|li|h1|h2|h3|h4|h5|h6'
      // 先整体删掉危险块（含其内容）
      s = s.replace(/<(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\/\1\s*>/gi, '')
      s = s.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, '')

      // 按标签切分：标签做白名单校验，文本做转义
      const parts = s.split(/(<[^>]+>)/g)
      const out = parts.map((seg) => {
        if (!seg) return ''
        if (seg.charAt(0) !== '<') {
          // 文本：转义 < > &（保护已有实体）
          return seg.replace(/&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
        }
        // 标签：取名字判断白名单
        const m = seg.match(/^<\/?\s*([a-zA-Z][\w-]*)/)
        if (!m) return ''
        const name = m[1].toLowerCase()
        if (name === 'img') return ''            // 章节内容里的图片走独立图片通道，不在此渲染
        if (!new RegExp('^(' + ALLOWED + ')$').test(name)) return ''
        // 属性只保留 colspan / rowspan（表格合并必需），其余（含 on* 事件、style 脚本）全部丢弃
        const keepAttrs = []
        const attrRe = /\s(colspan|rowspan)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
        let am
        while ((am = attrRe.exec(seg)) !== null) {
          const v = (am[2] || am[3] || am[4] || '').replace(/[^\d]/g, '')
          if (v) keepAttrs.push(am[1].toLowerCase() + '="' + v + '"')
        }
        const closing = /^<\//.test(seg)
        return closing ? '</' + name + '>' : '<' + name + (keepAttrs.length ? ' ' + keepAttrs.join(' ') : '') + '>'
      })
      let html = out.join('')

      // 纯文本（无块级标签）→ 补段落 + 换行
      if (!/<(table|p|div|ul|ol|h[1-6])\b/i.test(html)) {
        html = '<p style="line-height:1.8;color:#333;margin-bottom:15px;text-indent:2em;">' +
          html.replace(/\n/g, '<br>') + '</p>'
      }
      return html
    },

    // HTML转义
    escapeHtml(text) {
      if (!text) return ''
      return text.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#039;')
                 .replace(/\n/g, '<br>')
    },

    // 清理流式监听
    cleanupStreamListener() {
      console.log('[Editor] 清理流式监听器')
      window.removeEventListener('stream-init', this.onStreamInit)
      window.removeEventListener('stream-section-start', this.onStreamSectionStart)
      window.removeEventListener('stream-chunk', this.onStreamChunk)
      window.removeEventListener('stream-section-end', this.onStreamSectionEnd)
      window.removeEventListener('stream-section', this.onStreamSection)
      window.removeEventListener('stream-complete', this.onStreamComplete)
      window.removeEventListener('stream-error', this.onStreamError)
      window.removeEventListener('stream-section-error', this.onStreamSectionError)
    },

    // ========== 流式生成相关方法结束 ==========

    // 开始自动AI填充
    async startAutoFill() {
      if (this.pendingAnnotations.length === 0) {
        this.$message.warning('没有需要填充的数据')
        return
      }

      this.aiFillDialogVisible = true
      this.aiLoading = true
      this.autoFillProgress = 0
      this.autoFillStatus = '正在准备填充...'

      const total = this.pendingAnnotations.length
      let filled = 0

      try {
        for (let i = 0; i < this.pendingAnnotations.length; i++) {
          const annotation = this.pendingAnnotations[i]
          this.autoFillStatus = `正在填充 ${i + 1}/${total}: ${annotation.annotationText.substring(0, 20)}...`
          this.autoFillProgress = Math.round((i / total) * 100)

          try {
            // 调用大模型生成SQL并执行
            const res = await naturalLanguageQuery({
              query: annotation.query || annotation.annotationText,
              tables: null
            })

            if (res.code === 0 || res.code === 200) {
              const result = res.data
              if (result.status !== 'failed' && result.results && result.results.length > 0) {
                annotation.result = result.results[0]
                annotation.sql = result.sql
                filled++
              }
            }
          } catch (e) {
            console.error('填充失败:', annotation.annotationText, e)
          }

          // 更新进度
          this.autoFillProgress = Math.round(((i + 1) / total) * 100)
        }

        // 填充到文档
        this.applyResultsToDocument()
        this.autoFillProgress = 100
        this.autoFillStatus = `填充完成！成功填充 ${filled}/${total} 条数据`

        this.$message.success(`AI智能填充完成，成功填充 ${filled}/${total} 条数据`)

        // 3秒后关闭对话框
        setTimeout(() => {
          this.aiFillDialogVisible = false
        }, 2000)
      } catch (e) {
        console.error('自动填充失败', e)
        this.$message.error('自动填充失败: ' + e.message)
      } finally {
        this.aiLoading = false
      }
    },

    // 将结果填充到文档
    applyResultsToDocument() {
      const editorEl = this.$refs.editorContent
      if (!editorEl) return

      const apiTags = editorEl.querySelectorAll('.tag-api')
      apiTags.forEach((tag, i) => {
        const annotation = this.pendingAnnotations.find(a => a.index === i)
        if (annotation && annotation.result) {
          // 获取第一个值填充
          const firstValue = Object.values(annotation.result).find(v => v !== null && v !== undefined)
          if (firstValue !== null && firstValue !== undefined) {
            const value = typeof firstValue === 'number' ? firstValue.toFixed(2) : firstValue
            tag.textContent = value
            tag.classList.remove('tag-api')
            tag.classList.add('tag-filled')
            tag.style.background = '#f6ffed'
            tag.style.color = '#52c41a'
            tag.style.border = '1px solid #b7eb8f'
            tag.setAttribute('data-filled', 'true')
          }
        }
      })
    },

    // 打开AI智能填充对话框
    handleAiFillData() {
      if (this.pendingAnnotations.length === 0) {
        this.$message.warning('没有需要填充的API批注')
        return
      }
      this.aiFillDialogVisible = true
      this.aiCurrentStep = 0
      this.currentSql = ''
      this.queryResults = []
      this.queryError = ''
    },

    // 编辑单个批注的查询
    editAnnotationQuery(index, row) {
      this.editQueryForm = {
        index: row.index,
        annotationText: row.annotationText,
        query: row.query || '',
        tables: []
      }
      this.editQueryDialogVisible = true
    },

    // 保存查询并生成SQL
    async saveQueryAndClose() {
      if (!this.editQueryForm.query) {
        this.$message.warning('请输入查询内容')
        return
      }

      this.aiLoading = true
      try {
        const res = await naturalLanguageQuery({
          query: this.editQueryForm.query,
          tables: this.editQueryForm.tables.length > 0 ? this.editQueryForm.tables : null
        })

        if (res.code === 0 || res.code === 200) {
          const data = res.data
          if (data.status === 'failed') {
            this.$message.error(data.errorMessage || 'SQL生成失败')
          } else {
            this.currentSql = data.sql
            this.currentQuery = this.editQueryForm.query
            this.currentAnnotationIndex = this.editQueryForm.index
            this.queryResults = data.results || []
            this.fillPreview = this.generateFillPreview()

            // 更新pendingAnnotations
            const pendingIndex = this.pendingAnnotations.findIndex(p => p.index === this.editQueryForm.index)
            if (pendingIndex >= 0) {
              this.pendingAnnotations[pendingIndex].query = this.editQueryForm.query
              this.pendingAnnotations[pendingIndex].result = data
            }

            this.editQueryDialogVisible = false
            this.aiCurrentStep = 1
          }
        } else {
          this.$message.error(res.message || '请求失败')
        }
      } catch (e) {
        console.error('生成SQL失败', e)
        this.$message.error('生成SQL失败: ' + e.message)
      } finally {
        this.aiLoading = false
      }
    },

    // AI步骤下一步
    async nextAiStep() {
      if (this.aiCurrentStep === 0) {
        // 从第一步开始，自动处理第一个批注
        if (this.pendingAnnotations.length > 0) {
          const firstPending = this.pendingAnnotations.find(p => !p.query)
          if (firstPending) {
            this.editAnnotationQuery(firstPending.index, firstPending)
            return
          }
        }

        // 如果所有批注都已设置查询，直接生成SQL
        this.aiCurrentStep = 1
        await this.generateAllSql()
      } else if (this.aiCurrentStep === 1) {
        this.aiCurrentStep = 2
      } else if (this.aiCurrentStep === 2) {
        this.aiCurrentStep = 3
        this.fillPreview = this.generateFillPreview()
      }
    },

    // 为所有待填充批注生成SQL
    async generateAllSql() {
      this.aiLoading = true
      try {
        for (const pending of this.pendingAnnotations) {
          if (!pending.query) {
            // 使用批注内容作为查询
            pending.query = pending.annotationText
          }

          const res = await naturalLanguageQuery({
            query: pending.query,
            tables: null
          })

          if (res.code === 0 || res.code === 200) {
            pending.result = res.data
            if (res.data.status !== 'failed') {
              pending.queryResult = res.data.results
            }
          }
        }

        // 显示第一个SQL
        const firstWithResult = this.pendingAnnotations.find(p => p.result && p.result.sql)
        if (firstWithResult) {
          this.currentSql = firstWithResult.result.sql
          this.currentAnnotationIndex = firstWithResult.index
          this.queryResults = firstWithResult.queryResult || []
        }
      } catch (e) {
        console.error('批量生成SQL失败', e)
      } finally {
        this.aiLoading = false
      }
    },

    // 执行AI查询
    async executeAiQuery() {
      if (!this.currentSql) {
        this.$message.warning('请先生成SQL')
        return
      }

      this.aiLoading = true
      this.queryResults = []
      this.queryError = ''

      try {
        const res = await executeSql({ sql: this.currentSql, maxRows: 10 })

        if (res.code === 0 || res.code === 200) {
          const data = res.data
          if (data.status === 'failed') {
            this.queryError = data.errorMessage || '查询失败'
          } else {
            this.queryResults = data.results || []
            this.fillPreview = this.generateFillPreview()
            this.aiCurrentStep = 2
          }
        } else {
          this.queryError = res.message || '查询失败'
        }
      } catch (e) {
        console.error('执行查询失败', e)
        this.queryError = '执行查询失败: ' + e.message
      } finally {
        this.aiLoading = false
      }
    },

    // 重新生成SQL
    async regenerateSql() {
      if (!this.currentQuery) {
        this.$message.warning('无查询内容')
        return
      }

      this.aiLoading = true
      try {
        const res = await naturalLanguageQuery({
          query: this.currentQuery,
          tables: null
        })

        if (res.code === 0 || res.code === 200) {
          const data = res.data
          if (data.status !== 'failed') {
            this.currentSql = data.sql
            this.queryResults = data.results || []
          } else {
            this.$message.error(data.errorMessage || 'SQL生成失败')
          }
        }
      } catch (e) {
        console.error('重新生成SQL失败', e)
      } finally {
        this.aiLoading = false
      }
    },

    // 生成填充预览
    generateFillPreview() {
      if (this.queryResults.length === 0) return ''

      const firstRow = this.queryResults[0]
      const values = Object.values(firstRow).filter(v => v !== null && v !== undefined)

      return values.slice(0, 5).join(', ')
    },

    // 确认填充数据
    confirmFillData() {
      if (this.queryResults.length === 0) {
        this.$message.warning('没有可填充的数据')
        return
      }

      // 获取填充值
      const firstRow = this.queryResults[0]
      const fillValue = Object.values(firstRow)[0]

      if (fillValue !== null && fillValue !== undefined) {
        // 替换编辑器中的API标注内容
        const editorEl = this.$refs.editorContent
        if (editorEl) {
          const apiTags = editorEl.querySelectorAll('.tag-api')
          if (apiTags.length > 0) {
            const targetTag = apiTags[this.currentAnnotationIndex % apiTags.length]
            if (targetTag) {
              targetTag.textContent = fillValue
              targetTag.classList.remove('tag-api')
              targetTag.classList.add('tag-filled')
              targetTag.style.background = '#f6ffed'
              targetTag.style.color = '#52c41a'
              targetTag.style.border = '1px solid #b7eb8f'
            }
          }
        }

        this.$message.success(`已将数据 "${fillValue}" 填充到文档`)
      }

      this.aiFillDialogVisible = false
    },

    handleContentChange() {
      // 内容变化时的处理
    },

    // 执行富文本命令
    execCommand(command) {
      document.execCommand(command, false, null)
    },

    // 格式化标题
    formatBlock(tag) {
      document.execCommand('formatBlock', false, `<${tag}>`)
    },

    // 插入表格
    insertTable() {
      const table = `
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background: #fafafa;">列1</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #fafafa;">列2</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">数据1</td>
            <td style="border: 1px solid #ddd; padding: 8px;">数据2</td>
          </tr>
        </table>
      `
      document.execCommand('insertHTML', false, table)
    },

    // 插入图片
    insertImage() {
      const url = prompt('请输入图片URL:')
      if (url) {
        document.execCommand('insertImage', false, url)
      }
    },

    // 显示标注对话框
    showAnnotationDialog() {
      this.annotationDialogVisible = true
    },

    // 插入标注
    insertAnnotation() {
      const annotation = `<span class="annotation-tag ${this.selectedAnnotationType}">${this.getAnnotationLabel(this.selectedAnnotationType)}</span>`
      document.execCommand('insertHTML', false, '&nbsp;' + annotation + '&nbsp;')
      this.annotationDialogVisible = false
    },

    // 获取标注标签
    getAnnotationLabel(type) {
      const tag = this.annotationTags.find(t => t.type === type)
      return tag ? tag.label : ''
    }
  },
  destroyed() {
    // 清理流式监听
    this.cleanupStreamListener()
  }
}
</script>

<style scoped>
.report-editor-container {
  display: flex;
  flex-direction: column;
  /* 高度链路（AppMain 已改为不带 padding，统一铺 #f0f2f5）：
     100vh - 56px(顶栏) - 44px(自身上下留白之和)。
     改 AppMain padding 或顶栏高度时必须同步这里，否则底部会多/少一块空白。 */
  height: calc(100vh - 100px);
  background: #f0f2f5;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
}

.editor-main {
  flex: 1;
  overflow: hidden;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: stretch;
}

/* ===== 左侧章节导航 ===== */
.outline-panel {
  flex: 0 0 250px;
  width: 250px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: flex-basis 0.18s ease, width 0.18s ease;
}

/* 收起时只留一条窄条，点图标可再展开 */
.outline-panel.collapsed {
  flex: 0 0 42px;
  width: 42px;
}

.outline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 11px 10px 11px 12px;
  border-bottom: 1px solid #eef0f3;
  background: #fafbfc;
  flex-shrink: 0;
}

.outline-head-main {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.outline-head-main i {
  color: #3D5FEF;
  font-size: 15px;
}

.outline-head-title {
  white-space: nowrap;
}

.outline-head-count {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 400;
  color: #909399;
  background: #f0f2f5;
  border-radius: 8px;
  padding: 0 6px;
  line-height: 16px;
}

.outline-toggle {
  flex-shrink: 0;
  cursor: pointer;
  color: #909399;
  font-size: 15px;
  padding: 2px;
  border-radius: 3px;
}

.outline-toggle:hover {
  color: #3D5FEF;
  background: #eef4ff;
}

/* 收起态：只显示图标与竖排标题 */
.outline-panel.collapsed .outline-head {
  padding: 10px 0;
  justify-content: center;
  flex-wrap: wrap;
}

.outline-panel.collapsed .outline-head-title,
.outline-panel.collapsed .outline-head-count,
.outline-panel.collapsed .outline-progress,
.outline-panel.collapsed .outline-scroll,
.outline-panel.collapsed .outline-legend {
  display: none;
}

.outline-panel.collapsed .outline-head-main {
  justify-content: center;
}

/* 收起态的竖排提示 */
.outline-collapsed-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 0 10px;
  flex: 1;
}

.oc-percent {
  font-size: 11px;
  font-weight: 600;
  color: #389e0d;
  transform: rotate(-90deg);
  letter-spacing: 0.5px;
}

.oc-text {
  writing-mode: vertical-rl;
  font-size: 12px;
  letter-spacing: 3px;
  color: #8c939d;
}

.outline-collapsed-tip:hover .oc-text {
  color: #3D5FEF;
}

/* 总体完成度条 */
.outline-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f2f4f7;
  flex-shrink: 0;
}

.outline-progress-bar {
  flex: 1;
  height: 5px;
  background: #eef0f3;
  border-radius: 3px;
  overflow: hidden;
}

.outline-progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #52c41a, #95de64);
  border-radius: 3px;
  transition: width 0.35s ease;
}

.outline-progress-text {
  flex-shrink: 0;
  font-size: 11px;
  color: #606266;
}

/* 射孔方式选择（决定导航用哪套模板章节） */
.outline-perf {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-bottom: 1px solid #f2f4f7;
  background: #fafbfc;
}

.outline-perf .op-label {
  flex-shrink: 0;
  font-size: 11px;
  color: #909399;
}

.outline-perf .op-select {
  flex: 1;
  min-width: 0;
}

.outline-perf .op-select ::v-deep .el-input__inner {
  height: 26px;
  line-height: 26px;
  font-size: 12px;
  padding: 0 22px 0 8px;
}

.outline-perf .op-select ::v-deep .el-input__icon {
  line-height: 26px;
}

.outline-scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.outline-list {
  padding: 6px 0 10px;
}

.outline-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  padding-top: 5px;
  padding-bottom: 5px;
  padding-right: 10px;
  margin-left: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: #606266;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.outline-item:hover {
  background: #f5f9ff;
  color: #3D5FEF;
}

.outline-item.active {
  background: #eef4ff;
  color: #3D5FEF;
  font-weight: 600;
  box-shadow: inset 2px 0 0 #3D5FEF;
}

/* 一级章节加粗一点，形成层级感 */
.outline-item.lv-1 {
  font-weight: 600;
  color: #303133;
}

.outline-item.lv-1.active {
  color: #3D5FEF;
}

.outline-item.lv-3 {
  font-size: 11.5px;
  color: #7a8291;
}

/* 未填充的章节文字变浅，让人一眼看出缺哪块 */
.outline-item.empty .outline-text {
  color: #a8adb6;
}

.outline-no {
  flex-shrink: 0;
  min-width: 14px;
  color: #a8adb6;
  font-size: 11px;
}

.outline-item.active .outline-no {
  color: #3D5FEF;
}

.outline-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 右侧状态点（紧跟文字，不留大空白） */
.outline-dot {
  flex-shrink: 0;
  margin-left: auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #dcdfe6;
  transition: background 0.15s ease;
}

.outline-dot.ok {
  background: #52c41a;
}

.outline-dot.partial {
  background: #faad14;
}

.outline-dot.empty {
  background: #f0a020;
  box-shadow: 0 0 0 2px #fff3e0;
}

.outline-dot.pending {
  background: #d4d7de;
}

.outline-dot.group {
  background: #c9d4e5;
}

/* 模板章（四/五/七/十/十一）：由模板条文或 spec 内置数据生成，源文档本来就没有 */
.outline-dot.tmpl {
  background: #8fa8c8;
  box-shadow: 0 0 0 2px #eef3fa;
}

/* 提取覆盖率副行 */
.outline-substat {
  padding: 5px 12px 6px;
  font-size: 11px;
  color: #5a6b83;
  background: #fafbfc;
  border-top: 1px dashed #eef1f5;
  flex-shrink: 0;
}

.outline-substat-hint {
  font-style: normal;
  color: #a0a8b4;
}

/* 图例 */
.outline-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 7px 12px;
  border-top: 1px solid #f2f4f7;
  background: #fafbfc;
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
}

.outline-legend span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.outline-legend .lg {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.outline-legend .lg-ok {
  background: #52c41a;
}

.outline-legend .lg-empty {
  background: #f0a020;
}

.outline-legend .lg-pending {
  background: #d4d7de;
}

.outline-legend .lg-group {
  background: #c9d4e5;
}

.outline-legend .lg-tmpl {
  background: #8fa8c8;
}

/* ===== 当前章节「生成说明」条 ===== */
.sec-info {
  flex-shrink: 0;
  padding: 9px 16px;
  background: #f7faff;
  border-bottom: 1px solid #e3edff;
}

.sec-info-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sec-info-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2d3d;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sec-info-tag {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 17px;
  padding: 0 7px;
  border-radius: 9px;
  background: #eef0f3;
  color: #606266;
}

.sec-info-tag.ok {
  background: #e8f8e4;
  color: #389e0d;
}

.sec-info-tag.empty {
  background: #fff7e6;
  color: #d46b08;
}

.sec-info-tag.partial {
  background: #fff7e6;
  color: #d46b08;
}

.sec-info-tag.pending {
  background: #f0f2f5;
  color: #8c8c8c;
}

.sec-info-tag.group {
  background: #eaf1fd;
  color: #2f54eb;
}

.sec-info-pct {
  flex-shrink: 0;
  margin-left: 2px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
}

.sec-info-pct.ok {
  color: #389e0d;
}

.sec-info-pct.empty,
.sec-info-pct.partial {
  color: #d46b08;
}

.sec-info-line {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.65;
  color: #5a6472;
}

.sec-info-key {
  flex-shrink: 0;
  min-width: 56px;
  color: #9aa1ac;
}

.sec-info-val {
  flex: 1;
  min-width: 0;
}

.sec-info-val.warning {
  color: #d46b08;
}

.panel {
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

/* 富文本工具栏 */
.rich-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  flex-wrap: wrap;
  gap: 4px;
}

.toolbar-group {
  display: flex;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e8e8e8;
  margin: 0 8px;
}

/* 编辑器内容 */
.editor-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  outline: none;
  line-height: 1.8;
}

/* 流式提取生成进度条 */
.stream-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  background: #f0f9ff;
  border-bottom: 1px solid #91d5ff;
}

.stream-banner-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.stream-icon {
  color: #1890ff;
  font-size: 16px;
}

.stream-status {
  color: #1890ff;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stream-banner-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.stream-percent {
  color: #1890ff;
  font-size: 12px;
  width: 34px;
  text-align: right;
}

/* 生成文档说明（编辑框外）已移除，样式一并删除；
   页面只保留按章节的 .sec-info 说明条 */
.editor-content h1 {
  text-align: center;
  margin-bottom: 24px;
  font-size: 18px;
}

.editor-content h2 {
  margin: 16px 0 8px;
  font-size: 16px;
}

.editor-content p {
  text-indent: 2em;
  margin-bottom: 8px;
}

/* 标注标签 */
::v-deep .annotation-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 4px;
  cursor: pointer;
}

::v-deep .tag-api {
  background: #eef1fe;
  color: #3D5FEF;
}

::v-deep .tag-source {
  background: #fff7e6;
  color: #fa8c16;
}

::v-deep .tag-calc {
  background: #f9f0ff;
  color: #722ed1;
}

::v-deep .tag-std {
  background: #f0f5ff;
  color: #597ef7;
  border: 1px dashed #597ef7;
}

/* 标注对话框 */
.annotation-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.annotation-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.annotation-option:hover {
  border-color: #3D5FEF;
  background: #fafafa;
}

.annotation-option.selected {
  border-color: #3D5FEF;
  background: #eef1fe;
}

.annotation-desc {
  color: #8c8c8c;
  font-size: 12px;
}

/* AI智能填充样式 */
.ai-fill-container {
  padding: 16px 0;
}

.ai-steps {
  margin-bottom: 24px;
}

/* 自动填充进度 */
.auto-fill-progress {
  margin-bottom: 24px;
  padding: 20px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 1px solid #91d5ff;
}

.auto-fill-status {
  text-align: center;
  color: #1890ff;
  margin: 12px 0 0 0;
  font-size: 14px;
}

.pending-annotations h4,
.sql-result h4,
.query-result h4,
.fill-preview h4 {
  margin: 16px 0 12px;
  font-size: 14px;
  color: #303133;
}

.sql-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.result-summary {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-tip {
  margin-top: 12px;
  color: #909399;
  font-size: 12px;
}

.preview-tip i {
  margin-right: 4px;
}

.result-error {
  margin-top: 12px;
}

.result-loading {
  margin-top: 12px;
}

::v-deep .tag-filled {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

/* 流式生成样式 */
.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #91d5ff;
  border-radius: 4px;
  color: #1890ff;
  margin-top: 20px;
  font-size: 14px;
}

.streaming-indicator i {
  font-size: 16px;
}

.editor-content .heading-1 {
  text-align: center;
  margin: 24px 0 16px;
  font-size: 18px;
  color: #1a1a1a;
}

.editor-content .heading-2 {
  margin: 20px 0 12px;
  font-size: 16px;
  color: #333;
}

.editor-content .heading-3 {
  margin: 16px 0 8px;
  font-size: 14px;
  color: #555;
}

/* 严格提取结果：正文/图片/表格容器
   注意：编辑区内容通过 v-html 注入，不会带 scoped 的 data-v 属性，
   因此这些选择器必须用 ::v-deep 穿透（vue-loader 15 语法；:deep() 是 Vue3 语法，
   在 vue-loader15 下会原样输出被浏览器忽略，导致样式不生效）。 */
.editor-content ::v-deep .strict-extract-view {
  max-width: 100%;
}

.editor-content ::v-deep .strict-text p {
  text-indent: 2em;
  margin-bottom: 8px;
}

/* 文档中的表格（含后端返回的 .content-table）——必须有边框 */
.editor-content ::v-deep table,
.editor-content ::v-deep .content-table {
  border-collapse: collapse;
  border-spacing: 0;
  width: 100%;
  margin: 12px 0;
  font-size: 14px;
  border: 1px solid #cfcfcf;   /* 表格外框，双保险 */
  table-layout: auto;
}

/* 单元格边框（含 thead/tbody 下的 th、td） */
.editor-content ::v-deep table > thead > tr > th,
.editor-content ::v-deep table > thead > tr > td,
.editor-content ::v-deep table > tbody > tr > th,
.editor-content ::v-deep table > tbody > tr > td,
.editor-content ::v-deep table > tr > th,
.editor-content ::v-deep table > tr > td,
.editor-content ::v-deep .content-table > thead > tr > th,
.editor-content ::v-deep .content-table > tbody > tr > th,
.editor-content ::v-deep .content-table > tbody > tr > td {
  border: 1px solid #cfcfcf !important;   /* !important 覆盖后端内联样式 */
}

.editor-content ::v-deep table th,
.editor-content ::v-deep table td,
.editor-content ::v-deep .content-table th,
.editor-content ::v-deep .content-table td {
  border: 1px solid #cfcfcf;
  padding: 6px 10px;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}

.editor-content ::v-deep table th,
.editor-content ::v-deep .content-table th {
  background: #f5f7fa;
  font-weight: 600;
  color: #303133;
}

.editor-content ::v-deep table tr:nth-child(even) td {
  background: #fafafa;
}

/* 按井号筛选后保留的数据行（.well-row）高亮，让用户一眼看到保留的是哪口井 */
.editor-content ::v-deep table tr.well-row td,
.editor-content ::v-deep table tr.well-row th {
  background: #eef1fe !important;
  box-shadow: inset 3px 0 0 #3D5FEF;
}

/* 表格筛选说明小条 */
.editor-content ::v-deep .tbl-filter-note {
  color: #3D5FEF;
  font-size: 12px;
  margin: 2px 0 6px;
  font-style: italic;
}

/* 文档中的图片 */
.editor-content ::v-deep img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 8px auto;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.editor-content ::v-deep .img-block {
  margin: 14px 0;
  text-align: center;
}

/* 章节定位时标题闪一下（由 scrollToSection 动态加/移除 class） */
.editor-content ::v-deep .sec-flash {
  animation: secFlash 1.1s ease;
  border-radius: 3px;
}

@keyframes secFlash {
  0% {
    background: #fff3cd;
    box-shadow: 0 0 0 6px #fff3cd;
  }
  100% {
    background: transparent;
    box-shadow: 0 0 0 6px transparent;
  }
}
</style>
