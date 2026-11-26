import request from '@/utils/request'

// 获取模板列表
export function getTemplateList(params) {
  return request({
    url: '/api/template/list',
    method: 'get',
    params
  })
}

// 获取模板详情
export function getTemplateDetail(id) {
  return request({
    url: `/api/template/${id}`,
    method: 'get'
  })
}

// 创建模板
export function createTemplate(data) {
  return request({
    url: '/api/template',
    method: 'post',
    data
  })
}

// 保存模板
export function saveTemplate(data) {
  return request({
    url: '/api/template',
    method: 'post',
    data
  })
}

// 更新模板
export function updateTemplate(id, data) {
  return request({
    url: `/api/template/${id}`,
    method: 'put',
    data
  })
}

// 删除模板
export function deleteTemplate(id) {
  return request({
    url: `/api/template/${id}`,
    method: 'delete'
  })
}

// 复制模板
export function copyTemplate(id) {
  return request({
    url: `/api/template/${id}/copy`,
    method: 'post'
  })
}

// 导入模板
export function importTemplate(data) {
  return request({
    url: '/api/template/import',
    method: 'post',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 批量导出模板
export function batchExportTemplate(ids) {
  return request({
    url: '/api/template/export',
    method: 'post',
    data: { ids },
    responseType: 'blob'
  })
}

// 获取模板分类
export function getTemplateTypes() {
  return request({
    url: '/api/template/types',
    method: 'get'
  })
}

// 获取模板行业
export function getTemplateIndustries() {
  return request({
    url: '/api/template/industries',
    method: 'get'
  })
}

// 获取数据源列表
export function getDataSourceList() {
  return request({
    url: '/api/datasource/list',
    method: 'get'
  })
}

// 获取模板预览
export function getTemplatePreview(id) {
  return request({
    url: `/api/template/${id}/preview`,
    method: 'get'
  })
}
