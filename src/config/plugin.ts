// import type { RouteRecordRaw } from 'vue-router'
// import type { AxiosRequestConfig } from 'axios'
// import { noPrefixStorage } from 'udp/utils/Storage'
import { thirdOauth2AccessToken, TokenResponse } from '@/components/login/api/oauth2'








// //  动态异步路由示例代码-start

// import { getPermissionMenu } from 'udp/api/login'
//   // 预先引入常用的布局和异常页面组件
//   const NotFoundComponent = () => import('udp/views/exception/404.vue')
//   const BlankLayoutComponent = () => import('udp/layout/blank-layout.vue')

//   // 定义静态路由数组
//   const staticRoutes = [
//   {
//         path: '/no-menu',
//         name: 'no-menu',
//         component: () => import('@/views/home/no-menu.vue'),
//         meta: {
//           title: '温馨提示'
//         }
//       },  
//     // {
//     //   ...systemRouter
//     // },
//     // {
//     //   ...messageRouter
//     // },
//     // {
//     //   ...workflowRouter
//     // }
//   ]

//   // 使用 import.meta.glob 动态导入所有视图组件
//   const modules = import.meta.glob('@/views/**/*.vue')

//   // 根据组件路径获取对应的组件
//   function getComponentByPath(componentPath: string) {
//     if (!componentPath) return null
    
//     // 尝试构建完整的组件路径
//     const normalizedPath = componentPath.startsWith('/') ? componentPath.slice(1) : componentPath
//     const componentKey = `/src/views/${normalizedPath}`
    
//     // 检查是否在动态导入的模块中存在
//     if (modules[componentKey]) {
//       return modules[componentKey]
//     }
    
//     // 如果没有找到对应的组件，尝试其他可能的路径格式
//     const altComponentKey = `/src/views/${normalizedPath}.vue`
//     if (modules[altComponentKey]) {
//       return modules[altComponentKey]
//     }
    
//     // 如果还是没有找到，返回 null
//     return null
//   }

//   // 递归处理菜单数据，转换为路由格式
//   function transformMenuToRoutes(menus: any[], parentPath: string = ''): any[] {
//     if (!menus || !Array.isArray(menus)) return []
    
//     return menus
//       // .filter(menu => menu.visible !== false) // 过滤掉不可见的菜单
//       .map(menu => {
//         // 构建当前菜单的路径
//         const currentPath = menu.path.startsWith('/') ? menu.path : `${parentPath ? parentPath + '/' : ''}${menu.path}`
        
//         // 创建路由对象
//         const route: any = {
//           path: currentPath,
//           name: menu.componentName || menu.id,
//           meta: {
//             title: menu.name,
//             icon: menu.icon,
//             permission: menu.permission,
//             keepAlive: menu.keepAlive,
//             alwaysShow: menu.alwaysShow
//           }
//         }
        
//         // 如果是叶子节点且有组件路径
//         if (menu.component && menu.component.trim() !== '') {
//           const component = getComponentByPath(menu.component)
//           if (component) {
//             route.component = component
//           } else {
//             // 如果在 views 中找不到对应组件，则使用 404 页面
//             route.component = NotFoundComponent
//           }
//         } else {
//           // 如果是父目录则路由 component 使用 blank-layout
//           route.component = BlankLayoutComponent
//         }
        
//         // 递归处理子菜单
//         if (menu.children && menu.children.length > 0) {
//           route.children = transformMenuToRoutes(menu.children, currentPath)
          
//           // 如果当前菜单是父级目录（没有组件）且有子菜单，则设置 redirect 到第一个子菜单
//           if (!menu.component || menu.component.trim() === '') {
//             const firstChild = menu.children.find((child: any) => child && child.path)
//             if (firstChild) {
//               const firstChildPath = firstChild.path.startsWith('/') ? firstChild.path : `${currentPath}/${firstChild.path}`
//               route.redirect = firstChildPath
//             }
//           }
//         }
        
//         return route
//       })
//   }



// //  动态异步路由示例代码-end












export default {
  // 自定义异步添加的路由，若此插件存在，则不请求用户中心的菜单，支持异步
  // async addRouterDefined() {
  //   try {
  //     // 获取权限菜单数据
  //     const response: any = await getPermissionMenu()
  //     const menuData = response.data // 注意这里需要访问 data.data 因为 API 返回格式是 { code, data, message }
      
  //     if (menuData && menuData.menus) {
  //       // 将菜单数据转换为路由格式
  //       const menuRoutes = transformMenuToRoutes(menuData.menus)
  //       console.log(menuRoutes)
  //       return [
  //         ...menuRoutes,
  //         // ...staticRoutes
  //       ]
  //     } else {
  //       // 如果获取不到菜单数据，返回默认路由
  //       return staticRoutes
  //     }
  //   } catch (error) {
  //     console.error('获取权限菜单失败:', error)
  //     // 如果获取菜单失败，返回默认路由
  //     return staticRoutes
  //   }
  // },
  // 对请求的菜单进行自定义处理，支持异步
  // addRouterTransform(addRouters: RouteRecordRaw, res?: any) {

  //   // 自定义权限数据
  //   const permissionList = noPrefixStorage.get('permissionList')
  //   console.log(permissionList)
  //   // 自定义权限添加，例如转化后为
  //   let exampleTransform = {
  //     path: '/home1',
  //     name: 'Home1',
  //     component: () => import('@/views/home/index.vue'),
  //     meta: {
  //       title: '首页1'
  //     }
  //   }
  //   addRouters.children.push(exampleTransform)
  //   return addRouters
  // }
  // 自定义获取菜单的请求参数
  // definedQueryMenuParams() {
  //   return {
  //   }
  // }
  // 自定义面包屑
  // definedBreadcrumb(Route): breadListType[] {
  //   return []
  // }
  // 自定义左侧菜单
  // layoutSiderConfig: {
  //   layout: {
  //     // n-layout-sider配置
  //   },
  //   menu: {
  //     // n-menu配置
  //   }
  // },
  // 自定义多语言配置
  // definedVueI18nConfig() {
  //   return {}
  // }
  // 自定义多语言切换时的操作
  // handleLangChange() {}
  // 登录成功的回调
  // loginSuccessfulCallback() {},
  // 登出之前的操作，支持异步
  // async logoutBefore() {},
  // axios请求统一request钩子, 支持异步
  // async interceptorsRequest(config: AxiosRequestConfig) {},
  // axios请求统一response钩子, 支持异步
  // async interceptorsResponse(response: AxiosRequestConfig){}
  // 登出之后的操作，支持异步
  // async logoutAfter() {}
  
  /**
   * 集成第三方用户中心登录
   * @param thirdPartyToken  string 系统间跳转URL get方式传递的 token，有该参数值，使用该值置换统一开发平台 token，免登陆，否则跳转到import.meta.env.UDP_APP_SSO_URL登录
   * @returns{ code:200, data:{  平台用户信息 }, msg:'' }   成功
   *  其他
   * .env 文件配置
   * UDP_LOGIN_TYPE=5   # 1、 用户名密码登陆（兼容老项目）；  2、 iam ；3、 自己用户名密码登陆页面； 4 、统一开发平台用户中心单点登陆 ；5 第三方用户中心登陆
   * UDP_APP_SSO_URL= xxxxxx  # 单点登录地址
   * 
   * 
   * 
   */
  
  async thirdPartyLogin(thirdPartyToken: string): Promise<TokenResponse> {
     return thirdOauth2AccessToken(thirdPartyToken)
  },
}
