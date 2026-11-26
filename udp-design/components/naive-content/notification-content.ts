import { useNotification } from 'naive-ui'
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'NotificationContent',
  setup() {
    // 挂载在 window 方便与在js中使用
    window['$notification'] = useNotification()
  },
  render() {
    return null
  }
})
