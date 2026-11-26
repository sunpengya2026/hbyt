import axios from 'axios'
import { Message } from 'element-ui'
import store from '@/store'
import router from '@/router'
import { getToken } from '@/utils/auth'

const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 300000  // 5分钟超时
})

function expireSession(config) {
  if (!config.sessionIdentity || config.sessionIdentity !== store.getters.userInfo) return

  Message.error('登录信息已失效，请重新登录')
  store.dispatch('user/resetToken').then(() => {
    if (router.currentRoute.path !== '/login') router.replace('/login')
  })
}

// request interceptor
service.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) config.headers['Authorization'] = token
    if (!config.skipSessionReset) config.sessionIdentity = store.getters.userInfo
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json; charset=UTF-8'
    }
    return config
  },
  error => {
    console.log(error)
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  response => {
    // 如果是 blob 类型响应，直接返回原始数据
    if (response.config.responseType === 'blob') {
      return response.data
    }

    const res = response.data

    // code: 0 或 200 或 'OK' 都视为成功
    if (res.code === 0 || res.code === 200 || res.code === 'ok' || res.code === 'OK') {
      return res
    } else {
      if (['ERROR-TOKEN-INVALID', 'ERROR-TOKEN-NULL', -401, 401].includes(res.code) &&
          !response.config.skipSessionReset) {
        expireSession(response.config)
      } else {
        Message.error(res.message || '请求失败')
      }
      return Promise.reject(new Error(res.message || '请求失败'))
    }
  },
  error => {
    console.log('err' + error)
    if (error.response && error.response.status === 401 && error.config && !error.config.skipSessionReset) {
      expireSession(error.config)
      return Promise.reject(error)
    }
    let message = error.message
    if (error.response) {
      const data = error.response.data
      if (data instanceof Blob) {
        // responseType='blob' 时错误体也是 Blob，必须异步读出来，
        // 否则只能拿到 statusText（503 时为空），用户看到一片空白提示。
        return data.text().then(text => {
          let parsed = null
          try {
            parsed = JSON.parse(text)
          } catch (e) {
            parsed = null
          }
          const msg = (parsed && (parsed.message || parsed.msg)) ||
            (text && text.length < 300 ? text : '') ||
            `请求失败（HTTP ${error.response.status}）`
          Message({ message: msg, type: 'error', duration: 5 * 1000 })
          const err2 = new Error(msg)
          err2.response = error.response
          return Promise.reject(err2)
        }).catch(() => {
          Message({ message: `请求失败（HTTP ${error.response.status}）`, type: 'error', duration: 5 * 1000 })
          return Promise.reject(error)
        })
      }
      message = (data && (data.message || data.msg)) || error.response.statusText
        || `请求失败（HTTP ${error.response.status}）`
    }
    Message({
      message: message,
      type: 'error',
      duration: 5 * 1000
    })
    return Promise.reject(error)
  }
)

export default service
