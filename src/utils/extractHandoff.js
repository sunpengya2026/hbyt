/**
 * 跨路由传递「大文件」的传输层。
 *
 * ⚠️ 为什么不能塞 sessionStorage：
 *    `sessionStorage` 有约 5MB 的**字符串**配额，而 base64 会比原文件大 33%。
 *    一份 4.7MB 的压裂地质设计 → dataUrl 约 6.3MB → `setItem` 直接抛
 *    QuotaExceededError，用户看到「该文件较大，浏览器缓存空间不足」，
 *    但关标签页根本没用 —— **物理上就不够**，换个浏览器也一样。
 *    而且 base64 编码/解码本身还白吃一次内存与 CPU。
 *
 * ⚠️ 为什么不能改走 localStorage / IndexedDB：
 *    localStorage 配额更小（同 5MB 量级）；IndexedDB 是异步 API，
 *    而编辑器 created() 里是同步取任务的，改造成本与风险都远大于收益。
 *    这两个页面是同一个 SPA 内的路由跳转，**根本不需要持久化** ——
 *    刷新后本来就该重新点一次「进入智能提取」。
 *
 * 所以：**文件对象留在内存单例里，sessionStorage 只存一份轻量任务描述
 * （文件名、井名、模式等纯字符串），两者用一个随机 token 关联**。
 * 内存里的东西随页面刷新自然消失，语义上正好就是「一次性交接」。
 */

const KEY = 'extractStreamTask'
const PREFIX = '__extractFile__'

/** token → File。用 window 做容器，保证 HMR / 多次 import 也只有一份 */
const store = (() => {
  if (typeof window === 'undefined') return new Map()
  if (!window[PREFIX]) window[PREFIX] = new Map()
  return window[PREFIX]
})()

const genToken = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/**
 * 交出任务：文件进内存，元信息进 sessionStorage。
 *
 * @param {Object} task   任务描述（不含大字段）
 * @param {File}   file   源文件本体（可为 null）
 * @param {File}   templateFile  模版文件本体（可为 null）
 * @returns {String} 使用的 token（无文件时为 ''）
 */
export function handoffExtractTask(task, file, templateFile) {
  const meta = Object.assign({}, task)
  delete meta.sourceFile
  delete meta.templateFile

  let token = ''
  if (file || templateFile) {
    token = genToken()
    store.set(token, { file: file || null, templateFile: templateFile || null })
  }
  meta.fileToken = token
  meta.sourceFileName = meta.sourceFileName || (file && file.name) || ''
  meta.hasSourceFile = !!file
  meta.hasTemplateFile = !!templateFile

  // 收缩内存：只保留最近 1 份，避免用户来回点几次就把几份大文件全攒在内存里
  if (store.size > 1) {
    for (const k of Array.from(store.keys())) {
      if (k !== token) store.delete(k)
    }
  }

  try {
    sessionStorage.setItem(KEY, JSON.stringify(meta))
  } catch (e) {
    // 走到这里说明**连纯字符串的元信息都写不下**，那才是真的配额爆了。
    // 此时把刚放进去的文件也清掉，避免内存泄漏。
    if (token) store.delete(token)
    throw new Error('浏览器存储配额已满，请关闭部分标签页后重试')
  }
  return token
}

/**
 * 取回任务：从 sessionStorage 读元信息，从内存按 token 取回 File。
 *
 * @param {Object} opts
 * @param {Boolean} opts.remove  读后即删（默认 true，与旧逻辑保持一致）
 * @returns {{task: Object, file: File|null, templateFile: File|null}|null}
 */
export function takeExtractTask(opts) {
  const remove = !opts || opts.remove !== false
  let raw = null
  try {
    raw = sessionStorage.getItem(KEY)
  } catch (e) {
    return null
  }
  if (!raw) return null

  let meta
  try {
    meta = JSON.parse(raw)
  } catch (e) {
    if (remove) { try { sessionStorage.removeItem(KEY) } catch (_) {} }
    return null
  }

  let file = null
  let templateFile = null
  const token = meta && meta.fileToken
  if (token && store.has(token)) {
    const slot = store.get(token)
    file = slot.file
    templateFile = slot.templateFile
  }

  if (remove) {
    try { sessionStorage.removeItem(KEY) } catch (e) { /* ignore */ }
    if (token) store.delete(token)
  }

  const task = Object.assign({}, meta)
  delete task.fileToken
  return { task, file, templateFile }
}

/** 仅清理，不取用（路由离开等场景） */
export function clearExtractTask() {
  try { sessionStorage.removeItem(KEY) } catch (e) { /* ignore */ }
  store.clear()
}
