<template>
  <n-card class="udp-login">
    <div v-if="loginType === '4' || loginType === '5'" class="loadingBox">
      <n-spin size="large" />
    </div>
    <div v-else>
      <div class="udp-login-bg">
        <i class="orange"></i>
        <i class="green"></i>
        <i class="theme-left"></i>
        <i class="theme-right"></i>
        <span class="mark"></span>
      </div>
      <div class="udp-login-top">
        <div class="udp-login-logo">
          <img class="logo" :src="logoUrl" />
          <p class="title">
            {{ $t('f_UDP') }}
          </p>
        </div>
        
          <LanguageSelect style="width: 100px" />
          
      </div>
      <div class="udp-login-content">
        <transition name="move" enter-from-class="move-left-enter" leave-to-class="move-left-leave-to">
          <div v-if="show" class="udp-login-title">
            <h2 class="udp-login-title-name">{{  $t('f_TITLE')  }}</h2>
            <p class="udp-login-title-sub">{{  $t('f_TITLE_SUB')  }}
            </p>
            <LoginBackground style="font-size: 19vw" />
          </div>
        </transition>
        <transition name="move" enter-from-class="move-right-enter" leave-to-class="move-right-leave-to">
          <div v-if="show" class="udp-login-form">
            <n-tabs type="line" justify-content="space-evenly" @update:value="onLoginTabs">
              <template v-if="loginType === '1' || loginType === '3'">
                <n-tab-pane name="user" :tab="$t('f_login_user')">
                      <LoginForm />
                </n-tab-pane>
              </template>
              <template v-if="loginType === '2' || loginType === '3'">
                <n-tab-pane name="IAM" :tab="$t('f_login_iam')">
                      <LoginIAM />
                </n-tab-pane>
              </template>
            </n-tabs>
          </div>
        </transition>
      </div>
    </div>
  </n-card>
</template>
<script lang="ts">
import { defineComponent, computed, ref, nextTick } from 'vue'
import { useMessage } from 'naive-ui'
import { udpAppStore } from 'udp/store/app-store'
import { udpUserStore } from 'udp/store/user-store'
import { addColorAlpha, getColorPalette } from 'udp/utils/color'
import LoginForm from 'udp/views/login/login-form-verify.vue'
// import LoginForm from 'udp/views/login/login-form.vue'
import LoginIAM from 'udp/views/login/login-IAM.vue'
/* [验收裁剪] 图片资源已删除
import logoUrl from '/static/logo.png'
import LoginBackground from './login-background.vue'
*/
const logoUrl = ''
const LoginBackground = { name: 'LoginBackground', render: () => null }
import LanguageSelect from 'udp/lang/languageSelect.vue'

import { codeChangeToken, getOauth2User } from './api/oauth2'
import { useRouter } from "vue-router";
import plugin from "@/config/plugin";
import { udpPermissionStore } from 'udp/store/permission-store'
// 引入自定义加密、解密方法
import { decryptData } from 'udp/utils/crypt.js'
// 引入url工具方法
import { getUrlParam } from 'udp/utils/urlUtil';
import { getPermissionMenu } from 'udp/api/login'
import { noPrefixStorage } from 'udp/utils/Storage'
// ⚠️ 部署在子路径 /dh-desdoc-cbm/ 下且使用 hash 路由，
// 手工拼地址必须保留子路径前缀，否则会跳到 https://host/#/xxx（404）。
import { absoluteUrl } from '@/utils/deploy-path'

export default defineComponent({
  name: 'Login',
  components: { LoginForm, LoginIAM, LoginBackground, LanguageSelect  },
  setup() {
      const message = useMessage()
      const router = useRouter();
      const PermissionStore = udpPermissionStore()
      // 系统名称
      const UserStore = udpUserStore()
      const loginType = computed(() => UserStore.envMap.UDP_LOGIN_TYPE || import.meta.env.UDP_LOGIN_TYPE)
      const UDP_USER_INFO_TYPE = window.udpGlobalConfig?.UDP_USER_INFO_TYPE || import.meta.env.UDP_USER_INFO_TYPE
      const udpcode = getUrlParam(window.location.href, 'udpcode')  // 单点默认约定参数其解码值结构 {tenantId:xxx.token:yyy}
      const getCustomMenu = async () => {
        const { addRouterTransform } = plugin;
        if (addRouterTransform) {
          // 获取菜单
          let menu = await getPermissionMenu()
          let permissionList = menu.code == 0 && menu.data.menus.length > 0 ? menu.data.menus : []
          noPrefixStorage.set('permissionList', permissionList)
        }

      }
      const checkedSSO = async () => {

        try {
          // 1. 解码参数
          if (!udpcode) {
            throw new Error('udpcode参数不存在');
          }
          let params = decryptData(decodeURIComponent(udpcode))

          if (!params) {
            throw new Error('解密失败');
          }

          // 2. 解析参数
          params = JSON.parse(params)

          // 3. 设置token和tenantId
          if (params.jwt) {
            UserStore.setToken(params.jwt)
          }
          if (params.tenantId) {
            UserStore.setTenantId(params.tenantId)
          }

          // 4. 获取用户信息
          let userdata = await getOauth2User()
          if (userdata.code !== 0) {
            throw new Error(`获取用户信息失败：${userdata.msg}`);
          }

          // 5. 设置用户信息
          let mockData = {
            access_token: params.jwt,
            refresh_token: 'jwt',
            user_id: userdata.data.id
          }

          // 6. 等待用户信息设置完成
          await UserStore.setAllInfo(mockData)

          // 7. 获取自定义菜单
          await getCustomMenu()

          // 8. 执行登录成功回调
          const { loginSuccessfulCallback } = plugin;
          if (loginSuccessfulCallback) {
            await loginSuccessfulCallback();
          }

          // 9. 等待DOM更新后执行路由跳转
          await nextTick()

          // 10. 延迟执行路由跳转
          setTimeout(() => {
            let jump = '/'
            const resolved = router.resolve(jump);
            console.log('匹配到的路由:', resolved.matched);

            if (resolved.matched.length > 0) {
              console.log('路由已生效');
              let temp = resolved.matched[resolved.matched.length - 1]
              jump = params.redirect_uri ||
                (typeof temp.redirect === 'string' ? temp.redirect :
                  (temp.redirect?.path || temp.path))

              jump = jump.startsWith('/') ? jump : '/' + jump
              jump = absoluteUrl(jump)

              if (window.opener) {
                window.opener.postMessage({
                  env: 'reOpen',
                  winId: params.winId,
                  redirect_uri: jump
                }, '*')
              } else {
                window.open(jump, '_blank')
              }
            } else {
              console.log('路由未生效');
            }
          }, 100)

        } catch (e) {
          console.error('SSO登录失败:', e)
          // 如果SSO登录失败，尝试普通登录
          ssoLogin()
        }
      }




      // theme-渐变
      const appStore = udpAppStore()
      const theme = computed(() => appStore.theme)
      const linearGradient = computed(
      () =>
        `linear-gradient(180deg, ${addColorAlpha(theme.value, 0.15)} 0%, ${addColorAlpha(theme.value, 0.02)} 100%)`
    )
      const themeOpcity = computed(() => addColorAlpha(theme.value, 0.3))
      // themeMode
      const themeLight = computed(() => appStore.themeMode !== 'dark')
      const modeShadow = computed(() =>
      themeLight?.value ? getColorPalette('#EDF1F5', 6) : getColorPalette('#18181c', 6.3)
    )
      // 动画
      const show = ref(false)


      const IAMObj = ref({
        src: 'https://tam.iam.cnpc/login-pwd.html?appCode=udpF'
      })

      const onLoginTabs = (value: any) => {
        localStorage.setItem('loginType', value)
      }
    // 单点登陆模式才需要用到
      const ssoUrl = import.meta.env.UDP_APP_SSO_URL
      // 跳转sso页面
      function ssoLogin() {
        // 提取变量
        const clientId = import.meta.env.UDP_APP_CLIENTID; // 可以改写成，你的 clientId
        const redirectUri = encodeURIComponent(window.location.href); // 注意，需要使用 encodeURIComponent 编码地址
        const responseType = 'code'; // 1）授权码模式，对应 code；2）简化模式，对应 token
        window.location.href = `${ssoUrl}/#/sso?client_id=` + clientId
          + '&redirect_uri=' + redirectUri
          + '&response_type=' + responseType
          + '&scope=user.read user.write'
          + '&auto_approve=true'
          + '&queryToken=false'
      }
    const routerLink = (token: any) => {
      const index2 = window.location.href.indexOf('redirectUrl=')
      const url = window.location.href.substring(index2 + 12, window.location.href.length)
      // const url = getUrlParam(window.location.href,'redirectUrl')
      // debugger
      UserStore.setAllInfo(token).then(async () => {
        getCustomMenu()
        const { loginSuccessfulCallback } = plugin;
        loginSuccessfulCallback && loginSuccessfulCallback();
        if (url?.startsWith("http")) {
          window.location.href = decodeURIComponent(url);
        } else {
          // debugger
          // console.log(PermissionStore.addRouters, 'addRouters')
          // router.push(decodeURIComponent(url) || PermissionStore.addRouters.children[0].path);
          nextTick(() => {
            setTimeout(() => {
              let jump = PermissionStore.addRouters.children[0].path
              const resolved = router.resolve(jump);
              console.log('匹配到的路由:', resolved.matched);
              if (resolved.matched.length > 0) {
                console.log('路由已生效');
                jump = jump.startsWith('/') ? jump : '/' + jump
                jump = absoluteUrl(jump)
                // window.open(jump, '_blank')
                // window.close()
                window.location.replace(jump)
              } else {
                console.log('路由未生效');
              }
            }, 100)

          })
        }
      }).catch(err => {
        message.error(err)
        // router.push('/')
        nextTick(() => {
          window.location.replace('/')
        })
      })
    }
    const checkLogin = async () => {
      //
      const token = localStorage.getItem('jwt')
      if (token) {
        router.push('/')
      } else {
        // code码跳转sso模式
        if (loginType.value == '4' && UDP_USER_INFO_TYPE == 'code') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code')
          // 不存在code值 跳到单点地址
          if (!code) {
            ssoLogin()
            // 存在code，code转为token存储到本地
          } else {
            // 获取code 转换为token
            const index = window.location.href.indexOf('code=')
            const redirect_uri = window.location.href.substring(0, index - 1)
            // 只需要跟后端比对以字符串开头就行
            const tokenRes = await codeChangeToken(code, encodeURIComponent(redirect_uri))
            console.log(tokenRes, 'tokenres')
            routerLink(tokenRes.data)
          }
        }
        // token直接登陆模式
        // token直接登陆模式
        if (loginType.value == '4' && UDP_USER_INFO_TYPE == 'token') {
          let tokenData = JSON.parse(getUrlParam(window.location.href, 'authToken'))

          if (!tokenData) {
            const redirectUri = encodeURIComponent(window.location.href);
            window.location.href = `${ssoUrl}?infoType=token&redirect_uri=${redirectUri}`
          } else {      
            tokenData.user_id = tokenData.userId    
            // console.log(tokenData, 'tokenData')
            routerLink(tokenData)
          }
        }
      }
    };


      // 第三方用户中心单点登陆

      const { thirdPartyLogin } = plugin;
      const thirdPartyToken = getUrlParam(window.location.href, 'jwt') || ''
      const thirdPartyLoginCheck = async (token: string) => {
        if (!thirdPartyToken) {
          window.location.href = ssoUrl;
          return
        }
        noPrefixStorage.set('thirdPartyToken', thirdPartyToken)
        try {
          let res = await thirdPartyLogin(token)
          if (res.code == 0) {
            let data = res.data
            let userInfo = {
              access_token: data.accessToken,
              refresh_token: 'jwt',
              user_id: data.context.user.id,
              isThirdPartyLogin: true
            }
            // 设置用户信息
            await UserStore.setAllInfo(userInfo)

            // 获取自定义菜单
            await getCustomMenu()
            //  执行登录成功回调
            const { loginSuccessfulCallback } = plugin;
            if (loginSuccessfulCallback) {
              await loginSuccessfulCallback();
            }

            nextTick(() => {
              setTimeout(() => {
                // debugger
                let jump = PermissionStore.addRouters.children[0].path
                const resolved = router.resolve(jump);
                console.log('匹配到的路由:', resolved.matched);
                if (resolved.matched.length > 0) {
                  console.log('路由已生效');
                  // router.push(jump)
                  jump = jump.startsWith('/') ? jump : '/' + jump
                  jump = absoluteUrl(jump)
                  // window.open(jump, '_blank')
                  // window.close()
                  window.location.replace(jump)
                } else {
                  console.log('路由未生效');

                }
              }, 100)

            })
          } else {
            console.log('token交换失败')
          }
        } catch (e) {
          console.error('第三方用户中心单点登陆失败:', e)
          window.location.href = ssoUrl;
        }


      }


      if (loginType.value == '5' && typeof thirdPartyLogin == 'function') {
        thirdPartyLoginCheck(thirdPartyToken)
        return
      }


      // 外部跳转单点
      if (loginType.value == 4 && udpcode) {
        checkedSSO()
        return
      }

      // 直接单点登陆模式检查是否登陆
      checkLogin()

      return {
        logoUrl,
        linearGradient,
        modeShadow,
        loginType,
        themeOpcity,
        theme,
        show,
        IAMObj,
        onLoginTabs
      }
    },
  mounted() {
    // 动画
    this.show = true
  }
})
</script>
<style lang="less" scoped>
.loadingBox {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

@shadow-color: v-bind(modeShadow);
@linear-gradient: v-bind(linearGradient);

.move-enter-active,
.move-leave-active {
  transform: translateX(0);
  transition: transform 0.5s ease;
}

.move-left-enter,
.move-left-leave-to {
  transform: translateX(-100px);
}

.move-right-enter,
.move-right-leave-to {
  transform: translateX(100px);
}

.udp-login {
  position: relative;
  height: 100vh;
  padding: 0;
  overflow: hidden;

  &.n-card> :deep(.n-card__content:first-child) {
    padding: 0;
  }
}

.udp-login-bg {
  >i {
    position: absolute;
    aspect-ratio: 1;
    border-radius: 100%;
  }

  .orange {
    top: -78px;
    left: 20%;
    width: 24.5%;
    background: rgba(233, 138, 68, 0.3);
  }

  .green {
    bottom: 0;
    left: 52%;
    width: 42%;
    background: rgba(161, 233, 68, 0.3);
    transform: translateY(60%);
  }

  .theme-left {
    bottom: -3.3%;
    left: -2.5%;
    width: 34%;
    background: v-bind(themeopcity);
  }

  .theme-right {
    top: -10%;
    right: 2.5%;
    width: 34%;
    background: v-bind(themeopcity);
  }

  .mark {
    position: absolute;
    z-index: 1;
    width: 100%;
    height: 100%;
    background: @linear-gradient;
    backdrop-filter: blur(240px);
  }
}

.udp-login-top {
  position: absolute;
  z-index: 2;
  display: flex;
  width: 100%;
  padding: 24px 22px;
  box-sizing: border-box;
  justify-content: space-between;

  .udp-login-logo {
    display: flex;
    align-items: center;

    .logo {
      width: 22px;
      height: 22px;
      padding: 3px;
      background: #fff;
      border: 1px solid @shadow-color;
      border-radius: 50%;
      box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.08);
    }

    .title {
      padding: 0;
      margin: 0 0 0 8px;
      font-size: 1.15vw;
      color: v-bind(theme);
    }
  }

  :deep(.n-base-selection .n-base-selection-label) {
    background: rgba(0, 0, 0, 0);
  }

  :deep(.n-base-selection__border),
  :deep(.n-base-selection__state-border) {
    display: none;
  }

  :deep(.n-base-selection .n-base-selection-label .n-base-selection-input .n-base-selection-input__content),
  :deep(.n-base-selection .n-base-suffix .n-base-suffix__arrow) {
    color: v-bind(theme);
  }
}

.udp-login-content {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: flex;
  width: 100%;
  padding: 0 19%;
  transform: translate(-50%, -45%);
  box-sizing: border-box;
  justify-content: space-between;
  align-items: stretch;
}

.udp-login-title {
  padding-right: 90px;

  .udp-login-title-name {
    margin: 0 0 14px 0;
    font-size: 2vw;
    color: v-bind(theme);
  }

  .udp-login-title-sub {
    margin: 0 0 3.4% 0;
    font-size: 14px;
    line-height: 22px;
    letter-spacing: 2px;
    color: v-bind(theme);
    word-break: break-all;
  }
}

.udp-login-content .udp-login-form {
  position: relative;
  // width: 25vw;
  overflow: hidden;
  width: 350px;
  padding: 3vw 2vw 4vw;
  text-align: center;
  background: var(--n-color);
  border-radius: 8px;
  box-shadow: 0 2px 6px 0 rgb(0 0 0 / 8%);
  box-sizing: border-box;

  .copyright {
    position: absolute;
    bottom: 1vw;
    left: 50%;
    font-size: 12px;
    line-height: 17px;
    color: #ccc;
    transform: translateX(-50%);
  }

  :deep(.n-tabs-bar) {
    background: rgba(0, 0, 0, 0);

    &::before {
      position: absolute;
      top: 0;
      left: 50%;
      width: 20px;
      height: 3px;
      background: var(--n-bar-color);
      border-radius: 100px 100px 0 0;
      content: '';
      transform: translateX(-50%);
    }
  }

  :deep(.n-tab-pane) {
    padding-top: 36px;
    text-align: left;
  }

  :deep(.anticon) {
    color: var(--n-bar-color);
  }

  :deep(.n-form-item .n-form-item-feedback-wrapper) {
    min-height: 1.7vw;
  }
}

:deep(.n-input input.n-input__input-el) {
  height: 2.3vw;
  min-height: 32px;
  line-height: 2.3vw;
}

:deep(button.n-button) {
  height: 2.3vw;
  min-height: 32px;
  margin-top: 20px;
  font-size: 16px;
}
</style>
