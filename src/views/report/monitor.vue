<template>
  <div class="execution-monitor-container">
    <!-- 顶部导航 -->
    <div class="monitor-header">
      <div class="header-left">
        <el-button icon="el-icon-arrow-left" size="small" @click="goBack">返回</el-button>
        <span class="report-name">{{ reportName }}</span>
      </div>
      <div class="header-right">
        <el-tag :type="getStatusType(executionStatus)">
          {{ getStatusName(executionStatus) }}
        </el-tag>
      </div>
    </div>

    <!-- 监控主体 -->
    <div class="monitor-main">
      <!-- 左侧：节点状态列表 -->
      <div class="monitor-left">
        <div class="panel-header">
          <span>节点执行状态</span>
        </div>
        <div class="node-status-list">
          <div
            v-for="(node, index) in nodes"
            :key="node.id"
            :class="['node-status-item', { 'is-active': activeNodeId === node.id }]"
            @click="handleSelectNode(node)"
          >
            <div class="status-icon">
              <i :class="getStatusIcon(node.status)"></i>
            </div>
            <div class="status-info">
              <div class="node-name">{{ node.name }}</div>
              <div class="node-type">{{ node.nodeType }}</div>
            </div>
            <div class="status-badge">
              <el-tag :type="getStatusType(node.status)" size="mini">
                {{ getStatusName(node.status) }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 节点日志控制台 -->
        <div v-if="activeNodeId" class="node-log-console">
          <div class="console-header">
            <span>{{ activeNodeName }} - 执行日志</span>
          </div>
          <div class="console-content">
            <div
              v-for="(log, index) in nodeLogs"
              :key="index"
              :class="['log-item', log.type]"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-type">[{{ log.type.toUpperCase() }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：报告预览 -->
      <div class="monitor-right">
        <div class="panel-header">
          <span>报告实时预览</span>
        </div>
        <div class="report-preview">
          <div class="preview-paper">
            <div v-html="previewContent"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部进度 -->
    <div class="monitor-footer">
      <div class="progress-info">
        <span>执行进度：{{ progress }}%</span>
        <span class="separator">|</span>
        <span>成功：{{ successCount }} 个</span>
        <span class="separator">|</span>
        <span>失败：{{ failureCount }} 个</span>
        <span class="separator">|</span>
        <span>耗时：{{ formatDuration(duration) }}</span>
      </div>
      <el-progress :percentage="progress" :status="progressStatus" style="width: 300px;" />
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'ExecutionMonitor',
  data() {
    return {
      reportId: null,
      sessionId: null,
      reportName: '特种设备运行周报',
      executionStatus: 'running',
      progress: 0,
      successCount: 0,
      failureCount: 0,
      startTime: null,
      duration: 0,
      nodes: [
        { id: 1, name: '设备总数节点', nodeType: 'mysql', status: 'completed', result: '603台' },
        { id: 2, name: '运行率节点', nodeType: 'mysql', status: 'completed', result: '95.8%' },
        { id: 3, name: '设备明细节点', nodeType: 'mysql', status: 'running', result: '' },
        { id: 4, name: '异常汇总节点', nodeType: 'mcp', status: 'pending', result: '' },
        { id: 5, name: '本周总结节点', nodeType: 'knowledge', status: 'pending', result: '' }
      ],
      activeNodeId: null,
      nodeLogs: [
        { time: '10:30:01', type: 'ai', message: '正在分析设备运行数据...' },
        { time: '10:30:02', type: 'tool', message: '执行 SQL: SELECT COUNT(*) FROM equipment' },
        { time: '10:30:03', type: 'tool_result', message: '查询结果: 603' },
        { time: '10:30:04', type: 'ai', message: '数据获取成功，正在格式化输出...' }
      ],
      previewContent: `
        <h1>特种设备运行周报</h1>
        <p>上古二期特种设备共计 <span class="node-result filled">603</span> 台。</p>
        <p>本周运行情况如下：</p>
        <h2>一、设备运行统计</h2>
        <p>本周设备总体运行率：<span class="node-result filled">95.8</span>%</p>
        <h2>二、设备明细</h2>
        <p>正在加载设备明细数据...</p>
        <h2>三、异常事件汇总</h2>
        <p class="node-placeholder">待执行</p>
        <h2>四、本周工作总结</h2>
        <p class="node-placeholder">待执行</p>
      `
    }
  },
  computed: {
    activeNodeName() {
      const node = this.nodes.find(n => n.id === this.activeNodeId)
      return node ? node.name : ''
    },
    progressStatus() {
      if (this.progress === 100) return 'success'
      if (this.failureCount > 0) return 'exception'
      return null
    }
  },
  created() {
    this.reportId = this.$route.params.reportId
    this.sessionId = this.$route.params.sessionId
    this.startTime = Date.now()
    this.connectWebSocket()
    this.startProgressSimulation()
  },
  beforeDestroy() {
    this.disconnectWebSocket()
  },
  methods: {
    connectWebSocket() {
      // TODO: 连接 WebSocket
      // const ws = new WebSocket(`ws://${location.host}/ws/execution/${this.sessionId}`)
    },
    disconnectWebSocket() {
      // TODO: 断开 WebSocket
    },
    goBack() {
      this.$router.push('/report-manage/history')
    },
    handleSelectNode(node) {
      this.activeNodeId = node.id
      this.loadNodeLogs(node.id)
    },
    loadNodeLogs(nodeId) {
      // TODO: 加载节点执行日志
    },
    getStatusType(status) {
      const types = {
        pending: 'info',
        running: 'warning',
        completed: 'success',
        failed: 'danger'
      }
      return types[status] || 'info'
    },
    getStatusName(status) {
      const names = {
        pending: '等待中',
        running: '执行中',
        completed: '已完成',
        failed: '失败'
      }
      return names[status] || status
    },
    getStatusIcon(status) {
      const icons = {
        pending: 'el-icon-time',
        running: 'el-icon-loading',
        completed: 'el-icon-check',
        failed: 'el-icon-close'
      }
      return icons[status] || 'el-icon-question'
    },
    formatDuration(ms) {
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
    },
    startProgressSimulation() {
      // 模拟执行进度
      this.timer = setInterval(() => {
        this.duration = Date.now() - this.startTime

        // 更新进度
        if (this.progress < 100) {
          this.progress = Math.min(100, this.progress + 5)
        }

        // 更新节点状态
        this.nodes.forEach(node => {
          if (node.status === 'pending' && this.progress >= 20) {
            node.status = 'completed'
            node.result = node.name.includes('运行率') ? '95.8%' : '已完成'
            this.successCount++
          }
        })

        // 完成执行
        if (this.progress >= 100) {
          this.executionStatus = 'completed'
          clearInterval(this.timer)
        }
      }, 1000)
    }
  }
}
</script>

<style scoped>
.execution-monitor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f7;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e5ea;
}

.header-left {
  display: flex;
  align-items: center;
}

.report-name {
  margin-left: 16px;
  font-weight: 600;
  font-size: 16px;
}

.monitor-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.monitor-left {
  width: 40%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #e5e5ea;
}

.monitor-right {
  width: 60%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 16px 20px;
  font-weight: 600;
  border-bottom: 1px solid #e5e5ea;
}

.node-status-list {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.node-status-item {
  display: flex;
  align-items: center;
  padding: 14px;
  margin-bottom: 8px;
  background: #f9f9f9;
  border: 1px solid #e5e5ea;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.node-status-item:hover {
  border-color: #0071e3;
}

.node-status-item.is-active {
  border-color: #0071e3;
  background: #e8f2fd;
}

.status-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 12px;
}

.status-info {
  flex: 1;
}

.node-name {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 2px;
}

.node-type {
  font-size: 12px;
  color: #8e8e93;
}

.node-log-console {
  height: 250px;
  border-top: 1px solid #e5e5ea;
}

.console-header {
  padding: 10px 14px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

.console-content {
  height: 210px;
  padding: 10px;
  background: #1d1d1f;
  overflow-y: auto;
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: #e5e5ea;
}

.log-item {
  margin-bottom: 6px;
}

.log-item.ai {
  color: #34c759;
}

.log-item.tool {
  color: #0071e3;
}

.log-item.tool_result {
  color: #8e8e93;
}

.log-time {
  margin-right: 8px;
  color: #636366;
}

.log-type {
  margin-right: 8px;
  color: #636366;
}

.report-preview {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #e5e5ea;
}

.preview-paper {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.preview-paper h1 {
  font-size: 22px;
  text-align: center;
  margin-bottom: 24px;
}

.preview-paper h2 {
  font-size: 16px;
  margin-top: 20px;
  margin-bottom: 12px;
  color: #303133;
}

.preview-paper p {
  margin: 10px 0;
  line-height: 1.6;
}

.node-result.filled {
  color: #0071e3;
  font-weight: 600;
}

.node-placeholder {
  color: #8e8e93;
  font-style: italic;
}

.monitor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-top: 1px solid #e5e5ea;
}

.progress-info {
  font-size: 13px;
  color: #636366;
}

.separator {
  margin: 0 12px;
  color: #d1d1d6;
}
</style>
