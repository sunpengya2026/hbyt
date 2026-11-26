<template>
  <div class="dashboard-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <div class="kpi-card">
          <div class="kpi-icon" style="background: #e8f2fd; color: #0071e3;">
            <i class="el-icon-document"></i>
          </div>
          <div class="kpi-info">
            <div class="kpi-value">{{ statistics.reportCount }}</div>
            <div class="kpi-label">报告总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card">
          <div class="kpi-icon" style="background: #edfbf1; color: #34c759;">
            <i class="el-icon-circle-check"></i>
          </div>
          <div class="kpi-info">
            <div class="kpi-value">{{ statistics.completedCount }}</div>
            <div class="kpi-label">已完成执行</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card">
          <div class="kpi-icon" style="background: #fff6e8; color: #ff9f0a;">
            <i class="el-icon-time"></i>
          </div>
          <div class="kpi-info">
            <div class="kpi-value">{{ statistics.scheduleCount }}</div>
            <div class="kpi-label">定时任务</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="kpi-card">
          <div class="kpi-icon" style="background: #f5f3ff; color: #7c3aed;">
            <i class="el-icon-collection"></i>
          </div>
          <div class="kpi-info">
            <div class="kpi-value">{{ statistics.skillCount }}</div>
            <div class="kpi-label">技能包</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="16">
        <el-card>
          <div slot="header">
            <span>最近执行记录</span>
            <el-button style="float: right;" type="text" @click="$router.push('/history/list')">
              查看全部
            </el-button>
          </div>
          <el-table :data="recentExecutions" style="width: 100%">
            <el-table-column prop="reportName" label="报告名称" min-width="150" />
            <el-table-column prop="triggerType" label="触发方式" width="100">
              <template slot-scope="{row}">
                <el-tag :type="row.triggerType === 'scheduled' ? 'primary' : 'info'" size="small">
                  {{ row.triggerType === 'scheduled' ? '定时' : '手动' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template slot-scope="{row}">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="startTime" label="开始时间" width="160" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div slot="header">
            <span>快捷操作</span>
          </div>
          <div class="quick-actions">
            <el-button class="action-btn" icon="el-icon-plus" @click="$router.push('/report-generate/index')">
              新建报告
            </el-button>
            <el-button class="action-btn" icon="el-icon-document-copy" @click="$router.push('/report-manage/history')">
              查看历史
            </el-button>
            <el-button class="action-btn" icon="el-icon-time" @click="$router.push('/schedule/list')">
              定时任务
            </el-button>
            <el-button class="action-btn" icon="el-icon-collection" @click="$router.push('/skill/list')">
              技能包
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: 'Dashboard',
  data() {
    return {
      statistics: {
        reportCount: 12,
        completedCount: 156,
        scheduleCount: 8,
        skillCount: 24
      },
      recentExecutions: [
        { reportName: '特种设备运行周报', triggerType: 'scheduled', status: '成功', startTime: '2026-07-23 08:00:00' },
        { reportName: '生产运行日报', triggerType: 'manual', status: '成功', startTime: '2026-07-23 10:30:00' },
        { reportName: '设备维护周报', triggerType: 'scheduled', status: '失败', startTime: '2026-07-22 08:00:00' }
      ]
    }
  },
  methods: {
    getStatusType(status) {
      const types = { '成功': 'success', '失败': 'danger', '运行中': 'warning' }
      return types[status] || 'info'
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
}

.kpi-card {
  display: flex;
  align-items: center;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.kpi-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
}

.kpi-info {
  flex: 1;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: #1d1d1f;
}

.kpi-label {
  font-size: 13px;
  color: #8e8e93;
  margin-top: 4px;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  width: 100%;
}
</style>
