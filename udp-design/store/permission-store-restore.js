import { defineStore } from 'pinia';
import cloneDeep from 'lodash.clonedeep';
import qs from 'qs';
import {
  asyncRouter as asyncRouterConfig,
  errorPageRoute as errorPageRouteConfig,
  PageBuilding as PageBuildingConfig,
  RedirectRoute as RedirectRouteConfig,
  constantRouter as constantRouterConfig
} from 'udp/router/router-config-default';
import {
  customMenuRouter as customMenuRouterConfig,
  customPageRouter as customPageRouterConfig,
  customWhiteList as customWhiteListConfig
} from '@/router/router-custom';
import { udpUserStore as userStore } from 'udp/store/user-store';
import { udpAppStore as appStore } from 'udp/store/app-store';
import { mxMenuHiddenStore as menuHiddenStore } from 'udp/store/menu-hidden-store';
import { queryMenu as queryMenuApi } from 'udp/api/user';
import { router as routerInstance } from 'udp/router';
import { createStorage as createStorageUtil } from 'udp/utils/Storage';
import BlankLayout from 'udp/layout/blank-layout.vue';
import IframePage from 'udp/components/iframe/iframe-page.vue';
import PageBuilding from 'udp/views/exception/page-building.vue';
import {
  modulesIframe as iframeModules,
  systemModules as systemModulesConfig,
  envConfig as envConfig,
  modules as viewsModules
} from 'udp/store/views-module';
import pluginConfig from '@/config/plugin';
import * as themeOverrides from '@/config/theme-overrides';
import envChangeUrlConfig from 'udp/api/env-change-url-config';

/**
 * 获取 iframe 组件，如果未配置则使用默认的 IframePage 组件
 */
const IframeComponent = iframeModules['iframe'] || IframePage;

/**
 * 获取系统配置模块
 */
const SystemConfig = systemModulesConfig['../../src/config/system-config.ts'];

/**
 * 获取基础路由配置，包括常量路由和自定义页面路由
 * @returns {Array} 基础路由配置
 */
const getBaseRouters = () => [...cloneDeep(constantRouterConfig), ...cloneDeep(customPageRouterConfig)];

/**
 * 获取异步路由配置，支持动态添加额外路由
 * @param {Array} additionalRoutes - 额外路由配置
 * @returns {Object} 异步路由配置
 */
const getAsyncRouters = (additionalRoutes = []) => {
  const asyncRouters = cloneDeep(asyncRouterConfig);
  asyncRouters.children = [...asyncRouters.children, ...cloneDeep(customMenuRouterConfig), ...additionalRoutes];
  return asyncRouters;
};

/**
 * 创建单个路由配置
 * @param {Object} menuItem - 菜单项
 * @param {Boolean} isChildRoute - 是否为子路由
 * @returns {Object} 路由配置
 */
const createRoute = (menuItem, isChildRoute = false) => {
  const user = userStore();
  const route = {
    name: menuItem.id,
    path: menuItem?.url || `/${menuItem.id}`,
    meta: {
      title: menuItem?.name,
      i18nkey: menuItem?.i18nkey,
      hidden: menuItem?.isShowFunction === '0',
      keepAlive: menuItem?.isCached === '1',
      isChildRoute,
      isParentRoute: true,
      remark: menuItem?.remark
    },
    props: {}
  };

  // 设置菜单项的图标
  if (menuItem) {
    if (menuItem.icon) route.meta.icon = menuItem.icon;
    if (menuItem.iconImg) route.meta.iconImg = menuItem.iconImg;
  }

  // 根据菜单类型设置路由组件和路径
  const menuType = menuItem?.type;
  switch (menuType) {
    case 'iframe':
      route.component = IframeComponent;
      route.path = `/${menuItem.id}`;
      route.meta.iframeUrl = menuItem?.url;
      route.meta.microType = menuType;
      break;
    case 'link':
      route.component = IframeComponent;
      route.path = menuItem.url;
      route.meta.microType = menuType;
      break;
    case 'blank':
      // 替换路径中的动态参数
      route.path = route.path.replace('${token}', localStorage.getItem('token'));
      route.path = route.path.replace('${tenantCode}', user.tenantCode);
      route.meta.target = '_blank';
      break;
    case 'micro': {
      const baseUrl = envConfig.BASE_URL;
      if (menuItem.url && menuItem.url.startsWith(baseUrl)) {
        // 处理微前端路由
        const viewPath = menuItem.url.slice(baseUrl.length - 1);
        route.component = viewsModules[`../../src/views${viewPath}/index.vue`];
        route.path = viewPath;
      } else {
        // 替换路径中的动态参数
        route.path = route.path.replace('${token}', localStorage.getItem('token'));
        route.path = route.path.replace('${tenantCode}', user.tenantCode);
        route.meta.target = '_self';
      }
      break;
    }
    default: {
      // 处理普通路由
      let pathWithoutQuery = menuItem?.url?.split('?')[0];
      const queryString = menuItem?.url?.split('?')[1];
      const queryParams = queryString ? qs.parse(queryString) : {};
      const dynamicParams = {};
      const viewPath = pathWithoutQuery?.split('/:')[0];

      // 替换路径中的动态参数
      if (pathWithoutQuery) {
        pathWithoutQuery.split('/').filter(part => part.startsWith(':')).forEach(param => {
          const paramName = param.slice(1);
          const paramValue = queryParams[paramName];
          if (paramValue) {
            pathWithoutQuery = pathWithoutQuery.replace(param, paramValue);
            dynamicParams[paramName] = paramValue;
            delete queryParams[paramName];
          }
        });
      }

      // 设置路由组件和路径
      if (viewPath) {
        route.component = viewsModules[`../../src/views${viewPath}/index.vue`];
        route.path = pathWithoutQuery;
      } else {
        route.component = PageBuilding;
      }

      route.query = queryParams;
      route.meta.params = dynamicParams;

      // 设置菜单项的系统功能属性
      if (menuItem.sysFunctionPropertyValues?.length) {
        route.props.sysFunctionPropertyValues = menuItem.sysFunctionPropertyValues;
      }

      // 设置父级自链接目标
      if (menuItem.parentSelfLinkTo) {
        route.meta.parentSelfLinkTo = menuItem.parentSelfLinkTo;
      }
      break;
    }
  }

  return route;
};

/**
 * 创建嵌套路由配置
 * @param {Object} menuItem - 菜单项
 * @param {Object} parentRoute - 父级路由
 * @returns {Object} 嵌套路由配置
 */
const createNestedRoute = (menuItem, parentRoute = null) => {
  const isParentRoute = menuItem?.isParent === '1' || true;
  let nestedRoute = null;

  if (menuItem.children && menuItem.children.length) {
    if (menuItem.children.some(child => child.type === 'menu' || child.type === 'linkMenu')) {
      nestedRoute = {
        name: menuItem.id,
        path: menuItem?.url || `/${menuItem.id}`,
        component: BlankLayout,
        children: [],
        meta: {
          i18nkey: menuItem?.i18nkey,
          title: menuItem?.name,
          icon: menuItem?.icon || '',
          hidden: menuItem?.isShowFunction === '0',
          keepAlive: menuItem?.isCached === '1',
          isParentRoute,
          isChildRoute: parentRoute?.meta?.isChildRoute || false,
          remark: menuItem?.remark
        },
        props: {}
      };

      // 设置路由层级
      if (parentRoute) {
        nestedRoute.meta.mxLevel = parentRoute.meta.mxLevel + 1;
      } else {
        nestedRoute.meta.mxLevel = 1;
      }

      // 设置菜单项的图标
      if (menuItem.iconImg) {
        nestedRoute.meta.iconImg = menuItem.iconImg;
      }

      // 如果是父级路由，设置对应的视图组件
      if (isParentRoute) {
        const viewPath = menuItem?.url?.split('?')[0]?.split('/:')[0];
        if (viewPath) {
          nestedRoute.component = viewsModules[`../../src/views${viewPath}/index.vue`];
        }
      }

      // 处理子菜单项
      menuItem.children.forEach(child => {
        if (child.type === 'menu' || child.type === 'linkMenu') {
          if (child.children?.some(grandChild => grandChild.type === 'menu' || grandChild.type === 'linkMenu')) {
            // 递归处理嵌套子菜单
            nestedRoute.children.push(createNestedRoute(child, nestedRoute));
          } else {
            // 创建子路由
            const childRoute = createRoute(child, isParentRoute);
            if (child.children) {
              child.children.forEach(grandChild => {
                childRoute.props[grandChild.text?.split(':')[0]] = grandChild.url || true;
              });
            }
            nestedRoute.children.push(childRoute);
          }
        } else {
          // 设置非菜单项的路由属性
          nestedRoute.meta[child.name?.split(':')[0]] = child.url || true;
        }
      });

      // 处理链接菜单的特殊逻辑
      if (menuItem.type === 'linkMenu' && parentRoute) {
        const openPath = menuItem.openMode === 'open_self' ? menuItem.url : `${menuItem.id}_link`;
        const linkRoute = createRoute({ ...menuItem, id: openPath, isShowFunction: '0' });
        linkRoute.meta.parentSelfLinkFrom = menuItem.id;
        linkRoute.props = nestedRoute.props;
        (parentRoute || parentRoute).children.push(linkRoute);
        nestedRoute.path = `/${menuItem.id}`;
        nestedRoute.name = menuItem.id;
        nestedRoute.meta.parentSelfLinkTo = linkRoute.path;
      }
    } else {
      // 创建普通路由
      nestedRoute = createRoute(menuItem, isParentRoute);
      menuItem.children.forEach(child => {
        nestedRoute.meta[child.text?.split(':')[0]] = child.url || true;
      });
    }
  } else if (menuItem.type === 'menu' || menuItem.type === 'linkMenu') {
    // 创建单一路由
    nestedRoute = createRoute(menuItem, isParentRoute);
  } else if (parentRoute) {
    // 设置父级路由的属性
    parentRoute.meta[menuItem.name?.split(':')[0]] = menuItem.url || true;
  }

  // 设置菜单项的系统功能属性
  if (menuItem.sysFunctionPropertyValues?.length) {
    nestedRoute.meta.sysFunctionPropertyValues = menuItem.sysFunctionPropertyValues;
  }

  // 设置父级自链接目标
  if (menuItem.parentSelfLinkTo) {
    nestedRoute.meta.parentSelfLinkTo = menuItem.parentSelfLinkTo;
  }

  return nestedRoute;
};

/**
 * 处理路由的重定向逻辑
 * @param {Array} routes - 路由配置
 * @returns {Array} 处理后的路由配置
 */
const processRedirects = (routes) => {
  if (Array.isArray(routes) && routes.length) {
    routes.forEach(route => {
      if (route.children && route.children.length) {
        if (!route.redirect) {
          // 设置默认子路由的重定向
          let defaultChildIndex = -1;
          const hasVisibleChild = route.children.some((child, index) => {
            defaultChildIndex = index;
            return (child.meta?.parentSelfLinkFrom || !child.meta?.hidden);
          }) ? defaultChildIndex : 0;

          const defaultChild = route.children[hasVisibleChild];
          const queryString = defaultChild?.query ? qs.stringify(defaultChild.query) : '';
          route.redirect = `${defaultChild.path}${queryString ? '?' : ''}${queryString}`;
        }

        // 合并父级路由的属性
        route.children.forEach(child => {
          child.props = child.props ? { ...route.props, ...child.props } : route.props;
        });

        // 递归处理子路由
        processRedirects(route.children);
      }
    });
  }

  return routes;
};

/**
 * 格式化路由配置
 * @param {Array} menuList - 菜单列表
 * @returns {Array} 格式化后的路由配置
 */
const formatRoutes = (menuList) => {
  const asyncRouters = getAsyncRouters();
  if (menuList?.length) {
    menuList.forEach(menuItem => {
      if (menuItem.type === 'menu' || menuItem.type === 'linkMenu') {
        asyncRouters.children.push(createNestedRoute(menuItem, asyncRouters));
      }
    });
  }

  return processRedirects([asyncRouters]);
};

/**
 * 过滤路由配置
 * @param {Array} routes - 路由配置
 * @param {Array} whiteList - 白名单
 * @returns {Array} 过滤后的路由配置
 */
const filterRoutes = (routes, whiteList) => {
  return routes.filter(route => {
    return whiteList.includes(route.name) || 
           (route.children?.length ? (route.children = filterRoutes(route.children, whiteList), route.children.length) : false);
  });
};

/**
 * 解析路由的重定向
 * @param {Object} route - 路由配置
 * @param {String} fallbackRedirect - 默认重定向路径
 * @returns {String} 解析后的重定向路径
 */
const resolveRedirect = (route, fallbackRedirect) => {
  if (route.redirect) {
    const [path, query] = route.redirect.toString().split('?');
    const matchingChild = route.children?.find(child => {
      let childQuery = child.query;
      childQuery = childQuery ? new URLSearchParams(childQuery).toString() : undefined;
      childQuery = childQuery || undefined;
      return child.path === path && childQuery === query;
    });

    return matchingChild ? 
           (matchingChild.redirect ? resolveRedirect(matchingChild, matchingChild.redirect.toString()) : route.redirect.toString()) : 
           fallbackRedirect;
  }
  return fallbackRedirect;
};

/**
 * 权限存储模块
 */
export const usePermissionStore = defineStore('permission-store', {
  state: () => ({
    routers: getBaseRouters(),
    addRouters: null
  }),

  actions: {
    /**
     * 获取未授权菜单
     * @returns {Promise} 未授权菜单的路由配置
     */
    unauthorizedMenu() {
      return new Promise(resolve => {
        const asyncRouters = cloneDeep(asyncRouterConfig);
        const filteredMenu = filterRoutes(cloneDeep(customMenuRouterConfig), customWhiteListConfig);
        asyncRouters.children = [...asyncRouters.children, ...filteredMenu];
        asyncRouters.redirect = asyncRouters.children[0];
        this.addRouterHandler(asyncRouters).then(() => {
          setTimeout(() => resolve(asyncRouters), 0);
        });
      });
    },

    /**
     * 创建并添加路由
     * @param {Array} menuList - 菜单列表
     * @param {Object} options - 选项
     * @returns {Promise} 路由配置
     */
    async createAddRouter(menuList, options) {
      const { addRouterDefined } = pluginConfig;
      const formattedRoutes = addRouterDefined ? getAsyncRouters(menuList) : formatRoutes(menuList)[0];
      await this.addRouterHandler(formattedRoutes, options);
      return Promise.resolve(formattedRoutes);
    },

    /**
     * 处理路由添加逻辑
     * @param {Object} routes - 路由配置
     * @param {Object} options - 选项
     * @returns {Promise} 处理结果
     */
    async addRouterHandler(routes, options) {
      const user = userStore();
      const { addRouterDefined, addRouterTransform } = pluginConfig;

      // 设置默认重定向
      if (!routes.redirect) {
        if (routes.children?.length) {
          routes.redirect = routes.children[0];
        } else {
          if (user.isPublicUser) {
            routes.redirect = user.logoutUrl;
          } else {
            const envConfig = await envChangeUrlConfig;
            routes.redirect = themeOverrides.ErrorPageRedirect || 
                              (envConfig.isSingleTenant !== 'true' && !userStore().tenantList.length ? '/404' : '/403');
          }
        }
      }

      // 应用路由转换逻辑
      if (addRouterTransform && !addRouterDefined) {
        routes = await addRouterTransform(routes, options);
      }

      // 添加路由
      routerInstance.addRoute(routes);
      this.addRouters = routes;
      this.routers = [...getBaseRouters(), routes];
    },

    /**
     * 生成路由配置
     * @param {Object} appInfo - 应用信息
     * @param {Object} params - 参数
     * @returns {Promise} 路由配置
     */
    async generateRoutes(appInfo, params) {
      const systemConfig = SystemConfig ? await SystemConfig() : null;
      return new Promise(resolve => {
        const user = userStore();
        const { definedQueryMenuParams, addRouterDefined } = pluginConfig;
        const userId = user.userInfo.userId;
        let menuPromise = null;

        // 获取菜单数据
        if (addRouterDefined) {
          menuPromise = Promise.resolve(addRouterDefined());
        } else if (systemConfig?.default?.customMenuList) {
          menuPromise = systemConfig.default.customMenuList();
        } else {
          menuPromise = queryMenuApi(userId, params || definedQueryMenuParams?.() || {
            appCode: window?.udpGlobalConfig?.UDP_APP_CODE || envConfig.UDP_APP_CODE,
            tenantCode: user.tenantCode,
            accessType: 'public'
          });
        }

        // 处理菜单数据
        menuPromise.then(response => {
          const menuData = addRouterDefined ? response : response?.data || [];
          this.createAddRouter(menuData, response).then(resolve);
        }).catch(error => {
          console.error(error);
          this.createAddRouter([]).then(resolve);
        }).finally(() => {
          appInfo && appStore().setLayout(appInfo);
        });
      });
    },

    /**
     * 处理错误页面的重定向
     * @returns {Promise} 处理结果
     */
    async errorPageLinkTo() {
      const user = userStore();
      if (routerInstance.getRoutes().findIndex(route => route.name === errorPageRouteConfig.name) === -1) {
        let redirectPath = '/403';
        if (themeOverrides.ErrorPageRedirect) {
          redirectPath = themeOverrides.ErrorPageRedirect;
        } else if (user.logoutToPage) {
          redirectPath = () => (user.logout(true), redirectPath);
        } else {
          const envConfig = await envChangeUrlConfig;
          if (envConfig.isSingleTenant !== 'true') {
            redirectPath = () => userStore().tenantList.length ? '/403' : '/404';
          }
        }

        errorPageRouteConfig.redirect = redirectPath;
        routerInstance.addRoute(errorPageRouteConfig);
      }
    },

    /**
     * 格式化路由配置
     * @returns {Promise} 处理结果
     */
    generateRoutesFormat() {
      return new Promise(resolve => {
        this.errorPageLinkTo();
        if (routerInstance.getRoutes().findIndex(route => route.name === PageBuildingConfig.name) === -1) {
          routerInstance.addRoute('Root', PageBuildingConfig);
        }
        if (routerInstance.getRoutes().findIndex(route => route.name === RedirectRouteConfig.name) === -1) {
          routerInstance.addRoute('Redirect', RedirectRouteConfig);
        }

        // 处理隐藏菜单的存储
        const storage = createStorageUtil({ storage: sessionStorage });
        const hiddenList = storage.get('finally');
        if (hiddenList) {
          menuHiddenStore().setHiddenListDirectly(hiddenList);
          storage.remove('finally');
        }

        resolve();
      });
    },

    /**
     * 生成并添加路由
     * @param {Boolean} isUnauthorized - 是否为未授权状态
     * @returns {Promise} 处理结果
     */
    async generateRoutesAddRoute(isUnauthorized) {
      const user = userStore();
      try {
        if (isUnauthorized) {
          await this.unauthorizedMenu();
        } else {
          await user.setTenantList();
          await this.generateRoutesFormat();
        }
        await this.errorPageLinkTo();
      } catch (error) {
        console.error(error);
      }
    },

    /**
     * 查找根路由的重定向
     * @returns {String} 重定向路径
     */
    findRootRouteRedirect() {
      const rootRoute = this.addRouters;
      return rootRoute?.redirect ? resolveRedirect(rootRoute, rootRoute.redirect.toString()) : '/';
    }
  }
});