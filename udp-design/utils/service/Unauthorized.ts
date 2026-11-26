import { udpUserStore } from 'udp/store/user-store'
import { http } from 'udp/utils/service/request'
import type { AxiosError } from 'axios'
let isRefreshing = false
let unauthorizedCatch: any[] = []
function refreshTokenFetched(isResove?: boolean) {
  let token: string | null = null
  if (isResove) {
    const userStore = udpUserStore()
    token = userStore.getToken
  }
  unauthorizedCatch.forEach(callback => {
    callback(token)
  })
  unauthorizedCatch = []
}

export function refreshToken(error: AxiosError, errCallback: any) {
  const userStore = udpUserStore()
  if (userStore.getRememberMe()) {
    if (!isRefreshing) {
      isRefreshing = true
      userStore
        .doRefreshToken()
        .then(() => {
          refreshTokenFetched(true)
        })
        .catch(() => {
          refreshTokenFetched()
          errCallback()
        })
        .finally(() => {
          isRefreshing = false
        })
    }
    // 使其一直处于pedding状态
    return new Promise((resolve, reject) => {
      unauthorizedCatch.push((token: string) => {
        if (token) {
          const config = error.config
          if (config.headers) {
            config.headers['Authorization'] = 'Bearer ' + token
            delete config.cancelToken
            resolve(http(config))
          }
        } else {
          reject(error)
        }
      })
    })
  } else {
    errCallback()
    refreshTokenFetched()
  }
}
