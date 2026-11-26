<template>
  <div class="kb-chat">
    <!-- 悬浮入口 -->
    <div
      v-show="!visible"
      class="kb-chat-fab"
      :title="'知识库智能问答'"
      @click="open"
    >
      <i class="el-icon-chat-dot-round"></i>
      <span class="fab-text">问知识库</span>
    </div>

    <!-- 对话面板 -->
    <transition name="kb-slide">
      <div v-show="visible" class="kb-chat-panel">
        <div class="kb-chat-header">
          <div class="kb-chat-title">
            <i class="el-icon-cpu"></i>
            <span>知识库智能问答</span>
            <el-tag v-if="allDatasets" size="mini" type="warning" effect="plain">全部知识库</el-tag>
            <el-tag v-else-if="datasetName" size="mini" type="success" effect="plain">{{ datasetName }}</el-tag>
          </div>
          <div class="kb-chat-actions">
            <el-tooltip :content="allDatasets ? '只查当前知识库' : '查询全部知识库'" placement="bottom">
              <i :class="allDatasets ? 'el-icon-connection' : 'el-icon-set-up'"
                 :style="{ color: allDatasets ? '#e6a23c' : '' }"
                 @click="toggleScope"></i>
            </el-tooltip>
            <el-tooltip content="清空对话" placement="bottom">
              <i class="el-icon-delete" @click="clearChat"></i>
            </el-tooltip>
            <i class="el-icon-close" @click="close"></i>
          </div>
        </div>

        <div ref="scroller" class="kb-chat-body">
          <!-- 欢迎语 + 示例问题 -->
          <div v-if="messages.length === 0" class="kb-chat-welcome">
            <div class="welcome-icon"><i class="el-icon-chat-line-square"></i></div>
            <p class="welcome-title">{{ allDatasets ? '知识库智能问答助手' : (datasetName || '知识库') + ' 问答助手' }}</p>
            <p class="welcome-desc">
              <template v-if="allDatasets">
                正在检索<strong>全部 {{ datasetCount }} 个知识库</strong>，跨盆地/专题一起找答案，答案会标注来源片段。
              </template>
              <template v-else>
                基于「{{ datasetName || '当前知识库' }}」中的 {{ docTotal }} 份文档回答你的问题，
                答案会标注来源片段，方便回原文核对。
              </template>
            </p>
            <div class="scope-switch">
              <el-radio-group v-model="allDatasets" size="mini" @change="toggleScopeAndReload">
                <el-radio-button :label="false">当前知识库</el-radio-button>
                <el-radio-button :label="true">全部知识库</el-radio-button>
              </el-radio-group>
            </div>
            <div class="samples" v-loading="samplesLoading">
              <div
                v-for="(s, i) in samples"
                :key="i"
                class="sample-item"
                @click="askSample(s)"
              >
                {{ s }}
              </div>
            </div>
          </div>

          <!-- 消息列表 -->
          <div v-for="(m, idx) in messages" :key="idx" :class="['msg-row', m.role]">
            <div v-if="m.role === 'assistant'" class="msg-avatar bot">
              <i class="el-icon-cpu"></i>
            </div>
            <div class="msg-main">
              <div class="msg-bubble">
                <el-tag
                  v-if="m.role === 'assistant' && m.answerMode === 'extractive'"
                  size="mini"
                  type="warning"
                  effect="plain"
                  class="mode-tag"
                >原文摘录</el-tag>
                <el-tag
                  v-if="m.role === 'assistant' && m.weakMatch"
                  size="mini"
                  type="info"
                  effect="plain"
                  class="mode-tag"
                >未精确命中</el-tag>
                <div v-if="m.role === 'assistant'" class="msg-text" v-html="renderAnswer(m.content)"></div>
                <div v-else class="msg-text plain">{{ m.content }}</div>

                <!-- 弱召回提示：命中的是相近内容，不是直接答案 -->
                <div v-if="m.role === 'assistant' && m.weakMatch" class="weak-tip">
                  知识库中没有与问题直接匹配的表述，以下为语义相近的原文，请核对后使用。
                </div>

                <!-- 引用来源 -->
                <div v-if="m.references && m.references.length" class="msg-refs">
                  <div class="refs-head" @click="toggleRefs(idx)">
                    <i :class="['el-icon-arrow-right', { expanded: m.refsOpen }]"></i>
                    引用来源 {{ m.references.length }} 处 · {{ m.docCount || 0 }} 份文档
                    <span class="refs-mode" v-if="m.costMs">{{ (m.costMs / 1000).toFixed(1) }}s</span>
                  </div>
                  <div v-show="m.refsOpen" class="refs-list">
                    <div v-for="r in m.references" :key="r.index" class="ref-item">
                      <div class="ref-top">
                        <span class="ref-idx">片段 {{ r.index }}</span>
                        <span class="ref-doc" :title="r.documentName">{{ r.documentName || '未知文档' }}</span>
                        <span class="ref-sim">相关度 {{ (r.similarity * 100).toFixed(0) }}%</span>
                      </div>
                      <div class="ref-preview">{{ r.preview }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="m.role === 'user'" class="msg-avatar user">
                <i class="el-icon-user"></i>
              </div>
            </div>
          </div>

          <!-- 加载态 -->
          <div v-if="asking" class="msg-row assistant">
            <div class="msg-avatar bot"><i class="el-icon-cpu"></i></div>
            <div class="msg-main">
              <div class="msg-bubble loading-bubble">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                <span class="loading-text">正在检索知识库并组织答案…</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="kb-chat-input">
          <el-input
            v-model="question"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="输入问题，Enter 发送 / Shift+Enter 换行"
            :disabled="asking"
            @keydown.native="handleKeydown"
          />
          <el-button
            type="primary"
            icon="el-icon-position"
            :loading="asking"
            :disabled="!question.trim()"
            @click="send"
          >发送</el-button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { askKnowledgeBaseApi, getRagQaHealthApi, getQaSuggestionsApi, getAllDatasetIdsApi } from '@/api/ragflow'

export default {
  name: 'KnowledgeChat',
  props: {
    // 当前选中的知识库 ID，由父页面传入
    datasetId: { type: String, default: '' },
    // 当前知识库名称 / 文档数，仅用于展示
    datasetName: { type: String, default: '' },
    docTotal: { type: Number, default: 0 }
  },
  data() {
    return {
      visible: false,
      asking: false,
      question: '',
      messages: [],
      healthy: null,
      // 推荐问题：由后端按库里真实文档名/高频词生成，不再前端写死
      samples: [],
      samplesLoading: false,
      // 检索范围：false=只查当前库（默认），true=跨全部知识库
      allDatasets: false,
      datasetCount: 0
    }
  },
  created() {
    // 提前拉推荐问题，用户点开浮窗时已经在手，不会看到空面板
    this.loadDatasetCount()
    this.loadSuggestions()
  },
  watch: {
    datasetId() {
      // 切换知识库后清空对话，避免上下文串库
      this.clearChat()
      this.healthy = null
      this.samples = []
      this.loadSuggestions()
    }
  },
  methods: {
    open() {
      this.visible = true
      this.checkHealth()
      if (!this.samples.length) this.loadSuggestions()
      this.$nextTick(this.scrollToBottom)
    },
    close() {
      this.visible = false
    },

    /**
     * 拉取推荐问题。
     *
     * 原来这里是 4 条写死的「压裂液体系怎么选型」之类 —— 库里换成钻井/地质内容后，
     * 用户点一下必然答「未找到相关内容」，示例问题本身在误导人。
     * 现在改由后端按真实文档名与高频专业词生成，问的一定有内容可答。
     */
    async loadSuggestions() {
      if (this.samplesLoading) return
      this.samplesLoading = true
      try {
        const res = await getQaSuggestionsApi({
          datasetId: this.allDatasets ? '' : this.datasetId,
          allDatasets: this.allDatasets,
          // 单库 4 条够用；跨库必须多要 2 条。
          // 原因：后端跨库时是「每个库轮流出一个主题词」，小库（集输 3 份、测试库 10 份）
          // 的独有主题天然排在大库之后（如「集输方面需要关注哪些内容」在第 6 位），
          // 只要 4 条就永远被截掉 —— 那「全部知识库」看上去就跟单库没区别了。
          limit: this.allDatasets ? 6 : 4
        })
        const list = (res.data && res.data.questions) || []
        // 后端异常时不留空面板，给一句最通用的
        this.samples = list.length
          ? list
          : ['这个知识库里都包含哪些内容？']
      } catch (e) {
        this.samples = ['这个知识库里都包含哪些内容？']
      } finally {
        this.samplesLoading = false
      }
    },

    /** 切换检索范围（当前库 ↔ 全部知识库） */
    toggleScope() {
      this.allDatasets = !this.allDatasets
      this.afterScopeChange()
    },

    /** el-radio-group 的 change 事件已经改好了值，这里只做副作用 */
    toggleScopeAndReload() {
      this.afterScopeChange()
    },

    afterScopeChange() {
      this.samples = []
      this.clearChat()
      this.loadSuggestions()
      if (this.allDatasets && !this.datasetCount) this.loadDatasetCount()
    },

    /** 全部知识库的数量（仅用于文案展示） */
    async loadDatasetCount() {
      try {
        const res = await getAllDatasetIdsApi()
        this.datasetCount = (res.data || []).filter(d => d.id).length
      } catch (e) {
        this.datasetCount = 0
      }
    },
    async checkHealth() {
      if (this.healthy !== null) return
      try {
        const res = await getRagQaHealthApi()
        this.healthy = res.data || {}
        if (this.healthy.ready === false) {
          const reason = this.healthy.ragflowReachable === false
            ? '知识库服务不可达：' + (this.healthy.ragflowMessage || '请检查后端配置')
            : '大模型未启用，问答将无法生成答案'
          this.$message.warning(reason)
        }
      } catch (e) {
        this.healthy = {}
      }
    },
    askSample(text) {
      this.question = text
      this.send()
    },
    handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault()
        this.send()
      }
    },
    async send() {
      const q = (this.question || '').trim()
      if (!q || this.asking) return

      // 历史对话只取最近 6 轮，避免 prompt 无限增长
      const history = []
      for (const m of this.messages.slice(-12)) {
        history.push({ role: m.role, content: m.content })
      }

      this.messages.push({ role: 'user', content: q })
      this.question = ''
      this.asking = true
      this.scrollToBottom()

      try {
        const res = await askKnowledgeBaseApi({
          datasetId: this.allDatasets ? '' : this.datasetId,
          question: q,
          history,
          allDatasets: this.allDatasets
        })
        const data = res.data || {}
        this.messages.push({
          role: 'assistant',
          content: data.answer || '（未返回内容）',
          answerMode: data.answerMode || 'llm',
          weakMatch: !!data.weakMatch,
          references: data.references || [],
          docCount: data.docCount || 0,
          hitCount: data.hitCount || 0,
          costMs: data.costMs || 0,
          refsOpen: false
        })
      } catch (e) {
        this.messages.push({
          role: 'assistant',
          content: '抱歉，检索失败：' + (e.message || '请检查后端服务与知识库连接'),
          references: []
        })
      } finally {
        this.asking = false
        this.scrollToBottom()
      }
    },
    toggleRefs(idx) {
      const m = this.messages[idx]
      if (m) this.$set(m, 'refsOpen', !m.refsOpen)
    },
    clearChat() {
      this.messages = []
      this.question = ''
    },
    scrollToBottom() {
      const el = this.$refs.scroller
      if (el) el.scrollTop = el.scrollHeight
    },
    /**
     * 答案渲染：转义 HTML 后，把 [片段 N] 标注高亮成小标签。
     * 绝不直接 v-html 模型原始输出（模型可能输出 HTML 片段）。
     */
    renderAnswer(text) {
      if (!text) return ''
      const esc = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return esc
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>')
        .replace(
          /\[\s*片段\s*(\d+)\s*\]/g,
          '<span class="cite">[$1]</span>'
        )
    }
  }
}
</script>

<style scoped>
.kb-chat-fab {
  position: fixed;
  right: 28px;
  bottom: 96px;
  z-index: 2000;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 11px 18px;
  border-radius: 24px;
  background: linear-gradient(135deg, #409eff, #2b7de9);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.42);
  transition: transform 0.18s, box-shadow 0.18s;
  user-select: none;
}

.kb-chat-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(64, 158, 255, 0.5);
}

.kb-chat-fab i {
  font-size: 17px;
}

.kb-chat-panel {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2001;
  width: 440px;
  height: 640px;
  max-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.kb-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: linear-gradient(135deg, #409eff, #2b7de9);
  color: #fff;
  flex-shrink: 0;
}

.kb-chat-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
}

.kb-chat-title i {
  font-size: 17px;
}

.kb-chat-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 16px;
}

.kb-chat-actions i {
  cursor: pointer;
  opacity: 0.88;
}

.kb-chat-actions i:hover {
  opacity: 1;
}

.kb-chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #f6f8fb;
}

.kb-chat-welcome {
  text-align: center;
  padding: 18px 8px;
}

.welcome-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 10px;
  line-height: 52px;
  border-radius: 50%;
  background: #e8f3ff;
  color: #409eff;
  font-size: 24px;
}

.welcome-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.welcome-desc {
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.7;
  color: #909399;
}

/* 检索范围切换（当前库 / 全部知识库） */
.scope-switch {
  margin-bottom: 12px;
  text-align: center;
}

.scope-switch ::v-deep .el-radio-button__inner {
  padding: 5px 12px;
  font-size: 12px;
}

.samples {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 40px;
}

.sample-item {
  padding: 9px 12px;
  font-size: 12.5px;
  color: #409eff;
  text-align: left;
  background: #fff;
  border: 1px solid #d9ecff;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.sample-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
}

.msg-row {
  display: flex;
  margin-bottom: 14px;
  align-items: flex-start;
  gap: 8px;
}

.msg-row.user {
  justify-content: flex-end;
}

.msg-avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  line-height: 30px;
  text-align: center;
  border-radius: 50%;
  font-size: 15px;
}

.msg-avatar.bot {
  background: #e8f3ff;
  color: #409eff;
}

.msg-avatar.user {
  background: #f0f2f5;
  color: #606266;
}

.msg-main {
  display: flex;
  gap: 8px;
  max-width: calc(100% - 42px);
}

.msg-bubble {
  padding: 10px 12px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  font-size: 13px;
  line-height: 1.75;
  color: #303133;
  word-break: break-word;
}

.msg-row.user .msg-bubble {
  background: #409eff;
  color: #fff;
}

.mode-tag {
  margin-bottom: 6px;
  margin-right: 4px;
}

/* 弱召回提示条：提醒用户命中的是相近内容而非直接答案 */
.weak-tip {
  margin-top: 8px;
  padding: 6px 8px;
  font-size: 12px;
  line-height: 18px;
  color: #e6a23c;
  background: #fdf6ec;
  border-left: 2px solid #e6a23c;
  border-radius: 3px;
}

.msg-text ::v-deep .cite {
  display: inline-block;
  padding: 0 4px;
  margin: 0 1px;
  font-size: 11px;
  line-height: 16px;
  color: #409eff;
  background: #ecf5ff;
  border-radius: 3px;
  vertical-align: 1px;
}

.msg-refs {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #ebeef5;
}

.refs-head {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
  user-select: none;
}

.refs-head i {
  font-size: 12px;
  transition: transform 0.18s;
}

.refs-head i.expanded {
  transform: rotate(90deg);
}

.refs-mode {
  margin-left: auto;
  color: #c0c4cc;
}

.refs-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.ref-item {
  padding: 8px;
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.ref-top {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  margin-bottom: 4px;
}

.ref-idx {
  color: #409eff;
  font-weight: 600;
}

.ref-doc {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #606266;
}

.ref-sim {
  color: #909399;
}

.ref-preview {
  font-size: 11.5px;
  line-height: 1.6;
  color: #909399;
}

.loading-bubble {
  display: flex;
  align-items: center;
  gap: 5px;
}

.loading-text {
  margin-left: 4px;
  font-size: 12px;
  color: #909399;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #409eff;
  animation: kb-blink 1.2s infinite ease-in-out;
}

.dot:nth-child(2) { animation-delay: 0.18s; }
.dot:nth-child(3) { animation-delay: 0.36s; }

@keyframes kb-blink {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.kb-chat-input {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

.kb-chat-input >>> .el-textarea__inner {
  font-size: 13px;
  line-height: 1.6;
}

.kb-slide-enter-active,
.kb-slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.kb-slide-enter,
.kb-slide-leave-to {
  opacity: 0;
  transform: translateY(14px);
}
</style>
