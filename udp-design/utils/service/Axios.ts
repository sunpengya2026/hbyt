import axios, { AxiosInstance, AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios'
import { transformRequestData } from 'udp/utils/service/transform'
import { transformAuthor } from 'udp/utils/service/authorization'
import { handleAxiosError } from 'udp/utils/service/error'
import { AxiosCanceler } from 'udp/utils/service/axiosCancel'
import plugin from '@/config/plugin'
import { router } from 'udp/router'
import * as userConfig from '@/config/theme-overrides'
import { encodeURIFormate } from 'udp/store/user-store'
import { udpUserStore } from 'udp/store/user-store'
export default class CustomAxiosInstance {
  private axiosInstance: AxiosInstance
  

  constructor(options: AxiosRequestConfig) {
    this.axiosInstance = axios.create(options)
    this.setInterceptor()
  }

  getAxios(): AxiosInstance {
    return this.axiosInstance
  }

  /**
   * @description: 重新配置axios
   */
  reCreateAxios(options: AxiosRequestConfig) {
    if (!this.axiosInstance) {
      return
    }
    this.axiosInstance = axios.create(options)
  }

  /**
   * @description: 拦截器配置
   */
  setInterceptor() {
    const axiosCanceler = new AxiosCanceler()
    let isErrorMsg = true
    this.axiosInstance.interceptors.request.use(
      async (config: AxiosRequestConfig) => {
        // 是否忽略重复请求
        const { ignoreCancelToken } = config
        ignoreCancelToken !== false && axiosCanceler.addPending(config)

        // 参数转化
        if (config.transformDate !== false) {
          const contentType = config.headers?.['Content-Type'] as string
          config.data = transformRequestData(config.data, contentType)
        }
        // token处理
        transformAuthor(config)

        // baseURL处理
        config.baseURL = config.baseURL || (config.ignoreBaseUri ? '/' : userConfig.baseUri || '/')

        // 设置是否显示默认error弹框
        isErrorMsg = config.defaultError !== false
        const { interceptorsRequest } = plugin
        interceptorsRequest && (await interceptorsRequest(config))
        return config
      },
      (err: AxiosError) => {
        return handleAxiosError(err, isErrorMsg)
      }
    )
    this.axiosInstance.interceptors.response.use(
      async (response: AxiosResponse<unknown>) => {
        const UserStore = udpUserStore()
        response && axiosCanceler.removePending(response.config)
        const { interceptorsResponse } = plugin
        interceptorsResponse && (await interceptorsResponse(response))
        if (response?.data?.code === 401) {
          // debugger
          await UserStore.logout()
          console.log(router, 'router')
          console.log(JSON.stringify(router.currentRoute.value.fullPath) + '00000000currentRouter')
          const currentRouter = encodeURIFormate(router.currentRoute.value.fullPath)
          router.push(`/login?redirectUrl=${currentRouter}`)
          return false
        }
        if (response?.data && !response?.config?.allResponse) {
          return response.data
        } else {
          return response
        }
      },
      (err: AxiosError) => {
        // return handleAxiosError(err, isErrorMsg)
        if(err.config && err.config.url?.includes('sys/i18n/query/')){
          return Promise.reject(err)
        }
        // const UserStore = udpUserStore()
        if ((err.code === 'ERR_BAD_REQUEST' && err.message.includes('401'))|| (err.code === 'ECONNABORTED' && err.message.includes('timeout'))) {
          // 处理超时错误
          console.error('请求超时或权限过期，请稍后再试');
          // debugger
          // UserStore.logout()
          // const currentRouter = encodeURIFormate(router.currentRoute.value.fullPath)
          // router.push(`/login?redirectUrl=${currentRouter}`)          
          return Promise.reject(new Error('请求超时或权限过期，请稍后再试')); // 返回一个被拒绝的promise，以便后续的catch能够捕获到这个错误
        }
        // 对于其他类型的错误，返回原生的错误响应
        return Promise.reject(err);
      }
    )
  }
}
