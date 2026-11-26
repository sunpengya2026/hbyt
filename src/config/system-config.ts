import { login, getUser } from '@/api/login'
import { thirdOauthGetUser } from '@/components/login/api/oauth2'
export default {
  // 获取token与用户信息
  customLogin: (user?: AuthApi.loginApi, isPublicLogin: boolean) => {
    return login(user)
      .then((res: AuthApi.loginResponseType) => {
        res.data.access_token = res.data.accessToken
        res.data.refresh_token = res.data.refreshToken
        return res.data
      })
      .finally(() => {
        // const data = {
        //   userId: 1
        // }
        // return getUser(data).then((res: any) => {
        //   res.data.displayName = res.data.nickname
        //   res.data.loginName = res.data.username
        //   res.data.user_id = res.data.id
        //   res.data.userId = res.data.id
        //   return res.data
        // })
      })
    // return new Promise((resolve, reject) => {
    //   setTimeout(() => {
    //     resolve({
    //       access_token:
    //         'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2dpbl9uY***FuZ3hpeXVlIiwidXNlcl9pZCI6ImFmMmUzN2U5MWQ1YjdjNGU2MjUyY2JiNDgyZGY2NzcwIiwidXNlcl9uYW1lIjoid2FuZ3hpeXVlIiwic2NvcGUiOlsib3BlbmlkIl0sIm9yZ2FuaXphdGlvbiI6Ik9SR0FTWjEwMDAxMTE3NiIsImlzcyI6ImEzNmMzMDQ5YjM2MjQ5YTNjOWY4ODkxY2IxMjcyNDNjIiwiZXhwIjoxNzI0NDAyNjk0LCJkaXNwbGF5X25hbWUiOiLnjovojJznjqUiLCJyZWdpb24iOiJUTCIsImlhdCI6MTcyMTgxMDY5NCwianRpIjoiYzFjMDc1OTYtZWJjMS00Nzc3LTk1N2QtOGI3M2I5Y2Y0MzdiIiwiY2xpZW50X2lkIjoiY2QwMmMzNGMtN2ZjOS00YzhlLTlkZTctMzYxMzNhZGRkOTczIn0.d7SYwq2S4vXSn7v7BDnkpBE60ruVOU6fjiGBzXP86C0koX5lOoAK_-dsRW5zpDNpSFVDdbFEvG9d5WkaykP2-o7Tk64Tlz7o8oGUCIw3TaZMHAJa_wMHHmGhYzGkqDDIE1LjqZzFvdIo3CTa56FB4aHH6VjsSSumZ2ie75ms47WFSqcqrwrVgB-1xq9O4Yw7asEYGrRxP5zu-DJzFbaePWnQeI5psj5qoisokVHeEf6VfkV601KKFGydSxfbemYmWhZpaN6AF7jdbk-tDd-Dms5aVooz4Y1lD4As17y3JEknx1CK8-9HeSrKBZGaTHVGrR5LR-2HIbFe4rNPJ7mb8A',
    //       refresh_token:
    //         'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25h***eGl5dWUiLCJpc3MiOiJhMzZjMzA0OWIzNjI0OWEzYzlmODg5MWNiMTI3MjQzYyIsImRpc3BsYXlfbmFtZSI6IueOi-iMnOeOpSIsImNsaWVudF9pZCI6ImNkMDJjMzRjLTdmYzktNGM4ZS05ZGU3LTM2MTMzYWRkZDk3MyIsImxvZ2luX25hbWUiOiJ3YW5neGl5dWUiLCJ1c2VyX2lkIjoiYWYyZTM3ZTkxZDViN2M0ZTYyNTJjYmI0ODJkZjY3NzAiLCJzY29wZSI6WyJvcGVuaWQiXSwib3JnYW5pemF0aW9uIjoiT1JHQVNaMTAwMDExMTc2IiwiYXRpIjoiYzFjMDc1OTYtZWJjMS00Nzc3LTk1N2QtOGI3M2I5Y2Y0MzdiIiwiZXhwIjoxNzI0NDAyNjk0LCJyZWdpb24iOiJUTCIsImlhdCI6MTcyMTgxMDY5NCwianRpIjoiODc0NzZiYjAtNDdjYi00ZWZhLTkyMGYtN2MwMDc2ZDdhMzYwIn0.lKluWwDWztG0FvjPeoZC4pGxjgDhDDXtpCG-5xS7Tkt0GSBJVeqzYDJvsF6BP27pybDxIUMSJ7-dkK3_DW46jV2zJwk29a8AqhfOl8qQOnH213yKZrOFxZnSGHsZdT1UNaNIP9EVYXq3LUzj9CvT7MkOlfsiOr2msBohxZ50FXib57F6DyLnjaEpw4m9nX-2ny2K09dUK5PqIPOQ_gPlHxkHoofqo12ryX8HtqCrGBOKJL2z6jJSY62Holjsb-pa-amLUxpnXoaGWBu9WgSCF8evZx-OwUbCl8a-ZpkoQiczaWZQ_oQIpyQFqa-Scg_1EghHd6JjR8Gp2lvGA6ygbQ',
    //       login_name: 'wangxiyue',
    //       user_id: 'af2e37e91d5***6252cbb482df6770',
    //       organization: 'ORGASZ1***11176',
    //       display_name: '用户名',
    //       region: 'TL'
    //     } as AuthApi.loginResponseType)
    //   }, 1000)
    // })
  },
  // 自定义获取用户信息
  customCurrentuser: (userInfo: { userId: string, isThirdPartyLogin?: boolean }, token?: string) => {
    if (userInfo.isThirdPartyLogin) {
        return thirdOauthGetUser().then((res: any) => {
        res.data.displayName = res.data.nickname
        res.data.loginName = res.data.username
        res.data.user_id = res.data.id
        res.data.userId = res.data.id
        return res.data
      });
    } else {
      return getUser(userInfo).then((res: any) => {
        res.data.displayName = res.data.nickname
        res.data.loginName = res.data.username
        res.data.user_id = res.data.id
        res.data.userId = res.data.id
        return res.data
      })
    }
    // return new Promise((resolve, reject) => {
    //   setTimeout(() => {
    //     resolve({
    //       id: 'af2e37e91d5b7c4e6252cbb48***0',
    //       displayName: '用户名',
    //       loginName: 'wangxiyue',
    //       belongOrg: 'ORGASZ1***6',
    //       userId: 'af2e37e91d5b7c4e625***82df6770',
    //       dataRegion: 'TL'
    //     } as AuthApi.currentuserType)
    //   }, 1000)
    // })
  },
  // 自定义获取用户租户列表
  customUserTenantList: appCode => {
    console.log(appCode)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          msg: '操作成功！',
          flag: true,
          result: [
            {
              id: '70ef7e******ee9b5ef238f50618382',
              name: '前端租户测试',
              tenantCode: 'f84t***3us4c',
              parentId: 'nuq***a13r3v'
            } as AuthApi.tenantResponseType
          ]
        })
      }, 1000)
    })
  },
  // 自定义获取多语言列表
  customGetLanguageList: appCode => {
    console.log(appCode)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve([
          {
            id: 'f3640310781b34ef319084252ea68f26',
            code: 'zh_CN',
            name: '简体中文'
          },
          {
            id: 'b4a8cd5e3ecc8211f6c1fba698ddf9c1',
            code: 'en_GB',
            name: 'English'
          }
        ])
      }, 1000)
    })
  },
  // 自定义获取多语言翻译
  // customGetLanguage: (appCode, type) => {
  //   console.log(appCode)
  //   console.log(type)
  //   return new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       resolve({
  //         m_link: '嵌入第三方',
  //         m_authority_params: ' 路由传参-params',
  //         m_authority_button_inheritance: '继承父级按钮/菜单权限',
  //         m_authority: '传参与权限',
  //         m_childRouter4: '子路由4',
  //         m_authority_button: '按钮权限',
  //         m_childRouter: '子路由',
  //         m_authority_query: ' 路由传参-query',
  //         m_link_self: '在本标签页打开链接',
  //         m_authority_button_defined: '自定义按钮/链接权限',
  //         m_link_iframe: ' 内嵌第三方页面',
  //         m_menu2: ' 菜单2',
  //         m_childRouter1: '子路由1',
  //         m_drill: '下钻示例',
  //         m_drill_list: ' 列表页',
  //         m_drill_editor2: '下钻修改2',
  //         m_drill_editor1: '下钻修改1',
  //         m_link_blank: ' 跳转到新的标签页'
  //       })
  //     }, 1000)
  //   })
  // },
  // 自定义菜单请求
  // customMenuList() {
  //   return new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       resolve({
  //         code: 'success',
  //         msg: '操作成功',
  //         data: [
  //           {
  //             id: 'a4qe37pnvu9d5pjbtus8o4bu',
  //             text: '路由传参与按钮权限示例',
  //             iconCls: 'http://a6-rficons.a6-dev.dev.pcep.cloud/rfIcons/line/function/主页.svg',
  //             type: 'linkMenu',
  //             url: '/menu-first',
  //             remark: '',
  //             icon: null,
  //             openMode: 'self',
  //             i18nkey: 'm_authority',
  //             isCached: '0',
  //             isShowFunction: '1',
  //             isChildRoute: '0',
  //             extend: '',
  //             children: [
  //               {
  //                 id: 'ha9tla81syw7',
  //                 url: 'https://www.baidu.com/',
  //                 i18nkey: '',
  //                 text: 'linkToPath',
  //                 iconCls: '',
  //                 isCached: '0',
  //                 isShowFunction: '1',
  //                 isChildRoute: '0',
  //                 remark: '',
  //                 icon: '',
  //                 children: null,
  //                 type: 'button',
  //                 openMode: 'self',
  //                 extend: ''
  //               }
  //             ]
  //           } as AuthApi.menuResponseType
  //         ]
  //       })
  //     }, 1000)
  //   })
  // }
}
