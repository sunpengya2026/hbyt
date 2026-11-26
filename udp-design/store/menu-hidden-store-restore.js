import { defineStore } from 'pinia';
import { udpTabsViewStore } from 'udp/store/tabs-view-store';

/**
 * 格式化路由信息
 * @param {Object} route - 路由对象
 * @returns {Object} 格式化后的路由信息
 */
const formatRoute = (route) => ({
  fullPath: route.fullPath || route.path,
  name: route.name,
  keepAlive: route.meta.keepAlive,
  hidden: route.meta.hidden,
  i18nkey: route.meta.i18nkey,
  title: route.meta.title
});

/**
 * 菜单隐藏状态管理 Store
 */
export const mxMenuHiddenStore = defineStore('menu-hidden-store', {
  state: () => ({
    // 存储隐藏菜单的映射关系
    hiddenMenuMap: []
  }),
  actions: {
    /**
     * 设置隐藏菜单列表
     * @param {Object} currentRoute - 当前路由
     * @param {Object} targetRoute - 目标路由
     */
    setHiddenList(currentRoute, targetRoute) {
      const tabsStore = udpTabsViewStore();
      const hiddenRoutes = this.hiddenMenuMap.map(item => item.from.name);
      const tabsList = tabsStore.tabsList;
      const currentParentRoute = currentRoute.parents[currentRoute.parents.length - 2];
      const targetParentRoute = targetRoute.parents[targetRoute.parents.length - 2];

      // 处理父路由和子路由的隐藏逻辑
      if (currentRoute.meta.isParentRoute && currentParentRoute.meta.isChildRoute && !currentParentRoute.meta.hidden) {
        if (!hiddenRoutes.some(name => name === currentParentRoute.name)) {
          this.hiddenMenuMap.push({ from: formatRoute(currentParentRoute), to: [] });
        }
        const parentMenu = this.hiddenMenuMap.find(item => item.from.name === currentParentRoute.name)?.to;
        if (!parentMenu.some(item => item.from.name === currentRoute.name)) {
          parentMenu.push({ from: formatRoute(currentRoute), to: [] });
        }
        tabsStore.addTabs(currentRoute, targetRoute, currentParentRoute.name);
        return;
      }

      // 处理隐藏路由的逻辑
      if (currentParentRoute?.children?.length && currentParentRoute.children.every(child => child.meta?.hidden)) {
        if (currentRoute.meta.hidden) {
          if (targetRoute.fullPath !== currentRoute.fullPath) {
            if (targetRoute.meta.hidden) {
              if (!tabsList.some(tab => tab.name === currentRoute.name)) {
                const menuMap = this.findMenuMap(targetRoute.name);
                const isInHiddenMap = this.isInHiddenMenuMap(currentRoute.name);
                if (menuMap && !isInHiddenMap) {
                  if (currentRoute.meta.isParentRoute) {
                    if (!menuMap.to.some(item => item.from.name === currentRoute.name) || 
                        currentParentRoute.name === (targetParentRoute?.name)) {
                      menuMap.to.push({ from: formatRoute(currentRoute), to: [] });
                    }
                  } else if (targetRoute.meta.isChildRoute) {
                    this.hiddenMenuMap.push({ from: formatRoute(currentRoute), to: [] });
                  } else if (currentParentRoute.name === (targetParentRoute?.name)) {
                    menuMap.to.push({ from: formatRoute(currentRoute), to: [] });
                  }
                } else if (!menuMap && !isInHiddenMap && targetRoute.meta.parentSelfLinkFrom) {
                  this.hiddenMenuMap.push({ from: formatRoute(currentRoute), to: [] });
                }
              }
            } else {
              if (!currentParentRoute.meta.hidden && currentParentRoute.redirect === currentRoute.fullPath) {
                if (!hiddenRoutes.some(name => name === currentRoute.name)) {
                  this.hiddenMenuMap.push({ from: formatRoute(currentRoute), to: [] });
                }
              } else {
                if (!tabsList.some(tab => tab.name === currentRoute.name)) {
                  if (!hiddenRoutes.some(name => name === targetRoute.name)) {
                    this.hiddenMenuMap.push({
                      from: formatRoute(targetRoute),
                      to: [{ from: formatRoute(currentRoute), to: [] }]
                    });
                  } else {
                    const tabIndex = tabsList.findIndex(tab => tab.name === currentRoute.name);
                    if (tabIndex !== -1 && !this.hiddenMenuMap[tabIndex].to.some(item => item.from.name === currentRoute.name) && 
                        currentParentRoute.name === (targetParentRoute?.name)) {
                      this.hiddenMenuMap[tabIndex].to.push({ from: formatRoute(currentRoute), to: [] });
                    }
                  }
                }
              }
            }
          }
        } else {
          if (currentRoute.meta.hidden) {
            const parentRoute = currentRoute.parents[currentRoute.parents.length - 2];
            if (!parentRoute.meta.hidden && parentRoute.redirect === currentRoute.fullPath && 
                !hiddenRoutes.some(name => name === currentRoute.name)) {
              this.hiddenMenuMap.push({ from: formatRoute(currentRoute), to: [] });
            }
          }
        }
        tabsStore.changeTabs(currentRoute, targetRoute);
      } else if (hiddenRoutes.some(name => name === currentRoute.name)) {
        tabsStore.changeTabs(currentRoute, targetRoute);
      }
      if (currentRoute.name) {
        tabsStore.changeTabs(currentRoute, true);
      }
    },

    /**
     * 获取隐藏的父级菜单
     * @param {string} name - 菜单名称
     * @param {Array} menuMap - 菜单映射
     * @returns {Object|null} 父级菜单信息
     */
    getHiddenParent(name, menuMap = this.hiddenMenuMap) {
      let result = null;
      menuMap.some(item => {
        if (item.from.name === name) {
          result = { from: item.from, to: [] };
          return true;
        }
        if (item.to.length) {
          const parent = this.getHiddenParent(name, item.to);
          if (parent) {
            result = { from: item.from, to: [parent] };
            return true;
          }
        }
      });
      return result;
    },

    /**
     * 格式化隐藏的父级菜单
     * @param {Object} menuItem - 菜单项
     * @returns {Array} 格式化后的菜单列表
     */
    formateHiddenParent(menuItem) {
      let result = [menuItem.from];
      if (menuItem.to.length) {
        menuItem.to.forEach(item => {
          result = [...result, ...this.formateHiddenParent(item)];
        });
      }
      return result;
    },

    /**
     * 查找菜单映射
     * @param {string} name - 菜单名称
     * @param {Array} menuMap - 菜单映射
     * @returns {Object|null} 找到的菜单项
     */
    findMenuMap(name, menuMap = this.hiddenMenuMap) {
      let result = null;
      menuMap.some(item => {
        if (item.from.name === name) {
          result = item;
          return true;
        }
        if (item.to.length) {
          const found = this.findMenuMap(name, item.to);
          if (found) {
            result = found;
            return true;
          }
        }
      });
      return result;
    },

    /**
     * 检查是否为同一行的菜单映射
     * @param {string} name1 - 菜单名称1
     * @param {string} name2 - 菜单名称2
     * @param {Array} menuMap - 菜单映射
     * @param {boolean} isParent - 是否为父级
     * @returns {boolean} 是否为同一行
     */
    isOneLineMenuMap(name1, name2, menuMap = this.hiddenMenuMap, isParent = false) {
      return menuMap.some(item => {
        if (item.from.name === name1 || item.from.name === name2) {
          if (isParent) return true;
          if (item.to.length) {
            return this.isOneLineMenuMap(name1, name2, item.to, true);
          }
        } else if (item.to.length) {
          return this.isOneLineMenuMap(name1, name2, item.to, isParent);
        }
      });
    },

    /**
     * 检查菜单是否在隐藏菜单映射中
     * @param {string} name - 菜单名称
     * @param {Array} menuMap - 菜单映射
     * @returns {boolean} 是否在隐藏菜单中
     */
    isInHiddenMenuMap(name, menuMap = this.hiddenMenuMap) {
      return menuMap.some(item => 
        item.from.name === name || this.isInHiddenMenuMap(name, item.to)
      );
    },

    /**
     * 直接设置隐藏菜单列表
     * @param {Object} menuItem - 菜单项
     */
    setHiddenListDirectly(menuItem) {
      this.hiddenMenuMap.push({ ...menuItem });
    }
  }
});