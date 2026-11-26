<template>
  <div class="datasource-list-container">
    <el-card>
      <div slot="header" class="card-header">
        <span>数据源配置</span>
        <el-button type="primary" size="small" icon="el-icon-plus" @click="handleCreate">
          添加数据源
        </el-button>
      </div>

      <el-tabs v-model="activeTab" @tab-click="handleTabChange">
        <el-tab-pane label="MySQL" name="mysql" />
        <el-tab-pane label="MCP Server" name="mcp" />
        <el-tab-pane label="文档库" name="file" />
      </el-tabs>

      <el-row :gutter="20">
        <el-col v-for="ds in dataSourceList" :key="ds.id" :span="8" style="margin-bottom: 20px;">
          <el-card class="ds-card" shadow="hover">
            <div class="ds-header">
              <div class="ds-icon">
                <i :class="getIcon(ds.type)"></i>
              </div>
              <div class="ds-info">
                <div class="ds-name">{{ ds.name }}</div>
                <div class="ds-type">{{ getTypeName(ds.type) }}</div>
              </div>
              <div class="ds-status">
                <span :class="['status-dot', ds.status]"></span>
                {{ ds.status === 'connected' ? '已连接' : '未连接' }}
              </div>
            </div>
            <div class="ds-desc">{{ ds.description }}</div>
            <div class="ds-footer">
              <span class="ds-meta">最后测试: {{ formatDate(ds.lastTestTime) }}</span>
            </div>
            <div class="ds-actions">
              <el-button type="text" size="small" @click="handleEdit(ds)">编辑</el-button>
              <el-button type="text" size="small" @click="handleTest(ds)">测试</el-button>
              <el-button type="text" size="small" style="color: #F56C6C;" @click="handleDelete(ds)">
                删除
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <div v-if="dataSourceList.length === 0" class="empty-state">
        <i class="el-icon-folder-opened"></i>
        <p>暂无数据源</p>
        <el-button type="primary" size="small" @click="handleCreate">添加数据源</el-button>
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="600px">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="数据源名称" prop="name">
          <el-input v-model="form.name" placeholder="输入数据源名称" />
        </el-form-item>
        <el-form-item label="数据源类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio label="mysql">MySQL</el-radio>
            <el-radio label="mcp">MCP Server</el-radio>
            <el-radio label="file">文档库</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- MySQL 配置 -->
        <template v-if="form.type === 'mysql'">
          <el-form-item label="主机地址" prop="host">
            <el-input v-model="form.config.host" placeholder="如: localhost" />
          </el-form-item>
          <el-form-item label="端口" prop="port">
            <el-input-number v-model="form.config.port" :min="1" :max="65535" />
          </el-form-item>
          <el-form-item label="数据库名" prop="database">
            <el-input v-model="form.config.database" placeholder="数据库名称" />
          </el-form-item>
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.config.username" placeholder="用户名" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.config.password" type="password" placeholder="密码" show-password />
          </el-form-item>
        </template>

        <!-- MCP 配置 -->
        <template v-if="form.type === 'mcp'">
          <el-form-item label="协议类型" prop="protocol">
            <el-select v-model="form.config.protocol">
              <el-option label="STDIO" value="stdio" />
              <el-option label="SSE" value="sse" />
              <el-option label="HTTP" value="http" />
            </el-select>
          </el-form-item>
          <el-form-item label="命令" v-if="form.config.protocol === 'stdio'">
            <el-input v-model="form.config.command" placeholder="如: npx @example/mcp-server" />
          </el-form-item>
          <el-form-item label="URL" v-if="form.config.protocol !== 'stdio'">
            <el-input v-model="form.config.url" placeholder="如: http://localhost:3000" />
          </el-form-item>
        </template>

        <!-- 文件配置 -->
        <template v-if="form.type === 'file'">
          <el-form-item label="文件路径">
            <el-input v-model="form.config.path" placeholder="文档存储路径" />
          </el-form-item>
          <el-form-item label="允许格式">
            <el-checkbox-group v-model="form.config.allowedExtensions">
              <el-checkbox label="pdf">PDF</el-checkbox>
              <el-checkbox label="docx">Word</el-checkbox>
              <el-checkbox label="xlsx">Excel</el-checkbox>
              <el-checkbox label="txt">TXT</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </template>

        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="数据源描述" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'DataSourceList',
  data() {
    return {
      activeTab: 'mysql',
      dialogVisible: false,
      dialogTitle: '添加数据源',
      dataSourceList: [],
      form: {
        id: null,
        name: '',
        type: 'mysql',
        description: '',
        config: {
          host: 'localhost',
          port: 3306,
          database: '',
          username: '',
          password: '',
          protocol: 'stdio',
          command: '',
          url: '',
          path: '',
          allowedExtensions: ['pdf', 'docx', 'xlsx']
        }
      },
      rules: {
        name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择数据源类型', trigger: 'change' }],
        host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
        port: [{ required: true, message: '请输入端口', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadDataSources()
  },
  methods: {
    loadDataSources() {
      // TODO: 调用 API 获取数据源列表
      this.dataSourceList = [
        { id: 1, name: '生产数据库', type: 'mysql', description: '生产环境主数据库', status: 'connected', lastTestTime: new Date() },
        { id: 2, name: '天气API', type: 'mcp', description: '第三方天气服务', status: 'connected', lastTestTime: new Date() }
      ]
    },
    handleTabChange() {
      this.loadDataSources()
    },
    handleCreate() {
      this.dialogTitle = '添加数据源'
      this.form = {
        id: null,
        name: '',
        type: this.activeTab === 'mysql' ? 'mysql' : this.activeTab,
        description: '',
        config: {
          host: 'localhost',
          port: 3306,
          database: '',
          username: '',
          password: '',
          protocol: 'stdio',
          command: '',
          url: '',
          path: '',
          allowedExtensions: ['pdf', 'docx', 'xlsx']
        }
      }
      this.dialogVisible = true
    },
    handleEdit(ds) {
      this.dialogTitle = '编辑数据源'
      this.form = { ...ds, config: JSON.parse(ds.configJson || '{}') }
      this.dialogVisible = true
    },
    handleSave() {
      this.$refs.form.validate(valid => {
        if (valid) {
          // TODO: 调用 API 保存
          this.$message.success('保存成功')
          this.dialogVisible = false
          this.loadDataSources()
        }
      })
    },
    handleTest(ds) {
      // TODO: 调用测试连接 API
      this.$message.success('连接测试成功')
    },
    handleDelete(ds) {
      this.$confirm('确认删除该数据源？', '提示', { type: 'warning' }).then(() => {
        // TODO: 调用 API 删除
        this.$message.success('删除成功')
        this.loadDataSources()
      })
    },
    getIcon(type) {
      const icons = { mysql: 'el-icon-s-data', mcp: 'el-icon-box', file: 'el-icon-document' }
      return icons[type] || 'el-icon-question'
    },
    getTypeName(type) {
      const names = { mysql: 'MySQL数据库', mcp: 'MCP Server', file: '文档库' }
      return names[type] || type
    },
    formatDate(date) {
      if (!date) return '--'
      return new Date(date).toLocaleString('zh-CN')
    }
  }
}
</script>

<style scoped>
.datasource-list-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ds-card {
  height: 100%;
}

.ds-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.ds-icon {
  width: 40px;
  height: 40px;
  background: #e8f2fd;
  color: #0071e3;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 12px;
}

.ds-info {
  flex: 1;
}

.ds-name {
  font-weight: 600;
  font-size: 15px;
}

.ds-type {
  font-size: 12px;
  color: #8e8e93;
}

.ds-status {
  font-size: 12px;
  color: #8e8e93;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.status-dot.connected {
  background: #34c759;
}

.status-dot.disconnected {
  background: #ff3b30;
}

.ds-desc {
  font-size: 13px;
  color: #636366;
  margin-bottom: 12px;
  min-height: 40px;
}

.ds-footer {
  font-size: 12px;
  color: #8e8e93;
  margin-bottom: 12px;
}

.ds-actions {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8e8e93;
}

.empty-state i {
  font-size: 64px;
  margin-bottom: 16px;
}
</style>
