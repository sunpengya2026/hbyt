import request from '@/utils/request'

/**
 * 自然语言查询数据库
 */
export function naturalLanguageQuery(data) {
  return request({
    url: '/v1/db/query',
    method: 'post',
    data
  })
}

/**
 * 生成SQL（不执行）
 */
export function generateSql(data) {
  return request({
    url: '/v1/db/sql/generate',
    method: 'post',
    data
  })
}

/**
 * 直接执行SQL
 */
export function executeSql(params) {
  return request({
    url: '/v1/db/sql/execute',
    method: 'post',
    params
  })
}

/**
 * 获取所有表
 */
export function getAllTables() {
  return request({
    url: '/v1/db/tables',
    method: 'get'
  })
}

/**
 * 获取表结构
 */
export function getTableSchema(tableName) {
  return request({
    url: `/v1/db/tables/${tableName}/schema`,
    method: 'get'
  })
}

/**
 * 获取Schema上下文
 */
export function getSchemaContext(params) {
  return request({
    url: '/v1/db/schema/context',
    method: 'get',
    params
  })
}

/**
 * 刷新Schema缓存
 */
export function refreshSchema() {
  return request({
    url: '/v1/db/schema/refresh',
    method: 'post'
  })
}
