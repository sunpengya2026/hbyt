<template>
  <div class="mx-user">
    <n-popover trigger="click" :style="{ padding: '10px 20px' }">
      <template #trigger>
        <div class="mx-user-name">
          <n-avatar round :size="32">
            <Icon src="self-mx-user" />
          </n-avatar>
          <span v-if="!isPublicUser" class="mx-user-name-text">{{ userName }}</span>
          <span v-else class="mx-user-name-text" @click.stop="toLogin">{{ $t('f_login_msg_login') }}</span>
        </div>
      </template>
      <ul class="mx-user-content">
        <slot name="before"></slot>
        <li v-if="themeList?.length">
          <HeaderTheme />
        </li>
        <slot></slot>
        <slot name="after"></slot>
        <li v-if="!isPublicUser" class="mx-user-logout">
          <Icon class="mx-user-logout_icon" src="self-mx-logout" :is-mxdir="true" />
          <span class="mx-user-logout_btn" @click="handleLogout">{{ $t('f_logout') }}</span>
        </li>
      </ul>
    </n-popover>
  </div>
</template>

<script lang="ts">
  import { computed, defineComponent, ref } from 'vue'
  import Icon from 'udp/components/tools/icon'
  import HeaderTheme from 'udp/components/header-tools/header-theme.vue'
  import { useDialog } from 'naive-ui'
  import { themeArr } from '@/config/theme-overrides'
  import { udpUserStore } from 'udp/store/user-store'
  import { useI18n } from 'vue-i18n'
  import plugin from '@/config/plugin'
  export default defineComponent({
    name: 'HeaderUser',
    components: { Icon, HeaderTheme },
    setup(props, { slots }) {
      // 用户信息
      const UserStore = udpUserStore()
      const userName = computed(() => UserStore.userMsg.displayName)
      const isPublicUser = computed(() => UserStore.isPublicUser)
      const dialog = useDialog()
      const { t } = useI18n()
      const handleLogout = () => {
        const d = dialog.warning({
          title: t('f_confirm_tip'),
          content: t('f_confirm_queryLogou'),
          positiveText: t('f_title_sure'),
          negativeText: t('f_title_cancel'),
          positiveButtonProps: {
            type: 'primary'
          },
          onPositiveClick: async () => {
            d.loading = true
            // const { logoutBefore } = plugin
            // logoutBefore && (await logoutBefore())
            // return new Promise(resolve => {
            //   UserStore.logoutToPage().then(resolve)
            // })
            UserStore.logoutToPage(true).finally(() => {
              d.loading = false
            })            

          }
        })
      }
      const toLogin = () => {
        UserStore.logoutToPage(true)
      }

      // 弹框内容
      const themeList = ref(themeArr)
      const idDivider = computed(() => themeList.value?.length || slots.before || slots.after || slots.default)
      return {
        themeList,
        userName,
        idDivider,
        handleLogout,
        isPublicUser,
        toLogin
      }
    }
  })
</script>

<style lang="less" scoped>
  :deep(.n-avatar__text) {
    font-size: 12px;
    color: var(--mx-primary);
  }

  .mx-user-name {
    display: flex;
    font-size: 12px;
    color: #fff;
    cursor: pointer;
    align-items: center;

    & > span {
      margin-left: 8px;
    }
    .mx-user-name-text {
      max-width: 100px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.5;
    }
    .n-avatar{
      width:24px;
      height:24px;
    }
  }

  .mx-user-content {
    padding: 0 2px;
    list-style: none;
    :deep(.n-base-selection) {
      width: 160px;
    }
    .mx-user-logout {
      display: flex;
      align-items: center;
      > .mx-user-logout_icon {
        font-size: 16px;
        margin-right: 12px;
      }
      > .mx-user-logout_btn {
        font-weight: 600;
        padding-left: 0;
        cursor: pointer;
        padding: 10px 20px 10px 0;
        &:hover {
          color: var(--mx-primary);
        }
      }
    }
  }

  :deep(.n-divider:not(.n-divider--vertical)) {
    margin-bottom: 16px;
  }
</style>
