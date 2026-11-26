<template>
  <div class="template-editor-container">
    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <el-button icon="el-icon-arrow-left" @click="goBack">返回</el-button>
      <div class="toolbar-right">
        <el-button @click="handleSaveDraft">保存草稿</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>

    <!-- 模板基本信息 -->
    <el-card class="info-card" shadow="never">
      <el-form ref="templateForm" :model="templateForm" :rules="templateRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="模板名称" prop="name">
              <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模板类型" prop="type">
              <el-select v-model="templateForm.type" placeholder="请选择模板类型" style="width: 100%">
                <el-option label="周报" value="weekly" />
                <el-option label="月报" value="monthly" />
                <el-option label="季报" value="quarterly" />
                <el-option label="年报" value="yearly" />
                <el-option label="专题报告" value="special" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属行业" prop="industry">
              <el-select v-model="templateForm.industry" placeholder="请选择行业" style="width: 100%">
                <el-option label="能源" value="energy" />
                <el-option label="制造" value="manufacturing" />
                <el-option label="金融" value="finance" />
                <el-option label="医疗" value="medical" />
                <el-option label="教育" value="education" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="templateForm.status">
                <el-radio :label="1">启用</el-radio>
                <el-radio :label="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="模板描述" prop="description">
              <el-input
                v-model="templateForm.description"
                type="textarea"
                :rows="2"
                placeholder="请输入模板描述"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 模板结构 -->
    <el-card class="structure-card" shadow="never">
      <div slot="header" class="clearfix">
        <span>模板结构</span>
        <el-button style="float: right;" type="text" @click="handleAddSection">
          添加章节
        </el-button>
      </div>

      <div class="structure-editor">
        <!-- 左侧：结构树 -->
        <div class="structure-tree-panel">
          <el-tree
            ref="structureTree"
            :data="structureData"
            :props="treeProps"
            node-key="id"
            default-expand-all
            highlight-current
            :expand-on-click-node="false"
            @node-click="handleNodeClick"
          >
            <span slot-scope="{ node, data }" class="tree-node">
              <span>
                <i :class="getNodeIcon(data.type)"></i>
                {{ node.label }}
              </span>
              <span class="node-actions">
                <el-button type="text" size="mini" @click.stop="handleAddChild(data)">
                  <i class="el-icon-plus"></i>
                </el-button>
                <el-button type="text" size="mini" @click.stop="handleDeleteNode(data)">
                  <i class="el-icon-delete"></i>
                </el-button>
              </span>
            </span>
          </el-tree>
        </div>

        <!-- 右侧：节点配置 -->
        <div class="node-config-panel">
          <div v-if="currentNode" class="node-config-form">
            <h4>节点配置</h4>
            <el-form ref="nodeForm" :model="currentNode" label-width="100px" size="small">
              <el-form-item label="节点名称">
                <el-input v-model="currentNode.name" placeholder="请输入节点名称" />
              </el-form-item>
              <el-form-item label="节点类型">
                <el-select v-model="currentNode.type" placeholder="请选择节点类型" style="width: 100%">
                  <el-option label="章节" value="section" />
                  <el-option label="子章节" value="subsection" />
                  <el-option label="文本" value="text" />
                  <el-option label="表格" value="table" />
                  <el-option label="图表" value="chart" />
                </el-select>
              </el-form-item>
              <el-form-item label="数据来源" v-if="currentNode.type !== 'section' && currentNode.type !== 'subsection'">
                <el-select v-model="currentNode.dataSourceId" placeholder="请选择数据来源" clearable style="width: 100%">
                  <el-option
                    v-for="ds in dataSourceList"
                    :key="ds.id"
                    :label="ds.name"
                    :value="ds.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="输出格式" v-if="currentNode.type === 'table' || currentNode.type === 'chart'">
                <el-select v-model="currentNode.outputFormat" placeholder="请选择输出格式" style="width: 100%">
                  <el-option label="表格" value="table" />
                  <el-option label="柱状图" value="bar" />
                  <el-option label="折线图" value="line" />
                  <el-option label="饼图" value="pie" />
                </el-select>
              </el-form-item>
              <el-form-item label="提示词" v-if="currentNode.type === 'text'">
                <el-input
                  v-model="currentNode.prompt"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入内容生成的提示词"
                />
              </el-form-item>
            </el-form>
          </div>
          <div v-else class="empty-config">
            <i class="el-icon-warning"></i>
            <p>请从左侧选择一个节点进行配置</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 模板内容预览 -->
    <el-card class="preview-card" shadow="never">
      <div slot="header" class="clearfix">
        <span>内容预览</span>
        <el-button style="float: right;" type="text" @click="refreshPreview">
          刷新预览
        </el-button>
      </div>
      <div class="preview-content" v-html="previewContent"></div>
    </el-card>
  </div>
</template>

<script>
import { getTemplateDetail, saveTemplate, getDataSourceList } from '@/api/template'

export default {
  name: 'TemplateEditor',
  data() {
    return {
      templateId: '',
      isEdit: false,
      templateForm: {
        name: '',
        type: 'weekly',
        industry: '',
        description: '',
        status: 1
      },
      templateRules: {
        name: [
          { required: true, message: '请输入模板名称', trigger: 'blur' }
        ],
        type: [
          { required: true, message: '请选择模板类型', trigger: 'change' }
        ],
        industry: [
          { required: true, message: '请选择行业', trigger: 'change' }
        ]
      },
      structureData: [],
      treeProps: {
        children: 'children',
        label: 'name'
      },
      currentNode: null,
      dataSourceList: [],
      previewContent: '<p style="text-align: center; color: #999;">请选择节点并配置内容</p>'
    }
  },
  created() {
    this.templateId = this.$route.params.id
    this.isEdit = !!this.templateId
    this.loadDataSourceList()
    if (this.isEdit) {
      this.loadTemplateDetail()
    } else {
      this.initStructure()
    }
  },
  methods: {
    escapePreviewText(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    },

    loadTemplateDetail() {
      getTemplateDetail(this.templateId)
        .then(res => {
          const data = res.data
          this.templateForm = {
            name: data.name,
            type: data.type,
            industry: data.industry,
            description: data.description,
            status: data.status
          }
          this.structureData = data.structure || []
        })
        .catch(err => {
          this.$message.error(err.message || '加载模板详情失败')
        })
    },

    loadDataSourceList() {
      getDataSourceList()
        .then(res => {
          this.dataSourceList = res.data || []
        })
        .catch(() => {
          this.dataSourceList = []
        })
    },

    initStructure() {
      this.structureData = [
        {
          id: '1',
          name: '报告标题',
          type: 'section',
          children: [
            {
              id: '1-1',
              name: '摘要',
              type: 'text',
              prompt: '请生成报告摘要内容'
            },
            {
              id: '1-2',
              name: '目录',
              type: 'text'
            }
          ]
        },
        {
          id: '2',
          name: '正文',
          type: 'section',
          children: [
            {
              id: '2-1',
              name: '数据概览',
              type: 'subsection',
              children: [
                {
                  id: '2-1-1',
                  name: '关键指标',
                  type: 'table'
                }
              ]
            }
          ]
        },
        {
          id: '3',
          name: '结论与建议',
          type: 'section',
          children: []
        }
      ]
    },

    goBack() {
      this.$router.go(-1)
    },

    handleSaveDraft() {
      this.saveTemplate()
    },

    handleSave() {
      this.$refs.templateForm.validate(valid => {
        if (valid) {
          this.saveTemplate()
        }
      })
    },

    saveTemplate() {
      const templateData = {
        ...this.templateForm,
        structure: this.structureData
      }

      saveTemplate(templateData)
        .then(() => {
          this.$message.success('保存成功')
          if (!this.isEdit) {
            this.$router.go(-1)
          }
        })
        .catch(err => {
          this.$message.error(err.message || '保存失败')
        })
    },

    handleNodeClick(data) {
      this.currentNode = { ...data }
    },

    handleAddSection() {
      const newNode = {
        id: 'section_' + Date.now(),
        name: '新章节',
        type: 'section',
        children: []
      }
      this.structureData.push(newNode)
    },

    handleAddChild(data) {
      const newChild = {
        id: 'child_' + Date.now(),
        name: '新节点',
        type: 'text',
        prompt: ''
      }
      if (!data.children) {
        this.$set(data, 'children', [])
      }
      data.children.push(newChild)
    },

    handleDeleteNode(data) {
      this.$confirm('确定要删除该节点吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          const deleteFromTree = (nodes) => {
            const index = nodes.findIndex(item => item.id === data.id)
            if (index > -1) {
              nodes.splice(index, 1)
              return true
            }
            for (const node of nodes) {
              if (node.children && deleteFromTree(node.children)) {
                return true
              }
            }
            return false
          }
          deleteFromTree(this.structureData)
          if (this.currentNode && this.currentNode.id === data.id) {
            this.currentNode = null
          }
        })
        .catch(() => {})
    },

    refreshPreview() {
      this.previewContent = this.generatePreview(this.structureData)
    },

    generatePreview(structure) {
      let html = '<div class="preview-document">'
      const processNode = (node, level) => {
        const headingTag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4'
        if (node.type === 'section' || node.type === 'subsection') {
          html += `<${headingTag}>${this.escapePreviewText(node.name)}</${headingTag}>`
          if (node.children) {
            node.children.forEach(child => processNode(child, level + 1))
          }
        } else if (node.type === 'text') {
          html += `<p class="placeholder-text">[${this.escapePreviewText(node.name)} - ${this.escapePreviewText(node.prompt || '请配置提示词')}]</p>`
        } else if (node.type === 'table') {
          html += `<div class="placeholder-table"><p>[${this.escapePreviewText(node.name)} - 表格占位]</p></div>`
        } else if (node.type === 'chart') {
          html += `<div class="placeholder-chart"><p>[${this.escapePreviewText(node.name)} - 图表占位]</p></div>`
        }
      }
      structure.forEach(node => processNode(node, 1))
      html += '</div>'
      return html
    },

    getNodeIcon(type) {
      const map = {
        section: 'el-icon-folder-opened',
        subsection: 'el-icon-folder',
        text: 'el-icon-edit-outline',
        table: 'el-icon-s-grid',
        chart: 'el-icon-s-data'
      }
      return map[type] || 'el-icon-document'
    }
  }
}
</script>

<style scoped>
.template-editor-container {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.info-card {
  margin-bottom: 20px;
}

.structure-card {
  margin-bottom: 20px;
}

.structure-editor {
  display: flex;
  gap: 20px;
  min-height: 400px;
}

.structure-tree-panel {
  width: 350px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  overflow: auto;
}

.node-config-panel {
  flex: 1;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
}

.tree-node {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-actions {
  display: none;
}

.tree-node:hover .node-actions {
  display: inline;
}

.empty-config {
  text-align: center;
  padding-top: 100px;
  color: #909399;
}

.empty-config i {
  font-size: 48px;
  margin-bottom: 15px;
}

.node-config-form h4 {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.preview-card {
  margin-bottom: 20px;
}

.preview-content {
  padding: 20px;
  min-height: 300px;
  line-height: 1.8;
  color: #606266;
  background: #fafafa;
  border-radius: 4px;
}

::v-deep .preview-document h2 {
  font-size: 18px;
  color: #303133;
  margin: 20px 0 10px 0;
  padding-bottom: 5px;
  border-bottom: 2px solid #409eff;
}

::v-deep .preview-document h3 {
  font-size: 16px;
  color: #606266;
  margin: 15px 0 10px 0;
}

::v-deep .preview-document h4 {
  font-size: 14px;
  color: #909399;
  margin: 10px 0 10px 0;
}

::v-deep .placeholder-text,
::v-deep .placeholder-table,
::v-deep .placeholder-chart {
  padding: 20px;
  margin: 10px 0;
  background: #fff;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  text-align: center;
  color: #c0c4cc;
}
</style>
