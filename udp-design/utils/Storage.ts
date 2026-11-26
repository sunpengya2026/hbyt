/**
 * 创建本地缓存对象
 * @param {string} prefixKey - app + tenantCode
 * @param {Object} [storage=localStorage] - sessionStorage | localStorage
 */

 const app = window.udpGlobalConfig?.UDP_APP_CODE || import.meta.env.UDP_APP_CODE || ''
 export const createStorage = ({ prefixKey, storage = localStorage }: any = {}) => {
   /**
    * 本地缓存类
    * @class Storage
    */
   const Storage = class {
     private storage = storage
     private prefixKey?: string = prefixKey
 
     private getKey(key: string) {
       const prefix = this.prefixKey ?? app + localStorage.getItem(`${app}tenantCode`)
       return `${prefix}${key}`
     }
     /**
      * @description 设置缓存
      * @param {string} key 缓存键
      * @param {*} value 缓存值
      */
     set(key: string, value: any) {
       const stringData = typeof value === 'object' ? JSON.stringify(value) : value
       this.storage.setItem(this.getKey(key), stringData)
     }
     /**
      * 读取缓存
      * @param {string} key 缓存键
      * @param {*=} def 默认值
      */
     get(key: string, def?: unknown) {
       const item = this.storage.getItem(this.getKey(key))
       if (item) {
         try {
           return JSON.parse(item)
         } catch (e) {
           return item
         }
       }
       return def
     }
 
     /**
      * 删除某项
      * @param {string} key
      */
     remove(key: string) {
       this.storage.removeItem(this.getKey(key))
     }
 
     /**
      * 清空所有
      */
     clear(): void {
       this.storage.clear()
     }
   }
   return new Storage()
 }
 
 export const storage = createStorage()
 
 export const appCodeStorage = createStorage({ prefixKey: app })
 
 export const noPrefixStorage = createStorage({ prefixKey: '' })
 
 export default storage
 