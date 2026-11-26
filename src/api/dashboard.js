import request from '@/utils/request'

/**
 * 首页驾驶舱接口。
 *
 * 后端一次聚合四块数据（工作台井 / 文档进度 / 知识库 / 压裂日动态），
 * 前端不再逐个请求知识库文档，首屏只打这一个接口。
 */

/**
 * 驾驶舱总览
 * @param {object} [params] 预留参数（如未来按用户过滤）
 */
export function getDashboardOverviewApi(params) {
  return request({
    url: '/v1/dashboard/overview',
    method: 'get',
    params
  })
}

/**
 * 探活：自动刷新前先确认接口可达，避免连续报错
 */
export function getDashboardHealthApi() {
  return request({
    url: '/v1/dashboard/health',
    method: 'get'
  })
}
