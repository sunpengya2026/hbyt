// 导入所需的依赖
import { defineStore } from 'pinia';
import { router } from 'udp/router';
import { watch } from 'vue';
import { createStorage } from 'udp/utils/Storage';
import { mxMenuHiddenStore } from 'udp/store/menu-hidden-store';
import { tabKeepAlive } from '@/config/theme-overrides';

// 创建本地存储实例
const storage = createStorage();

// 定义标签页视图存储
const useTabsViewStore = defineStore('tabs-view-store', {
  // 定义状态
  state: () => ({
    tabsList: [], // 标签页列表
    isShowTabs: tabKeepAlive, // 是否显示标签页
    excludeKeepAliveList: [], // 排除缓存的标签页列表
    noTabsKeepAliveList: [], // 不需要标签页缓存的列表
    hiddenKeepAliveList: [], // 隐藏的标签页缓存列表
  }),
  // 定义操作
  actions: {
    // 设置标签页列表
    setTabsList(tabs) {
      this.tabsList = tabs;
    },

    // 格式化组件名称
    formatComponentName(route) {
      const matched = route.matched;
      if (!matched || !matched.length) return '';
      const lastMatched = matched[matched.length - 1];
      return lastMatched?.components?.default?.name || '';
    },

    // 格式化路由项
    formatRouteItem(route) {
      return {
        fullPath: route.fullPath, // 完整路径
        name: route.name, // 路由名称
        title: route.meta.title, // 标题
        keepAlive: route.meta.keepAlive, // 是否缓存
        componentName: this.formatComponentName(route), // 组件名称
        hidden: route.meta.hidden, // 是否隐藏
        i18nkey: route.meta?.i18nkey, // 国际化键
      };
    },

    // 格式化匹配的路由项
    formatMatchedItem(route) {
      return {
        fullPath: route.path, // 完整路径
        name: route.name, // 路由名称
        title: route.meta?.title, // 标题
        keepAlive: route.meta?.keepAlive, // 是否缓存
        componentName: route.components?.default?.name, // 组件名称
        hidden: route.meta?.hidden, // 是否隐藏
        i18nkey: route.meta?.i18nkey, // 国际化键
      };
    },

    // 添加标签页
    addTabs(route, forceAdd) {
      const formattedRoute = this.formatRouteItem(route);
      if (
        (this.isShowTabs || storage.get('isShowTabs')) && // 如果显示标签页或存储中设置为显示
        (forceAdd || !route.meta.hidden) && // 强制添加或路由不隐藏
        !this.tabsList.some((tab) => tab.name === formattedRoute.name) // 标签页列表中不存在同名标签页
      ) {
        this.tabsList.push(formattedRoute); // 添加到标签页列表
        const index = this.excludeKeepAliveList.findIndex(
          (item) => item.name === formattedRoute.name
        );
        if (index !== -1) this.excludeKeepAliveList.splice(index, 1); // 如果存在于排除缓存列表，则移除
      }
      this.setExcludeKeepAliveList(formattedRoute, route); // 设置排除缓存列表
    },

    // 切换标签页
    changeTabs(currentRoute, prevRoute, menuMap) {
      const menuHiddenStore = mxMenuHiddenStore();
      const isOneLineMenuMap = menuHiddenStore.isOneLineMenuMap;

      // 如果标签页列表为空且显示标签页，则添加当前路由
      if (!this.tabsList.length && this.isShowTabs) {
        this.addTabs(currentRoute, true);
        this.hiddenKeepAliveList.push(this.formatRouteItem(currentRoute));
        return;
      }

      // 如果提供了菜单映射，则根据菜单映射处理
      if (menuMap) {
        const menuItem = menuHiddenStore.findMenuMap(menuMap);
        if (menuItem) {
          const toRoute = menuItem.to;
          const index = this.tabsList.findIndex((tab) =>
            toRoute.some((item) => item.from.name === tab.name)
          );
          if (index !== -1) {
            this.tabsList.splice(index, 1, this.formatRouteItem(currentRoute)); // 替换标签页
          } else {
            this.addTabs(currentRoute, true); // 添加标签页
          }
        }
        return;
      }

      // 如果有上一个路由，则根据路由关系处理
      if (prevRoute) {
        const currentName = currentRoute.name;
        const prevName = prevRoute?.name;
        if (isOneLineMenuMap(prevName, currentName)) {
          const prevIndex = this.tabsList.findIndex(
            (tab) => tab.name === prevName
          );
          const menuItem = menuHiddenStore.findMenuMap(currentRoute.name);
          if (menuItem) this.deleteHiddenKeepAliveList(menuItem); // 删除隐藏的缓存

          if (
            !this.hiddenKeepAliveList.some(
              (item) => item.name === currentName
            )
          ) {
            this.hiddenKeepAliveList.push(this.formatRouteItem(currentRoute)); // 添加到隐藏缓存列表
          }

          if (prevIndex !== -1) {
            this.tabsList.splice(
              prevIndex,
              1,
              this.formatRouteItem(currentRoute)
            ); // 替换标签页
          }
          return;
        } else {
          const menuMap = menuHiddenStore.hiddenMenuMap;
          const index = menuMap.findIndex(
            (item) => item.from.name === currentName
          );
          if (
            index !== -1 &&
            !this.tabsList.some((tab) => tab.name === currentName)
          ) {
            const menuItem = menuMap[index];
            const tabIndex = this.tabsList.findIndex((tab) =>
              menuHiddenStore.isChildRoute(tab.name, menuItem.to)
            );
            if (tabIndex !== -1) {
              this.tabsList.splice(
                tabIndex,
                1,
                this.formatRouteItem(currentRoute)
              ); // 替换标签页
            } else {
              if (this.isShowTabs) this.addTabs(currentRoute, true); // 添加标签页
              if (
                !this.hiddenKeepAliveList.some(
                  (item) => item.name === currentName
                )
              ) {
                this.hiddenKeepAliveList.push(this.formatRouteItem(currentRoute)); // 添加到隐藏缓存列表
              }
            }
          }
        }
      }
    },

    // 关闭其他标签页
    closeOtherTabs(currentTab) {
      this.excludeKeepAliveList = this.tabsList.filter(
        (tab) => tab.name !== currentTab.name && !tab.keepAlive
      ); // 排除当前标签页和非缓存的标签页
      this.tabsList.forEach((tab) => {
        if (tab.hidden) {
          const menuItem = mxMenuHiddenStore().getHiddenParent(tab.name);
          if (menuItem) this.deleteHiddenKeepAliveList(menuItem, true, true); // 删除隐藏的缓存
        }
      });
      this.tabsList = this.tabsList.filter((tab) => tab.name === currentTab.name); // 仅保留当前标签页
    },

    // 关闭当前标签页
    closeCurrentTab(tab) {
      const index = this.tabsList.findIndex((item) => item.name === tab.name);
      if (tab.hidden) {
        const menuItem = mxMenuHiddenStore().getHiddenParent(tab.name);
        if (menuItem) this.deleteHiddenKeepAliveList(menuItem, true, true); // 删除隐藏的缓存
      }
      if (index !== -1) this.tabsList.splice(index, 1); // 从标签页列表中移除
    },

    // 关闭所有标签页
    closeAllTabs(defaultTab) {
      this.excludeKeepAliveList = this.tabsList.filter(
        (tab) => !tab.keepAlive && !tab.hidden
      ); // 排除非缓存和非隐藏的标签页
      this.tabsList = []; // 清空标签页列表
      this.hiddenKeepAliveList = defaultTab.hidden ? [{ ...defaultTab }] : []; // 设置隐藏缓存列表
    },

    // 切换标签页显示/隐藏
    changeTabsShowHide(isShow) {
      this.isShowTabs = isShow;
      storage.set('isShowTabs', isShow); // 存储显示状态
    },

    // 获取标签页显示状态
    getTabsShow() {
      const storedValue = storage.get('isShowTabs');
      if (this.isShowTabs === null) {
        if (typeof storedValue === 'undefined') {
          this.changeTabsShowHide(true); // 默认显示
        } else {
          this.isShowTabs = storedValue; // 使用存储的值
        }
      }
      return this.isShowTabs;
    },

    // 设置排除缓存列表
    setExcludeKeepAliveList(shouldExclude, route, formattedRoute) {
      const routeItem = formattedRoute || this.formatRouteItem(route);
      this.excludeKeepAliveList = shouldExclude ? [] : [routeItem]; // 根据条件设置排除缓存列表
    },

    // 设置不需要标签页缓存的列表
    setNoTabsKeepAliveList(route, matchedRoute) {
      if (
        !this.noTabsKeepAliveList.some(
          (item) => item.name === route.name
        ) &&
        matchedRoute.meta.keepAlive // 如果路由需要缓存
      ) {
        this.noTabsKeepAliveList.push(route); // 添加到不需要标签页缓存的列表
        if (matchedRoute.meta.isParentRoute) {
          const matched = matchedRoute.matched;
          const parentRoute = matched[matched.length - 2]; // 获取父路由
          if (
            !this.noTabsKeepAliveList.some(
              (item) => item.name === parentRoute.name
            ) &&
            parentRoute.meta.keepAlive // 如果父路由需要缓存
          ) {
            this.noTabsKeepAliveList.push(this.formatMatchedItem(parentRoute)); // 添加父路由到不需要缓存的列表
          }
        }
      }
    },

    // 删除隐藏的缓存列表
    deleteHiddenKeepAliveList(menuItem, shouldDelete, shouldExclude) {
      if (menuItem) {
        const index = this.hiddenKeepAliveList.findIndex(
          (item) => item.name === menuItem.to[0].name
        );
        if (index !== -1 && shouldDelete) {
          this.hiddenKeepAliveList.splice(index, 1); // 从隐藏缓存列表中移除
        }
        if (shouldExclude) {
          const excludeIndex = this.excludeKeepAliveList.findIndex(
            (item) => item.name === menuItem.to[0].name
          );
          if (excludeIndex !== -1 && shouldDelete) {
            this.excludeKeepAliveList.splice(excludeIndex, 1); // 从排除缓存列表中移除
          }
        }
        if (menuItem.to.length) {
          menuItem.to.forEach((item) => {
            this.deleteHiddenKeepAliveList(item, true, shouldExclude); // 递归删除子项
          });
        }
      } else {
        this.hiddenKeepAliveList = []; // 清空隐藏缓存列表
      }
    },

    // 重新加载页面
    reloadPage(route, formattedRoute) {
      const routeItem = formattedRoute || this.formatRouteItem(route);
      if (route.meta.isParentRoute) {
        this.excludeKeepAliveList = route.matched
          .filter((item) => item.meta.keepAlive) // 过滤需要缓存的路由
          .map((item) => this.formatMatchedItem(item)); // 格式化路由项
      } else {
        this.setExcludeKeepAliveList(true, route, formattedRoute); // 设置排除缓存列表
      }
      router.push(`/redirect${routeItem.fullPath}`); // 重定向到新路径
      const unwatch = watch(
        () => route.fullPath,
        (newPath) => {
          if (newPath === routeItem.fullPath) {
            this.setExcludeKeepAliveList(false, route); // 取消排除缓存
            unwatch(); // 停止监听
          }
        }
      );
    },

    // 初始化标签页
    initTabs() {
      const menuHiddenStore = mxMenuHiddenStore();
      menuHiddenStore.hiddenMenuMap = []; // 清空隐藏菜单映射
      this.tabsList = []; // 清空标签页列表
      this.excludeKeepAliveList = []; // 清空排除缓存列表
      this.noTabsKeepAliveList = []; // 清空不需要缓存的列表
      this.hiddenKeepAliveList = []; // 清空隐藏缓存列表
    },
  },
});

export { useTabsViewStore as udpTabsViewStore }; // 导出标签页视图存储