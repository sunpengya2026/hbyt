declare namespace AuthApi {
  // login的用户名密码
  interface loginType {
    username: string | null
    password: string | null
  }
  // 登录接口
  interface loginApi extends loginType {
    scope: string
    // eslint-disable-next-line camelcase
    grant_type: string
  }
  // token接口返回数据格式
  interface loginResponseType {
    // 访问令牌
    access_token: string
    // 刷新令牌
    refresh_token: string
    // 登录名
    login_name: string
    // 用户id
    user_id: string
    // 组织id
    organization: string
    // 用户名
    display_name: string
    // 区域id
    region: string
    // 其他参数
    [x: string]: any
  }
  // currentuser接口返回数据格式
  interface currentuserType {
    // 用户id
    id: string
    // 用户名
    displayName: string
    // 登录名
    loginName: string
    // 组织id
    belongOrg: string
    // 用户id
    userId: string
    // 区域id
    dataRegion: string
    // 其他参数
    [x: string]: any
  }
  interface tenantResponseType {
    // 租户id
    id: string
    // 租户名称
    name: string
    // 租户编码
    tenantCode: string
    // 父级id
    parentId: string
    // 其他参数
    [x: string]: any
  }
  interface menuResponseType {
    // 菜单id
    id: string
    // 菜单url
    url: string
    // 菜单多语言key
    i18nkey: string
    // 菜单名称
    text: string
    // 菜单图标
    iconCls?: string
    // 菜单图标
    icon?: string
    // 是否缓存
    isCached: '0' | '1'
    // 菜单是否显示
    isShowFunction: '0' | '1'
    // 是否为子路由
    isChildRoute: '0' | '1'
    // 备注
    remark: string
    // 子菜单
    children: null | menuResponseType[]
    // 菜单类型(menu:菜单；button:功能；linkMenu:自定义父菜单)
    type: 'menu' | 'button' | 'linkMenu' | string
    // 打开方式
    openMode: 'self' | 'iframe' | 'blank' | 'open_self' | 'micro'
    // 扩展
    extend: string
    // 其他参数
    [x: string]: any
  }
}
