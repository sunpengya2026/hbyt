/**
 * 单井工作台 · 知识库文档「井号 + 文档类型」模糊匹配
 *
 * 用途：用户在单井页点「一键从知识库提取」后，把知识库里所有文档挨个过一遍，
 * 判断它属于哪口井、是什么类型的材料，再决定落到工作台的哪个模块槽位。
 *
 * 为什么单独成文件：
 *   1) 匹配规则纯函数、零依赖，可以脱离 Vue 单测；
 *   2) 工作台页（well-workbench.vue）已经 5 万多行，再塞一套规则会淹没；
 *   3) 规则要反复调（井号写法五花八门），改这里不影响页面结构。
 *
 * ⚠️ 与 wellModules.js 的关系：
 *   匹配结果的 moduleKey / inputKey 必须与 wellModules.js 里的 key 一一对应，
 *   否则上传时会找不到槽位。新增材料类型时，两处要同步。
 */

/* ============================================================
 *  一、文本归一化
 * ============================================================ */

/** 全角 → 半角（括号、连字符、数字最常见） */
const FULL_HALF_MAP = {
  '（': '(', '）': ')', '［': '[', '］': ']', '｛': '{', '｝': '}',
  '，': ',', '。': '.', '：': ':', '；': ';', '、': ',',
  '－': '-', '—': '-', '–': '-', '‐': '-', '‒': '-', '﹣': '-', '－': '-',
  '～': '~', '％': '%', '　': ' ', '－': '-'
}

/** 统一小写、全角转半角、去掉空白 */
export function normalizeText(s) {
  if (s === null || s === undefined) return ''
  let out = ''
  const str = String(s)
  for (let i = 0; i < str.length; i++) {
    const ch = str.charAt(i)
    out += FULL_HALF_MAP[ch] || ch
  }
  return out.toLowerCase().replace(/\s+/g, '')
}

/** 取文件名主干（去扩展名） */
export function stripExt(fileName) {
  if (!fileName) return ''
  const idx = String(fileName).lastIndexOf('.')
  return idx > 0 ? String(fileName).slice(0, idx) : String(fileName)
}

/* ============================================================
 *  二、井号匹配
 * ============================================================ */

/**
 * 井号别名生成。
 *
 * 现实里的写法差异极大，同一口井可能叫：
 *   郑58-5B-3平1 / 郑58-5B-3P1 / 郑585B-3平1 / 郑58-5B-3平01 / 郑58-5B井组
 *
 * 策略：
 *   - 归一化后生成若干「可让文档名包含」的片段，命中任一即算同井；
 *   - 同时要求片段后面不紧跟数字，避免「郑58-5B-3平1」误命中「郑58-5B-3平12」。
 *
 * @param {String} wellName 工作台井名
 * @returns {{ core: String, aliases: String[], group: String }} group = 井组主体（可为空）
 */
export function wellAliases(wellName) {
  const n = normalizeText(wellName)
  if (!n) return { core: '', aliases: [], group: '' }

  const aliases = new Set()
  aliases.add(n)

  // 平 → p：郑58-5B-3平1 ⇒ 郑58-5b-3p1
  aliases.add(n.replace(/平/g, 'p'))
  // 支 → z、斜 → x（少量井用这个写法）
  aliases.add(n.replace(/平/g, 'p').replace(/支/g, 'z').replace(/斜/g, 'x'))

  // 去掉连字符 / 下划线 / 空格：郑58-5B-3平1 ⇒ 郑585b3p1
  const noSep = n.replace(/[-_()]/g, '')
  aliases.add(noSep)
  aliases.add(noSep.replace(/平/g, 'p'))

  // 数字前导零：平01 ⇒ 平1
  const noLeadZero = n.replace(/0+(\d)/g, '$1')
  if (noLeadZero !== n) aliases.add(noLeadZero)

  /**
   * 井组主体：郑58-5B-3平1 ⇒ 郑58-5b
   * 只用于「井组文档」严格判定（见 matchWell），不当作宽松别名。
   *
   * ⚠️ 不能让「郑58-5b」当普通别名 —— 那会把「郑58-5B井组压裂地质设计」
   * 判成每一口郑58-5B 子井的「本井文档」，实测 3 口子井全部误命中。
   */
  let group = ''
  const groupMatch = n.match(/^([^-]+-\d+[a-z]*)/)
  if (groupMatch && groupMatch[1] && groupMatch[1] !== n) {
    group = groupMatch[1]
  }

  // 只保留长度 ≥ 3 的片段，太短的片段（如「王4」）误命中率过高
  const list = Array.from(aliases).filter(a => a && a.length >= 3)
  list.sort((a, b) => b.length - a.length)
  return { core: list[0] || n, aliases: list, group }
}

/**
 * 判断文档名是否属于某口井。
 *
 * 三档判定：
 *  1. 完整井号命中（郑58-5b-3平1）—— 最强，直接算本井；
 *  2. 同一井组文档（郑58-5B井组压裂地质设计）—— 也算本井，
 *     因为井组地质设计是井组内所有子井共享的基础资料；
 *  3. 井组主体出现在名字里但带别的井号后缀（郑58-5b-3平2）—— 不算本井。
 *
 * @param {String} fileName 文档名
 * @param {String} wellName 井名
 * @returns {Boolean}
 */
export function matchWell(fileName, wellName) {
  const name = normalizeText(stripExt(fileName))
  const { aliases, group } = wellAliases(wellName)
  if (!name || !aliases.length) return false

  // /^\d/ 用于排除「片段后紧跟数字」，避免 平1 命中 平12
  const hitAlias = (a) => {
    let from = 0
    while (true) {
      const idx = name.indexOf(a, from)
      if (idx < 0) return false
      const next = name.charAt(idx + a.length)
      // 井号后缀 a 之后允许的字符：结束、或非数字
      if (!/\d/.test(next)) return true
      from = idx + 1
    }
  }

  for (const a of aliases) {
    if (hitAlias(a)) return true
  }

  // 井组文档：郑58-5B井组压裂地质设计 → group=郑58-5b 且紧跟「井组」
  if (group && name.indexOf(group + '井组') >= 0) return true

  return false
}

/* ============================================================
 *  三、文档类型字典
 * ============================================================ */

/**
 * 材料类型规则。
 *
 * 字段说明：
 *   moduleKey  落到 wellModules.js 的哪个模块
 *   inputKey   落到该模块的哪个 input 槽位（attachmentType）
 *   keywords   命中即算（归一化后比较，不含扩展名）
 *   ext        允许的扩展名（不带点）；不填表示不限
 *   priority   同分时优先级（大者优先），用于「压裂工程设计」这类宽泛名的兜底
 *   label      展示名
 *   docType    写入文档中心 COMM_WB_WELL_DOC.DOC_TYPE（仅地质设计用，其它为 OTHER）
 *
 * ⚠️ 顺序有意义：越具体的规则越靠前，先命中先返回。
 */
export const TYPE_RULES = [
  /* ---------------- 基础资料：地质设计 / 本井工程设计（走文档中心，不是附件槽位） ---------------- */
  {
    moduleKey: 'base',
    inputKey: '__DOC_CENTER__',
    docType: 'GEOLOGICAL_DESIGN',
    label: '压裂地质设计',
    keywords: ['地质设计', '压裂地质设计', '地质方案'],
    // 地质设计一般是 docx，但也有人传 pdf 签字版
    ext: ['doc', 'docx', 'pdf'],
    priority: 100
  },
  {
    moduleKey: 'base',
    inputKey: '__DOC_CENTER__',
    docType: 'ENGINEERING_DESIGN',
    label: '本井压裂工程设计',
    keywords: ['压裂工程设计', '工程设计', '压裂设计', '施工设计'],
    ext: ['doc', 'docx', 'pdf'],
    priority: 90,
    /**
     * 本井的旧版工程设计同样归文档中心（作为本井参考/对比），
     * 只有「别的井的工程设计」才降级为邻井参考槽位 —— 见 classify()。
     */
    selfOnly: true
  },
  /* ---------------- 基础资料：邻井参考 ---------------- */
  {
    moduleKey: 'base',
    inputKey: 'SOURCE_ENGDESIGN',
    docType: 'OTHER',
    label: '邻井工程设计',
    keywords: ['压裂工程设计', '工程设计', '压裂设计', '施工设计'],
    ext: ['doc', 'docx', 'pdf'],
    priority: 60,
    // 只有「不属于本井」时才当邻井参考，见 classify 里的 selfOnly 处理
    neighborOnly: true
  },
  /* ---------------- 分段射孔方案 ---------------- */
  {
    moduleKey: 'perforation',
    inputKey: 'MSE',
    docType: 'OTHER',
    label: '机械比能曲线（MSE）',
    keywords: ['mse', '机械比能'],
    ext: ['xls', 'xlsx', 'csv', 'doc', 'docx']
  },
  {
    moduleKey: 'perforation',
    inputKey: 'CASING_COLLAR',
    docType: 'OTHER',
    label: '套管接箍数据',
    keywords: ['套管接箍', '接箍', 'casingcollar', 'ccl'],
    ext: ['xls', 'xlsx', 'csv', 'doc', 'docx', 'txt']
  },
  {
    moduleKey: 'perforation',
    inputKey: 'TOTAL_HC',
    docType: 'OTHER',
    label: '全烃值数据',
    keywords: ['全烃', '总烃', 'totalhc', '气测全烃'],
    ext: ['xls', 'xlsx', 'csv', 'doc', 'docx', 'pdf', 'txt']
  },
  {
    moduleKey: 'perforation',
    inputKey: 'GAMMA',
    docType: 'OTHER',
    label: '伽马曲线',
    keywords: ['伽马', '伽瑪', '自然伽马', 'gr曲线', 'gamma'],
    ext: ['xls', 'xlsx', 'csv', 'txt']
  },
  /* ---------------- 泵注程序 ---------------- */
  {
    moduleKey: 'pump',
    inputKey: 'PUMP_PRETEST',
    docType: 'OTHER',
    label: '压前测试泵注程序',
    keywords: ['压前测试', '小压测试', '压前测试泵注', 'pretest'],
    ext: ['xls', 'xlsx', 'csv']
  },
  {
    moduleKey: 'pump',
    inputKey: 'PUMP_MAIN',
    docType: 'OTHER',
    label: '正式压裂泵注程序',
    keywords: ['泵注程序', '泵注', '施工泵注', '注液程序'],
    ext: ['xls', 'xlsx', 'csv', 'doc', 'docx']
  },
  /* ---------------- 化工原材料 ---------------- */
  {
    moduleKey: 'material',
    inputKey: 'FLUID_FORMULA',
    docType: 'OTHER',
    label: '压裂液配方表',
    keywords: ['压裂液配方', '液体配方', '配方表', '压裂液体系'],
    ext: ['xls', 'xlsx', 'csv']
  },
  {
    moduleKey: 'material',
    inputKey: 'PROPPANT_SPEC',
    docType: 'OTHER',
    label: '支撑剂制式说明',
    keywords: ['支撑剂', '陶粒', '石英砂', '加砂制式'],
    ext: ['doc', 'docx', 'xls', 'xlsx', 'pdf']
  },
  /* ---------------- 附图及附表 ---------------- */
  {
    moduleKey: 'figures',
    inputKey: 'FIG_SITE',
    docType: 'OTHER',
    label: '附图6 井场布置图',
    keywords: ['井场布置', '井场平面', '地面布置'],
    ext: ['jpg', 'jpeg', 'png', 'bmp']
  },
  {
    moduleKey: 'figures',
    inputKey: 'FIG_STRINGS',
    docType: 'OTHER',
    label: '附图5 施工管柱示意图',
    keywords: ['管柱示意', '施工管柱图', '管柱结构图'],
    ext: ['jpg', 'jpeg', 'png', 'bmp']
  },
  {
    moduleKey: 'figures',
    inputKey: 'FIG_SOURCE',
    docType: 'OTHER',
    label: '源文档附图（补充）',
    keywords: ['附图', '录井综合图', '导向图', '构造图', '井位部署图', '图版'],
    ext: ['jpg', 'jpeg', 'png', 'bmp', 'zip']
  },
  /* ---------------- 其他补充材料 ---------------- */
  {
    moduleKey: 'misc',
    inputKey: 'WELL_CONTROL',
    docType: 'OTHER',
    label: '井控 / 地面环境资料',
    keywords: ['井控', '地面环境', '环境敏感', '周边情况'],
    ext: ['doc', 'docx', 'xls', 'xlsx', 'pdf']
  },
  {
    moduleKey: 'misc',
    inputKey: 'OTHER',
    docType: 'OTHER',
    label: '其他过程材料',
    keywords: [],
    ext: [],
    priority: 1,
    fallback: true
  }
]

/** 按 inputKey 快速取规则 */
const RULE_BY_INPUT = TYPE_RULES.reduce((acc, r) => {
  acc[r.inputKey] = r
  return acc
}, {})

export function ruleOf(inputKey) {
  return RULE_BY_INPUT[inputKey] || null
}

/* ============================================================
 *  四、单份文档分类
 * ============================================================ */

/**
 * 按文档名判断材料类型（不看井号）。
 *
 * @param {String} fileName
 * @returns {Object|null} 命中的规则
 */
export function matchType(fileName) {
  const name = normalizeText(stripExt(fileName))
  const ext = (String(fileName).split('.').pop() || '').toLowerCase()
  if (!name) return null

  for (const rule of TYPE_RULES) {
    if (rule.fallback) continue
    // 扩展名不符直接跳过（避免「MSE 曲线.docx」这种被塞进只收 xlsx 的槽位）
    if (rule.ext && rule.ext.length && ext && !rule.ext.includes(ext)) continue
    for (const kw of rule.keywords) {
      if (name.indexOf(normalizeText(kw)) >= 0) {
        return rule
      }
    }
  }
  // 兜底：能进「其他过程材料」的扩展名
  return TYPE_RULES.find(r => r.fallback) || null
}

/**
 * 综合分类一份知识库文档。
 *
 * @param {Object} doc 知识库文档 { id, name, size, suffix, ... }
 * @param {String} wellName 当前井名
 * @param {Array<Object>} allWellNames 工作台全部井名（识别「这其实是别的井的文档」）
 * @returns {Object} {
 *   doc, moduleKey, inputKey, label, docType,
 *   hitWell, isSelf, isNeighbor, score, reason
 * }
 */
export function classify(doc, wellName, allWellNames = []) {
  const rule = matchType(doc.name) || TYPE_RULES[TYPE_RULES.length - 1]
  const isSelf = matchWell(doc.name, wellName)

  // 是否属于工作台里另一口井（同井组不同井：郑58-5B-3平2 vs 郑58-5B-3平1）
  let hitOtherWell = ''
  if (!isSelf) {
    for (const other of allWellNames) {
      if (!other || other === wellName) continue
      if (matchWell(doc.name, other)) {
        hitOtherWell = other
        break
      }
    }
  }

  /**
   * 两条互斥规则：
   *  - selfOnly（本井工程设计）：本井 → 文档中心；非本井 → 降级为邻井参考
   *  - neighborOnly（邻井参考）：本井 → 不该塞邻井槽位，降级为其他材料
   */
  let finalRule = rule
  if (rule.selfOnly && !isSelf) {
    finalRule = TYPE_RULES.find(r => r.neighborOnly) || rule
  } else if (rule.neighborOnly && isSelf) {
    finalRule = TYPE_RULES.find(r => r.fallback) || rule
  }

  // 打分：本井 + 类型具体度高 + 有时间/版本号更新
  let score = 0
  if (isSelf) score += 100
  if (hitOtherWell) score -= 20 // 别的井，降权但仍可手动勾选
  score += (finalRule.priority || 50)
  if (finalRule.neighborOnly && hitOtherWell) score += 10 // 邻井文档正好用得上

  const reasons = []
  if (isSelf) reasons.push('井号命中「' + wellName + '」')
  else if (hitOtherWell) reasons.push('属于其他井「' + hitOtherWell + '」')
  else reasons.push('井号未命中（可手动指定）')
  reasons.push('类型识别为「' + finalRule.label + '」')

  return {
    doc,
    moduleKey: finalRule.moduleKey,
    inputKey: finalRule.inputKey,
    label: finalRule.label,
    docType: finalRule.docType,
    hitWell: isSelf ? wellName : hitOtherWell,
    isSelf,
    isNeighbor: !!(finalRule.neighborOnly && !isSelf),
    score,
    reason: reasons.join('，')
  }
}

/**
 * 批量分类 + 按「工作台模块顺序」排序。
 *
 * @param {Array<Object>} docs 知识库文档列表
 * @param {String} wellName
 * @param {Array<String>} allWellNames
 * @param {Array<Object>} modules wellModules.js 的 MODULES
 * @returns {Array<Object>} 分类结果，已排序
 */
export function classifyAll(docs, wellName, allWellNames, modules) {
  const order = {}
  const moduleOrder = {}
  ;(modules || []).forEach((m, i) => {
    moduleOrder[m.key] = i
    ;(m.inputs || []).forEach((inp, j) => {
      order[`${m.key}::${inp.key}`] = i * 100 + j
    })
  })
  // 文档中心槽位排最前
  order['base::__DOC_CENTER__'] = -1

  const list = (docs || []).map(d => classify(d, wellName, allWellNames))
  list.sort((a, b) => {
    const ka = order[`${a.moduleKey}::${a.inputKey}`] === undefined ? 9999 : order[`${a.moduleKey}::${a.inputKey}`]
    const kb = order[`${b.moduleKey}::${b.inputKey}`] === undefined ? 9999 : order[`${b.moduleKey}::${b.inputKey}`]
    if (ka !== kb) return ka - kb
    if (b.score !== a.score) return b.score - a.score
    return String(a.doc.name).localeCompare(String(b.doc.name))
  })
  return list
}

/* ============================================================
 *  五、辅助
 * ============================================================ */

/** 字节数 → 可读大小 */
export function fmtSize(bytes) {
  const n = Number(bytes || 0)
  if (n <= 0) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** 结果汇总：{ 模块key: 数量 }，给按钮气泡/提示用 */
export function summarize(list) {
  const acc = {}
  ;(list || []).forEach(it => {
    acc[it.moduleKey] = (acc[it.moduleKey] || 0) + 1
  })
  return acc
}
