<template>
  <div class="well-sidebar">
    <div class="sidebar-header">
      <i class="el-icon-location-information" style="color: #3D5FEF;"></i>
      <span>井列表</span>
    </div>
    <div class="sidebar-search">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索井名..."
        prefix-icon="el-icon-search"
        size="small"
        clearable
        @input="handleSearch"
      />
    </div>
    <div class="well-list" v-loading="loading">
      <div
        v-for="well in filteredWells"
        :key="well.wellId"
        :class="['well-item', { active: selectedWellId === well.wellId }]"
        @click="selectWell(well)"
      >
        <div class="well-icon">
          <i class="el-icon-location-information"></i>
        </div>
        <div class="well-info">
          <div class="well-name">{{ well.wellName }}</div>
          <div class="well-status">{{ well.status }}</div>
        </div>
      </div>
      <el-empty v-if="filteredWells.length === 0 && !loading" description="暂无井数据"></el-empty>
    </div>
  </div>
</template>

<script>
import { getWellList } from '@/api/well'

export default {
  name: 'WellSidebar',
  data() {
    return {
      wells: [],
      filteredWells: [],
      searchKeyword: '',
      selectedWellId: null,
      loading: false
    }
  },
  created() {
    this.loadWells()
  },
  methods: {
    async loadWells() {
      this.loading = true
      try {
        const res = await getWellList()
        if (res.code === 200) {
          this.wells = res.data || []
          this.filteredWells = this.wells
        }
      } catch (e) {
        console.error('加载井列表失败', e)
      } finally {
        this.loading = false
      }
    },

    handleSearch() {
      if (!this.searchKeyword) {
        this.filteredWells = this.wells
        return
      }
      const keyword = this.searchKeyword.toLowerCase()
      this.filteredWells = this.wells.filter(well =>
        well.wellName.toLowerCase().includes(keyword) ||
        well.wellId.toLowerCase().includes(keyword)
      )
    },

    selectWell(well) {
      this.selectedWellId = well.wellId
      // 通过事件总线通知其他组件
      this.$bus.$emit('well-selected', well)
      // 也可以通过store
      this.$store.commit('well/SET_SELECTED_WELL', well)
    }
  }
}
</script>

<style scoped>
.well-sidebar {
  width: 260px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-search {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
}

.well-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.well-item {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #595959;
  border-left: 3px solid transparent;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  &.active {
    background: #e8edfd;
    color: $base-color;
    border-left-color: $base-color;
  }
}

.well-icon {
  width: 32px;
  height: 32px;
  background: #7d92f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
}

.well-info {
  flex: 1;
}

.well-name {
  font-weight: 500;
  color: #262626;
}

.well-item.active .well-name {
  color: $base-color;
}

.well-status {
  font-size: 12px;
  color: #8c8c8c;
}
</style>
