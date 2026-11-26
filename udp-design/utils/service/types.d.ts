// import { AxiosRequestConfig } from 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    // 是否忽略重复请求
    ignoreCancelToken?: boolean
    // 是否携带token
    withToken?: boolean
    // 是否显示默认错误处理弹框
    defaultError?: boolean
    // 是否在请求头加入TenantCode
    withTenantCode?: boolean
    // 是否对数据进行默认处理
    transformDate?: boolean
    // 是否忽略请求的公共uri
    ignoreBaseUri?: boolean
    // 是否返回全部的数据，包括config、header等
    allResponse?: boolean
  }
  interface AxiosInstance {
    (config: AxiosRequestConfig): Promise<unknown>
  }
}

export interface api {
  get: (url: string, params?: object) => Promise<unknown>
  post: (url: string, data?: object, params?: object) => Promise<unknown>
  put: (url: string, data?: object, params?: object) => Promise<unknown>
  delete: (url: string, params?: object) => Promise<unknown>
}
