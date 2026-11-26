import { useLoadingBar } from 'naive-ui'
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'LoadingContent',
  setup() {
    // 挂载在 window 方便与在js中使用
    window['$loading'] = useLoadingBar()
  },
  render() {
    return null
  }
})
