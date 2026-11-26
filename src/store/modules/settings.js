import variables from '@/styles/element-variables.scss'
import defaultSettings from '@/settings'

const { sideTheme, showSettings, topNav, tagsView, fixedHeader, sidebarLogo, dynamicTitle } = defaultSettings

const storageSetting = {
  sideTheme: localStorage.getItem('side-theme') || sideTheme,
  showSettings: localStorage.getItem('show-settings') || showSettings,
  topNav: localStorage.getItem('top-nav') || topNav,
  tagsView: localStorage.getItem('tag-view') || tagsView,
  fixedHeader: localStorage.getItem('fixed-header') || fixedHeader,
  sidebarLogo: localStorage.getItem('sidebar-logo') || sidebarLogo,
  dynamicTitle: localStorage.getItem('dynamic-title') || dynamicTitle
}

const state = {
  ...storageSetting,
  theme: variables.theme,
  sideTheme: storageSetting.sideTheme,
  settings: storageSetting,
  loading: false
}

const mutations = {
  CHANGE_SETTINGS: (state, { key, value }) => {
    if (state.hasOwnProperty(key)) {
      state[key] = value
    }
  },
  SET_LOADING: (state, loading) => {
    state.loading = loading
  }
}

const actions = {
  changeSetting({ commit }, data) {
    commit('CHANGE_SETTINGS', data)
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
