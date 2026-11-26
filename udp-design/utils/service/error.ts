import type { AxiosError } from 'axios'
import { udpUserStore } from 'udp/store/user-store'
import { NButton, NotificationReactive } from 'naive-ui'
import * as config from '@/config/theme-overrides'
import { refreshToken } from './Unauthorized'
import { router } from 'udp/router'
import { h } from 'vue'
import { i18n } from 'udp/lang'
const { t } = i18n.global

export const ERROR_STATUS = {
  400: 'f_msg_400',
  401: 'f_msg_401',
  403: 'f_msg_403',
  404: 'f_msg_404',
  405: 'f_msg_405',
  408: 'f_msg_408',
  500: 'f_msg_500',
  501: 'f_msg_501',
  502: 'f_msg_502',
  503: 'f_msg_503',
  504: 'f_msg_504',
  505: 'f_msg_505'
}

type ErrorStatus = keyof typeof ERROR_STATUS

const errAction = {}

const HandleUnauthorized = (error: AxiosError, isErrorMsg?: boolean) => {
  const errorCode = error.response?.status as number
  if (errAction[errorCode]) {
    return Promise.reject(error)
  }
  const curRoute = router.currentRoute.value
  const userStore = udpUserStore()
  if (config.isUnauthorizedJumpToLoginPage) {
    if (curRoute.path !== '/login') {
      userStore.logoutToPage()
    }
  } else {
    errAction[errorCode] = true
    const notification = window['$notification']
    if (notification && curRoute.path !== '/login' && isErrorMsg) {
      let count = 10
      const content = (note: NotificationReactive) => {
        return [
          h(
            NButton,
            {
              text: true,
              type: 'primary',
              onClick: () => {
                userStore.logoutToPage()
                note.destroy()
              }
            },
            {
              default: () => t('f_login_msg_login')
            }
          ),
          h('span', { style: 'margin-left:10px;font-size:12px' }, `${t('f_msg_time_close')}${count}`)
        ]
      }
      const note = notification.error({
        content: 'Unauthorized',
        duration: 10000,
        action: () => content(note),
        meta: () => h('span', {}, t('f_msg_401')),
        onAfterEnter: () => {
          const minusCount = () => {
            count--
            note.action = () => content(note)
            if (count > 0 && errAction[errorCode]) {
              window.setTimeout(minusCount, 1000)
            } else if (count === 0) {
              userStore.logoutToPage()
              note.destroy()
            }
          }
          window.setTimeout(minusCount, 1000)
        },
        onAfterLeave: () => {
          errAction[errorCode] = false
        }
      })
    } else {
      setTimeout(() => {
        errAction[errorCode] = false
      }, 3000)
    }
  }
}

export function handleAxiosError(error: AxiosError, isErrorMsg?: boolean) {
  const errorCode = error.response?.status as number
  // if (errorCode === 401 && !error.config.url?.includes('/uaa/oauth/token')) {
  //   return refreshToken(error, () => HandleUnauthorized(error, isErrorMsg))
  // }
  if (isErrorMsg) {
    const notification = window['$notification']
    if (error.response) {
      const errorMessage = error.response.data.error_description
      if (errAction[errorCode]) {
        return Promise.reject(error)
      }
      errAction[errorCode] = true
      if (errorCode !== 401) {
        if (ERROR_STATUS[`${errorCode as ErrorStatus}`]) {
          notification.error({
            content: `${errorCode}`,
            meta: () => h('span', {}, t(ERROR_STATUS[`${errorCode as ErrorStatus}`])),
            duration: 10000,
            onAfterLeave: () => {
              errAction[errorCode] = false
            }
          })
        } else {
          notification.error({
            content: 'Error',
            meta: () => h('span', {}, errorMessage || t('f_msg_error')),
            duration: 10000,
            onAfterLeave: () => {
              errAction[errorCode] = false
            }
          })
        }
      }
    } else {
      if (error.message?.includes('timeout')) {
        if (errAction['timeout']) return
        errAction['timeout'] = true
        notification.error({
          content: 'Error',
          meta: () => h('span', {}, t('f_msg_408')),
          duration: 10000,
          onAfterLeave: () => {
            errAction['timeout'] = false
          }
        })
      } else if (!window.navigator.onLine || error.message === 'Network Error') {
        if (errAction['Network']) return
        errAction['Network'] = true
        notification.error({
          content: 'Error',
          meta: () => h('span', {}, t('f_msg_networkError')),
          duration: 10000,
          onAfterLeave: () => {
            errAction['Network'] = false
          }
        })
      }
    }
  }

  return Promise.reject(error)
}
