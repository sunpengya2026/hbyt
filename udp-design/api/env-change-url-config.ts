import { http } from 'udp/utils/service/request'
import { udpUserStore } from 'udp/store/user-store'
import { envConfig } from 'udp/store/views-module'
const modules = import.meta.glob('../../src/api/*.json', {
  import: 'default'
})
const envChangeUrlConfig = modules['../../src/api/env-change-url-config.json']
const defaultUdpIamLogin =
  '//www.mx-cloud.udp/front/uc/v3/static/iamLogin/iamCallBack.html?iamType=${iamType}&callBackUrl=${backUrl}'
const defaultUdpIamLogout = '/front/platform/entry/logout.html?callBackUrl=${backUrl}'
const UdpUserCenter = '/uc'
const UdpUserCenterMap = {
  dev: {
    UdpUserCenter,
    UdpIamLogin: defaultUdpIamLogin,
    UdpIamLogout: defaultUdpIamLogout
  },
  uat: {
    UdpUserCenter,
    UdpIamLogin: defaultUdpIamLogin,
    UdpIamLogout: defaultUdpIamLogout
  },
  prd: {
    UdpUserCenter,
    UdpIamLogin: defaultUdpIamLogin,
    UdpIamLogout: defaultUdpIamLogout
  }
}
const queryEnvConfigMap = new Promise(resolve => {
  const promiseUrl = envConfig.UDP_QUERY_CONFIG_URL
    ? http({
        url: envConfig.UDP_QUERY_CONFIG_URL,
        method: 'get',
        ignoreBaseUri: true
      })
    : null
  const envChangeJson = (envChangeUrlConfig && envChangeUrlConfig()) || null
  Promise.allSettled([envChangeJson, promiseUrl]).then(([jsonRes, promiseRes]: [any, any]) => {
    const jsonResMap = jsonRes.value || {}
    const promiseResMap = promiseRes.value?.data || {}
    const globalConfig = window.udpGlobalConfig || {}
    const flag = window.udpEnv ?? promiseResMap.UDP_ENV_FLAG ?? globalConfig.UDP_ENV_FLAG ?? envConfig.UDP_ENV_FLAG
    const userCenterMap = {}
    for (const env in UdpUserCenterMap) {
      userCenterMap[env] = { ...UdpUserCenterMap[env], ...(jsonResMap[env] || {}) }
    }
    const flagMap = { ...jsonResMap, ...userCenterMap }[flag]
    const totalMap = { ...envConfig, ...flagMap, ...globalConfig, ...promiseResMap }
    const ignoreEnv = ['UDP_PUBLIC_URL', 'UDP_CLIENT_ID', 'UDP_CLIENT_SECRET', 'UDP_APP_CODE']
    totalMap.UDP_ENV_FLAG = flag
    ignoreEnv.forEach(v => {
      delete totalMap[v]
    })
    udpUserStore().setEnvMap(totalMap)
    resolve(totalMap)
  })
})

export default queryEnvConfigMap
