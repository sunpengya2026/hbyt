<template>
  <n-input
    v-model:value="searchValue"
    :placeholder="$t('f_placeholder_search')"
    autosize
    style="max-height: 32px; min-width: 240px; border-radius: 4px"
    @keyup.enter="handleSearch"
    class="udp-search"
  >
    <template #prefix>
      <Icon src="self-mx-search" :is-mxdir="true" />
    </template>
  </n-input>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue'
  import Icon from 'udp/components/tools/icon'
  import queryEnvConfigMap from 'udp/api/env-change-url-config'
  export default defineComponent({
    name: 'HeaderSearch',
    components: { Icon },
    setup() {
      // 查询
      const searchValue = ref(null)
      const handleSearch = () => {
        queryEnvConfigMap.then((envMap: any) => {
          const f = envMap.UDP_ENV_FLAG
          const _flag = f === 'prd' ? '' : `${f}.`
          const url = `http://www.${_flag}pcep.cloud/front/isearch/search-result?keyword=${searchValue.value}`
          window.open(url, '_blank', 'noopener')
        })
      }
      return {
        searchValue,
        handleSearch
      }
    }
  })
</script>

<style lang="less" scoped>
.n-input.udp-search{
  font-size: 12px;
  height: 24px;
}
</style>
