import { http } from 'udp/utils/service/request'
import { Base64 } from 'js-base64'

const queryBaseApi = import('./env-change-url-config').then(({ default: userCenterUrl }) => {
  return userCenterUrl.then((envMap: any) => {
    return Promise.resolve({
      baseApiV2: `${envMap.UdpUserCenter}/api/v2`,
      envMap
    })
  })
})

export function currentuser() {
  return http({
    url: '/sys/user/currentuser',
    method: 'get',
    ignoreBaseUri: true
    // defaultError: false
  })
}
export function login(data: unknown) {
  const clientId = window.cnpcGlobalConfig?.UDP_CLIENT_ID || import.meta.env.UDP_CLIENT_ID || import.meta.env.UDP_ClIENT_ID
  const clientSecret = window.cnpcGlobalConfig?.UDP_CLIENT_SECRET || import.meta.env.UDP_CLIENT_SECRET
  return http({
    url: '/uaa/oauth/token',
    method: 'post',
    defaultError: false,
    ignoreBaseUri: true,
    headers: {
      Authorization: 'Basic ' + Base64.encode(clientId + ':' + clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data
  })
}
export function queryMenu(userid: string, params: object) {
  return Promise.resolve()
  // return queryBaseApi.then(({ baseApiV2, envMap }) => {
  //   const mxQueryMenuUrl = envMap.UDP_QUERY_MENU_URL
  //   const url = mxQueryMenuUrl
  //     ? `${envMap.UdpUserCenter}${mxQueryMenuUrl}`
  //     : `${baseApiV2}/sys/user/${userid}/functionstree`
  //   return Promise.resolve(
  //     http({
  //       url,
  //       method: 'get',
  //       ignoreBaseUri: true,
  //       params
  //     })
  //   )
  // })
}
export function queryUserTenantList(params: object) {
  return queryBaseApi.then(({ baseApiV2 }) => {
    return Promise.resolve(
      http({
        url: `${baseApiV2}/sys/user/tenant/list`,
        method: 'get',
        ignoreBaseUri: true,
        params
      })
    )
  })
}
