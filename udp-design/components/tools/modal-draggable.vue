<template>
  <div>
    <n-modal
      v-bind="$attrs"
      :id="modalId"
      class="draggable-modal"
      :class="{ resize: isResize }"
      :show="show"
      @update:show="v => $emit('update:show', v)"
    >
      <template v-for="(val, key) in $slots" #[key]>
        <slot :name="key"></slot>
      </template>
    </n-modal>
    <Teleport v-if="showModal" :to="`#${modalId}`">
      <i v-if="isDrag" class="draggable-area" @mousedown="handleMousedown"></i>
      <i v-if="isFullScreen" class="full-screen" @click="fullScreenChange">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          version="1.1"
          viewBox="0 0 1024 1024"
          style="width: 1em; height: 1em; fill: currentColor"
        >
          <path
            v-show="!fullScreen"
            d="M401.675,897.5H161.5c-19.33,0-35-15.67-35-35V622.324c0-19.33,15.67-35,35-35s35,15.67,35,35V827.5h205.175  c19.33,0,35,15.67,35,35S421.005,897.5,401.675,897.5z M196.5,401.675V196.5h205.175c19.33,0,35-15.67,35-35s-15.67-35-35-35H161.5  c-19.33,0-35,15.67-35,35v240.175c0,19.33,15.67,35,35,35S196.5,421.005,196.5,401.675z M897.5,862.5V622.324  c0-19.33-15.67-35-35-35s-35,15.67-35,35V827.5H622.324c-19.33,0-35,15.67-35,35s15.67,35,35,35H862.5  C881.83,897.5,897.5,881.83,897.5,862.5z M897.5,401.675V161.5c0-19.33-15.67-35-35-35H622.324c-19.33,0-35,15.67-35,35  s15.67,35,35,35H827.5v205.175c0,19.33,15.67,35,35,35S897.5,421.005,897.5,401.675z"
          />
          <g v-show="fullScreen">
            <path
              d="M139.4,880.4c13.7,13.7,35.8,13.7,49.5,0l214-217V827c0,19.3,15.7,35,35,35s35-15.7,35-35V586.9c0-19.3-15.7-35-35-35   H197.8c-19.3,0-35,15.7-35,35s15.7,35,35,35h147.6l-206,209C125.8,844.5,125.8,866.7,139.4,880.4z"
            />
            <path
              d="M885.4,134.1c-13.7-13.7-35.8-13.7-49.5,0l-214,217V187.4c0-19.3-15.7-35-35-35s-35,15.7-35,35v240.2c0,19.3,15.7,35,35,35   H827c19.3,0,35-15.7,35-35s-15.7-35-35-35H679.4l206-209C899.1,169.9,899.1,147.7,885.4,134.1z"
            />
          </g>
        </svg>
      </i>
    </Teleport>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, watch, nextTick } from 'vue'
  interface Offset {
    x: number
    y: number
    maxX: number
    maxY: number
  }
  interface XY {
    x: number
    y: number
  }
  export default defineComponent({
    name: 'ModalDraggable',
    props: {
      show: {
        type: Boolean,
        default: false
      },
      // 是否拖拽
      isDrag: {
        type: Boolean,
        default: true
      },
      // 是否调整大小
      isResize: {
        type: Boolean,
        default: true
      },
      // 是否可全屏
      isFullScreen: {
        type: Boolean,
        default: true
      }
    },
    emits: ['update:show'],
    setup(props) {
      // 弹框id
      const modalId = ref('')
      // 是否将图标挂在到弹框上
      const showModal = ref(false)
      // 弹框的DOM
      let el: HTMLElement | null = null
      // 拖拽标识
      let dragging = false
      // 拖拽鼠标点信息
      let offset: Offset | null = null
      // 弹框的x，y坐标
      let xy: XY | null = null
      // 图标显示
      const fullScreen = ref(false)
      // 屏幕宽高
      let screenXY: XY = {
        x: window.innerWidth,
        y: window.innerHeight
      }
      // 弹框初始化
      const draggingInit = () => {
        modalId.value = ''
        showModal.value = false
        dragging = false
        offset = null
        xy = null
        el = null
      }
      // 鼠标按下
      const handleMousedown = (e: MouseEvent) => {
        dragging = true
        if (el) {
          offset = {
            x: e.offsetX,
            y: e.offsetY,
            maxX: screenXY.x - el.offsetWidth,
            maxY: screenXY.y - el.offsetHeight
          }
          el.style.cssText += `will-change: transform;user-select: none;`
        }
      }
      // 鼠标移动时
      const handleMousemove = (e: MouseEvent) => {
        if (dragging && el && offset && xy) {
          let x = e.clientX - offset.x
          let y = e.clientY - offset.y
          if (x < 0) {
            x = 0
          } else if (x > offset.maxX) {
            x = offset.maxX
          }
          if (y < 0) {
            y = 0
          } else if (y > offset.maxY) {
            y = offset.maxY
          }
          el.style.cssText += `left:${x}px;top:${y}px`
          xy = { x, y }
        }
      }
      // 鼠标抬起时
      const handleMouseup = () => {
        dragging = false
        offset = null
        if (el && xy) {
          el.style.cssText += `will-change: initial;max-height:calc(100vh - ${xy.y}px);max-width:calc(100vw - ${xy.x}px);user-select: initial;`
        }
      }
      // 浏览器大小改变时
      const handleResize = () => {
        const x = window.innerWidth
        const y = window.innerHeight
        if (screenXY && el) {
          const scaleX = x / screenXY.x
          const scaleY = y / screenXY.y
          let currentLeft = scaleX * el.offsetLeft
          let currentTop = scaleY * el.offsetTop
          let currentWidth = scaleX * el.offsetWidth
          let currentHeight = scaleY * el.offsetHeight
          if (currentLeft + currentWidth > x) {
            currentWidth = x - currentLeft
            if (currentWidth < 350) {
              currentWidth = 350
              currentLeft = x - currentWidth
            }
          }
          if (currentTop + currentHeight > y) {
            currentHeight = y - currentTop
            if (currentHeight < 145) {
              currentHeight = 145
              currentTop = y - currentHeight
            }
          }
          xy = { x: currentLeft, y: currentTop }
          el.style.cssText += `width:${currentWidth}px;height:${currentHeight}px;left:${currentLeft}px;top:${currentTop}px;max-height:calc(100vh - ${currentTop}px);max-width:calc(100vw - ${currentLeft}px);`
        }
        screenXY = { x, y }
      }
      // 节流
      let timer: number | null = null
      let prev = Date.now()
      const throttle = () => {
        const now = Date.now()
        const remain = 200 - (now - prev)
        timer && clearTimeout(timer)
        if (remain <= 0) {
          handleResize()
          prev = Date.now()
        } else {
          timer = setTimeout(handleResize, remain)
        }
      }
      // 全屏
      let originStyle = ''
      const fullScreenChange = () => {
        if (el) {
          const current = el.style.cssText
          const isFull = fullScreen.value
          fullScreen.value = !fullScreen.value
          nextTick(() => {
            if (el) {
              if (!isFull) {
                originStyle = current
                el.style.cssText += `position: absolute;left:0px;right:auto;top:0px;bottom:auto;width:100vw;height:100vh;max-height:100vh;max-width:100vw;`
              } else {
                el.style.cssText = originStyle
                originStyle = ''
              }
            }
          })
        }
      }
      watch(
        () => props.show,
        n => {
          if (n) {
            const nowId = `drag${new Date().getTime()}modal`
            modalId.value = nowId
            nextTick(() => {
              el = document.getElementById(nowId)
              if (el) {
                showModal.value = true

                // 添加拖拽监听
                window.addEventListener('mousemove', handleMousemove)
                window.addEventListener('mouseup', handleMouseup)
                window.addEventListener('resize', throttle)
                nextTick(() => {
                  if (el) {
                    // 设置弹框样式，解决Teleport渲染会刷新dom的问题
                    const left = el.offsetLeft
                    const top = el.offsetTop
                    el.style.cssText += `position: absolute;left:${left}px;right:auto;top:${top}px;bottom:auto;max-height:calc(100vh - ${top}px);max-width:calc(100vw - ${left}px);width:${el.offsetWidth}px;height:${el.offsetHeight}px;`
                    xy = {
                      x: left,
                      y: top
                    }
                  }
                })
              }
            })
          } else {
            window.removeEventListener('mousemove', handleMousemove)
            window.removeEventListener('mouseup', handleMouseup)
            window.removeEventListener('resize', throttle)
            draggingInit()
          }
        }
      )
      return {
        modalId,
        showModal,
        fullScreen,
        fullScreenChange,
        handleMousedown
      }
    }
  })
</script>

<style lang="less">
  .draggable-modal {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 11111;
    &.resize {
      resize: both;
      overflow: auto;
      max-width: 100vw;
      max-height: 100vh;
      min-height: 145px;
      min-width: 350px;
    }
    .n-dialog__content {
      flex: 1;
    }
    .draggable-area {
      position: absolute;
      top: 0;
      left: 0;
      width: calc(100% - 70px);
      height: 26px;
      &:hover {
        cursor: grab;
      }
      &:active {
        cursor: grabbing;
      }
    }
    .full-screen {
      position: absolute;
      right: 56px;
      top: 21px;
      font-size: var(--n-close-icon-size);
      cursor: pointer;
      &:hover {
        color: var(--mx-primary);
      }
    }
    .n-card-header ~ .full-screen {
      right: 70px;
      top: 29px;
    }
  }
</style>
