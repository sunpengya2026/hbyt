import request from '@/utils/request'

// 报告生成相关接口

/**
 * 提交报告生成任务
 */
export function generateReport(data) {
  return request({
    url: '/v1/reports/generate',
    method: 'post',
    data
  })
}

/**
 * 异步提交报告生成任务
 */
export function generateReportAsync(data) {
  return request({
    url: '/v1/reports/generate/async',
    method: 'post',
    data
  })
}

/**
 * 获取任务状态
 */
export function getTaskStatus(taskId) {
  return request({
    url: `/v1/reports/tasks/${taskId}`,
    method: 'get'
  })
}

/**
 * 取消任务
 */
export function cancelTask(taskId) {
  return request({
    url: `/v1/reports/tasks/${taskId}/cancel`,
    method: 'post'
  })
}

/**
 * 获取报告列表
 */
export function getReportList(params) {
  return request({
    url: '/v1/reports',
    method: 'get',
    params
  })
}

/**
 * 获取报告详情
 */
export function getReportDetail(reportId) {
  return request({
    url: `/v1/reports/${reportId}`,
    method: 'get'
  })
}

/**
 * 下载报告
 */
export function downloadReport(reportId, format) {
  return request({
    url: `/v1/reports/${reportId}/download`,
    method: 'get',
    params: { format },
    responseType: 'blob'
  })
}

/**
 * 删除报告
 */
export function deleteReport(reportId) {
  return request({
    url: `/v1/reports/${reportId}`,
    method: 'delete'
  })
}

/**
 * 导出报告
 */
export function exportReport(reportId, format) {
  return request({
    url: `/v1/reports/${reportId}/export`,
    method: 'get',
    params: { format },
    responseType: 'blob'
  })
}

/**
 * 保存报告
 */
export function saveReport(reportId, data) {
  return request({
    url: `/v1/reports/${reportId}`,
    method: 'put',
    data
  })
}

/**
 * 发布报告
 */
export function publishReport(reportId) {
  return request({
    url: `/v1/reports/${reportId}/publish`,
    method: 'post'
  })
}
