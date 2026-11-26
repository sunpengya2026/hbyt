import { getToken, setToken, removeToken } from '@/utils/auth'
import { login as loginApi, getUserInfo as getUserInfoApi, getBuiltinUserInfo } from '@/api/auth'

/**
 * 免登录开关
 *
 * 当前阶段系统对外发布，不做登录校验：
 *   - 首次进入由路由守卫自动写入本地 token 与用户信息
 *   - 全程不调用后端 /v1/auth/login，避免后端未就绪时页面白屏
 *
 * 将来要接回真实登录，只需把 .env 里的 VUE_APP_FREE_LOGIN 改成 'false'，
 * 并实现 login 走真实接口即可，其余逻辑不用动。
 */
const FREE_LOGIN = process.env.VUE_APP_FREE_LOGIN !== 'false'

/** 免登录模式下使用的本地模拟 token */
const MOCK_TOKEN = 'Bearer free-login-token'

/** 免登录模式下的默认用户信息（接口拿不到时的兜底） */
const DEFAULT_USER_INFO = {
  name: '管理员',
  nickname: '管理员',
  userName: '管理员',
  avatar: '',
  roles: ['admin']
}

/**
 * 从接口返回体里推导出「显示用姓名」
 *
 * 两个来源，字段名不一样，都要兼容：
 *   统一认证 curuser（生产）     → { userName:'张三', ... }        ← 参考项目 5370dh-cbm-front 用的就是 userName
 *   后端内置 /v1/auth/userinfo  → { userName, name, nickname }
 *
 * 逐个尝试，任何一个有值就返回，不会显示成空白/undefined。
 *
 * 🔴 顺序不能改成「nickname 优先」： nickname 常常是英文账号或手机号，
 *    导航条要显示的是中文姓名。
 */
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
  /** 是否已向后端拉取过用户信息（含失败降级），用于避免重复请求 */
  userInfoFetched: false,
  introduction: ''
}

const mutations = {
  SET_TOKEN: (state, token) => {
    state.token = token
  },
  SET_NAME: (state, name) => {
    state.name = name
  },
  SET_AVATAR: (state, avatar) => {
    state.avatar = avatar
  },
  SET_USER_INFO: (state, userInfo) => {
    state.userInfo = userInfo
  },
  SET_USER_INFO_FETCHED: (state, fetched) => {
    state.userInfoFetched = !!fetched
  }
}

const actions = {
  // 用户登录
  login({ commit }, userInfo) {
    // 免登录模式：直接下发本地 token，不请求后端
    if (FREE_LOGIN) {
      return new Promise((resolve) => {
        setToken(MOCK_TOKEN)
        commit('SET_TOKEN', MOCK_TOKEN)
        resolve({ code: 0, message: 'success', data: { tokenValue: MOCK_TOKEN } })
      })
    }

    return new Promise((resolve, reject) => {
      loginApi(userInfo).then(response => {
        // 后端返回 code: 0 表示成功
        if (response.code === 0 || response.code === 200 || response.code === 'OK') {
          // 支持多种token字段名: token, accessToken, tokenValue
          const token = (response.data && response.data.accessToken) ||
                        (response.data && response.data.token) ||
                        (response.data && response.data.tokenValue) ||
                        response.token
          if (token) {
            setToken(token)
            commit('SET_TOKEN', token)
          }
          resolve(response)
        } else {
          reject(new Error(response.message || '登录失败'))
        }
      }).catch(error => {
        reject(error)
      })
    })
  },

  // 获取用户信息
  //
  // 三级取数，逐级降级，**永远 resolve**：
  //   ① 统一认证 GET /api/base-auth-service/curuser（生产主路径，参考 5370dh-cbm-front）
  //   ② 后端内置  GET /v1/auth/userinfo（统一认证不可用 / 无 token 时）
  //   ③ 本地常量   DEFAULT_USER_INFO（后端也没起来时，保证页面不白屏）
  //
  // ⚠️ 为什么不像参考项目那样 reject：
  //    那边 getInfo 失败会中断整个路由守卫，页面直接卡住。
  //    我们当前是「免登录 + 对外发布」，身份只影响导航条一行字，
  //    不能因为统一认证没调通就把用户挡在门外。
  getUserInfo({ commit, state }) {
    return new Promise(resolve => {
      // 已经成功拉过一次就直接返回（避免每次路由跳转都打一次接口）
      //
      // 🔴 判据必须是「是否请求过」这个标记，不能拿 name 和默认值比。
      //    统一认证和内置账号返回的姓名都可能是「管理员」，
      //    用 name !== '管理员' 作判据的话永远为假 → 每次导航都重新请求。
      if (state.userInfo && state.userInfoFetched) {
        resolve(state.userInfo)
        return
      }

      const apply = (data, from) => {
        const displayName = pickDisplayName(data) || DEFAULT_USER_INFO.name
        const userInfo = {
          ...DEFAULT_USER_INFO,
          ...data,
          name: displayName,
          userName: displayName,
          avatar: (data && data.avatar) || ''
        }
        commit('SET_USER_INFO', userInfo)
        commit('SET_NAME', displayName)
        commit('SET_AVATAR', userInfo.avatar)
        commit('SET_USER_INFO_FETCHED', true)
        if (process.env.NODE_ENV === 'development') {
          console.log('[user/getUserInfo] 用户信息来源：', from, '→', displayName, data)
        }
        resolve(userInfo)
      }

      // ① 统一认证
      getUserInfoApi()
        .then(res => {
          // 统一认证的 code 是字符串：成功为 '0' 或 'success'，失败为 'ERROR-TOKEN-NULL' 等。
          // 注意 data 为 null 时也要当作失败 —— 那是「token 无效」而非「用户没名字」。
          const code = res && res.code
          const ok = code === 0 || code === 200 || code === '0' || code === 'success' || code === 'OK'
          const data = res && res.data
          if (ok && data) {
            apply(data, '统一认证 curuser')
            return
          }
          // 接口通了但没身份（多为 token 为空/失效）→ 走 ②
          if (process.env.NODE_ENV === 'development') {
            console.warn('[user/getUserInfo] 统一认证未返回用户信息：', code, (res && res.message) || '')
          }
          throw new Error('curuser 未返回有效用户')
        })
        .catch(() => {
          // ② 后端内置账号
          getBuiltinUserInfo()
            .then(res => {
              const data = (res && res.data) || {}
              apply(data, '后端内置 userinfo')
            })
            .catch(err => {
              // ③ 本地常量
              if (process.env.NODE_ENV === 'development') {
                console.warn('[user/getUserInfo] 内置接口也失败，降级为默认用户：', err && err.message)
              }
              apply({ ...DEFAULT_USER_INFO }, '本地默认值')
            })
        })
    })
  },

  // 用户登出
  logout({ commit }) {
    return new Promise((resolve) => {
      removeToken()
      commit('SET_TOKEN', '')
      commit('SET_USER_INFO', null)
      commit('SET_USER_INFO_FETCHED', false)
      commit('SET_NAME', '')
      commit('SET_AVATAR', '')
      resolve()
    })
  },

  // 重置token
  resetToken({ commit }) {
    return new Promise(resolve => {
      removeToken()
      commit('SET_TOKEN', '')
      commit('SET_USER_INFO', null)
      commit('SET_USER_INFO_FETCHED', false)
      resolve()
    })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
