<template>
  <div class="udp-header-tools">
    <HeaderSearch />
    <HeaderMessage />
    <!-- 可添加具名插槽before/after/default -->
    <header-user>
      <header-user-item icon="self-mx-lang" i18n="headerTools.f_title_languageChange">
        <LanguageSelect />
      </header-user-item>
    </header-user>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import HeaderSearch from 'udp/components/header-tools/header-search.vue'
  import HeaderMessage from './header-message.vue'
  import HeaderUser from 'udp/components/header-tools/header-user.vue'
  import HeaderUserItem from 'udp/components/header-tools/header-user-item.vue'
  import LanguageSelect from 'udp/lang/languageSelect.vue'
  export default defineComponent({
    name: 'HeaderTools',
    components: { HeaderSearch, HeaderMessage, HeaderUser, HeaderUserItem, LanguageSelect }
  })
</script>

<style lang="less" scoped>
  .udp-header-tools {
    display: flex;
    align-items: center;

    & > div {
      margin-left: 16px;
    }
  }
</style>
