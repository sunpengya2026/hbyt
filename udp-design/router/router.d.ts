import 'vue-router'

/**
 * 页面的打开方式
 * - self - 打开项目本地对应url下的index.vue文件
 * - iframe - 以ifram嵌套的方式打开
 * - blank - 以新标签页的方式打开
 * - open_self - 在本标签页进行跳转
 */
type target = 'self' | 'iframe' | 'blank' | 'open_self'

/** 路由元信息描述 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 菜单名称（面包屑）*/
    title: string
    /** 菜单图标*/
    icon?: string
    /** 菜单图标_图标样式*/
    iconCls?: string
    /** 多语言的key*/
    i18nkey?: string
    /** 是否显示在菜单中*/
    hidden?: boolean
    /** 是否进行缓存*/
    keepAlive?: boolean
    /** 页面打开方式*/
    target?: target
    /** 是否为父路由*/
    isParentRoute?: boolean
    /** 是否为子路由*/
    isChildRoute?: boolean
    /** 页面参数*/
    params?: Record<string, any>
    /** 点击父菜单点击显示自己的页面地址 **/
    parentSelfLinkTo?: string
    /** 点击父菜单点击显示自己的页面地址，对应的 **/
    parentSelfLinkFrom?: string
    /** 配置iframe或micor时，用于区别两种方式 **/
    microType?: 'iframe' | 'micro'
    /** 备注 **/
    remark?: string
  }
}
