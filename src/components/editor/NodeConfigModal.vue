<template>
  <el-dialog
    :title="dialogTitle"
    :visible.sync="visible"
    width="800px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 步骤指示器 -->
    <el-steps :active="step - 1" finish-status="success" class="config-steps">
      <el-step title="选择数据源" />
      <el-step title="选择输出类型" />
      <el-step title="编辑处理过程" />
      <el-step title="验证配置" />
    </el-steps>

    <div class="step-content">
      <!-- Step 1: 选择数据源 -->
      <div v-show="step === 1" class="step-panel">
        <el-tabs v-model="sourceTab">
          <el-tab-pane label="MySQL" name="mysql">
            <el-form label-width="100px">
              <el-form-item label="选择连接">
                <el-select v-model="nodeForm.sourceId" placeholder="请选择数据库连接" filterable>
                  <el-option
                    v-for="ds in mysqlDataSources"
                    :key="ds.id"
                    :label="ds.name"
                    :value="ds.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="选择表">
                <el-select v-model="nodeForm.tables" multiple placeholder="请选择数据表" filterable>
                  <el-option
                    v-for="table in tables"
                    :key="table"
                    :label="table"
                    :value="table"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="自定义SQL">
                <el-input
                  v-model="nodeForm.customSql"
                  type="textarea"
                  :rows="4"
                  placeholder="可输入自定义SQL查询语句"
                />
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="MCP工具" name="mcp">
            <el-form label-width="100px">
              <el-form-item label="选择Server">
                <el-select v-model="nodeForm.sourceId" placeholder="请选择MCP Server">
                  <el-option
                    v-for="server in mcpServers"
                    :key="server.id"
                    :label="server.name"
                    :value="server.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="选择工具">
                <el-checkbox-group v-model="nodeForm.tools">
                  <el-checkbox
                    v-for="tool in availableTools"
                    :key="tool.name"
                    :label="tool.name"
                  >
                    {{ tool.description }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="文档库" name="file">
            <el-form label-width="100px">
              <el-form-item label="选择文件">
                <el-select v-model="nodeForm.files" multiple placeholder="请选择文档">
                  <el-option
                    v-for="file in files"
                    :key="file.id"
                    :label="file.name"
                    :value="file.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="文件格式">
                <el-checkbox-group v-model="nodeForm.fileTypes">
                  <el-checkbox label="pdf">PDF</el-checkbox>
                  <el-checkbox label="docx">Word</el-checkbox>
                  <el-checkbox label="xlsx">Excel</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- Step 2: 选择输出类型 -->
      <div v-show="step === 2" class="step-panel">
        <el-form label-width="120px">
          <el-form-item label="输出格式">
            <el-radio-group v-model="nodeForm.outputFormat">
              <el-radio label="paragraph">段落文本</el-radio>
              <el-radio label="number">数字</el-radio>
              <el-radio label="list">列表</el-radio>
              <el-radio label="table">表格</el-radio>
              <el-radio label="chart">图表</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="原始内容">
            <el-input
              v-model="nodeForm.originalContent"
              type="textarea"
              :rows="6"
              placeholder="粘贴原始内容，用于对比验证"
            />
            <div class="form-tip">用于验证时左右对比参考</div>
          </el-form-item>
        </el-form>
      </div>

      <!-- Step 3: 编辑处理过程 -->
      <div v-show="step === 3" class="step-panel">
        <el-form label-width="120px">
          <el-form-item label="查询步骤">
            <el-input
              v-model="nodeForm.querySteps"
              type="textarea"
              :rows="6"
              placeholder="描述数据处理步骤，AI会根据此描述生成执行计划"
            />
            <div class="form-tip">
              示例：从生产库查询本周设备运行数据，统计各类设备数量，计算运行率
            </div>
          </el-form-item>
          <el-form-item label="节点名称">
            <el-input v-model="nodeForm.name" placeholder="输入节点名称" />
          </el-form-item>
        </el-form>
      </div>

      <!-- Step 4: 验证配置 -->
      <div v-show="step === 4" class="step-panel">
        <el-row :gutter="20">
          <el-col :span="12">
            <div class="log-console">
              <div class="console-header">
                <span>执行日志</span>
                <el-button type="text" size="small" icon="el-icon-refresh" @click="handleRun">
                  运行
                </el-button>
              </div>
              <div class="console-content" v-loading="running">
                <div
                  v-for="(log, index) in logs"
                  :key="index"
                  :class="['log-item', log.type]"
                >
                  <span class="log-time">{{ log.time }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
                <div v-if="logs.length === 0 && !running" class="empty-logs">
                  点击"运行"按钮开始验证
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="result-preview">
              <div class="preview-header">结果预览</div>
              <div class="preview-content">
                <div v-if="previewResult" class="preview-result">
                  {{ previewResult }}
                </div>
                <div v-else class="empty-preview">
                  运行后显示预览结果
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <span slot="footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button v-if="step > 1" @click="handlePrev">上一步</el-button>
      <el-button v-if="step < 4" type="primary" @click="handleNext">下一步</el-button>
      <el-button v-if="step === 4" type="success" @click="handleSave">保存配置</el-button>
      <el-button v-if="step === 4" type="text" @click="handleSaveAsSkill">保存为技能包</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'NodeConfigModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    node: {
      type: Object,
      default: () => ({})
    },
    step: {
      type: Number,
      default: 1
    }
  },
  data() {
    return {
      sourceTab: 'mysql',
      nodeForm: {
        name: '',
        sourceId: null,
        tables: [],
        tools: [],
        files: [],
        customSql: '',
        outputFormat: 'paragraph',
        originalContent: '',
        querySteps: ''
      },
      mysqlDataSources: [
        { id: 1, name: '生产数据库' },
        { id: 2, name: '测试数据库' }
      ],
      mcpServers: [
        { id: 1, name: '天气API' },
        { id: 2, name: '设备监控系统' }
      ],
      tables: ['equipment', 'device_status', 'production_log'],
      availableTools: [
        { name: 'get_weather', description: '获取天气信息' },
        { name: 'get_device_status', description: '获取设备状态' }
      ],
      files: [
        { id: 1, name: '巡检报告.pdf' },
        { id: 2, name: '设备清单.xlsx' }
      ],
      logs: [],
      running: false,
      previewResult: ''
    }
  },
  computed: {
    dialogTitle() {
      return this.node && this.node.id ? '编辑节点' : '创建节点'
    }
  },
  watch: {
    node: {
      handler(newVal) {
        if (newVal) {
          Object.assign(this.nodeForm, newVal)
        }
      },
      immediate: true
    }
  },
  methods: {
    handleClose() {
      this.$emit('update:visible', false)
      this.$emit('close')
    },
    handlePrev() {
      this.$emit('prev')
    },
    handleNext() {
      this.$emit('next')
    },
    handleSave() {
      this.$emit('save', this.nodeForm)
    },
    handleSaveAsSkill() {
      this.$message.info('保存为技能包功能开发中')
    },
    handleRun() {
      this.running = true
      this.logs = [
        { type: 'ai', time: '10:30:01', message: '正在分析查询需求...' },
        { type: 'tool', time: '10:30:02', message: '正在连接数据库...' },
        { type: 'tool_result', time: '10:30:03', message: '连接成功，获取到 156 条记录' },
        { type: 'ai', time: '10:30:04', message: '数据处理完成，正在生成输出...' }
      ]

      setTimeout(() => {
        this.running = false
        this.previewResult = '本周特种设备共计 603 台，运行率 95.8%'
        this.$message.success('验证完成')
      }, 2000)
    }
  }
}
</script>

<style scoped>
.config-steps {
  margin-bottom: 24px;
}

.step-content {
  min-height: 350px;
}

.step-panel {
  padding: 10px 0;
}

.form-tip {
  font-size: 12px;
  color: #8e8e93;
  margin-top: 4px;
}

.log-console,
.result-preview {
  height: 300px;
  border: 1px solid #e5e5ea;
  border-radius: 8px;
  overflow: hidden;
}

.console-header,
.preview-header {
  padding: 10px 14px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

.console-header button {
  float: right;
  color: #34c759;
}

.console-content {
  height: 260px;
  padding: 10px;
  background: #1d1d1f;
  overflow-y: auto;
  font-family: 'SF Mono', monospace;
  font-size: 12px;
}

.log-item {
  margin-bottom: 6px;
  color: #e5e5ea;
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

.empty-logs,
.empty-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8e8e93;
}

.preview-content {
  padding: 14px;
  height: 260px;
  overflow-y: auto;
}

.preview-result {
  font-size: 14px;
  line-height: 1.6;
  color: #303133;
}
</style>
