<template>
  <div class="exception">
    <div class="img">
      <slot></slot>
    </div>
    <div class="content">
      <h1>{{ pageInfo.title }}</h1>
      <n-space class="desc">
        <span>{{ $t(pageInfo.desc) }}</span>
        <n-button type="primary" @click="handleToHome">{{ $t('f_title_homePage') }}</n-button>
        <n-button type="error" @click="handleLogout">{{ $t('f_login_msg_login') }}</n-button>
      </n-space>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, PropType } from 'vue'
  import { useRouter } from 'vue-router'
  import { udpUserStore } from 'udp/store/user-store'

  interface pageInfoType {
    title: string
    desc: string
  }
  export default defineComponent({
    name: 'ExceptionPage',
    props: {
      pageInfo: {
        type: Object as PropType<pageInfoType>,
        required: true
      }
    },
    setup() {
      const Router = useRouter()
      const UserStore = udpUserStore()
      const handleToHome = () => {
        Router.push('/')
      }
      const handleLogout = () => {
        UserStore.logoutToPage()
      }
      return {
        handleToHome,
        handleLogout
      }
    }
  })
</script>

<style lang="less" scoped>
  .exception {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;

    h1 {
      margin-bottom: 24px;
      font-size: 40px;
      font-weight: 600;
      line-height: 40px;
      color: #434e59;
      text-align: center;
    }

    .desc {
      margin-bottom: 16px;
      font-size: 20px;
      font-weight: 540;
      line-height: 28px;
      color: rgba(0, 0, 0, 0.45);
    }

    .content {
      margin-top: -8rem;
    }

    .img {
      text-align: center;
      font-size: 25rem;
      margin-top: -8rem;
    }
  }
</style>
