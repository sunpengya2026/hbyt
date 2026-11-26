<template>
  <div>
    <component :is="slotIAMComponent" v-if="slotIAMComponent"></component>
    <n-button type="primary" :block="true" :loading="loading" @click="iamLogin">{{ $t('f_login_iam') }}</n-button>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref, defineAsyncComponent } from 'vue'
  import { udpUserStore } from 'udp/store/user-store'
  import queryEnvConfigMap from 'udp/api/env-change-url-config'
  const slotModule = import.meta.glob('../../../src/components/layout-tools/**.vue')
  const slotIAM = '../../../src/components/layout-tools/slot-login-IAM.vue'
  export default defineComponent({
    name: 'LoginIAM',
    setup() {
      let slotIAMComponent = null
      if (slotModule[slotIAM]) {
        slotIAMComponent = defineAsyncComponent(slotModule[slotIAM])
      }
      const loading = ref(false)
      const UserStore = udpUserStore()
      const iamLogin = () => {
        UserStore.setIamLogin(true)
        const redirect = UserStore.getCurrentRedirectUrl()
        const backUrl = redirect.startsWith('http') ? redirect : `${UserStore.baseUrl}${redirect}`
        queryEnvConfigMap.then((envMap: any) => {
          const UdpIamLogin = envMap.UdpIamLogin
          window.location.href = UdpIamLogin.replace('${iamType}', envMap.UDP_IAM_TYPE).replace(
            '${backUrl}',
            encodeURIComponent(decodeURIComponent(backUrl))
          )
        })
      }
      return {
        slotIAMComponent,
        iamLogin,
        loading
      }
    }
  })
</script>

<style lang="less" scoped></style>
