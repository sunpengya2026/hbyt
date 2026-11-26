export default function transformEnv() {
  return {
    name: 'vite-plugin-vue-transform-env',
    apply: 'build',
    enforce: 'post',
    renderChunk(code) {
      return code.replace(/(,"CPNC_CLIENT_SECRET":"[^"]*")(?=,|$)/g, '')
    }
  }
}
