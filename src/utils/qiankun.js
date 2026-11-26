/**
 * qiankun 微前端配置
 */

let apps = []

export const qiankun = {
  start: () => {
    console.log('qiankun starting...')
  },
  registerMicroApps: (microApps) => {
    apps = microApps
  },
  setDefaultMountApp: (app) => {
    console.log('default mount app:', app)
  }
}

export default qiankun
