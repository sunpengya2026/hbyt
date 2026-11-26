import request from '@/utils/request'

/**
 * 获取定时任务列表
 */
export function getScheduleList(params) {
  return request({
    url: '/api/v1/schedules',
    method: 'get',
    params
  })
}

/**
 * 获取定时任务详情
 */
export function getSchedule(id) {
  return request({
    url: `/api/v1/schedules/${id}`,
    method: 'get'
  })
}

/**
 * 创建定时任务
 */
export function createSchedule(data) {
  return request({
    url: '/api/v1/schedules',
    method: 'post',
    data
  })
}

/**
 * 更新定时任务
 */
export function updateSchedule(id, data) {
  return request({
    url: `/api/v1/schedules/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除定时任务
 */
export function deleteSchedule(id) {
  return request({
    url: `/api/v1/schedules/${id}`,
    method: 'delete'
  })
}

/**
 * 启用/暂停定时任务
 */
export function toggleSchedule(id) {
  return request({
    url: `/api/v1/schedules/${id}/toggle`,
    method: 'put'
  })
}

/**
 * 手动触发定时任务
 */
export function triggerSchedule(id) {
  return request({
    url: `/api/v1/schedules/${id}/trigger`,
    method: 'post'
  })
}

/**
 * 验证 Cron 表达式
 */
export function validateCron(cronExpression) {
  return request({
    url: '/api/v1/schedules/validate-cron',
    method: 'post',
    params: { cronExpression }
  })
}
