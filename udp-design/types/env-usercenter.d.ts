declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  // eslint-disable-next-line
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly KLD_TITLE: string
  readonly KLD_TITLE_SUB: string
  readonly KLD_PUBLIC_URL: string
  readonly KLD_CLIENT_ID: string
  readonly KLD_CLIENT_SECRET: string
  readonly KLD_APP_CODE: string
  readonly KLD_TENANT_CODE: string
  readonly KLD_LOGIN_TYPE: string
  readonly KLD_IAM_TYPE: string
  readonly KLD_ENV_FLAG: string
  readonly KLD_TENANT_SINGLE: string
  readonly KLD_QUERY_CONFIG_URL: string
  readonly KLD_QUERY_MENU_URL: string
  readonly UDP_APP_TENANT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
interface GlobalConfig {
  [x: string]: any
  readonly KldUserCenter?: string
  readonly KldIamLogin?: string
  readonly KldIamLogout?: string
}

declare interface Window {
  $dialog: DialogApiInjection
  $loading: LoadingBarApiInjection
  $message: MessageApiInjection
  $notification: NotificationApiInjection
  kldEnv: string
  udpGlobalConfig: GlobalConfig
  t: ComposerTranslation
}

declare module 'lodash.clonedeep'
declare module 'qs'
declare module 'lodash.debounce'
declare module 'element-resize-detector'
declare module '@iconfu/svg-inject'
declare module 'encryptlong'
