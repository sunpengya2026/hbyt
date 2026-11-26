/**
 * 压裂设计智能体 → 报告编辑器 的大对象交接层。
 *
 * ⚠️ 为什么不能直接 `sessionStorage.setItem('agentEditorDocument', JSON.stringify(payload))`：
 *    sessionStorage 配额只有约 **5MB（按 UTF-16 字符串计，实际可用更少）**，
 *    而智能体生成的 payload 里带着整篇正文 `bodyHtml` + `fieldReport` + `sectionReport`
 *    + 封面图标 base64。一部完整压裂工程设计的正文动辄 1~3MB，
 *    叠加说明数组后很容易冲破配额 → `setItem` 抛
 *    `QuotaExceededError: exceeded the quota`。
 *
 *    这个异常在 `runGenerate` 的外层 catch 里被捕获，转成了
 *    「执行失败：Failed to execute 'setItem' on 'Storage' ...」——
 *    用户看到的是「智能提取报错」，但**其实文档已经生成成功了**，
 *    只是最后一步写缓存失败。极易被误判成后端问题。
 *
 * ✅ 做法（与 utils/extractHandoff.js 同一思路）：
 *    大对象留在 `window` 内存单例里，sessionStorage 只存一个 token。
 *    智能体页与编辑器是同一个 SPA 内的路由跳转，本来就不需要持久化；
 *    刷新后重新生成一次即可，语义上正好是「一次性交接」。
 *
 * ✅ 必须保留 sessionStorage 作为兼容通道：
 *    线上可能还开着旧版本的智能体页（未刷新），它会往 sessionStorage
 *    写 `agentEditorDocument`。编辑器必须两种来源都认，否则老页面跳过来会白屏。
 */

const KEY = 'agentEditorDocument'
const PREFIX = '__agentEditorDoc__'

/** token → payload。用 window 做容器，保证 HMR / 多次 import 也只有一份 */
const store = (() => {
  if (typeof window === 'undefined') return new Map()
  if (!window[PREFIX]) window[PREFIX] = new Map()
  return window[PREFIX]
})()

const genToken = () => 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/**
 * 交出智能体生成结果。
 *
 * 大对象进内存，sessionStorage 只写 token。写 token 都失败时才会真正报错
 * （那说明连几十字节都写不下，属于配额被别的数据占满的真实故障）。
 *
 * @param {Object} payload 智能体生成结果（可含大字段）
 * @returns {String} token
 * @throws {Error} 仅当 sessionStorage 连 token 都写不进时抛出
 */
export function handoffAgentDocument(payload) {
  const token = genToken()
  store.set(token, payload)

  // 收缩内存：只保留最近 1 份，避免用户反复生成把多份正文全攒在内存里
  if (store.size > 1) {
    for (const k of Array.from(store.keys())) {
      if (k !== token) store.delete(k)
    }
  }

  try {
    sessionStorage.setItem(KEY, JSON.stringify({ __token: token }))
  } catch (e) {
    // 清掉刚放进内存的那份，避免泄漏
    store.delete(token)
    // 退一步：sessionStorage 满了但内存可用 —— 直接清掉旧键再试一次
    try {
      sessionStorage.removeItem(KEY)
      sessionStorage.setItem(KEY, JSON.stringify({ __token: token }))
      return token
    } catch (_) {
      throw new Error('浏览器缓存空间已满，请关闭部分标签页或清理站点数据后重试')
    }
  }
  return token
}

/**
 * 取回智能体生成结果（读后即删）。
 *
 * 优先按 token 从内存取；取不到再尝试把 sessionStorage 里的内容当完整 payload 解析
 * （兼容旧版智能体页 + 兼容历史遗留数据）。
 *
 * @returns {Object|null}
 */
export function takeAgentDocument() {
  let raw = null
  try {
    raw = sessionStorage.getItem(KEY)
  } catch (e) {
    raw = null
  }

  let payload = null

  if (raw) {
    let parsed = null
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      parsed = null
    }

    if (parsed && parsed.__token) {
      // 新路径：token → 内存
      payload = store.get(parsed.__token) || null
      store.delete(parsed.__token)
    } else if (parsed && typeof parsed === 'object') {
      // 旧路径：整个 payload 就存在 sessionStorage 里
      payload = parsed
    }
  }

  // 读后即删（成功读到才删；读不到也清理，避免脏 token 残留导致下次误判）
  try { sessionStorage.removeItem(KEY) } catch (e) { /* ignore */ }
  store.clear()

  return payload
}

/** 仅清理，不取用（路由离开 / 重新生成前） */
export function clearAgentDocument() {
  try { sessionStorage.removeItem(KEY) } catch (e) { /* ignore */ }
  store.clear()
}
