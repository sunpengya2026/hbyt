import request from '@/utils/request'

// 任务管理相关接口

/**
 * 获取任务列表
 */
export function getTaskList(params) {
  return request({
    url: '/api/v1/tasks',
    method: 'get',
    params
  })
}

/**
 * 获取任务详情
 */
export function getTaskDetail(taskId) {
  return request({
    url: `/api/v1/tasks/${taskId}`,
    method: 'get'
  })
}

/**
 * 取消任务
 */
export function cancelTask(taskId) {
  return request({
    url: `/api/v1/tasks/${taskId}/cancel`,
    method: 'post'
  })
}

/**
 * 重试任务
 */
export function retryTask(taskId) {
  return request({
    url: `/api/v1/tasks/${taskId}/retry`,
    method: 'post'
  })
}

/**
 * 删除任务
 */
export function deleteTask(taskId) {
  return request({
    url: `/api/v1/tasks/${taskId}`,
    method: 'delete'
  })
}

/**
 * 获取任务日志
 */
export function getTaskLogs(taskId, params) {
  return request({
    url: `/api/v1/tasks/${taskId}/logs`,
    method: 'get',
    params
  })
}

/**
 * 获取任务统计
 */
export function getTaskStatistics() {
  return request({
    url: '/api/v1/tasks/statistics',
    method: 'get'
  })
}
