<template>
  <div class="scroll-container" ref="scrollContainer" @wheel.prevent="handleScroll">
    <slot />
  </div>
</template>

<script>
export default {
  name: 'ScrollPane',
  methods: {
    handleScroll(e) {
      const eventDelta = e.wheelDelta || -e.deltaY * 40
      const $scrollWrapper = this.$refs.scrollContainer
      $scrollWrapper.scrollLeft += eventDelta / 4
    }
  }
}
</script>

<style lang="scss" scoped>
.scroll-container {
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  width: 100%;
  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
