import { AxiosRequestConfig } from 'axios'
import { udpUserStore } from 'udp/store/user-store'

export function transformAuthor(config: AxiosRequestConfig) {
  const userStore = udpUserStore()
  const token = userStore.getToken
  const tenantId = userStore.getTenantId
  const { withToken, withTenantCode } = config
  if (withToken === false) {
    // 无权限认证
    delete config?.headers?.['Authorization']
  } else {
    // 有权限认证
    if (token && !config.headers?.['Authorization']) {
      config.headers || (config.headers = {})
      config.headers['Authorization'] = 'Bearer ' + token
    }
  }
  // 加租户code
  const tenantCode = userStore.tenantCode
  if ((withTenantCode && !config.headers?.['TenantCode'] && tenantCode)) {
    config.headers || (config.headers = {})
    config.headers['tenantCode'] = tenantCode
  }
  config.headers['tenant-id'] = tenantId
}
