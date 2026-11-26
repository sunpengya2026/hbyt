<template>
  <div class="sidebar-logo" :class="{ 'collapse': collapse }">
    <span class="logo-icon"></span>
    <span class="logo-title">煤层气压裂工程设计方案智能生成</span>
  </div>
</template>

<script>
export default {
  name: 'Logo',
  props: {
    collapse: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="scss" scoped>
// 侧栏 Logo（折叠侧边栏布局时使用）。
// 实现方式对齐 5370dh-cbm-front/src/layout/components/Sidebar/Logo.vue：
// 徽标走 CSS background-image（不占 DOM 语义），标题白字加粗单行省略。
// 当前 layout/index.vue 用的是顶部横向导航（Sidebar.vue），本组件未挂载，
// 但保持与 Sidebar.vue 同一套视觉，将来切布局不会突然「掉档」。
.sidebar-logo {
  height: 56px;
  line-height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: $navbar-bg;
  overflow: hidden;

  .logo-icon {
    width: 25px;
    height: 25px;
    margin-right: 12px;
    flex-shrink: 0;
    /* [验收裁剪] 图片已删除
    background-image: url('~@/assets/images/logo@2x.png');
    */
    background-image: none;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
  }

  .logo-title {
    color: #fff;
    font-size: 16px;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.collapse {
    padding: 0;
    justify-content: center;

    .logo-icon {
      margin-right: 0;
    }

    .logo-title {
      display: none;
    }
  }
}
</style>
