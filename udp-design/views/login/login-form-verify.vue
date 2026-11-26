<template>
  <div>
    <n-form ref="formRef" :model="loginValue" :rules="rules" :show-label="false">
      <n-form-item path="username">
        <n-input v-model:value="loginValue.username" :placeholder="$t('f_login_msg_name')" >
              <template #prefix>
                <Icon src="self-login-user" />
              </template>
        </n-input>
      </n-form-item>
      <n-form-item path="password">
        <n-input v-model:value="loginValue.password" type="password" show-password-on="click" :placeholder="$t('f_login_msg_password')" >
          <template #prefix>
            <Icon src="self-login-password" />
          </template>
        </n-input>
      </n-form-item>
      <n-form-item v-if="isRememberMeShow" path="rememberMe">
        <n-radio :checked="rememberMe" @click="rememberMe = !rememberMe">
          {{ $t('f_login_rememberMe') }}
        </n-radio>
      </n-form-item>
      <component :is="slotFormComponent" v-if="slotFormComponent"></component>
      <n-form-item>
        <n-button attr-type="submit" type="primary" :block="true" :loading="btnLoading" :disabled="subDisabled" @click="useVerify">
          {{ $t('f_login_msg_login') }}
        </n-button>
      </n-form-item>
    </n-form>
    <Verify mode="pop" captchaType="blockPuzzle" ref="verifyRef" :blockSize="{ width: 40, height: 40 }" @success="verifySuccess" @close="verifyClose"></Verify>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, defineAsyncComponent, watch } from 'vue'
import { useNotification, FormInst } from 'naive-ui'
import { udpUserStore } from 'udp/store/user-store'
import { useRouter } from 'vue-router'
import Icon from 'udp/components/tools/icon'
import { useI18n } from 'vue-i18n'
import { udpLangStore } from 'udp/lang/langStore'
import plugin from '@/config/plugin'
import * as config from '@/config/theme-overrides'
const slotModule = import.meta.glob('../../../src/components/layout-tools/**.vue')
const slotForm = '../../../src/components/layout-tools/slot-login-form.vue'
import Verify from "../../components/verifition/Verify.vue";
import { noPrefixStorage } from "udp/utils/Storage";
export default defineComponent({
  name: 'LoginForm',
  components: { Icon, Verify },
  setup() {
    
    const { t } = useI18n()
    const LangStore = udpLangStore() 
    const UserStore = udpUserStore()
    const CAPTCHA_TYPE = window.udpGlobalConfig?.UDP_CAPTCHA_TYPE || import.meta.env.UDP_CAPTCHA_TYPE;
    const formRef = ref<FormInst | null>(null)
    let slotFormComponent = null
    if (slotModule[slotForm]) {
      slotFormComponent = defineAsyncComponent(slotModule[slotForm])
    }
    const rememberMe = ref(UserStore.getRememberMe())
    const isRememberMeShow = ref(config.isRememberMeShow)
    // eslint-disable-next-line no-undef
    const modelRef = reactive<AuthApi.loginType>({
      username: null,
      password: null
    })
    const btnLoading = ref(false)
    const notification = useNotification()
    const router = useRouter()
    const rules = {
      username: [
        {
          required: true,
          trigger: 'blur',
          renderMessage: () => {
              return t('f_login_msg_name')
          }
        }
      ],
      password: [
        {
          required: true,
          trigger: 'blur',
          renderMessage: () => {
              return t('f_login_msg_password')
          }
        }
      ]
      }
    const verifyRef = ref();
    const subDisabled = ref(false);
    const verifySuccess = (val) => {
      handleValidateClick(val);
    };

    const useVerify = () => {
      formRef.value?.validate((errors) => {
        if (!errors) {
          subDisabled.value = true;
          verifyRef.value.show();
        }
      });
    };
    const verifyClose = () => {
      subDisabled.value = false;
    };
    const loginClick = () => {
      if (CAPTCHA_TYPE == 1) {
        useVerify()
      } else {
        handleValidateClick()
      }
    }    
    // 获取地址栏url参数
    function extractRedirectUrl(queryString: string, url: string): string | null {
      // const index = queryString.indexOf('redirectUrl=')
      const index = queryString.indexOf(url);
      if (index > -1) {
        return queryString.substring(index + 12);
      }
      return null;
    }
    const redirect = extractRedirectUrl(window.location.hash.slice(1), "redirectUrl=") || '/';
    const callBack = extractRedirectUrl(window.location.hash.slice(1), "callBackUrl=");
    watch(
      () => callBack,
      async (n) => {
        if (callBack) {
          if (callBack?.startsWith("http")) {
            const url = new URL(callBack);
            // 获取所有查询参数
            const params = new URLSearchParams(url.href);
            // 或者直接获取特定参数
            noPrefixStorage.set("jwt", params.get("accessToken"));
            noPrefixStorage.set("refresh_token", params.get("accessToken"));
            const { loginSuccessfulCallback } = plugin;
            loginSuccessfulCallback && loginSuccessfulCallback();
            const redirect_uri = extractRedirectUrl(window.location.hash.slice(1), "redirect_uri=") || localStorage.getItem("redirect_uri") || "";
            if (redirect_uri?.startsWith("http")) {
              // sso跳转
              window.location.href = decodeURIComponent(redirect_uri);
              localStorage.setItem("redirect_uri", "");
            } else {
              router.replace("/")
              // 定时器延迟1秒后执行
              setTimeout(() => {
                location.reload();
              }, 1000);
            }
          }
        }
      },
      { immediate: true, deep: true }
    );
    watch(
      () => redirect,
      (n) => {
        if (redirect) {
          console.log(redirect, "redirect_uri");
          let redirectUri = decodeURIComponent(redirect);
          localStorage.setItem("redirect_uri", redirectUri);
        }
      },
      { immediate: true, deep: true }
    );    
    const handleValidateClick = (val?: string) => {
      // e.preventDefault()
      btnLoading.value = true;
      const obj = {
        username: modelRef.username,
        password: modelRef.password,
        scope: "openid",
        grant_type: "password",
      }
      if (val) {
        obj.captchaVerification = val?.captchaVerification
      }
      UserStore.loginHandle(obj, true).then(() => {
        // const redirect = UserStore.getCurrentRedirectUrl()
        console.log(redirect, "redirect_uri");
        const { loginSuccessfulCallback } = plugin;
        loginSuccessfulCallback && loginSuccessfulCallback();
        UserStore.setRememberMe(isRememberMeShow.value ? rememberMe.value : false);
        
        LangStore.refreshLanguage();
        
        if (redirect?.startsWith("http")) {
          window.location.href = decodeURIComponent(redirect);
        } else {
          console.log(redirect, "redirect");
          router.push(decodeURIComponent(redirect) || "/");
        }
      })
        .catch((error) => {
          const errorCode = error.response?.status;
          
            notification.error({
              content: errorCode === 401 ? t("f_login_msg_error") : error.response?.data.error_description || t("f_login_msg_fail"),
              duration: 2000,
            });
          
        })
        .finally(() => {
          btnLoading.value = false;
          subDisabled.value = false;
        });
    };    
    return {
      slotFormComponent,
      rememberMe,
      isRememberMeShow,
      formRef,
      loginValue: modelRef,
      rules,
      btnLoading,
      handleValidateClick,
      subDisabled,
      Verify,
      verifySuccess,
      verifyClose,
      useVerify,
      verifyRef,
      loginClick
    }
  }
})
</script>

<style lang="less" scoped></style>
