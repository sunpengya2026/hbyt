/**
 * 工作台「对象树」数据层（后端优先 + localStorage 兜底）。
 *
 * 主数据源：后端 COMM_WB_FOLDER / COMM_WB_WELL
 *   GET    /v1/workbench/tree
 *   POST   /v1/workbench/folder            PUT /folder/{id}   DELETE /folder/{id}
 *   POST   /v1/workbench/well              PUT /well/{id}     DELETE /well/{id}
 *
 * 兜底：后端不可用时（离线 / 接口异常）自动退回 localStorage，
 *      保证演示与联调不中断，并在控制台给出提示。
 *
 * 对外统一数据结构（与后端字段对齐后的前端形态）：
 * {
 *   folders: [{ id, name, parentId, path, sortNo }],
 *   wells:   [{ id, name, folderId, wellId, block, wellType, status, source, remark, createTime }]
 * }
 */

import {
  getObjectTree,
  createFolder as apiCreateFolder,
  renameFolder as apiRenameFolder,
  deleteFolder as apiDeleteFolder,
  createWbWell as apiCreateWell,
  updateWbWell as apiUpdateWell,
  deleteWbWell as apiDeleteWell
} from '@/api/workbench'

const STORAGE_KEY = 'workbench.objectTree.v1'

/* ============================================================
 *  localStorage 兜底实现
 * ============================================================ */

function emptyTree() {
  return { folders: [], wells: [] }
}

function isSupported() {
  try {
    const k = '__wb_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch (e) {
    return false
  }
}

const memoryStore = { data: null }

function readLocal() {
  if (!isSupported()) {
    return memoryStore.data || emptyTree()
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyTree()
    const parsed = JSON.parse(raw)
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      wells: Array.isArray(parsed.wells) ? parsed.wells : []
    }
  } catch (e) {
    console.warn('[workbench] 解析本地对象树失败，已重置', e)
    return emptyTree()
  }
}

function writeLocal(tree) {
  const payload = {
    folders: (tree && tree.folders) || [],
    wells: (tree && tree.wells) || []
  }
  if (!isSupported()) {
    memoryStore.data = payload
    return payload
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('[workbench] 写入本地对象树失败', e)
  }
  return payload
}

/** 本地模式标记：后端不可用时置 true，后续写操作走 localStorage */
let localMode = false

/** 后端是否已进入兜底模式 */
export function isLocalMode() {
  return localMode
}

/* ============================================================
 *  字段映射
 * ============================================================ */

function mapFolder(f) {
  return {
    id: f.folderId,
    name: f.folderName,
    parentId: f.parentId || '',
    path: f.folderPath || f.folderName,
    sortNo: f.sortNo
  }
}

function mapWell(w) {
  return {
    id: w.wbWellId,
    name: w.wellName,
    folderId: w.folderId || '',
    wellId: w.wellId || '',
    block: w.wellBlock || '',
    blockCodeId: w.wellBlockCodeId || '',
    perforationMethod: w.perforationMethod || '',
    wellType: w.wellType || '',
    // ⚠️ 这一列是建井时写死的「待生成」，之后后端没有任何地方更新它，
    //    生成成功也不会变。只作历史字段保留，列表里不要拿它当状态用，
    //    真正要看的是下面 generated / latestVersion（由文档表实时算）。
    status: w.wellStatus || '待生成',
    source: w.wellSource || '',
    remark: w.remark || '',

    /* ------------------------------------------------------------
     * 生成状态四件套（后端 WorkbenchTreeService#fillGeneratedInfo 填充）
     *
     * ⚠️ 这里是白名单式逐字段映射，后端加了字段但这里没加 = 前端永远 undefined。
     *    「字段一路都有值，最后列空着」的坑，多半就是漏了这一行。
     * ------------------------------------------------------------ */
    // 是否已生成过工程设计（后端只认 DOC_SOURCE='GENERATED'）
    generated: w.generated === true,
    // 最新生成版本号，三段式如 1.0.2；未生成时为空
    latestVersion: w.latestVersion || '',
    latestFileName: w.latestFileName || '',
    latestGeneratedAt: w.latestGeneratedAt || '',
    versionCount: w.versionCount || 0,

    /* ------------------------------------------------------------
     * 压裂地质设计（后端 WorkbenchTreeService#fillGeologicalInfo 填充）
     *
     * ⚠️ 与上面「生成状态」是两套口径：
     *    generated      = 有没有系统生成的工程设计成果（DOC_SOURCE='GENERATED'）
     *    hasGeological  = 有没有用户上传的地质设计资料（DOC_TYPE='GEOLOGICAL_DESIGN'）
     *    千万别把 hasGeological 当成 generated 用，否则「传了一份地质设计」
     *    会显示成「已生成工程设计」。
     * ------------------------------------------------------------ */
    hasGeological: w.hasGeological === true,
    geologicalDocId: w.geologicalDocId || '',
    geologicalFileName: w.geologicalFileName || '',
    geologicalUploadedAt: w.geologicalUploadedAt || '',
    geologicalCount: w.geologicalCount || 0,

    createTime: w.createDate || ''
  }
}

/* ============================================================
 *  读取
 * ============================================================ */

/**
 * 读取整棵对象树（异步）。
 * @returns {Promise<{folders:Array, wells:Array, local:boolean}>}
 */
export async function loadTree(params) {
  try {
    const res = await getObjectTree(params)
    const data = (res && res.data) || {}
    const folders = (data.folders || []).map(mapFolder)
    const wells = (data.wells || []).map(mapWell)
    localMode = false
    // 后端成功后同步一份到本地，作为离线快照
    writeLocal({ folders, wells })
    return { folders, wells, local: false }
  } catch (e) {
    console.warn('[workbench] 后端对象树不可用，已切换本地存储兜底', e)
    localMode = true
    const local = readLocal()
    return { ...local, local: true }
  }
}

/**
 * 同步读取本地缓存（不请求后端，用于首屏占位）。
 */
export function getCachedTree() {
  return readLocal()
}

/* ============================================================
 *  文件夹写操作
 * ============================================================ */

/**
 * 新建文件夹
 * @returns {Promise<{folder:Object, local:boolean}>}
 */
export async function createFolder({ name, parentId, remark, userId }) {
  if (!localMode) {
    try {
      const res = await apiCreateFolder({
        folderName: name,
        parentId: parentId || '',
        remark: remark || '',
        userId
      })
      return { folder: mapFolder((res && res.data) || {}), local: false }
    } catch (e) {
      console.warn('[workbench] 新建文件夹接口失败，回退本地', e)
      localMode = true
    }
  }
  const folder = { id: genId('f'), name, parentId: parentId || '', path: name, sortNo: 0 }
  const tree = readLocal()
  tree.folders.push(folder)
  writeLocal(tree)
  return { folder, local: true }
}

export async function renameFolder(folderId, name, userId) {
  if (!localMode) {
    try {
      await apiRenameFolder(folderId, { folderName: name, userId })
      return { local: false }
    } catch (e) {
      console.warn('[workbench] 重命名接口失败，回退本地', e)
      localMode = true
    }
  }
  const tree = readLocal()
  const target = tree.folders.find(f => f.id === folderId)
  if (target) target.name = name
  writeLocal(tree)
  return { local: true }
}

/**
 * 删除文件夹。本地兜底模式下同步处理「井号上提到父级」。
 */
export async function removeFolder(folderId, userId) {
  if (!localMode) {
    try {
      const res = await apiDeleteFolder(folderId, { userId })
      const moved = ((res && res.data) || {}).movedWells
      return { local: false, movedWells: typeof moved === 'number' ? moved : undefined }
    } catch (e) {
      console.warn('[workbench] 删除文件夹接口失败，回退本地', e)
      localMode = true
    }
  }
  const tree = readLocal()
  const ids = [folderId]
  let frontier = [folderId]
  while (frontier.length) {
    const next = []
    tree.folders.forEach(f => {
      if (frontier.includes(f.parentId || '')) {
        ids.push(f.id)
        next.push(f.id)
      }
    })
    frontier = next
  }
  const folder = tree.folders.find(f => f.id === folderId)
  const parentOfDeleted = (folder && folder.parentId) || ''
  tree.wells.forEach(w => {
    if (ids.includes(w.folderId || '')) w.folderId = parentOfDeleted
  })
  tree.folders = tree.folders.filter(f => !ids.includes(f.id))
  writeLocal(tree)
  return { local: true }
}

/* ============================================================
 *  井号写操作
 * ============================================================ */

export async function createWell(payload, userId) {
  const body = {
    wellName: payload.name,
    folderId: payload.folderId || '',
    wellId: payload.wellId || '',
    wellBlock: payload.block || '',
    wellBlockCodeId: payload.blockCodeId || '',
    perforationMethod: payload.perforationMethod || '',
    wellType: payload.wellType || '',
    wellStatus: payload.status || '待生成',
    wellSource: payload.source || '',
    remark: payload.remark || '',
    userId
  }

  if (!localMode) {
    try {
      const res = await apiCreateWell(body)
      const wellData = (res && res.data) || {}
      if (wellData.existed) {
        // 井号已存在：返回已有记录，告知调用方
        return { well: mapWell(wellData), local: false, existed: true }
      }
      return { well: mapWell(wellData), local: false }
    } catch (e) {
      const msg = (e && e.message) || ''
      if (msg.indexOf('已存在') >= 0) throw e
      console.warn('[workbench] 新建井号接口失败，回退本地', e)
      localMode = true
    }
  }

  const well = {
    id: genId('w'),
    name: payload.name,
    folderId: payload.folderId || '',
    wellId: payload.wellId || '',
    block: payload.block || '',
    blockCodeId: payload.blockCodeId || '',
    perforationMethod: payload.perforationMethod || '',
    wellType: payload.wellType || '',
    status: payload.status || '待生成',
    source: payload.source || '',
    remark: payload.remark || '',
    createTime: formatNow()
  }
  const tree = readLocal()
  tree.wells.push(well)
  writeLocal(tree)
  return { well, local: true }
}

export async function updateWell(wbWellId, payload, userId) {
  const body = {
    wellName: payload.name,
    folderId: payload.folderId || '',
    wellBlock: payload.block || '',
    wellBlockCodeId: payload.blockCodeId || '',
    perforationMethod: payload.perforationMethod || '',
    wellType: payload.wellType || '',
    remark: payload.remark || '',
    userId
  }

  if (!localMode) {
    try {
      const res = await apiUpdateWell(wbWellId, body)
      return { well: mapWell((res && res.data) || {}), local: false }
    } catch (e) {
      const msg = (e && e.message) || ''
      if (msg.indexOf('已存在') >= 0) throw e
      console.warn('[workbench] 编辑井号接口失败，回退本地', e)
      localMode = true
    }
  }

  const tree = readLocal()
  const target = tree.wells.find(w => w.id === wbWellId)
  if (target) {
    Object.assign(target, {
      name: payload.name,
      folderId: payload.folderId || '',
      block: payload.block || '',
      blockCodeId: payload.blockCodeId || '',
      perforationMethod: payload.perforationMethod || '',
      wellType: payload.wellType || '',
      remark: payload.remark || ''
    })
  }
  writeLocal(tree)
  return { local: true }
}

export async function removeWell(wbWellId, userId) {
  if (!localMode) {
    try {
      await apiDeleteWell(wbWellId, { userId })
      return { local: false }
    } catch (e) {
      console.warn('[workbench] 删除井号接口失败，回退本地', e)
      localMode = true
    }
  }
  const tree = readLocal()
  tree.wells = tree.wells.filter(w => w.id !== wbWellId)
  writeLocal(tree)
  return { local: true }
}

/* ============================================================
 *  工具
 * ============================================================ */

/** 生成本地唯一 id */
export function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function formatNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/* ============================================================
 *  兼容旧调用（同步版，仅本地）
 * ============================================================ */

/**
 * @deprecated 请使用 loadTree()（后端优先）。
 */
export function getTree() {
  return readLocal()
}

/**
 * @deprecated 请使用 createFolder / createWell 等异步接口。
 */
export function saveTree(tree) {
  return writeLocal(tree)
}

export function clearTree() {
  return writeLocal(emptyTree())
}
