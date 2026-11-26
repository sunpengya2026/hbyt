// login
import {  authPrefix,userPrefix } from '@/api/prefix'
export function login(data: any) {
  const requestData = {
    username: data.username,
    password: data.password,
    captchaVerification: data?.captchaVerification
  }
  return $api.post(`${authPrefix}/system/auth/login`, requestData)
}

// 获取用户
export function getUser(data: any) {
  // const requestData = {
  //   id: data.userId,
  // }
  // 、、 ?id=${requestData.id}
  return $api.get(`${userPrefix}/system/user/profile/get`)
}
// 退出登录
 export function logoutApi() {
  return $api.post(`${authPrefix}/system/auth/logout`)
}
// 获取用户权限菜单
export function getPermissionMenu() {
  return $api.get(`${userPrefix}/system/user/profile/get-menu-button-info`)
}