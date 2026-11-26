import request from '@/utils/request'

// 获取技能包列表
export function getSkillList(params) {
  return request({
    url: '/v1/skills',
    method: 'get',
    params
  })
}

// 获取技能包详情
export function getSkillDetail(id) {
  return request({
    url: `/v1/skills/${id}`,
    method: 'get'
  })
}

// 创建技能包
export function createSkill(data) {
  return request({
    url: '/v1/skills',
    method: 'post',
    data
  })
}

// 更新技能包
export function updateSkill(id, data) {
  return request({
    url: `/v1/skills/${id}`,
    method: 'put',
    data
  })
}

// 删除技能包
export function deleteSkill(id) {
  return request({
    url: `/v1/skills/${id}`,
    method: 'delete'
  })
}

// 复制技能包
export function duplicateSkill(id) {
  return request({
    url: `/v1/skills/${id}/duplicate`,
    method: 'post'
  })
}

// 获取技能包分类
export function getSkillCategories() {
  return request({
    url: '/v1/skills/categories',
    method: 'get'
  })
}

// 验证技能包
export function validateSkill(id) {
  return request({
    url: `/v1/skills/${id}/validate`,
    method: 'post'
  })
}

// 发布技能包
export function publishSkill(id) {
  return request({
    url: `/v1/skills/${id}/publish`,
    method: 'post'
  })
}

// 禁用技能包
export function disableSkill(id) {
  return request({
    url: `/v1/skills/${id}/disable`,
    method: 'post'
  })
}
