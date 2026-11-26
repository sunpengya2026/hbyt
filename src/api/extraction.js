import request from '@/utils/request'

/**
 * 获取知识库列表
 */
export function getKnowledgeBaseList() {
  return request({
    url: '/v1/extraction/knowledge-bases',
    method: 'get'
  })
}

/**
 * 从知识库提取数据
 */
export function extractFromKnowledgeBase(kbId, wellId) {
  return request({
    url: '/v1/extraction/from-knowledge-base',
    method: 'post',
    params: { kbId, wellId }
  })
}

/**
 * 从文件提取数据
 */
export function extractFromFile(file, wellId) {
  const formData = new FormData()
  formData.append('file', file)
  if (wellId) {
    formData.append('wellId', wellId)
  }
  return request({
    url: '/v1/extraction/from-file',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 兼容旧版本的导出名称
export const extractFromFileApi = extractFromFile
export const extractFromKnowledgeBaseApi = extractFromKnowledgeBase
