<template>
  <div class="fa-page">
    <!-- 顶部：井信息 + 操作 -->
    <div class="fa-hero">
      <div class="fa-hero__left">
        <div class="fa-hero__icon"><i class="el-icon-cpu"></i></div>
        <div>
          <div class="fa-hero__title">
            压裂设计智能体
            <el-tag size="mini" type="success" effect="plain">内置模板骨架</el-tag>
            <el-tag size="mini" type="info" effect="plain">内置数据来源规则</el-tag>
            <!--
              「文档类型」标签已去掉：本章节结构三种制式完全一致（11 章 41 节点），
              把它当成「类型」摆在这里反而暗示存在三份不同的文档模板。
              差异只在射孔方式/射孔方向两列文字，已在下一行的射孔方式与下方口径说明里交代。
            -->
          </div>
          <div class="fa-hero__meta">
            <span>井号：{{ wellName || '-' }}</span>
            <span>源文档：{{ geoDoc ? geoDoc.fileName : '未找到地质设计' }}</span>
            <!--
              射孔方式这里只做「展示」，不再是选择器 —— 值来自工作台井号字段。
              标签型态用 plain + 前缀文字，避免用户误以为是可点的深链。
            -->
            <span v-if="perforationMethod">
              射孔方式：<b>{{ perforationMethod }}</b>
              <span class="fa-hero__from">（取自工作台井号）</span>
            </span>
          </div>
        </div>
      </div>
      <div class="fa-hero__actions">
        <el-button size="small" icon="el-icon-arrow-left" @click="goBack">返回工作台</el-button>
        <el-button
          size="small"
          icon="el-icon-reading"
          @click="openLogicDialog()"
        >查看提取逻辑</el-button>
        <el-button
          size="small"
          type="primary"
          icon="el-icon-video-play"
          :loading="running"
          :disabled="!geoDoc"
          @click="runAgent"
        >{{ running ? '智能体执行中…' : (finished ? '重新执行' : '开始智能提取并生成') }}</el-button>
      </div>
    </div>

    <!--
      选项区（v2）：
      「文档类型（射孔方式）」与「压前测试档位」两个选择器已下线 ——
      两者的值都由工作台井号带过来（射孔方式 = 井号字段，小压测试档位 = 泵注程序模块），
      本页不再让用户二次切换。这里只留一行口径说明，交代「结构一致、差异在哪」，
      避免用户看到不同井生成的文档后困惑为什么章节数一样。
    -->
    <div v-if="currentMethod" class="fa-scope">
      <i class="el-icon-info"></i>
      <span>
        <b>章节结构完全一致</b>（11 章 {{ sectionTotal || 41 }} 个节点），差异只落在<b>射孔方案表</b>与<b>制式文案</b>上：
        射孔方式列写「<b>{{ currentMethod.perforationType }}</b>」，
        射孔方向列写「<b>{{ currentMethod.perforationDirection }}</b>」，{{ currentMethod.desc }}
      </span>
    </div>

    <!-- 主体：左章节树 / 中对话流 / 右节点详情 -->
    <div class="fa-body">
      <!-- 左：章节节点树（完整流程可视化） -->
      <div class="fa-tree">
        <div class="fa-tree__head">
          <span><i class="el-icon-share"></i> 章节节点</span>
          <span class="fa-tree__stat">
            {{ treeStat.rendered }}/{{ treeNodes.length }} 已出内容
          </span>
        </div>
        <div class="fa-tree__legend">
          <span v-for="lg in nodeStatusLegend" :key="lg.key" class="fa-tree__legend-item">
            <i :class="['fa-node-dot', 'fa-node-dot--' + lg.key]"></i>{{ lg.label }}
          </span>
        </div>
        <div class="fa-tree__bar">
          <div class="fa-tree__bar-inner" :style="{ width: treePercent + '%' }"></div>
        </div>
        <div ref="treeList" class="fa-tree__list">
          <div v-if="!treeNodes.length" class="fa-tree__empty">
            <i class="el-icon-loading"></i> 等待解析文档骨架…
          </div>
          <div
            v-for="n in treeNodes"
            :key="n.key || n.index"
            :data-key="n.key"
            :class="['fa-node',
                     'fa-node--l' + n.level,
                     'fa-node--' + n.status,
                     activeNodeKey === n.key ? 'fa-node--active' : '']"
            :title="n.title"
            @click="selectNode(n)"
          >
            <i :class="['fa-node__icon', nodeIcon(n)]"></i>
            <span class="fa-node__no">{{ n.no }}</span>
            <span class="fa-node__title">{{ n.title }}</span>
            <span v-if="n.fields && n.fields.length" class="fa-node__badge">
              {{ nodeFoundCount(n) }}/{{ n.fields.length }}
            </span>
          </div>
        </div>
      </div>

      <!-- 中：智能体对话 -->
      <div class="fa-chat">
        <div ref="chatScroll" class="fa-chat__scroll">
          <div v-for="(m, i) in messages" :key="i" :class="['fa-msg', 'fa-msg--' + m.role]">
            <div class="fa-msg__avatar">
              <i :class="m.role === 'agent' ? 'el-icon-cpu' : 'el-icon-user'"></i>
            </div>
            <div class="fa-msg__main">
              <div class="fa-msg__head">
                <span class="fa-msg__name">{{ m.role === 'agent' ? '压裂设计智能体' : '我' }}</span>
                <span class="fa-msg__time">{{ m.time }}</span>
              </div>
              <div class="fa-msg__bubble">
                <div class="fa-msg__text" v-html="m.html"></div>
                <div v-if="m.thinking" class="fa-msg__thinking">
                  <i class="el-icon-loading"></i> {{ m.thinking }}
                </div>
              </div>
              <!-- 结构化卡片：字段提取结果 / 章节填充结果 -->
              <div v-if="m.card" class="fa-card">
                <div class="fa-card__head">
                  <span>{{ m.card.title }}</span>
                  <span class="fa-card__stat">{{ m.card.stat }}</span>
                </div>
                <div class="fa-card__body">
                  <div v-for="(row, ri) in m.card.rows" :key="ri" class="fa-card__row">
                    <span :class="['fa-dot', row.ok ? 'fa-dot--ok' : 'fa-dot--no']"></span>
                    <span class="fa-card__label">{{ row.label }}</span>
                    <span class="fa-card__value">{{ row.value }}</span>
                    <span v-if="row.src" class="fa-card__src">{{ row.src }}</span>
                  </div>
                </div>
                <div v-if="m.card.more > 0" class="fa-card__more">
                  还有 {{ m.card.more }} 项未展示…
                </div>
              </div>
            </div>
          </div>

          <div v-if="thinking" class="fa-msg fa-msg--agent">
            <div class="fa-msg__avatar"><i class="el-icon-cpu"></i></div>
            <div class="fa-msg__main">
              <div class="fa-msg__bubble">
                <div class="fa-msg__thinking"><i class="el-icon-loading"></i> {{ thinking }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区：智能体不接受任意提问，只给「继续 / 重新执行」两类指令 -->
        <div class="fa-composer">
          <el-input
            v-model="input"
            type="textarea"
            :rows="2"
            resize="none"
            :disabled="running"
            placeholder="智能体已内置模板骨架与数据来源规则，可直接发送「继续」或「重新执行」"
            @keydown.native.enter.exact.prevent="sendInput"
          />
          <el-button type="primary" :disabled="running" @click="sendInput">发送</el-button>
        </div>
      </div>

      <!-- 右：执行步骤 / 分析过程 + 当前节点详情（字段级实时回显） -->
      <div class="fa-steps">
        <div class="fa-steps__head">
          <span><i class="el-icon-s-order"></i> 执行步骤</span>
          <span class="fa-steps__progress">{{ doneSteps }}/{{ steps.length }}</span>
        </div>
        <div class="fa-steps__bar">
          <div class="fa-steps__bar-inner" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="fa-steps__list">
          <div
            v-for="(s, i) in steps"
            :key="i"
            :class="['fa-step', 'fa-step--' + s.status]"
          >
            <div class="fa-step__icon">
              <i v-if="s.status === 'done'" class="el-icon-check"></i>
              <i v-else-if="s.status === 'running'" class="el-icon-loading"></i>
              <i v-else-if="s.status === 'error'" class="el-icon-close"></i>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <div class="fa-step__main">
              <div class="fa-step__title">{{ s.title }}</div>
              <div v-if="s.desc" class="fa-step__desc">{{ s.desc }}</div>
              <div v-if="s.detail && s.detail.length" class="fa-step__detail">
                <div v-for="(d, di) in s.detail" :key="di" class="fa-step__detail-line">
                  <i class="el-icon-right"></i> {{ d }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 当前节点详情：点左侧树节点即切换，字段级回显「抽到没有 / 从哪抽的」 -->
        <div class="fa-detail">
          <div class="fa-detail__head">
            <span><i class="el-icon-document"></i> 当前节点</span>
            <el-tag
              v-if="activeNode && activeNode.status"
              size="mini"
              :type="statusTag(activeNode.status)"
              effect="plain"
            >{{ statusLabel(activeNode.status) }}</el-tag>
          </div>

          <div v-if="!activeNode" class="fa-detail__empty">
            <i class="el-icon-pointer"></i> 点击左侧章节节点查看该节点的字段与取值
          </div>

          <div v-else class="fa-detail__body">
            <div class="fa-detail__title">
              <span class="fa-detail__no">{{ activeNode.no }}</span>
              <span>{{ activeNode.title }}</span>
            </div>
            <div class="fa-detail__meta">
              <span>第 {{ activeNode.level }} 层</span>
              <span v-if="activeNode.generation">生成方式：{{ genLabel(activeNode.generation) }}</span>
              <span v-if="activeNode.length">正文 {{ activeNode.length }} 字</span>
            </div>

            <!-- 节点引用的字段：抽取阶段实时刷新 -->
            <div v-if="activeNode.fields && activeNode.fields.length" class="fa-detail__fields">
              <div class="fa-detail__subtitle">
                引用字段（{{ nodeFoundCount(activeNode) }}/{{ activeNode.fields.length }} 已提取）
              </div>
              <div
                v-for="fk in activeNode.fields"
                :key="fk"
                :class="['fa-field', fieldOf(fk).found ? 'fa-field--ok' : 'fa-field--no']"
              >
                <div class="fa-field__head">
                  <i :class="['fa-node-dot', fieldOf(fk).found ? 'fa-node-dot--done' : 'fa-node-dot--pending']"></i>
                  <span class="fa-field__label">{{ fieldOf(fk).label }}</span>
                  <el-tag v-if="fieldOf(fk).confidence" size="mini" effect="plain">
                    {{ fieldOf(fk).confidence }}
                  </el-tag>
                </div>
                <div class="fa-field__value">
                  {{ fieldOf(fk).found ? (fieldOf(fk).value || '（空值）') : '未提取到' }}
                </div>
                <div v-if="fieldOf(fk).locate" class="fa-field__src">
                  <i class="el-icon-place"></i> {{ fieldOf(fk).locate }}
                </div>
                <div v-if="fieldOf(fk).rule" class="fa-field__rule">
                  {{ fieldOf(fk).rule }}
                </div>
              </div>
            </div>
            <div v-else class="fa-detail__nofield">
              <i class="el-icon-info"></i> {{ noFieldTip }}
            </div>

            <!-- 子节点：看清「下一步进哪」 -->
            <div v-if="activeNode.children && activeNode.children.length" class="fa-detail__children">
              <div class="fa-detail__subtitle">下级节点（{{ activeNode.children.length }}）</div>
              <div
                v-for="c in activeNode.children"
                :key="c.key"
                class="fa-detail__child"
                @click="selectNode(c)"
              >
                <i :class="['fa-node__icon', nodeIcon(c)]"></i>
                <span class="fa-detail__childno">{{ c.no }}</span>
                <span class="fa-detail__childtitle">{{ c.title }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="finished" class="fa-steps__foot">
          <el-button type="success" size="small" icon="el-icon-edit-outline" @click="goEditor">
            进入文档编辑
          </el-button>
        </div>
      </div>
    </div>

    <!-- ========== 提取逻辑说明弹窗 ========== -->
    <el-dialog
      title="模板提取逻辑说明"
      :visible.sync="logicVisible"
      width="1080px"
      top="5vh"
      custom-class="fa-logic-dialog"
    >
      <div v-loading="logicLoading" class="fa-logic">
        <div class="fa-logic__intro">
          <i class="el-icon-info"></i>
          <span>
            下表把模板里<b>批注</b>与<b>章节小标题</b>中隐含的提取逻辑用文字说明出来：
            每条数据<b>从哪来 → 怎么定位 → 怎么筛选 → 怎么处理</b>。
            右侧「本次实测」列是本井执行后的真实命中情况（未执行时为空）。
          </span>
        </div>

        <div v-if="logicError" class="fa-logic__err">
          <i class="el-icon-warning-outline"></i> 读取提取逻辑失败：{{ logicError }}
        </div>

        <div v-for="g in logicGroups" :key="g.id" class="fa-logic__group">
          <div class="fa-logic__group-head">
            <span class="fa-logic__group-title">{{ g.title }}</span>
            <el-tag v-if="g.priority === '高'" type="danger" size="mini" effect="plain">重点关注</el-tag>
            <span v-if="g.chapter" class="fa-logic__group-chapter">{{ g.chapter }}</span>
            <span class="fa-logic__group-stat">
              {{ groupFound(g) }}/{{ g.items.length }} 已命中
            </span>
          </div>

          <table class="fa-logic__table">
            <thead>
              <tr>
                <th style="width:132px">字段</th>
                <th style="width:74px">类型</th>
                <th style="width:150px">数据来源</th>
                <th>提取逻辑</th>
                <th style="width:200px">本次实测</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in g.items" :key="it.key">
                <td>
                  <div class="fa-logic__label">{{ it.label }}</div>
                  <div class="fa-logic__key">{{ it.key }}</div>
                </td>
                <td>
                  <el-tag size="mini" :type="typeTag(it.type)" effect="plain">{{ it.type }}</el-tag>
                </td>
                <td>
                  <div class="fa-logic__origin">{{ it.origin }}</div>
                  <div v-if="it.commentRef" class="fa-logic__ref">{{ it.commentRef }}</div>
                </td>
                <td>
                  <div class="fa-logic__logic">{{ it.logic }}</div>
                  <div v-if="it.locate" class="fa-logic__sub">
                    <b>定位：</b>{{ it.locate }}
                  </div>
                  <div v-if="it.filter" class="fa-logic__sub">
                    <b>筛选：</b>{{ it.filter }}
                  </div>
                  <div v-if="it.headers && it.headers.length" class="fa-logic__sub">
                    <b>表头：</b>{{ it.headers.join(' / ') }}
                  </div>
                  <div v-if="it.formula && it.formula.length" class="fa-logic__sub">
                    <b>公式：</b>
                    <div v-for="(f, fi) in it.formula" :key="fi" class="fa-logic__formula">{{ f }}</div>
                  </div>
                  <div v-if="it.rowCount" class="fa-logic__sub">
                    <b>行数：</b>{{ it.rowCount }}
                  </div>
                  <div v-if="it.note" class="fa-logic__note">
                    <i class="el-icon-warning-outline"></i> {{ it.note }}
                  </div>
                </td>
                <td>
                  <!-- 一律走 liveIndex 计算属性（只建一次 key 索引），
                       原来每个格子直接调 liveOf 4 次，21 行 × 5 列要扫上百次 -->
                  <template v-if="liveIndex[it.key]">
                    <div class="fa-logic__live">
                      <span :class="['fa-dot', liveIndex[it.key].found ? 'fa-dot--ok' : 'fa-dot--no']"></span>
                      <span>{{ liveIndex[it.key].found ? '已提取' : '未提取' }}</span>
                      <el-tag v-if="liveIndex[it.key].confidence" size="mini" effect="plain">
                        {{ liveIndex[it.key].confidence }}
                      </el-tag>
                    </div>
                    <div class="fa-logic__live-val">{{ truncate(liveIndex[it.key].value, 60) || '—' }}</div>
                    <div class="fa-logic__live-src">{{ liveIndex[it.key].locate }}</div>
                  </template>
                  <span v-else class="fa-logic__live-none">{{ hasLive ? '无此字段' : '尚未执行' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!logicLoading && !logicGroups.length && !logicError" class="fa-logic__empty">
          未取到提取逻辑说明
        </div>
      </div>
      <span slot="footer">
        <el-button @click="logicVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { listWellDocs, listDocsByWellName, downloadWellDoc } from '@/api/wellDoc'
import {
  generateByAgentStreamApi, generateByAgentApi, getExtractLogicApi, getAgentInfoApi
} from '@/api/fracturing'
import {
  PRETEST_VARIANTS, PRETEST_DEFAULT, loadPreTestVariant
} from './preTestVariants'
import { handoffAgentDocument } from '@/utils/agentHandoff'

/**
 * 压前测试（小压测试）泵注程序档位。
 *
 * <p><b>本页已不再提供档位选择器</b>（2026-11-09 用户要求下线）：
 * 档位属于「工作台井号 + 泵注程序模块」的既有选择，智能体页直接沿用，
 * 让用户在这一页只需按一个按钮。这里保留 import 只为：
 *   ① 从 query / 工作台读取档位，原样传给后端（不传会回落默认 12 方，
 *      导致「工作台选了 15 方、这里生成出来却是 12 方」）；
 *   ② 兜底提示词展示用（生成失败时能说清用的是哪一档）。
 *
 * <p>只读不写：绝不调 savePreTestVariant —— 智能体页没有改档入口，
 * 若仍监听并落盘，会把用户在工作台的选择静默改回默认值。
 */

/** 执行步骤定义（顺序固定，与智能体内部流程一一对应） */
function buildSteps() {
  return [
    { key: 'locate', title: '定位源文档', desc: '从关联文档中找地质设计', status: 'wait', detail: [] },
    { key: 'outline', title: '解析文档骨架', desc: '识别章节 / 表格 / 图片', status: 'wait', detail: [] },
    { key: 'extract', title: '按数据来源规则抽取字段', desc: '批注即规则，逐字段定位取值', status: 'wait', detail: [] },
    { key: 'render', title: '按内置模板骨架渲染正文', desc: '11 章 / 章节顺序 / 占位符', status: 'wait', detail: [] },
    { key: 'done', title: '生成完成，转入编辑器', desc: '封面与目录在导出时补全', status: 'wait', detail: [] }
  ]
}

/**
 * 三种文档类型 = 三种射孔方式。
 *
 * <p>章节结构完全一致（11 章 41 节点），差异只落在两处：
 * 分段射孔表的「射孔方式 / 射孔方向」两列，以及部分制式文案。
 * 这里的取值必须与后端 `perforation-agent-spec.json → templates` 严格一致，
 * 否则前端提示的制式与后端实际写入的会对不上。
 */
export const PERFORATION_METHODS = [
  {
    key: '全程固井',
    perforationType: '全程固井射孔',
    perforationDirection: '180°定向（套管底部）',
    desc: '套管全程固井后射孔，射孔段覆盖目的层全井段。'
  },
  {
    key: '半程固井',
    perforationType: '半程固井射孔',
    perforationDirection: '120°定向',
    desc: '上部套管固井、下部裸眼或筛管完井，射孔段位于固井段内。'
  },
  {
    key: '滑套压裂',
    perforationType: '滑套压裂',
    perforationDirection: '无射孔（滑套打开）',
    desc: '不射孔，靠滑套逐级打开，分段依靠滑套位置划分。'
  }
]

/** 节点状态 → 图例文案（顺序即图例展示顺序） */
const NODE_STATUS_LEGEND = [
  { key: 'pending', label: '待处理' },
  { key: 'running', label: '提取中' },
  { key: 'done', label: '已出内容' },
  { key: 'empty', label: '空' },
  { key: 'placeholder', label: '待人工补充' },
  { key: 'user', label: '待上传' },
  { key: 'container', label: '仅容器' }
]

export default {
  name: 'FracturingAgent',
  data() {
    return {
      wbWellId: null,
      wellName: '',
      geoDoc: null,
      docsLoading: false,

      running: false,
      finished: false,
      input: '',
      messages: [],
      thinking: '',
      steps: buildSteps(),
      result: null,

      /**
       * 压前测试（小压测试）泵注程序档位，写入「六、施工泵注程序」章节开头。
       *
       * <p>本页无选择器（已下线），值一律从 query / 工作台继承：
       * 在 created 里只读不写，保证与工作台「泵注程序」模块是同一个选择。
       * 与后端 fracturing-agent-spec.json → preTestProgram.variants 的 key 一一对应。
       */
      preTestVariant: PRETEST_DEFAULT,
      preTestVariants: PRETEST_VARIANTS,

      /**
       * 射孔方式 = 文档类型：「全程固井」/「半程固井」/「滑套压裂」。
       *
       * <p>本页无选择器（已下线），值由工作台井号字段带过来，只做展示：
       * 优先级 query → 本井射孔方案页存过的值 → 后端 init 事件回填 → 全程固井。
       * 它既是施工参数，也是「生成哪一份制式」的判断条件，抽取阶段就要定下来。
       */
      perforationMethod: PERFORATION_METHODS[0].key,
      perforationMethods: PERFORATION_METHODS,

      /* ---------- 章节节点树（完整流程可视化） ---------- */
      /**
       * 扁平节点列表，每项形如：
       * { key, no, title, level, generation, parentKey, fields, children,
       *   status, length, index }
       *
       * 数据来源三处，合并口径：
       *   1) init / outline-sections 事件 → 全量骨架（status 先置 pending）
       *   2) section-start     事件 → 该节点 status 置 running
       *   3) section           事件 → 落 status / length / fields
       */
      treeNodes: [],
      sectionTotal: 0,
      activeNodeKey: '',
      nodeStatusLegend: NODE_STATUS_LEGEND,
      /** 字段级实时回显：key → { label, found, value, locate, rule, type, confidence } */
      liveFields: {},

      /* ---------- 提取逻辑说明弹窗 ---------- */
      logicVisible: false,
      logicLoading: false,
      logicError: '',
      /** 后端 fracturing-extract-logic.json 的 groups[]，中文可读版 */
      logicGroups: []
    }
  },
  computed: {
    doneSteps() {
      return this.steps.filter(s => s.status === 'done').length
    },
    progressPercent() {
      return Math.round((this.doneSteps / this.steps.length) * 100)
    },
    /** 当前射孔方式对应的制式（射孔类型 / 射孔方向 / 说明），供口径说明行使用 */
    currentMethod() {
      return this.perforationMethods.find(m => m.key === this.perforationMethod) || null
    },
    /** 已出内容（非 pending/running）的节点数 */
    treeStat() {
      const rendered = this.treeNodes.filter(
        n => n.status && n.status !== 'pending' && n.status !== 'running'
      ).length
      return { rendered }
    },
    /** 节点进度条：已处理节点占比 */
    treePercent() {
      if (!this.treeNodes.length) return 0
      return Math.round((this.treeStat.rendered / this.treeNodes.length) * 100)
    },
    /** 当前选中节点（找不到时回落第一个有字段的节点，便于生成后直接看结果） */
    activeNode() {
      if (this.activeNodeKey) {
        const n = this.treeNodes.find(x => x.key === this.activeNodeKey)
        if (n) return n
      }
      return null
    },
    /**
     * 「本节点不引用字段」时该说什么 —— 按 generation 分别措辞。
     *
     * <p>不能一句话糊过去。实测 41 个节点里有 15 个没有字段，但原因完全不同：
     * 固定文案章节是「本来就不取自源文档」，附图节点是「等图不是等字」，
     * 容器章节是「内容在子节点」，「待开发」是「还没做完」。
     * 统一说成「由子节点或固定制式产生」会让用户误判为功能缺失。
     */
    noFieldTip() {
      const n = this.activeNode
      if (!n) return ''
      const gen = n.generation || ''
      if (gen === 'TEMPLATE_TEXT') return '本节点为模板内置固定文案，无需从源文档取值。'
      if (gen === 'FIGURES') return '本节点是附图容器，图片分别在其下级各「附图 N」节点里。'
      if (gen === 'SOURCE_FIGURE') return '本节点从源文档按图题匹配图片，取的是图不是文字字段。'
      if (gen === 'USER_UPLOAD') return '本节点需人工上传图片，不支持从源文档提取。'
      if (gen === 'STANDARDS') return '本节点为内置标准清单表，无需从源文档取值。'
      if (gen === 'FLUID_STANDARD') return '本节点为内置压裂液检测指标表，无需从源文档取值。'
      if (gen === 'MIXED') return '本节点是容器章节，正文来自它的下级节点。'
      if (gen === 'PENDING_DEV') return '本节点功能待开发，当前输出占位提示。'
      return '本节点不直接引用字段，内容由下级节点或内置制式产生。'
    },
    /**
     * 本次实测结果 → 以字段 key 为键的索引。
     *
     * <p>踩过的坑：`/extract` 与 `/generate` 返回字段列表用的**不是同一个键名** ——
     * `/extract` 是 `fields`，`/generate` 是 `fieldReport`。只读 `fieldReport`
     * 会让「只跑了预览、还没生成正文」的场景整列显示「尚未执行」，
     * 看着像功能没接通，实际是取错了键。两个都读，兼容任何入口。
     */
    liveIndex() {
      // liveFields 是 SSE 逐字段回显的实时值（执行过程中就有），
      // result.fieldReport 是最终定稿值。两者合并：定稿优先，实时补位。
      const map = {}
      Object.keys(this.liveFields).forEach(k => { map[k] = this.liveFields[k] })
      const r = this.result
      if (r) {
        const list = r.fieldReport || r.fields || []
        list.forEach(f => { if (f && f.key) map[f.key] = f })
      }
      return map
    },
    /** 是否已经跑过一次抽取/生成（决定右列「尚未执行」 vs 「无此字段」） */
    hasLive() {
      if (Object.keys(this.liveFields).length) return true
      const r = this.result
      if (!r) return false
      return !!(r.fieldReport || r.fields)
    }
  },
  // 本页已无档位/类型选择器，不需要 watch 落盘 —— 只读继承即可。
  async created() {
    const q = this.$route.query || {}
    this.wbWellId = q.wbWellId || this.resolveWbWellId()
    this.wellName = q.wellName || this.resolveWellName()
    // 压前测试档位：本页只读继承，不提供切档入口（选择器已下线）。
    // 优先级 query（从工作台带过来）→ 本井保存过的选择 → 默认 12方。
    const fromQuery = q.preTestVariant || ''
    this.preTestVariant = this.preTestVariants.some(v => v.key === fromQuery)
      ? fromQuery
      : loadPreTestVariant(this.wbWellId)

    // 射孔方式（文档类型）：同样是只读继承，来源三级——
    //   ① query（工作台井号字段）
    //   ② 本井「射孔方案」页存过的值
    //   ③ 后端 init 事件回填（它才是实际生成用的制式）
    // 这里做前两级只是为了让页面一开始显示的方式和最终生成的一致，
    // 避免用户看到全程固井、生成出来却是滑套压裂。
    const qMethod = q.perforationMethod || ''
    if (this.perforationMethods.some(m => m.key === qMethod)) {
      this.perforationMethod = qMethod
    } else {
      const saved = this.resolveWellPerforationMethod()
      if (saved && this.perforationMethods.some(m => m.key === saved)) {
        this.perforationMethod = saved
      }
    }

    // 同步选中井，保证「返回工作台」带回正确的井库 ID 与标题
    this.syncSelectedWell()
    // 先把 41 个节点骨架铺出来：需求是「完整的流程和每个节点都可视化」，
    // 树应该在页面一打开就能看全，而不是等跑到某个节点才知道有这么个节点。
    // 用 /info 的 sections（扁平、带 level/fields）铺，比等 SSE 更早。
    await this.preloadSectionTree()
    if (this.treeNodes.length) {
      this.activeNodeKey = this.treeNodes[0].key
    }
    this.pushAgent(
      `你好，我是压裂设计智能体。已内置 <b>批注模板的 11 章文档结构</b> 和 <b>19 类字段的数据来源规则</b>，` +
      '不需要你上传模板。<br>现在我会先读取本井关联的地质设计文档，自动抽取字段并生成压裂工程设计正文。' +
      '<br>点击右上角「开始智能提取并生成」即可执行。'
    )
    await this.loadGeoDoc()
  },
  methods: {
    resolveWbWellId() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (raw) {
          const o = JSON.parse(raw)
          if (o && o.wbWellId) return o.wbWellId
        }
      } catch (e) { /* ignore */ }
      return null
    },
    resolveWellName() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (raw) {
          const o = JSON.parse(raw)
          if (o && (o.wellName || o.name)) return o.wellName || o.name
        }
      } catch (e) { /* ignore */ }
      return ''
    },

    /* ---------------- 文档定位 ---------------- */
    async loadGeoDoc() {
      if (!this.wbWellId && !this.wellName) return
      this.docsLoading = true
      const step = this.stepByKey('locate')
      step.status = 'running'
      step.desc = '正在查询关联文档…'
      try {
        let list = []
        if (this.wbWellId) {
          // 优先「工作台井号」下的文档
          const res = await listWellDocs(this.wbWellId, { docType: 'GEOLOGICAL_DESIGN', onlyCurrent: true })
          list = this.pickList(res)
        }
        if (!list.length && this.wellName) {
          // 兜底：按井名查（未关联井库的井号）
          const res2 = await listDocsByWellName(this.wellName)
          list = this.pickList(res2)
        }
        const geo = list.find(d => d.docType === 'GEOLOGICAL_DESIGN') ||
          list.find(d => /地质/.test(d.fileName || '')) || null
        this.geoDoc = geo
        if (geo) {
          step.status = 'done'
          step.detail = [`${geo.fileName}`, `类型：${geo.docTypeName || geo.docType || '压裂地质设计'}`]
          this.pushAgent(`已定位到地质设计文档：<b>${this.escapeHtml(geo.fileName)}</b>。` +
            '<br>智能体会把它作为唯一数据来源，按模板批注里定义的数据来源规则逐字段取值。')
        } else {
          step.status = 'error'
          step.desc = list.length
            ? `找到了 ${list.length} 份文档，但没有「压裂地质设计」`
            : '未找到关联文档'
          this.pushAgent('没有找到本井的<b>压裂地质设计</b>文档。' +
            '请先在工作台的「文档中心」上传地质设计（文档类型选「压裂地质设计」），再回来执行。')
        }
      } catch (e) {
        step.status = 'error'
        step.desc = '查询文档失败：' + (e.message || '')
        this.pushAgent('查询关联文档失败：' + this.escapeHtml(e.message || ''))
      } finally {
        this.docsLoading = false
      }
    },

    /** 统一取接口返回的数组（拦截器可能返回 {data:[…]} 或 [ … ]） */
    pickList(res) {
      if (!res) return []
      if (Array.isArray(res)) return res
      if (Array.isArray(res.data)) return res.data
      if (res.data && Array.isArray(res.data.list)) return res.data.list
      return []
    },

    /* ---------------- 执行智能体 ---------------- */
    async runAgent() {
      if (this.running || !this.geoDoc) return
      this.running = true
      this.finished = false
      this.messages = this.messages.filter(m => m.role === 'agent').slice(0, 1)
      this.steps = buildSteps()
      // 重跑要把上一轮的节点状态与字段回显清干净，否则会出现
      // 「新任务还没跑到的节点仍显示上一轮的已生成」，看着像跳步。
      // 节点骨架本身保留（预铺的 41 个），只把状态打回 pending。
      this.treeNodes = this.treeNodes.map(n => Object.assign({}, n, {
        status: 'pending', length: 0
      }))
      this.liveFields = {}
      this.activeNodeKey = this.treeNodes.length ? this.treeNodes[0].key : ''

      const locate = this.stepByKey('locate')
      locate.status = 'done'
      locate.detail = [this.geoDoc.fileName]

      // 1) 取文件
      this.thinking = '正在下载地质设计文档…'
      let file = null
      try {
        const blob = await downloadWellDoc(this.geoDoc.docId)
        file = new File([blob], this.geoDoc.fileName || 'geo.docx', {
          type: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
      } catch (e) {
        this.thinking = ''
        this.running = false
        this.stepByKey('outline').status = 'error'
        this.stepByKey('outline').desc = '下载源文档失败'
        this.pushAgent('下载地质设计文档失败：' + this.escapeHtml(e.message || ''))
        return
      }

      // 2) 骨架解析 + 3) 字段抽取 + 4) 渲染：后端用 SSE 逐条推真实进度
      const outlineStep = this.stepByKey('outline')
      const extractStep = this.stepByKey('extract')
      const renderStep = this.stepByKey('render')
      outlineStep.status = 'running'
      this.thinking = '正在解析文档骨架（章节 / 表格 / 图片）…'
      this.pushAgent('开始解析源文档，按内置数据来源规则逐字段抽取。')

      // 字段抽取阶段用的实时对话卡片（每收到一条 field 事件就地追加一行）
      let fieldMsg = null
      let sectionMsg = null
      let fieldRows = []
      let sectionRows = []

      const ensureFieldMsg = () => {
        if (fieldMsg) return fieldMsg
        fieldMsg = {
          role: 'agent',
          time: this.now(),
          html: '正在按数据来源规则逐字段定位取值…',
          thinking: '',
          card: { title: '字段抽取结果', stat: '0/0', rows: fieldRows, more: 0 }
        }
        this.messages.push(fieldMsg)
        return fieldMsg
      }
      const ensureSectionMsg = () => {
        if (sectionMsg) return sectionMsg
        sectionMsg = {
          role: 'agent',
          time: this.now(),
          html: '正在按内置模板骨架逐章渲染正文…',
          thinking: '',
          card: { title: '章节渲染进度', stat: '0/0', rows: sectionRows, more: 0 }
        }
        this.messages.push(sectionMsg)
        this.scrollChat()
        return sectionMsg
      }

      // 右侧步骤面板的实时明细（只保留最近若干条，避免刷屏）
      const liveDetail = (step, line, keep) => {
        if (!step.detail) step.detail = []
        step.detail.push(line)
        if (step.detail.length > (keep || 6)) step.detail.splice(0, step.detail.length - (keep || 6))
      }

      const onEvent = (event, d) => {
        if (!d) return
        if (event === 'init') {
          outlineStep.desc = '已接收源文档，开始解析…'
          // init 也会带一份章节树：保证首帧就把节点铺出来，不用等 outline-sections。
          if (Array.isArray(d.sectionTree) && d.sectionTree.length) {
            this.ingestSectionTree(d.sectionTree)
          }
          if (d.sectionCount) this.sectionTotal = d.sectionCount
          // 后端定档结果回填：以它为准（它才是实际生成用的制式）
          if (d.perforationMethod && this.perforationMethods.some(m => m.key === d.perforationMethod)) {
            this.perforationMethod = d.perforationMethod
          }
          return
        }
        if (event === 'outline-sections') {
          // 全量节点树（带 parentKey，可直接成树）
          if (Array.isArray(d.nodes)) this.ingestSectionTree(d.nodes)
          if (d.total) this.sectionTotal = d.total
          return
        }
        if (event === 'stage') {
          const st = this.stepByKey(d.key)
          if (!st) return
          if (d.status === 'running') {
            st.status = 'running'
            st.desc = d.desc || st.desc
            this.thinking = d.desc || this.thinking
          } else if (d.status === 'done') {
            st.status = 'done'
            st.desc = d.desc || st.desc
            if (d.key === 'outline') {
              outlineStep.detail = [d.desc || '']
              this.thinking = '正在按数据来源规则抽取字段…'
            }
            if (d.key === 'extract') {
              this.thinking = '正在按内置模板骨架逐章渲染正文…'
            }
            if (d.key === 'render') {
              this.thinking = ''
            }
          }
          return
        }
        if (event === 'field') {
          // 字段级实时回显：先落 liveFields（左侧树/右侧详情都读它），再刷对话卡片
          this.liveFields = Object.assign({}, this.liveFields, {
            [d.key]: {
              key: d.key,
              label: d.label || d.key,
              type: d.type || '',
              found: !!d.found,
              value: d.value == null ? '' : String(d.value),
              locate: d.locate || '',
              rule: d.rule || '',
              confidence: d.confidence || ''
            }
          })
          // 该字段归属的章节同步刷新「已命中数」：liveFields 一换新对象，
          // computed 的 liveIndex / nodeFoundCount 即重算，树上的 n/m 立刻变。
          // （字段事件早于章节渲染，所以命中数能在「还没渲染到该章」时就先亮）

          ensureFieldMsg()
          fieldRows.push({
            ok: !!d.found,
            label: d.label || d.key,
            value: d.found ? this.truncate(d.value, 40) : '未找到',
            src: d.locate || d.rule || ''
          })
          if (fieldRows.length > 12) fieldRows.shift()
          const total = d.total || fieldRows.length
          fieldMsg.card.stat = `${d.done || fieldRows.length}/${total}`
          if (d.found) liveDetail(extractStep, `${d.label}：取自 ${d.locate || '正文'}`)
          this.scrollChat()
          return
        }
        if (event === 'section-start') {
          // 进入节点：树上点亮「提取中」，顺带把右栏切到该节点，
          // 这样「是否进入下一节点」是肉眼可见的推进，而不是等全部跑完才亮。
          const n = this.nodeByKey(d.key)
          if (n) {
            n.status = 'running'
            if (n.no === undefined || n.no === '') n.no = d.no || ''
            if (!n.title) n.title = d.title || ''
            this.activeNodeKey = d.key
          }
          if (d.total) this.sectionTotal = d.total
          ensureSectionMsg()
          if (d.title) this.thinking = `正在渲染「${(d.no ? d.no + '、' : '') + d.title}」…`
          // 树有 41 个节点、要滚 2.4 屏：不跟着滚的话，跑到第 20 个节点时
          // 高亮的那一行在视口外，用户只看到一个不动的树，等于没可视化。
          this.scrollTreeTo(d.key)
          return
        }
        if (event === 'section') {
          const n = this.nodeByKey(d.key)
          if (n) {
            n.status = d.status || 'rendered'
            n.length = Number(d.length || 0)
            if (d.fields && d.fields.length) n.fields = d.fields.map(f => f.key)
            // 章节结束时的字段终值比 field 事件更权威（含未单独发过事件的字段）
            ;(d.fields || []).forEach(f => {
              if (!f || !f.key) return
              this.liveFields = Object.assign({}, this.liveFields, {
                [f.key]: {
                  key: f.key,
                  label: f.label || f.key,
                  type: f.type || '',
                  found: !!f.found,
                  value: f.value == null ? '' : String(f.value),
                  locate: f.locate || '',
                  rule: f.rule || '',
                  confidence: (this.liveFields[f.key] || {}).confidence || ''
                }
              })
            })
          }
          ensureSectionMsg()
          const label = (d.no ? d.no + '、' : '') + (d.title || '')
          const len = Number(d.length || 0)
          sectionRows.push({
            ok: len > 0,
            label,
            value: len > 0 ? `${len} 字` : this.statusLabel(d.status),
            src: this.genLabel(d.generation)
          })
          if (sectionRows.length > 12) sectionRows.shift()
          sectionMsg.card.stat = `${d.done || sectionRows.length}/${d.total || '?'}`
          if (len > 0) liveDetail(renderStep, `${label}（${len} 字）`)
          this.scrollChat()
        }
      }

      try {
        // wbWellId 必须带上：「（1）分段射孔方案」「（2）计算煤岩破碎指数」两张表
        // 优先读射孔方案页保存过的结构化表（COMM_WB_POR_*），
        // 用户在那边调完点保存，这里生成出来的就是调完的值。
        // perforationMethod 决定用哪一套制式（射孔方式 / 射孔方向两列 + 部分制式文案）。
        const data = await generateByAgentStreamApi(file, this.wellName, {
          onEvent,
          onDone: () => { /* 结果在 return 里拿，这里不用处理 */ }
        }, this.preTestVariant, this.wbWellId, this.perforationMethod)
        this.thinking = ''
        if (!data) throw new Error('智能体未返回结果')

        this.result = data
        // 结果兜底：即便 SSE 中途有事件丢失，也用最终列表把树与字段回显补齐，
        // 保证「页面看到的」与「实际生成的」一致。
        this.ingestFinalResult(data)

        // 骨架解析结果
        outlineStep.status = 'done'
        outlineStep.desc = '骨架解析完成'
        outlineStep.detail = [
          `源文档块：${data.sourceBlocks || 0}`,
          `表格：${data.sourceTables || 0} 张`,
          `图片：${data.sourceImages || 0} 张`
        ]
        // 收尾：把实时卡片定稿成「结果卡片」
        if (fieldMsg) {
          const fields = data.fieldReport || []
          const found = fields.filter(f => f.found).length
          fieldMsg.html = `字段抽取完成：共 <b>${fields.length}</b> 个字段，命中 <b>${found}</b> 个。` +
            '下面按字段列出数据来源与取值：'
          fieldMsg.card.stat = `${found}/${fields.length}`
          fieldMsg.card.rows = fields.slice(0, 10).map(f => ({
            ok: !!f.found,
            label: f.label || f.key,
            value: f.found ? this.truncate(f.value, 40) : '未找到',
            src: f.locate || f.rule || ''
          }))
          fieldMsg.card.more = Math.max(0, fields.length - 10)
        } else {
          const fields = data.fieldReport || []
          const found = fields.filter(f => f.found).length
          if (fields.length) {
            this.pushAgent(
              `字段抽取完成：共 <b>${fields.length}</b> 个字段，命中 <b>${found}</b> 个。` +
              '下面按字段列出数据来源与取值：',
              null,
              {
                title: '字段抽取结果',
                stat: `${found}/${fields.length}`,
                rows: fields.slice(0, 10).map(f => ({
                  ok: !!f.found,
                  label: f.label || f.key,
                  value: f.found ? this.truncate(f.value, 40) : '未找到',
                  src: f.locate || f.rule || ''
                })),
                more: Math.max(0, fields.length - 10)
              }
            )
          }
        }

        // 章节填充结果
        const secs = data.sectionReport || []
        // 一级章节自身 length=0 是正常的（内容都在子节点里），
        // 这里把子孙章节的字数汇总上来，避免卡片上显示「0 字」被误读为未生成。
        const secLen = s => {
          const own = Number(s.length || s.charCount || 0)
          if (own > 0) return own
          const kids = secs.filter(o => o.key && s.key && o.key.startsWith(s.key + '-'))
          return kids.reduce((a, o) => a + Number(o.length || 0), 0)
        }
        const secOk = secs.filter(s => secLen(s) > 0).length
        extractStep.status = 'done'
        const fieldList = data.fieldReport || []
        const fieldFound = fieldList.filter(f => f.found).length
        extractStep.desc = `命中 ${fieldFound}/${fieldList.length} 个字段`
        if (!extractStep.detail || !extractStep.detail.length) {
          extractStep.detail = fieldList.slice(0, 6).map(f =>
            `${f.label || f.key}：${f.found ? (f.value || '已取到') : '未找到'}`)
        }
        renderStep.status = 'done'
        renderStep.desc = `已渲染 ${secs.length} 个章节`
        if (sectionMsg) {
          sectionMsg.html = `正文渲染完成：按内置模板骨架输出 <b>${secs.length}</b> 个章节节点，` +
            `其中 <b>${secOk}</b> 个填充了内容。`
          sectionMsg.card.stat = `${secOk}/${secs.length}`
          sectionMsg.card.rows = secs.slice(0, 10).map(s => ({
            ok: secLen(s) > 0,
            label: (s.no ? s.no + '、' : '') + (s.title || s.key),
            value: `${secLen(s)} 字`,
            src: this.genLabel(s.generation)
          }))
          sectionMsg.card.more = Math.max(0, secs.length - 10)
        } else if (secs.length) {
          renderStep.detail = secs.slice(0, 8).map(s =>
            `${s.no ? s.no + '、' : ''}${s.title || s.key}：${secLen(s)} 字`)
          this.pushAgent(
            `正文渲染完成：按内置模板骨架输出 <b>${secs.length}</b> 个章节节点，其中 <b>${secOk}</b> 个填充了内容。`,
            null,
            {
              title: '章节填充情况',
              stat: `${secOk}/${secs.length}`,
              rows: secs.slice(0, 10).map(s => ({
                ok: secLen(s) > 0,
                label: (s.no ? s.no + '、' : '') + (s.title || s.key),
                value: `${secLen(s)} 字`,
                src: this.genLabel(s.generation)
              })),
              more: Math.max(0, secs.length - 10)
            }
          )
        }

        // 写入编辑器
        const doneStep = this.stepByKey('done')
        doneStep.status = 'done'
        doneStep.desc = '已准备好正文，可进入编辑'
        doneStep.detail = [
          `正文长度：${data.bodyLength || 0} 字符`,
          `耗时：${((data.costMs || 0) / 1000).toFixed(1)} s`
        ]

        // 🔴 交接失败 ≠ 生成失败。
        //    正文已经拿到了，只是「放到编辑器」这一步可能因为浏览器配额不够失败。
        //    以前它和生成逻辑共用一个 try，抛个 QuotaExceededError 就把整步打成
        //    「执行失败」，用户会以为文档根本没生成 —— 这是本 bug 最误导的地方。
        let handoffError = null
        try {
          this.saveEditorPayload()
        } catch (e) {
          handoffError = e
          console.warn('[fracturing-agent] 交接编辑器失败（文档本身已生成）', e)
        }

        this.finished = true
        if (handoffError) {
          doneStep.status = 'warning'
          doneStep.desc = '正文已生成，但暂存到编辑器失败'
          this.pushAgent(
            '<b>正文已生成成功</b>，但保存到编辑器时遇到浏览器缓存空间不足：' +
            this.escapeHtml(handoffError.message || '未知错误') +
            '。请关闭部分标签页后重新生成，或直接使用下方「导出 Word」下载成果。'
          )
        } else {
          this.pushAgent(
            '全部完成。正文已按模板骨架排好章节顺序、字体与表格，' +
            '<b>封面、目录、页眉页脚会在导出 Word 时由后端补全</b>。' +
            '点击右下角「进入文档编辑」查看与修改，或在下方输入「进入编辑」直接跳转。'
          )
        }
      } catch (e) {
        this.thinking = ''
        const cur = this.steps.find(s => s.status === 'running')
        if (cur) { cur.status = 'error'; cur.desc = e.message || '执行失败' }
        this.pushAgent('执行失败：' + this.escapeHtml(e.message || '未知错误'))
      } finally {
        this.running = false
      }
    },

    /* ============================================================
     *  章节节点树（完整流程可视化）
     * ============================================================ */

    /**
     * 页面加载时用 `/info` 预铺章节骨架。
     *
     * <p>为什么不等 SSE：`init` / `outline-sections` 事件要等用户点「开始执行」
     * 且源文档下载成功之后才会来。若源文档缺失（文档中心不可达、附件没上传），
     * 树就一直是空的 —— 用户看不到「完整流程」，只看到一个空面板，
     * 分不清是「流程还没开始」还是「页面坏了」。
     *
     * <p>`/info` 的 `sections` 是扁平列表（带 level / generation / fields），
     * `sectionTree` 是嵌套树但不带 fields。这里用扁平列表 + 按 level 栈算 parentKey，
     * 与后端 `outline-sections` 事件的口径一致，后续事件进来能直接合并。
     */
    async preloadSectionTree() {
      try {
        const res = await getAgentInfoApi()
        const data = (res && res.sections) ? res : ((res && res.data) || {})
        const sections = data.sections || []
        if (!sections.length) return
        // 按 level 维护祖先栈，算父节点 key（与后端 outline-sections 的算法一致）
        const stack = []
        const nodes = sections.map((s, i) => {
          const level = Number(s.level || 1)
          while (stack.length >= level) stack.pop()
          const parentKey = stack.length ? stack[stack.length - 1] : ''
          stack.push(s.key)
          return {
            key: s.key,
            index: i,
            no: s.no || '',
            title: s.title || s.key,
            level,
            generation: s.generation || '',
            parentKey,
            fields: s.fields || [],
            status: 'pending',
            length: 0
          }
        })
        this.treeNodes = nodes
        this.sectionTotal = nodes.length
      } catch (e) {
        // 预铺失败不影响主流程：SSE 的 init/outline-sections 还会再来一次
        console.warn('预加载章节骨架失败：', e && e.message)
      }
    },

    /**
     * 把后端给的节点列表并进 treeNodes。
     *
     * <p>合并而不是覆盖：`init` 与 `outline-sections` 会各发一次全量树，
     * 而两次之间可能已经收到 `section` 事件（极快的小文档），
     * 直接覆盖会把已经拿到的 status/length 抹回 pending。
     * 层级用 parentKey 现算，前端不再猜。
     */
    ingestSectionTree(list) {
      const old = {}
      this.treeNodes.forEach(n => { if (n.key) old[n.key] = n })
      const nodes = (list || []).map((raw, i) => {
        const key = raw.key || ('node-' + i)
        const prev = old[key] || {}
        return {
          key,
          index: raw.index == null ? i : raw.index,
          no: raw.no || prev.no || '',
          title: raw.title || prev.title || key,
          level: raw.level || prev.level || 1,
          generation: raw.generation || prev.generation || '',
          parentKey: raw.parentKey == null ? (prev.parentKey || '') : raw.parentKey,
          fields: (raw.fields && raw.fields.length) ? raw.fields : (prev.fields || []),
          // 状态只增不减：已经从 pending 前进过的节点不要被打回
          status: prev.status && prev.status !== 'pending' ? prev.status : 'pending',
          length: prev.length || 0,
          children: []
        }
      })
      // parentKey → children（右侧「下级节点」用）
      const idx = {}
      nodes.forEach(n => { idx[n.key] = n })
      nodes.forEach(n => {
        if (n.parentKey && idx[n.parentKey]) idx[n.parentKey].children.push(n)
      })
      this.treeNodes = nodes
    },

    /**
     * 用最终结果兜底补齐节点状态与字段回显。
     *
     * <p>`sectionReport` 里带的 status 是后端最终判定的（rendered / placeholder /
     * container / user / empty），比 SSE 过程态更可信；`fieldReport` 是定稿值。
     * 两份都用来覆盖一遍，避免「事件丢了 → 页面永远停在提取中」。
     */
    ingestFinalResult(data) {
      if (!data) return
      const secs = data.sectionReport || []
      const byKey = {}
      secs.forEach(s => { if (s && s.key) byKey[s.key] = s })
      this.treeNodes = this.treeNodes.map(n => {
        const s = byKey[n.key]
        if (!s) {
          // 结果里没这个节点：说明后端没渲染到（不应该发生），置空而不是假装成功
          return Object.assign({}, n, { status: n.status === 'running' ? 'empty' : n.status })
        }
        return Object.assign({}, n, {
          status: s.status || 'rendered',
          length: Number(s.length || n.length || 0),
          no: n.no || s.no || '',
          title: n.title || s.title || '',
          fields: (s.fields && s.fields.length) ? s.fields.map(f => f.key) : n.fields
        })
      })

      const fields = data.fieldReport || []
      const map = Object.assign({}, this.liveFields)
      fields.forEach(f => {
        if (!f || !f.key) return
        map[f.key] = {
          key: f.key,
          label: f.label || f.key,
          type: f.type || (map[f.key] || {}).type || '',
          found: !!f.found,
          value: f.value == null ? '' : String(f.value),
          locate: f.locate || '',
          rule: f.rule || '',
          confidence: f.confidence || (map[f.key] || {}).confidence || ''
        }
      })
      this.liveFields = map
    },

    /** 按 key 取节点 */
    nodeByKey(key) {
      if (!key) return null
      return this.treeNodes.find(n => n.key === key) || null
    },

    /** 某节点已命中的字段数（读 liveFields，实时） */
    nodeFoundCount(n) {
      if (!n || !n.fields || !n.fields.length) return 0
      const idx = this.liveIndex
      return n.fields.filter(k => idx[k] && idx[k].found).length
    },

    /** 取字段实时回显（只读 liveIndex，保证同一口径） */
    fieldOf(key) {
      return this.liveIndex[key] || {
        key, label: key, found: false, value: '', locate: '', rule: '', confidence: ''
      }
    },

    /** 点击树节点：右栏切到该节点详情 */
    selectNode(n) {
      if (!n) return
      this.activeNodeKey = n.key
    },

    /** 节点状态图标 */
    nodeIcon(n) {
      const s = n.status
      if (s === 'running') return 'el-icon-loading'
      if (s === 'done' || s === 'rendered') return 'el-icon-circle-check'
      if (s === 'placeholder') return 'el-icon-edit-outline'
      if (s === 'user') return 'el-icon-upload2'
      if (s === 'container') return 'el-icon-folder'
      if (s === 'empty') return 'el-icon-remove-outline'
      return 'el-icon-time'
    },

    /** 节点状态中文 */
    statusLabel(s) {
      const map = {
        pending: '待处理',
        running: '提取中',
        rendered: '已生成',
        done: '已生成',
        placeholder: '待人工补充',
        user: '待上传',
        container: '仅容器',
        empty: '空'
      }
      return map[s] || (s || '')
    },

    /** 节点状态 → el-tag type */
    statusTag(s) {
      if (s === 'rendered' || s === 'done') return 'success'
      if (s === 'running') return 'primary'
      if (s === 'placeholder' || s === 'user') return 'warning'
      if (s === 'empty') return 'danger'
      return 'info'
    },

    /** 从工作台井号详情里取射孔方式（用于 created 时的初值定档） */
    resolveWellPerforationMethod() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (!raw) return ''
        const o = JSON.parse(raw) || {}
        const id = o.wbWellId || ''
        if (this.wbWellId && id && id !== this.wbWellId) return ''
        return String(o.perforationMethod || '').trim()
      } catch (e) {
        return ''
      }
    },

    saveEditorPayload() {
      const data = this.result
      if (!data) return
      const payload = {
        isAgentGenerated: true,
        wellName: data.wellName || this.wellName,
        // 文件名与后端 /agent/fracturing/export 保持一致：井号 + 井压裂工程设计
        fileName: ((this.docBaseName(data) || '压裂工程设计') + '.docx'),
        bodyHtml: data.bodyHtml || '',
        fieldReport: data.fieldReport || [],
        sectionReport: data.sectionReport || [],
        warnings: data.warnings || [],
        coverIcon: data.coverIcon || '',
        coverIconContentType: data.coverIconContentType || '',
        coverIconWidthCm: data.coverIconWidthCm,
        coverIconHeightCm: data.coverIconHeightCm,
        // 文档类型（射孔方式）：编辑器 / 导出处按它取制式，不传会回落默认全程固井
        perforationMethod: data.perforationMethod || this.perforationMethod,
        templateLabel: data.templateLabel || '',
        wbWellId: this.wbWellId
      }
      // 🔴 绝不能把整篇正文 + 说明数组 JSON 塞进 sessionStorage：
      //    配额约 5MB，完整压裂设计正文直接撑爆 → QuotaExceededError，
      //    被 runGenerate 外层 catch 转成「执行失败：...exceeded the quota」，
      //    用户以为文档没生成。大对象改走内存单例，sessionStorage 只存 token。
      handoffAgentDocument(payload)

      /*
       * 这一个是轻量元信息（几十字节），继续走 sessionStorage 无妨。
       *
       * 🔴 2026-11-16 修（「进入压裂智能体后返回提示井不存在」）：
       *    这里原来只写 wbWellId / wellName / perforationMethod 三个字段，
       *    **没有 wellId** —— 等于把上游 goAgent() 刚写好的「井库 ID」擦掉了。
       *    之后无论走哪条返回路径，都会拿不到井库 ID：
       *      · 智能体页 goBack() → resolveWellId() 读到 undefined → 退化成
       *        local~<wbWellId>，井库信息（地层、井深、邻井）全丢；
       *      · 编辑器 goBack() → resolveWbWellId() 命中，但 wellId 空 →
       *        被 goEditor() 传进来的 query.wellId（**井名**）顶替 →
       *        路由 params.wellId 变成「安13-7-3平3」→ 单井页请求
       *        /v1/wells/安13-7-3平3 → 后端 code -1「井不存在」。
       *
       *    所以必须把 wellId 一起带上；取不到就沿用存储里的旧值，
       *    绝不用空串覆盖（同 syncSelectedWell 的口径）。
       */
      sessionStorage.setItem('wbSelectedWell', JSON.stringify({
        wbWellId: this.wbWellId,
        wellId: this.resolveWellId(),
        wellName: payload.wellName,
        perforationMethod: payload.perforationMethod
      }))
    },

    /**
     * 生成文档基名（不含扩展名）：`井号 + 井压裂工程设计`。
     * 井号形如「郑58-5B-3平1」时得到「郑58-5B-3平1井压裂工程设计」，
     * 与后端 FracturingAgentController 的命名规则完全一致，避免「编辑器里看到的
     * 文件名」和「导出下载到的文件名」差一个「井」字。
     * 井号本身已带「井」或以「压裂工程设计」结尾时不再重复追加。
     */
    docBaseName(data) {
      let w = String((data && data.wellName) || this.wellName || '').trim()
      w = w.replace(/\.docx$/i, '')
      // 兜底剥离可能混入的后缀（如「…压裂工程设计文档」「…压裂地质设计」）
      w = w.replace(/压裂工程设计文档$/, '').replace(/压裂地质设计$/, '').replace(/压裂工程设计$/, '')
      if (!w) return '压裂工程设计'
      if (/井$/.test(w)) return w + '压裂工程设计'
      return w + '井压裂工程设计'
    },

    /* ---------------- 对话 ---------------- */
    sendInput() {
      const t = (this.input || '').trim()
      if (!t) return
      this.input = ''
      this.pushUser(this.escapeHtml(t))
      if (/进入编辑|打开编辑/.test(t) && this.finished) {
        this.goEditor()
        return
      }
      if (/重新|重来|再执行/.test(t)) {
        this.runAgent()
        return
      }
      if (/继续/.test(t)) {
        if (this.finished) this.goEditor()
        else this.runAgent()
        return
      }
      this.pushAgent('我目前只执行「读取地质设计 → 抽取字段 → 按内置模板渲染正文」这一条链路。' +
        '可以发送「继续」「重新执行」，或点击右上角按钮。')
    },
    pushAgent(html, thinking, card) {
      this.messages.push({ role: 'agent', html, thinking, card, time: this.now() })
      this.trimMessages()
      this.scrollChat()
    },
    pushUser(html) {
      this.messages.push({ role: 'user', html, time: this.now() })
      this.trimMessages()
      this.scrollChat()
    },
    /**
     * 对话区消息封顶，只保留最近 MAX_MESSAGES 条。
     *
     * <p><b>为什么必须封顶</b>：右侧两栏（章节树 41 节点 + 节点详情）已经承担了
     * 「过程可视化」的职责，中间对话区只是给一句结论。但每渲染一个章节就
     * `pushAgent` 一条，41 个节点 + 22 个字段事件下来，DOM 会堆到 1300+ 字符内容
     * 的十几张卡片。实测（2026-11-09 e2e）：执行到最后时 `.fa-chat__scroll` 的
     * `chatLen` 从 1144 掉到 871 —— 不是被裁剪，而是中间那张卡片被 Vue 复用了
     * 不同高度，滚动位置算错，用户会看到对话区「跳一下然后少了一段」。
     *
     * <p>封顶到 60 条：足够回看最近几十步，又不会让渲染和滚动计算失控。
     * 只裁头部、不动尾部 —— 尾部是用户最关心的最新结论。
     */
    trimMessages() {
      const MAX_MESSAGES = 60
      if (this.messages.length > MAX_MESSAGES) {
        this.messages.splice(0, this.messages.length - MAX_MESSAGES)
      }
    },
    scrollChat() {
      this.$nextTick(() => {
        const el = this.$refs.chatScroll
        if (el) el.scrollTop = el.scrollHeight
      })
    },
    /**
     * 把左树滚到指定节点，并保证它在视口里「留一点上下余量」。
     *
     * <p>用 scrollTop 手算而不是 scrollIntoView：后者会连带滚动所有可滚祖先，
     * 把中间对话区和整页一起滚走 —— 用户正在看对话，树一动页面也跟着跳，
     * 相当于用一次「炫技」换来整页跳动。
     *
     * @param {string} key 节点 key
     */
    scrollTreeTo(key) {
      this.$nextTick(() => {
        const list = this.$refs.treeList
        if (!list || !key) return
        const el = list.querySelector(`[data-key="${key}"]`)
        if (!el) return
        const lr = list.getBoundingClientRect()
        const er = el.getBoundingClientRect()
        // 已在视口内（留 24px 余量）就不动，避免每来一个事件都微调、画面发飘
        const pad = 24
        if (er.top >= lr.top + pad && er.bottom <= lr.bottom - pad) return
        // 让目标行落在视口垂直中线附近，比贴顶更易读（能看到上下相邻节点）
        const offset = er.top - lr.top + list.scrollTop - (list.clientHeight - er.height) / 2
        list.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
      })
    },
    now() {
      const d = new Date()
      const p = n => (n < 10 ? '0' + n : '' + n)
      return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    },
    stepByKey(k) {
      return this.steps.find(s => s.key === k)
    },
    /** 章节生成策略的中文标签（键名与后端 sectionReport.generation 对齐） */
    genLabel(g) {
      const map = {
        FIELDS: '字段填充',
        FIELD_TEXT: '字段成段',
        FIELD_TABLE: '字段成表',
        PUMP_PROGRAM: '泵注程序',
        TEMPLATE_TEXT: '模板文案',
        SOURCE_FIGURE: '源文档附图',
        FIGURES: '附图清单',
        USER_UPLOAD: '待上传',
        STANDARDS: '标准规程',
        FLUID_STANDARD: '压裂液指标',
        PENDING_DEV: '待开发填充',
        MIXED: '混合（子章节）',
        LLM: 'AI 生成',
        SOURCE: '源文档搬运',
        TABLE: '表格生成',
        IMAGE: '图片',
        PLACEHOLDER: '待人工补充',
        BOILERPLATE: '模板固定文案',
        CALC: '计算推导'
      }
      return map[g] || (g || '')
    },

    /* ---------------- 跳转 ---------------- */
    /**
     * 进入编辑器继续编辑。
     *
     * <p>⚠️ <b>{@code query.wellId} 里必须是井库 ID，绝不能是井名</b>。
     * 旧版写的是 {@code wellId: this.wellName}，而编辑器 {@code created()} 里
     * {@code this.wellId = params.wellId}，随后 {@code resolveWbWellId()} 的
     * 第三级兜底 {@code return this.wellId} 会把它当成「工作台井号」用，
     * 返回工作台时又变成路由 {@code params.wellId} → 单井页拿井名去查井库
     * → 后端返回「井不存在」。</p>
     *
     * <p>井名本来就不该走 wellId 这个参数：编辑器自己会从
     * {@code handoffAgentDocument} 的 payload 与 sessionStorage 里拿到井名。</p>
     */
    goEditor() {
      if (!this.finished) {
        this.$message.warning('请先完成智能体执行')
        return
      }
      this.$router.push({
        name: 'ReportEditor',
        query: {
          wellId: this.resolveWellId(),
          wbWellId: this.wbWellId,
          wellName: this.wellName,
          agent: 1
        }
      })
    },
    /**
     * 返回单井工作台。
     * 注意：params.wellId 是「井库 ID」，query.wbWellId 才是「工作台井号 ID」，
     * 二者不是同一个值。把 wbWellId 当 wellId 传会让单井页去查井库并报「井不存在」。
     * 井号未关联井库时（wellId 为空），用 local~<wbWellId> 打头的离线 ID，
     * 与 index.vue 的 openWell 保持一致。
     */
    goBack() {
      if (!this.wbWellId) {
        this.$router.push({ name: 'Workbench' })
        return
      }
      const wellId = this.resolveWellId()
      this.$router.push({
        name: 'WellWorkbench',
        params: { wellId: wellId || `local~${this.wbWellId}` },
        query: { wbWellId: this.wbWellId }
      })
    },

    /* ---------------- 提取逻辑说明 ---------------- */

    /**
     * 打开「查看提取逻辑」弹窗。
     *
     * 两份数据各司其职：
     *   - 左半部分（字段/类型/来源/逻辑/定位/筛选/公式）：来自后端
     *     `fracturing-extract-logic.json`，是**模板视角的「应该怎么抽」**，
     *     由模板批注（21 条「模板提示词」）与章节小标题归纳而来，与是否执行无关；
     *   - 右半部分「本次实测」：来自本次 /extract 的 fieldReport，是**本井视角的
     *     「实际抽到没有」**，用于对照哪条逻辑没命中。
     * 二者按 key 对齐（logic 的 key 与 spec 字段 key 一一对应）。
     */
    async openLogicDialog() {
      this.logicVisible = true
      if (this.logicGroups.length) return   // 已加载过，不重复请求
      this.logicLoading = true
      this.logicError = ''
      try {
        const res = await getExtractLogicApi()
        // 拦截器可能已剥外层，也可能返回 { code, data }
        const data = (res && res.groups) ? res : (res && res.data ? res.data : res)
        this.logicGroups = (data && data.groups) || []
        if (!this.logicGroups.length) {
          const w = (data && data.warnings) || []
          this.logicError = w.length ? w.join('；') : ''
        }
      } catch (e) {
        this.logicError = e.message || String(e)
      } finally {
        this.logicLoading = false
      }
    },

    /**
     * 按字段 key 找本次实测结果（未执行过返回 null）。
     * @deprecated 模板已改用 computed 的 {@link liveIndex}，保留仅为兼容旧调用。
     */
    liveOf(key) {
      return this.liveIndex[key] || null
    },

    /** 某分组内已命中的条数 */
    groupFound(g) {
      const idx = this.liveIndex
      return (g.items || []).filter(it => idx[it.key] && idx[it.key].found).length
    },

    /** 字段类型 → el-tag type */
    typeTag(t) {
      if (t === '表格') return 'warning'
      if (t === '图片') return 'success'
      if (t === '数值') return ''
      return 'info'
    },

    /**
     * 从 sessionStorage 里读当前井号的井库 ID（工作台跳转时写入）。
     *
     * <p>两道校验缺一不可：</p>
     * <ol>
     *   <li><b>必须同一口井</b>：{@code o.wbWellId === this.wbWellId}，防止切井串数据。</li>
     *   <li><b>值不能是井名</b>：这是「返回工作台提示井不存在」的直接原因。
     *       历史版本 {@code goEditor()} 曾把 {@code wellId: this.wellName} 传给编辑器，
     *       编辑器再写回存储，于是 {@code wellId} 里躺的是「安13-7-3平3」而不是
     *       {@code HB00022534}。直接返回它 → 单井页请求
     *       {@code /v1/wells/安13-7-3平3} → 后端 code -1「井不存在」。
     *       井库 ID 是字母数字编码，含中文/「平」「井」等字的一律不是，直接丢弃。</li>
     * </ol>
     *
     * <p>丢弃后返回空串，调用方会退化成 {@code local~<wbWellId>} 离线井 ——
     * 宁可少一点井库信息，也不要跳到一个必然报错的页面。</p>
     */
    resolveWellId() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (raw) {
          const o = JSON.parse(raw)
          if (o && o.wbWellId === this.wbWellId && o.wellId) {
            const id = String(o.wellId).trim()
            if (id && !isWellNameLike(id)) return id
          }
        }
      } catch (e) {
        // 忽略解析失败
      }
      return ''
    },

    /*
     * 读取 sessionStorage 里「任意形态」的井库 ID 原始值（不做井名校验）。
     *
     * 只给 syncSelectedWell 回写时用：它的语义是「存储里原本躺着什么」，
     * 而不是「什么能用」。若在这里也过滤掉井名，回写时就会用空串去覆盖 ——
     * 但空串写进去等于**保留了脏值还是脏的**（见下方 syncSelectedWell 注释），
     * 反而不如显式写回原始值、让下游的 isWellNameLike 统一兜住。
     */
    rawStoredWellId() {
      try {
        const raw = sessionStorage.getItem('wbSelectedWell')
        if (!raw) return ''
        const o = JSON.parse(raw)
        if (o && o.wbWellId === this.wbWellId && o.wellId) return String(o.wellId).trim()
      } catch (e) { /* ignore */ }
      return ''
    },

    /**
     * 把当前选中的井号同步到 Vuex + sessionStorage。
     * 返回单井工作台时，离线模式用 store 里的 wellName 做标题兜底，
     * 井库 ID 也从 wbSelectedWell 里取，因此两处都要写。
     *
     * <p>⚠️ <b>井名不允许被空串覆盖</b>：本页打开时 {@code wellName} 可能还是空
     * （从 {@code #/workbench/agent} 直接刷新、或上游 goAgent 没带过来），
     * 若照直写 {@code this.wellName || ''} 就把「井名」这一格抹平了 ——
     * 返回单井工作台时离线分支拿不到井名，标题退化成「未命名井」。
     * 所以这里取「当前值 → sessionStorage 旧值」兜底，两者都空才写空。</p>
     *
     * <p>⚠️ <b>wellId 同理，且必须写「原始值」而不是「校验后的值」</b>：
     * 若这里写 {@code resolveWellId()}（已过滤井名），存储里原本是井名的脏值
     * 会被替换成空串；下次再读仍是空 → 看起来「洗掉了」，但 Vuex 里的
     * {@code selectedWell.wellId} 也被写成空，串井校验
     * {@code cachedWellId === realWellId} 从此恒不成立，缓存井名全部失效。
     * 写回原始值可以让脏值保持可见，由 {@code resolveWellId()} 在**使用点**
     * 统一过滤 —— 校验集中在一处，不散落在写入侧。</p>
     */
    syncSelectedWell() {
      if (!this.wbWellId) return
      const wellId = this.resolveWellId()
      const rawId = wellId || this.rawStoredWellId()
      const name = String(this.wellName || this.cachedWellName() || '').trim()
      this.$store.commit('well/SET_SELECTED_WELL', {
        wellId,
        wellName: name,
        block: '',
        wellType: ''
      })
      try {
        sessionStorage.setItem('wbSelectedWell', JSON.stringify({
          wbWellId: this.wbWellId,
          wellId: rawId,
          wellName: name,
          userId: ''
        }))
      } catch (e) {
        // 忽略存储失败
      }
    },

    /** sessionStorage 里上一次记下的井名（按 wbWellId 比对，避免串井） */
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

    /* ---------------- 工具 ---------------- */
    escapeHtml(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    },
    truncate(s, n) {
      const t = String(s == null ? '' : s)
      return t.length > n ? t.slice(0, n) + '…' : t
    }
  }
}

/**
 * 判断一个字符串「像井名」而不是「井库 ID」。
 *
 * <p>为什么需要它：井名的形态是「安13-7-3平3」「郑58-5B-3平1」，
 * 井库 ID 是「HB00022534」这种纯字母数字编码。历史上确实出现过
 * 把井名写进 {@code wellId} 字段的情况，一旦被当成 ID 去查
 * {@code /v1/wells/{id}}，后端必定返回「井不存在」。</p>
 *
 * <p>判定口径刻意宽松（宁可误判成井名，也不要误判成 ID）：
 * 井库 ID 不会含中文、不会含「井」结尾、也不会带空格。
 * 误判成井名的代价只是退化成本地井（local~ 前缀），
 * 而误判成 ID 的代价是跳到一个必然报错的页面。</p>
 *
 * @param {String} s 待判定的值
 * @returns {Boolean} true = 看起来是井名，不能当井库 ID 用
 */
function isWellNameLike(s) {
  const v = String(s == null ? '' : s).trim()
  if (!v) return true
  // 含中文（含全角符号）→ 井名
  if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(v)) return true
  // 「井」结尾 → 井名（井库 ID 不会以井字收尾）
  if (/井$/.test(v)) return true
  // 含空格 → 不是 ID
  if (/\s/.test(v)) return true
  return false
}
</script>

<style lang="scss" scoped>
.fa-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  /*
   * 整页不滚，只让「主体三栏」内部滚。
   *
   * 上方 hero + 两张参数卡片是固定高度（合计约 300px），主体三栏吃掉剩下的。
   * 一屏 1000px 时 body 只剩 541px，而左树要装 41 个节点（内容高 1109px）——
   * 这时树列表自己滚才是对的：它滚动时表头和进度条不动，用户始终知道自己站在
   * 流程的哪个位置。若改成整页滚，表头会跟着滚出视口，「完整流程」的骨架感就没了。
   */
  overflow: hidden;
}

/*
 * 屏幕较矮时（笔记本 1366×768、或开了浏览器书签栏），
 * 上方固定块 + 三栏会互相挤压，左侧节点树会缩到几乎不可用。
 * 这里给主体一个下限，并用负 margin + padding 让它在极窄高度下也能滚，
 * 而不是把 41 个节点压成 5 行。
 */
@media (max-height: 820px) {
  .fa-page { gap: 8px; padding: 10px 12px; }
  .fa-body { min-height: 360px; }
}

/* ---------- 顶部 ---------- */
.fa-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  background: linear-gradient(135deg, #eef4ff 0%, #f7faff 100%);
  border: 1px solid #dbe6f7;
  flex: none;

  &__left { display: flex; align-items: center; gap: 14px; }
  &__icon {
    width: 44px; height: 44px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: #3D5FEF; color: #fff; font-size: 22px;
  }
  &__title { font-size: 16px; font-weight: 600; color: #1f2d3d; display: flex; align-items: center; gap: 8px; }
  &__meta {
    margin-top: 4px;
    font-size: 12px;
    color: #7a8699;
    display: flex;
    gap: 16px;
    align-items: center;
    b { color: #1f2d3d; font-weight: 600; }
  }
  /*
   * 「（取自工作台井号）」这类来源备注。
   * 必须比主值淡一档 —— 否则和射孔方式的值同等醒目，
   * 用户会以为这里也能点、也能改（现在这页就是不允许改）。
   */
  &__from { color: #a8b3c4; font-size: 11px; }
  &__actions { display: flex; gap: 8px; }
}

/*
 * ---------- 口径说明行（原「文档类型 / 压前测试」两张选项卡的替代） ----------
 *
 * 两张卡片下线后不再需要选择器样式，但「结构一致、差异在哪」这句话
 * 仍然要占一个可见位置 —— 否则用户换一口不同射孔方式的井生成，
 * 看到章节数一样会以为「射孔方式没生效」。
 * 所以保留为一行浅绿提示：有边框、无背景块，视觉权重低于主体三栏，
 * 不会被误认成需要交互的表单区。
 */
.fa-scope {
  flex: none;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #f4fbf5;
  border: 1px solid #c8e8cd;
  font-size: 12px;
  line-height: 1.7;
  color: #5d8a67;
  white-space: normal;
  word-break: break-word;

  i { flex: 0 0 auto; line-height: 1.7; color: #3f7a4c; }
  b { color: #35734a; }
}

/* ---------- 主体三栏 ---------- */
.fa-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 380px;
  /*
   * 必须显式声明行轨道，否则默认那一行是 `auto` —— 行高由内容撑，
   * `flex: 1` 只拉高了 grid 外框，内部三栏仍按各自内容取高，
   * 结果就是「左树列表只有 458px（41 个节点要滚 2.4 屏）、右栏底部一片空白」。
   * 写成 minmax(0, 1fr)：既吃满剩余高度，又允许栏内元素在缩小时正常出现滚动条
   * （纯 1fr 的 min-content 下限会顶住容器，把 overflow 挤成溢出而不是滚动）。
   */
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
}

/* ---------- 左：章节节点树 ---------- */
.fa-tree {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #e8ebf0;
  border-radius: 10px;
  overflow: hidden;

  &__head {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 12px 6px;
    font-size: 13px;
    font-weight: 600;
    color: #1f2d3d;
  }
  &__stat { font-size: 12px; color: #3D5FEF; font-weight: 500; }

  &__legend {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    padding: 0 12px 8px;
    font-size: 11px;
    color: #9aa4b2;
  }
  &__legend-item { display: inline-flex; align-items: center; gap: 3px; }

  &__bar {
    flex: none;
    height: 3px;
    background: #f0f2f5;
    margin: 0 12px 8px;
    border-radius: 2px;
    overflow: hidden;
  }
  &__bar-inner { height: 100%; background: #3D5FEF; transition: width .35s ease; }

  &__list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 6px 10px; }
  &__empty {
    padding: 24px 10px;
    text-align: center;
    font-size: 12px;
    color: #9aa4b2;
  }
}

.fa-node {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 6px;
  border-radius: 5px;
  font-size: 12px;
  color: #495060;
  cursor: pointer;
  line-height: 1.4;
  transition: background .15s;

  &:hover { background: #f5f8fd; }
  &--active { background: #eef1fe; color: #3D5FEF; font-weight: 600; }

  /* 层级缩进：三级分别 0 / 12 / 24px */
  &--l2 { padding-left: 18px; }
  &--l3 { padding-left: 32px; }
  &--l1 { font-weight: 600; }

  &__icon { flex: none; font-size: 12px; color: #c0c4cc; }
  /* 序号与标题之间必须有肉眼可见的空隙：
     模板里的序号有「一」「（1）」「十一」三种宽度，单字时只有 14px，
     靠 gap 的 5px 在 12px 字号下几乎看不出来（截图里像「一基本数据」连写）。
     这里给 min-width 撑到能容纳「十一」，再用 margin-right 兜底。 */
  &__no {
    flex: none;
    min-width: 22px;
    margin-right: 2px;
    color: #9aa4b2;
    font-size: 11px;
    white-space: nowrap;
  }
  &__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &__badge {
    flex: none;
    font-size: 10px;
    color: #8c96a4;
    background: #f2f4f8;
    border-radius: 8px;
    padding: 0 5px;
    line-height: 15px;
  }

  /* 状态着色 */
  &--running &__icon { color: #3D5FEF; }
  &--running { background: #eef1fe; color: #3D5FEF; }
  &--rendered &__icon,
  &--done &__icon { color: #52c41a; }
  &--placeholder &__icon { color: #faad14; }
  &--user &__icon { color: #fa8c16; }
  &--container &__icon { color: #b0b8c4; }
  &--empty &__icon { color: #f5222d; }
}

.fa-node-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
  background: #d9dde3;

  &--pending { background: #d9dde3; }
  &--running { background: #3D5FEF; }
  &--done, &--rendered { background: #52c41a; }
  &--placeholder { background: #faad14; }
  &--user { background: #fa8c16; }
  &--container { background: #c0c4cc; }
  &--empty { background: #f5222d; }
}

/* ---------- 右：当前节点详情 ---------- */
.fa-detail {
  flex: none;
  max-height: 46%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-top: 1px solid #eef1f6;
  background: #fafbfd;

  &__head {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px 6px;
    font-size: 12.5px;
    font-weight: 600;
    color: #1f2d3d;
  }
  &__empty {
    padding: 18px 12px;
    font-size: 12px;
    color: #9aa4b2;
    text-align: center;
    i { margin-right: 4px; }
  }
  &__body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 12px 12px; }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: #1f2d3d;
    line-height: 1.5;
    word-break: break-word;
  }
  &__no { color: #3D5FEF; margin-right: 6px; }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 4px;
    font-size: 11px;
    color: #9aa4b2;
  }

  &__subtitle {
    margin: 10px 0 6px;
    font-size: 11.5px;
    font-weight: 600;
    color: #606266;
  }

  &__nofield {
    margin-top: 10px;
    padding: 8px 10px;
    background: #f4f6fa;
    border-radius: 5px;
    font-size: 11.5px;
    line-height: 1.6;
    color: #8c96a4;
    i { margin-right: 4px; color: #b0b8c4; }
  }

  &__children { margin-top: 4px; }
  &__child {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 11.5px;
    color: #606266;
    cursor: pointer;
    i { color: #b0b8c4; }
    &:hover { background: #eef4ff; color: #3D5FEF; }
  }
  &__childno { flex: none; color: #9aa4b2; }
  &__childtitle {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.fa-field {
  padding: 7px 9px;
  margin-bottom: 6px;
  border-radius: 5px;
  background: #fff;
  border: 1px solid #eef1f6;
  border-left-width: 3px;

  &--ok { border-left-color: #52c41a; }
  &--no { border-left-color: #e4e8ef; }

  &__head {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 600;
    color: #495060;
  }
  &__label { flex: 1; min-width: 0; }
  &__value {
    margin-top: 4px;
    font-size: 11.5px;
    line-height: 1.55;
    color: #303133;
    word-break: break-word;
    max-height: 60px;
    overflow-y: auto;
  }
  &--no &__value { color: #c0c4cc; }
  &__src {
    margin-top: 3px;
    font-size: 11px;
    color: #9aa4b2;
    word-break: break-word;
  }
  &__rule {
    margin-top: 3px;
    font-size: 10.5px;
    color: #b0b8c4;
    line-height: 1.5;
    word-break: break-word;
  }
}

/* ---------- 对话 ---------- */
.fa-chat {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #e8ebf0;
  border-radius: 10px;
  overflow: hidden;

  &__scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; }
}

.fa-msg {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;

  &__avatar {
    flex: none;
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
  }
  &--agent &__avatar { background: #eef1fe; color: #3D5FEF; }
  &--user &__avatar { background: #f0f2f5; color: #606266; }
  &__main { min-width: 0; flex: 1; }
  &__head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  &__name { font-size: 12px; font-weight: 600; color: #495060; }
  &__time { font-size: 11px; color: #b3bac6; }
  &__bubble {
    display: inline-block;
    max-width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.7;
    color: #303133;
  }
  &--agent &__bubble { background: #f6f8fb; border: 1px solid #eef1f6; }
  &--user &__bubble { background: #3D5FEF; color: #fff; }
  &__text { word-break: break-word; }
  &__thinking { margin-top: 6px; font-size: 12px; color: #3D5FEF; }
}

.fa-card {
  margin-top: 8px;
  border: 1px solid #e8ebf0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  max-width: 720px;

  &__head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; background: #fafbfd; border-bottom: 1px solid #eef1f6;
    font-size: 12px; font-weight: 600; color: #495060;
  }
  &__stat { color: #3D5FEF; font-weight: 500; }
  &__body { max-height: 280px; overflow-y: auto; }
  &__row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 12px; font-size: 12px;
    border-bottom: 1px dashed #f2f4f8;
  }
  &__label { width: 150px; flex: none; color: #495060; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__value { flex: 1; min-width: 0; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__src { flex: none; max-width: 180px; color: #9aa4b2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__more { padding: 6px 12px; font-size: 12px; color: #9aa4b2; background: #fafbfd; }
}

.fa-dot {
  width: 6px; height: 6px; border-radius: 50%; flex: none;
  &--ok { background: #52c41a; }
  &--no { background: #d9dde3; }
}

.fa-composer {
  flex: none;
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #eef1f6;
  background: #fafbfd;
}

/* ---------- 步骤 ---------- */
.fa-steps {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid #e8ebf0;
  border-radius: 10px;
  overflow: hidden;

  &__head {
    flex: none;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px 8px;
    font-size: 13px; font-weight: 600; color: #1f2d3d;
  }
  &__progress { font-size: 12px; color: #3D5FEF; font-weight: 500; }
  &__bar { flex: none; height: 3px; background: #f0f2f5; margin: 0 14px 10px; border-radius: 2px; overflow: hidden; }
  &__bar-inner { height: 100%; background: #3D5FEF; transition: width .35s ease; }
  &__list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 14px 12px; }
  &__foot { flex: none; padding: 10px 14px; border-top: 1px solid #eef1f6; background: #fafbfd; text-align: right; }
}

.fa-step {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px dashed #f2f4f8;

  &:last-child { border-bottom: none; }

  &__icon {
    flex: none;
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    background: #f0f2f5; color: #9aa4b2;
  }
  &__main { min-width: 0; flex: 1; }
  &__title { font-size: 13px; color: #303133; font-weight: 500; }
  &__desc { margin-top: 2px; font-size: 12px; color: #9aa4b2; }
  &__detail { margin-top: 6px; }
  &__detail-line { font-size: 12px; color: #606266; line-height: 1.6; }

  &--running &__icon { background: #eef1fe; color: #3D5FEF; }
  &--running &__title { color: #3D5FEF; }
  &--done &__icon { background: #eafaf0; color: #52c41a; }
  &--error &__icon { background: #fff1f0; color: #f5222d; }
  &--error &__title { color: #f5222d; }
}

/* ============ 提取逻辑说明弹窗 ============ */
.fa-logic {
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 4px;

  &__intro {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
    margin-bottom: 14px;
    background: #f4f8ff;
    border: 1px solid #dbe7ff;
    border-radius: 6px;
    font-size: 12.5px;
    line-height: 1.7;
    color: #4a5568;

    i { color: #3D5FEF; margin-top: 3px; }
    b { color: #3D5FEF; }
  }

  &__err {
    padding: 10px 12px;
    margin-bottom: 12px;
    background: #fff1f0;
    border: 1px solid #ffccc7;
    border-radius: 6px;
    color: #cf1322;
    font-size: 12.5px;
  }

  &__group {
    margin-bottom: 18px;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    overflow: hidden;
  }

  &__group-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    background: #fafbfc;
    border-bottom: 1px solid #ebeef5;
  }
  &__group-title { font-size: 13.5px; font-weight: 600; color: #303133; }
  &__group-chapter { font-size: 12px; color: #9aa4b2; }
  &__group-stat { margin-left: auto; font-size: 12px; color: #8c96a4; }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    table-layout: fixed;

    th {
      padding: 7px 10px;
      text-align: left;
      font-weight: 600;
      color: #606266;
      background: #fcfcfd;
      border-bottom: 1px solid #ebeef5;
      white-space: nowrap;
    }
    td {
      padding: 9px 10px;
      vertical-align: top;
      border-bottom: 1px solid #f2f4f8;
      line-height: 1.65;
      color: #303133;
      word-break: break-word;
    }
    tr:last-child td { border-bottom: none; }
  }

  &__label { font-weight: 600; color: #303133; }
  &__key {
    margin-top: 2px;
    font-family: Consolas, Monaco, monospace;
    font-size: 11px;
    color: #b0b8c4;
  }
  &__origin { color: #303133; }
  &__ref {
    margin-top: 3px;
    font-size: 11px;
    color: #b07d2b;
    background: #fffbe6;
    border-radius: 3px;
    padding: 1px 4px;
    display: inline-block;
  }
  &__logic { color: #303133; }
  &__sub {
    margin-top: 3px;
    font-size: 11.5px;
    color: #7a8494;

    b { color: #606266; font-weight: 600; }
  }
  &__formula {
    margin-top: 2px;
    padding-left: 8px;
    border-left: 2px solid #e4e8ef;
    font-family: Consolas, Monaco, monospace;
    font-size: 11px;
    color: #55606f;
  }
  &__note {
    margin-top: 5px;
    padding: 4px 7px;
    background: #fff7e6;
    border-radius: 4px;
    font-size: 11.5px;
    color: #ad6800;
    line-height: 1.6;
  }

  &__live {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #303133;
  }
  &__live-val {
    margin-top: 4px;
    font-size: 11.5px;
    color: #55606f;
  }
  &__live-src {
    margin-top: 2px;
    font-size: 11px;
    color: #9aa4b2;
    line-height: 1.5;
  }
  &__live-none { font-size: 12px; color: #c0c4cc; }

  &__empty {
    padding: 30px;
    text-align: center;
    color: #9aa4b2;
    font-size: 13px;
  }
}

/* 弹窗挂到 body 下，scoped 的样式选不中，这里补一条非 scoped 的宽度兜底 */
::v-deep .fa-logic-dialog {
  max-width: 96vw;
}
</style>
