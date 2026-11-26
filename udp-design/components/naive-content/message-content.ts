import { useMessage } from 'naive-ui'
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'MessageContent',
  setup() {
    // 挂载在 window 方便与在js中使用
    window['$message'] = useMessage()
  },
  render() {
    return null
  }
})
