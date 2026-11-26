import request from '@/utils/request'

// 获取执行历史列表
export function getExecutionHistory(params) {
  return request({
    url: '/api/history/list',
    method: 'get',
    params
  })
}

// 获取执行详情
export function getExecutionDetail(id) {
  return request({
    url: `/api/history/${id}`,
    method: 'get'
  })
}

// 重新执行
export function rerunExecution(id) {
  return request({
    url: `/api/history/${id}/rerun`,
    method: 'post'
  })
}

// 取消执行
export function cancelExecution(id) {
  return request({
    url: `/api/history/${id}/cancel`,
    method: 'post'
  })
}

// 导出执行历史
export function exportExecutionHistory(params) {
  return request({
    url: '/api/history/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

// 获取执行统计
export function getExecutionStats(params) {
  return request({
    url: '/api/history/stats',
    method: 'get',
    params
  })
}

// 删除执行记录
export function deleteExecutionRecord(id) {
  return request({
    url: `/api/history/${id}`,
    method: 'delete'
  })
}

// 批量删除执行记录
export function batchDeleteExecutionRecord(ids) {
  return request({
    url: '/api/history/batch-delete',
    method: 'post',
    data: { ids }
  })
}

// 获取执行日志
export function getExecutionLogs(id, params) {
  return request({
    url: `/api/history/${id}/logs`,
    method: 'get',
    params
  })
}
