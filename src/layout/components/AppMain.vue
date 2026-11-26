<template>
  <section class="app-main">
    <transition name="fade-transform" mode="out-in">
      <router-view :key="key" />
    </transition>
  </section>
</template>

<script>
export default {
  name: 'AppMain',
  computed: {
    key() {
      return this.$route.path
    }
  }
}
</script>

<style lang="scss" scoped>
.app-main {
  min-height: 0;    /* 改为 0，让高度由内容撑出（由子元素 well-workbench 的 calc(100vh-90px) 决定） */
  flex: 1 1 auto;
  width: 100%;
  position: relative;
  overflow: visible; /* 改为 visible，让子元素滚动条可见 */
  // 内容区统一铺浅灰底（与参考图一致）。留白交给各页面自己的容器负责：
  // 这里若再加 padding，会和页面内的 .cockpit / .panel 等内层 padding 叠加，
  // 表现为「灰底比白卡片窄一圈」，且会让 1366 屏横向溢出。
  background-color: #f0f2f5;
  box-sizing: border-box;
  min-width: 0;
}

.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all .5s;
}

.fade-transform-enter {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
