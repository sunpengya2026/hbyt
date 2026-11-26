<template>
  <div class="tags-view-container">
    <scroll-pane class="tags-view-wrapper" @scroll="scrollContent">
      <router-link
        v-for="tag in visitedViews"
        :key="tag.path"
        :to="{ path: tag.path, query: tag.query }"
        tag="span"
        class="tags-view-item"
        :class="isActive(tag) ? 'active' : ''"
      >
        {{ tag.title }}
        <span class="el-icon-close" @click.prevent.stop="closeSelectedTag(tag)" />
      </router-link>
    </scroll-pane>
  </div>
</template>

<script>
import ScrollPane from './ScrollPane'

export default {
  name: 'TagsView',
  component: {
    ScrollPane
  },
  data() {
    return {
      visitedViews: []
    }
  },
  watch: {
    $route() {
      this.updateViews()
    }
  },
  mounted() {
    this.updateViews()
  },
  methods: {
    updateViews() {
      // 只显示当前路由的标签，不显示初始的"首页"标签
      const currentPath = this.$route.path
      const currentTitle = this.$route.meta.title || this.getTitleFromPath(currentPath)

      // 如果当前页面不在 visitedViews 中，则添加
      const exists = this.visitedViews.some(v => v.path === currentPath)
      if (!exists && currentPath !== '/') {
        this.visitedViews = [{ path: currentPath, title: currentTitle }]
      }
    },
    getTitleFromPath(path) {
      // 根据路径映射标题
      const pathMap = {
        '/report-index/index': '首页',
        '/workbench/index': '工作台',
      '/knowledge/list': '知识库',
      '/skill/list': '技能包',
      '/skill/fracturing': '压裂文档生成',
      '/skill/doc-parser': '文档解析',
      '/template/list': '模板管理',
        '/report-generate/index': '文档生成',
        '/report-editor/list': '文档编辑',
        '/report-extract/index': '智能提取'
      }
      return pathMap[path] || '页面'
    },
    isActive(route) {
      return route.path === this.$route.path
    },
    closeSelectedTag(view) {
      const index = this.visitedViews.findIndex(v => v.path === view.path)
      if (index > -1) {
        this.visitedViews.splice(index, 1)
      }
    },
    scrollContent() {}
  }
}
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: 34px;
  width: 100%;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 16px;
  box-sizing: border-box;

  .tags-view-wrapper {
    height: 100%;
    display: flex;
    align-items: center;

    .tags-view-item {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      height: 26px;
      line-height: 26px;
      border: 1px solid #e4e7ed;
      color: #606266;
      background: #fff;
      padding: 0 12px 0 10px;
      font-size: 12px;
      margin-right: 8px;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        color: #3D5FEF;
        border-color: #c6e2ff;
        background: #ecf5ff;
      }

      &.active {
        background-color: #3D5FEF;
        color: #fff;
        border-color: #3D5FEF;

        &::before {
          content: '';
          background: #fff;
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 6px;
        }

        .el-icon-close {
          color: #fff;

          &:hover {
            background-color: rgba(255, 255, 255, 0.2);
          }
        }
      }

      .el-icon-close {
        margin-left: 6px;
        width: 14px;
        height: 14px;
        line-height: 14px;
        text-align: center;
        border-radius: 50%;
        font-size: 10px;
        color: #909399;
        transition: all 0.2s;

        &:hover {
          background-color: #c0c4cc;
          color: #fff;
        }
      }
    }
  }
}
</style>
