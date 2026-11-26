import { getToken, setToken, removeToken } from '@/utils/auth'
import { login as loginApi, getUserInfo as getUserInfoApi, getBuiltinUserInfo } from '@/api/auth'
import { removeIdeasToken } from '@/api/ideasAuth'
import { resetRouter } from '@/router'

let pendingIdentity

function pickDisplayName(data) {
  if (!data) return ''
  const candidates = [
    data.userName, // 统一认证（生产主路径）/ 参考项目
    data.realName, // 部分版本用真实姓名
    data.name,
    data.nickname,
    data.username,
    data.account,
    data.loginName,
    data.userAccount
  ]
  for (const v of candidates) {
    if (v && String(v).trim()) return String(v).trim()
  }
  return ''
}

const state = {
  token: getToken(),
  name: '',
  avatar: '',
  userInfo: null,
  introduction: ''
}

const mutations = {
  SET_TOKEN(state, token) {
    state.token = token
  },
  SET_USER_INFO(state, userInfo) {
    state.userInfo = userInfo
    state.name = userInfo ? userInfo.name : ''
    state.avatar = userInfo ? userInfo.avatar : ''
  }
}

const actions = {
  async login({ commit, dispatch }, credentials) {
    const response = await loginApi(credentials)
    const data = response.data || {}
    const token = data.accessToken || data.token || data.tokenValue || response.token
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error('登录接口未返回有效凭据')
    }

    await dispatch('resetToken')
    setToken(token)
    commit('SET_TOKEN', token)
    await dispatch('getUserInfo')
    return response
  },

  getUserInfo({ commit, dispatch, state }) {
    if (state.userInfo) return state.userInfo
    if (pendingIdentity) return pendingIdentity

    const token = state.token
    // 应用令牌交由应用后端验证。门户入口则要求统一认证返回实际身份。
    const identity = (token ? getBuiltinUserInfo() : getUserInfoApi()).then(result => {
      if (pendingIdentity !== identity) throw new Error('登录会话已变更')

      const data = result && result.data
      const validCode = [0, 200, '0', 'ok', 'OK', 'success'].includes(result && result.code)
      const name = pickDisplayName(data)
      if (!validCode || !name) throw new Error('无法验证当前登录身份')

      const roles = Array.isArray(data.roles) ? data.roles.filter(role => typeof role === 'string') : []
      const user = { ...data, name, avatar: data.avatar || '', roles }
      commit('SET_USER_INFO', user)
      return user
    }).catch(async error => {
      if (pendingIdentity === identity) await dispatch('resetToken')
      throw error
    }).finally(() => {
      if (pendingIdentity === identity) pendingIdentity = null
    })

    pendingIdentity = identity
    return identity
  },

  logout({ dispatch }) {
    return dispatch('resetToken')
  },

  resetToken({ commit, dispatch }) {
    pendingIdentity = null
    removeToken()
    removeIdeasToken()
    commit('SET_TOKEN', '')
    commit('SET_USER_INFO', null)
    resetRouter()
    return dispatch('permission/clearRoutes', null, { root: true })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
