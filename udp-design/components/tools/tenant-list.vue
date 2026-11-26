<template>
  <n-select
    v-bind="$attrs"
    style="min-width: 100px"
    :value="selected"
    label-field="name"
    value-field="code"
    :options="options"
    @update:value="handleUpdateValue"
  />
</template>

<script lang="ts">
  import { defineComponent, ref, computed } from 'vue'
  import { SelectOption } from 'naive-ui'
  import { udpPermissionStore } from 'udp/store/permission-store'
  import { router } from 'udp/router'
  import { udpTabsViewStore } from 'udp/store/tabs-view-store'
  import { udpUserStore } from 'udp/store/user-store'
  import { envConfig } from 'udp/store/views-module'
  export default defineComponent({
    name: 'TenantList',
    emits: ['change'],
    setup(props, { emit }) {
      const PermissionStore = udpPermissionStore()
      const TabsViewStore = udpTabsViewStore()
      const UserStore = udpUserStore()

      const selected = ref('')
      const active = computed(() => UserStore.tenantCode)
      const options = computed(() => UserStore.tenantList)

      selected.value = active.value

      const handleUpdateValue = async (value: string, option: SelectOption) => {
        selected.value = value
        if (value !== active.value) {
          UserStore.setTenantCode(value)
          try {
            await PermissionStore.GenerateRoutes(null, {
              appCode: window.udpGlobalConfig?.UDP_APP_CODE || envConfig.UDP_APP_CODE,
              tenantCode: value,
              accessType: 'public'
            })
            await PermissionStore.GenerateRoutesFormate()
          } catch (error) {
            console.error(error)
          }
          TabsViewStore.initTabs()
          
          const path = router.currentRoute.value.path
          router.push(`/`)
          // 页面没跳转的情况下刷新页面
          if (path === PermissionStore.findRootRouteRedirect()) {
            TabsViewStore.reloadPage(router.currentRoute.value)
          }
          emit('change', { ...option })
        }
      }
      return {
        selected,
        options,
        handleUpdateValue
      }
    }
  })
</script>

<style lang="less" scoped></style>
