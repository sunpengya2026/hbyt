<template>
  <div class="app-wrapper">
    <div class="main-container">
      <!-- 顶部横向导航 -->
      <sidebar class="horizontal-sidebar" />
      <app-main />
    </div>
  </div>
</template>

<script>
import { Navbar, Sidebar, AppMain, TagsView, Logo } from './components'
import ResizeMixin from './mixin/ResizeHandler'

export default {
  name: 'Layout',
  components: {
    Navbar,
    Sidebar,
    AppMain,
    TagsView,
    Logo
  },
  mixins: [ResizeMixin],
  computed: {
    sidebar() {
      return this.$store.state.app.sidebar
    },
    isCollapse() {
      return !this.sidebar.opened
    }
  }
}
</script>

<style lang="scss" scoped>
.app-wrapper {
  display: flex;
  height: 100%;
  width: 100%;
}

.main-container {
  flex: 1;
  overflow: visible;  /* 允许内容溢出并由子元素自行滚动（由 .well-workbench 接管） */
  display: flex;
  flex-direction: column;
  min-width: 0;       /* 防止 flex 子项被内容撑宽 */
}

.horizontal-sidebar {
  // 与 Sidebar.vue 的 $navbar-bg（#2F82EB）以及它 computed 的 navbarBg() 保持一致，
  // 三处都改才不会出现「导航栏下面露一条深色」。
  background-color: #2F82EB;
  flex-shrink: 0;
}
</style>
