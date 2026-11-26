import {authPrefix,userPrefix} from '@/api/prefix'
// login
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
  return $api.get(`${userPrefix}/system/user/profile/get`)
}
