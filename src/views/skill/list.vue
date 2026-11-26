<template>
  <div class="skill-list-container">
    <!-- 快捷入口卡片 -->
    <div class="quick-access">
      <div class="quick-access-title">快速入口</div>
      <div class="quick-cards">
        <div class="quick-card" @click="goToDocParser('images')">
          <div class="quick-icon">
            <i class="el-icon-picture-outline"></i>
          </div>
          <div class="quick-info">
            <div class="quick-name">图片提取</div>
            <div class="quick-desc">从Word文档提取图片</div>
          </div>
        </div>
        <div class="quick-card" @click="goToDocParser('tables')">
          <div class="quick-icon" style="background: #409eff;">
            <i class="el-icon-s-grid"></i>
          </div>
          <div class="quick-info">
            <div class="quick-name">表格提取</div>
            <div class="quick-desc">从Word文档提取表格</div>
          </div>
        </div>
        <div class="quick-card" @click="$router.push('/skill/fracturing')">
          <div class="quick-icon" style="background: #7c3aed;">
            <i class="el-icon-document-add"></i>
          </div>
          <div class="quick-info">
            <div class="quick-name">压裂文档生成</div>
            <div class="quick-desc">基于模板的压裂设计自动生成</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 顶部操作栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索技能包名称或描述"
          prefix-icon="el-icon-search"
          style="width: 300px"
          clearable
          @input="handleSearch"
        />
        <el-select
          v-model="filterCategory"
          placeholder="技能分类"
          style="width: 150px; margin-left: 10px"
          clearable
          @change="handleFilter"
        >
          <el-option label="数据采集" value="data" />
          <el-option label="数据处理" value="processing" />
          <el-option label="报告生成" value="report" />
          <el-option label="知识问答" value="qa" />
          <el-option label="自定义" value="custom" />
        </el-select>
        <el-select
          v-model="filterStatus"
          placeholder="状态"
          style="width: 120px; margin-left: 10px"
          clearable
          @change="handleFilter"
        >
          <el-option label="已启用" value="enabled" />
          <el-option label="已禁用" value="disabled" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" icon="el-icon-plus" @click="handleCreate">
          新建技能包
        </el-button>
      </div>
    </div>

    <!-- 技能包列表 -->
    <el-table
      v-loading="tableLoading"
      :data="tableData"
      border
      stripe
      class="skill-table"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="技能包名称" min-width="180" show-overflow-tooltip>
        <template slot-scope="{ row }">
          <span class="skill-name" @click="handleDetail(row)">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="120" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="getCategoryType(row.category)" size="small">
            {{ getCategoryName(row.category) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="nodeCount" label="节点数量" width="100" align="center" />
      <el-table-column prop="useCount" label="使用次数" width="100" align="center" />
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-switch
            v-model="row.status"
            :active-value="'enabled'"
            :inactive-value="'disabled'"
            @change="handleStatusChange(row)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="160" align="center" />
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template slot-scope="{ row }">
          <el-button type="text" size="small" @click="handleDetail(row)">详情</el-button>
          <el-button type="text" size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button type="text" size="small" @click="handleDuplicate(row)">复制</el-button>
          <el-button type="text" size="small" class="danger-text" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      :current-page="pagination.page"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="pagination.size"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top: 20px; text-align: right"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <!-- 技能包详情弹窗 -->
    <el-dialog
      :visible.sync="detailVisible"
      title="技能包详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="currentSkill" class="skill-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="技能包名称">
            {{ currentSkill.name }}
          </el-descriptions-item>
          <el-descriptions-item label="分类">
            <el-tag :type="getCategoryType(currentSkill.category)" size="small">
              {{ getCategoryName(currentSkill.category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ currentSkill.description }}
          </el-descriptions-item>
          <el-descriptions-item label="节点数量">
            {{ currentSkill.nodeCount }}
          </el-descriptions-item>
          <el-descriptions-item label="使用次数">
            {{ currentSkill.useCount }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ currentSkill.status === 'enabled' ? '已启用' : '已禁用' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ currentSkill.createTime }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="node-list" style="margin-top: 20px">
          <h4>包含节点</h4>
          <el-table :data="currentSkill.nodes || []" border size="small">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="name" label="节点名称" />
            <el-table-column prop="type" label="节点类型" width="120" />
            <el-table-column prop="outputFormat" label="输出格式" width="120" />
          </el-table>
        </div>

        <div class="skill-config" style="margin-top: 20px">
          <h4>配置参数</h4>
          <el-form label-width="100px" size="small">
            <el-form-item label="最大执行时间">
              <el-input-number
                v-model="currentSkill.config.maxExecutionTime"
                :min="1"
                :max="3600"
              />
              <span style="margin-left: 10px; color: #999">秒</span>
            </el-form-item>
            <el-form-item label="重试次数">
              <el-input-number
                v-model="currentSkill.config.retryCount"
                :min="0"
                :max="10"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEditFromDetail">编辑</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { getSkillList, updateSkill, deleteSkill, duplicateSkill } from '@/api/skill'

export default {
  name: 'SkillList',
  data() {
    return {
      searchKeyword: '',
      filterCategory: '',
      filterStatus: '',
      tableLoading: false,
      tableData: [],
      pagination: {
        page: 1,
        size: 10,
        total: 0
      },
      detailVisible: false,
      currentSkill: null
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    // 跳转到文档解析页面
    goToDocParser(tab) {
      this.$router.push({
        path: '/skill/doc-parser',
        query: { tab: tab }
      })
    },

    loadData() {
      this.tableLoading = true
      getSkillList({
        page: this.pagination.page,
        size: this.pagination.size,
        keyword: this.searchKeyword,
        category: this.filterCategory,
        status: this.filterStatus
      })
        .then(res => {
          this.tableData = res.data.list || []
          this.pagination.total = res.data.total || 0
        })
        .catch(err => {
          this.$message.error(err.message || '加载数据失败')
        })
        .finally(() => {
          this.tableLoading = false
        })
    },

    handleSearch() {
      this.pagination.page = 1
      this.loadData()
    },

    handleFilter() {
      this.pagination.page = 1
      this.loadData()
    },

    handleSizeChange(size) {
      this.pagination.size = size
      this.loadData()
    },

    handleCurrentChange(page) {
      this.pagination.page = page
      this.loadData()
    },

    handleCreate() {
      this.$router.push('/skill/editor')
    },

    handleDetail(row) {
      this.currentSkill = { ...row }
      this.detailVisible = true
    },

    handleEdit(row) {
      this.$router.push(`/skill/editor/${row.id}`)
    },

    handleEditFromDetail() {
      this.detailVisible = false
      this.handleEdit(this.currentSkill)
    },

    handleDuplicate(row) {
      this.$confirm('确定要复制该技能包吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      })
        .then(() => {
          duplicateSkill(row.id)
            .then(() => {
              this.$message.success('复制成功')
              this.loadData()
            })
            .catch(err => {
              this.$message.error(err.message || '复制失败')
            })
        })
        .catch(() => {})
    },

    handleDelete(row) {
      this.$confirm('确定要删除该技能包吗？删除后无法恢复。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          deleteSkill(row.id)
            .then(() => {
              this.$message.success('删除成功')
              this.loadData()
            })
            .catch(err => {
              this.$message.error(err.message || '删除失败')
            })
        })
        .catch(() => {})
    },

    handleStatusChange(row) {
      updateSkill(row.id, { status: row.status })
        .then(() => {
          this.$message.success('状态更新成功')
        })
        .catch(err => {
          this.$message.error(err.message || '状态更新失败')
          row.status = row.status === 'enabled' ? 'disabled' : 'enabled'
        })
    },

    getCategoryName(category) {
      const map = {
        data: '数据采集',
        processing: '数据处理',
        report: '报告生成',
        qa: '知识问答',
        custom: '自定义'
      }
      return map[category] || category
    },

    getCategoryType(category) {
      const map = {
        data: 'success',
        processing: 'primary',
        report: 'warning',
        qa: 'info',
        custom: ''
      }
      return map[category] || ''
    }
  }
}
</script>

<style scoped>
.skill-list-container {
  padding: 16px 20px;
  background: #f0f2f5;
  min-height: calc(100vh - 120px);
}

/* 快捷入口样式 - 企业级卡片 */
.quick-access {
  background: #fff;
  border-radius: 4px;
  padding: 16px 20px;
  margin-bottom: 16px;
  border: 1px solid #e8e8e8;
}

.quick-access-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.quick-cards {
  display: flex;
  gap: 16px;
}

.quick-card {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 260px;
  flex: 1;
}

.quick-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.quick-card:nth-child(2) {
  background: #fff;
}

.quick-icon {
  width: 40px;
  height: 40px;
  background: #ecf5ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
}

.quick-icon i {
  font-size: 20px;
  color: #409eff;
}

.quick-info {
  flex: 1;
}

.quick-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
}

.quick-desc {
  font-size: 12px;
  color: #909399;
}

/* 工具栏样式 - 企业级表单 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 20px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-left >>> .el-input__inner {
  border-radius: 4px;
  border-color: #dcdfe6;
}

.toolbar-left >>> .el-input__inner:focus {
  border-color: #409eff;
}

.toolbar-left >>> .el-select .el-input__inner {
  border-radius: 4px;
}

/* 表格容器 */
.skill-list-container >>> .el-table {
  border-radius: 4px;
  overflow: hidden;
}

.skill-list-container >>> .el-table__header th {
  background: #fafafa !important;
  color: #606266;
  font-weight: 500;
}

.skill-list-container >>> .el-table__body td {
  color: #303133;
}

.skill-name {
  color: #409eff;
  cursor: pointer;
}

.skill-name:hover {
  color: #66b1ff;
}

.danger-text {
  color: #f56c6c;
}

.node-list h4,
.skill-config h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

/* 分页样式 */
.skill-list-container >>> .el-pagination {
  background: #fff;
  padding: 12px 16px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
}

/* 表格样式 */
.skill-table {
  border-radius: 4px;
}
</style>
