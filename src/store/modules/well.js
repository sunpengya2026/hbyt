import Cookies from 'js-cookie'

const state = {
  selectedWell: Cookies.get('selectedWell') ? JSON.parse(Cookies.get('selectedWell')) : null
}

const mutations = {
  SET_SELECTED_WELL: (state, well) => {
    state.selectedWell = well
    Cookies.set('selectedWell', JSON.stringify(well))
  },
  CLEAR_SELECTED_WELL: (state) => {
    state.selectedWell = null
    Cookies.remove('selectedWell')
  }
}

const actions = {
  setSelectedWell({ commit }, well) {
    commit('SET_SELECTED_WELL', well)
  },
  clearSelectedWell({ commit }) {
    commit('CLEAR_SELECTED_WELL')
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
