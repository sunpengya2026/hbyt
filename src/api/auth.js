import request from '@/utils/request'
import { getCurUser } from './ideasAuth'

// 用户登录
export function login(data) {
  return request({
    url: '/v1/auth/login',
    method: 'post',
    skipSessionReset: true,
    data: {
      account: data.username,
      password: data.password,
      code: data.captcha || '',
      yzm: 0
    }
  })
}

// 用户登出
export function logout() {
  return request({
    url: '/v1/auth/logout',
    method: 'post'
  })
}

/**
 * 获取当前登录用户信息
 *
 * 生产走统一认证：GET /api/base-auth-service/curuser
 *   （同源路径，由 www.hbepicp.petrochina 网关转发到 base-auth-service）
 * 与参考项目 5370dh-cbm-front 的 api/user.js getInfo() 完全一致。
 *
 * 返回结构：
 *   成功 { code:'0', message:'成功', data:{ userName:'张三', ... } }
 *   失败 { code:'ERROR-TOKEN-NULL', message:'token为空或者未提供token', data:null }
 *
 */
export function getUserInfo() {
  return getCurUser()
}

// 获取应用令牌对应的用户信息
export function getBuiltinUserInfo() {
  return request({
    url: '/v1/auth/userinfo',
    method: 'get',
    skipSessionReset: true
  })
}

// 获取路由信息
export function getRouters() {
  return request({
    url: '/v1/auth/routers',
    method: 'get'
  })
}

// 获取验证码（保留）
export function getCaptcha() {
  return '/v1/auth/captcha'
}
