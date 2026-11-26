const hooks = {
  $api: 'udp/utils/service/request.ts',
  udpAppStore: 'udp/store/app-store.js',
  udpUserStore: 'udp/store/user-store.js',
  udpPermissionStore: 'udp/store/permission-store.js'
}
Object.defineProperty(hooks, 'constructor', {
  enumerable: false
})
const resolveHooks = name => {
  if (!hooks[name]) return
  return {
    name,
    from: hooks[name]
  }
}
const udpResolveHooks = () => {
  return name => {
    return resolveHooks(name)
  }
}

export default udpResolveHooks
