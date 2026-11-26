import CustomAxiosInstance from 'udp/utils/service/Axios'
import { AxiosCanceler } from 'udp/utils/service/axiosCancel'
import * as config from '@/config/theme-overrides'

const axiosInstance = new CustomAxiosInstance({
  timeout: config.timeout || 60000 // 请求超时时间
})
export const http = axiosInstance.getAxios()

export const $api = {
  get(url: string, params?: object, config = {}) {
    // 查
    return http({
      url,
      method: 'get',
      params,
      ...config
    })
  },
  post(url: string, data?: object, params?: object, config = {}) {
    // 增
    return http({
      url,
      method: 'post',
      params,
      data,
      ...config
    })
  },
  put(url: string, data?: object, params?: object, config = {}) {
    // 改
    return http({
      url,
      method: 'put',
      params,
      data,
      ...config
    })
  },
  delete(url: string, params?: object, config = {}) {
    // 删
    return http({
      url,
      method: 'delete',
      params,
      ...config
    })
  },
  cancelAllPending() {
    // 取消所有pending的请求
    const axiosCanceler = new AxiosCanceler()
    axiosCanceler.removeAllPending()
  }
}
