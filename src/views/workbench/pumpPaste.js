/**
 * Excel 剪贴板 → 泵注表行 解析器
 *
 * 用户场景：在 Excel 里框选一片泵注表 → Ctrl+C → 到页面上 Ctrl+V。
 * 这条路比「先另存为 xlsx 再上传」省三步，是现场最常见的手上动作。
 *
 * ── 剪贴板里到底是什么 ─────────────────────────────────────
 * Excel 复制时往 clipboardData 里同时塞好几种格式，对文本最有用的两个：
 *   text/plain        制表符分隔、行之间 \r\n，**不含任何合并单元格与样式**
 *   text/html         <table> 结构，**带 rowspan/colspan**，能还原副表头
 * 所以：先按 text/html 解析（能拿到合并信息），拿不到再退回 text/plain。
 *
 * ⚠️ 单元格内如果有换行（'前置液\n（1110m³）'，真实表里很常见），
 *    Excel 会用双引号把整格包起来：`"前置液\n（1110m³）"\t390`。
 *    按 \t / \r\n 裸切会把这个换行当成行尾 → 一行裂成两行、列全错位。
 *    所以必须走下面这个带引号状态的扫描器，不能用 split('\t') / split('\n')。
 *
 * ⚠️ 制表符切出来后末尾常带一堆空列（Excel 总会带上最右的空白列），
 *    不能直接把空列当数据列数，否则列数判定一律失败。
 */

/** 泵注表里出现过的阶段/分组名 —— 用来在开始列自动定位时打高分 */
const KNOWN_STAGES = [
  '泵送桥塞', '送桥塞', '送球液', '送球', '前置液', '携砂液', '顶替液',
  '活性水', '滑溜水', '基液', '隔离液', '停泵'
]

/**
 * 表头关键字 → 内部字段。
 *
 * ⚠️ keys 必须按「长词在前」写，且**越具体的字段规则要排在越前面**，
 *    因为匹配是「取全表头里最长的命中关键字」而不是「取第一条命中规则的」。
 *    之前踩过的两个坑，都是「短别名把长表头吃掉了」：
 *      · `fluid` 的别名里有 `液量` → 「砂液量」被判成净液量
 *      · `stage` 的别名里有 `阶段` → 「阶段时间」被判成阶段
 *    现在改成按长度竞争 + 每列可选多个候选，由 findHeader 统一去重。
 */
const HEADER_RULES = [
  { prop: 'no', keys: ['序号', '编号', '步骤'] },
  { prop: 'stage', keys: ['施工阶段', '液体类型', '作业内容', '阶段', '工序'] },
  { prop: 'conc', keys: ['加砂浓度', '砂浓度'] },
  { prop: 'ratio', keys: ['综合砂比', '平均砂比', '砂比'] },
  { prop: 'fluid', keys: ['净液量', '携液量', '净液', '液量'] },
  { prop: 'floatSand', keys: ['自悬浮砂量', '悬浮砂量'] },
  { prop: 'cumSand', keys: ['累积砂量', '累计砂量', '累积', '累计砂'] },
  { prop: 'sand', keys: ['石英砂量', '支撑剂量', '加砂量', '砂量'] },
  { prop: 'liquidVol', keys: ['混砂液量', '携砂液量', '砂液量'] },
  { prop: 'rate', keys: ['套管排量', '注入排量', '排量'] },
  { prop: 'minutes', keys: ['阶段时间', '施工时间', '时间', '时长'] },
  { prop: 'note', keys: ['备注', '说明'] },
  { prop: 'proppant', keys: ['支撑剂类型', '支撑剂', '砂型', '规格'] }
]

/**
 * 字段优先级：同一列表头若同时像两个字段，谁更需要这个列由它决定。
 * 数值越大越优先（例如「累积砂量」既像 cumSand 又像 sand，必须归 cumSand）。
 */
const PROP_PRIORITY = {
  no: 100,
  liquidVol: 96,
  floatSand: 94,
  cumSand: 92,
  minutes: 90,
  conc: 88,
  ratio: 86,
  rate: 84,
  sand: 70,
  fluid: 60,
  stage: 50,
  proppant: 30,
  note: 20
}

/** 表头里常见的单位/注释括号，匹配前整体剥掉，避免 `(m³/min)` 里的 `m` 之类干扰 */
const UNIT_SUFFIX = /[（(][^（()）]{0,16}[)）]\s*$/

const NUMERIC_PROPS = ['fluid', 'conc', 'ratio', 'sand', 'floatSand', 'cumSand', 'liquidVol', 'rate', 'minutes']

/* ============================================================
 *  一、text/plain → 二维数组（带引号状态的扫描器）
 * ============================================================ */

/**
 * 解析 Excel 的 text/plain 剪贴板内容。
 *
 * 规则（与 Excel / LibreOffice 一致）：
 *   · \t 分列、\r\n 或 \n 分行
 *   · 格内含 \t / \n / " 时，整格用 " 包裹，内部的 " 写成 ""
 *   · 引号只在「格首」生效；格中间的 " 是普通字符
 *
 * @param {String} text
 * @returns {String[][]}
 */
export function parseTsv(text) {
  const src = String(text == null ? '' : text)
  const rows = []
  let row = []
  let cur = ''
  let inQuote = false
  /** 当前格是否还在「格首」——只有格首的 " 才是引号 */
  let atCellStart = true
  let i = 0

  const endCell = () => {
    row.push(cur)
    cur = ''
    atCellStart = true
  }
  const endRow = () => {
    endCell()
    rows.push(row)
    row = []
  }

  while (i < src.length) {
    const ch = src[i]

    if (inQuote) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i += 2; continue }
        inQuote = false
        i++
        continue
      }
      cur += ch
      i++
      continue
    }

    if (ch === '"' && atCellStart) { inQuote = true; atCellStart = false; i++; continue }
    if (ch === '\t') { endCell(); i++; continue }
    if (ch === '\r') { endRow(); i += (src[i + 1] === '\n' ? 2 : 1); continue }
    if (ch === '\n') { endRow(); i++; continue }

    cur += ch
    atCellStart = false
    i++
  }
  // 收尾：只要还有内容或还有未提交的格，就补一行
  if (cur !== '' || row.length) endRow()

  return rows
}

/* ============================================================
 *  二、text/html → 二维数组（含 rowspan/colspan 展开）
 * ============================================================ */

/**
 * 解析 Excel 的 text/html 剪贴板内容 → 二维数组。
 *
 * 合并单元格要**真正展开成矩形**，否则副表头（两行）会让后面每一列的
 * 下标整体左移。真实泵注表恰好是「射孔井段（m）」那种 colspan=2 表头，
 * 不展开就会把「顶深」读成「底深」。
 *
 * ⚠️ 不引第三方 HTML 解析器：这段 HTML 只来自 Excel，结构极简单
 *    （table > tr > td|th），正则切分足够且没有依赖风险。
 *
 * @param {String} html
 * @returns {String[][]}
 */
export function parseHtmlTable(html) {
  const src = String(html == null ? '' : html)
  const tableM = /<table[\s\S]*?<\/table>/i.exec(src)
  if (!tableM) return []
  const body = tableM[0]

  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi

  const raw = []
  let trM
  while ((trM = trRe.exec(body))) {
    const cells = []
    let cM
    cellRe.lastIndex = 0
    while ((cM = cellRe.exec(trM[1]))) {
      const attrs = cM[2] || ''
      const rs = /\browspan\s*=\s*"?(\d+)/i.exec(attrs)
      const cs = /\bcolspan\s*=\s*"?(\d+)/i.exec(attrs)
      cells.push({
        text: htmlToText(cM[3]),
        rowspan: rs ? Math.max(1, Number(rs[1])) : 1,
        colspan: cs ? Math.max(1, Number(cs[1])) : 1
      })
    }
    if (cells.length) raw.push(cells)
  }
  if (!raw.length) return []

  /*
   * 按 rowspan/colspan 展开成矩形网格。
   *
   * ⚠️ 两个容易写错的地方：
   *   ① 被上面行 rowspan 占住的位置必须先「占位再写」，否则下面行自己的 <td>
   *      会顺着空位写进来，把合并单元格的内容顶掉（实测第 2 行拿到 '' 而不是 '第一段'）
   *   ② 合并区**只有左上角存文本**，展开出来的从属格留空 —— 与 Excel 视觉一致，
   *      也避免同一段名被读成一整片重复数据
   */
  const grid = []

  raw.forEach((cells, r) => {
    if (!grid[r]) grid[r] = []
    // 本行被上面 rowspan 占住的列号（展开后这些列不能再放本行自己的格）
    const blocked = (grid[r].__blocked || []).slice()
    let c = 0
    cells.forEach(cell => {
      while (blocked.indexOf(c) >= 0) c++
      for (let dr = 0; dr < cell.rowspan; dr++) {
        for (let dc = 0; dc < cell.colspan; dc++) {
          const rr = r + dr
          const cc = c + dc
          if (!grid[rr]) grid[rr] = []
          if (dr === 0 && dc === 0) {
            grid[rr][cc] = cell.text
          } else if (dr === 0) {
            // 同一行内的 colspan 从属格：留空（Excel 视觉上就是合并的）
            grid[rr][cc] = ''
          } else {
            /*
             * 往下跨行：把「上面那格的内容」写进下面这一行。
             * ⚠️ 必须写字而不是留空 —— 用户粘贴的是一片矩形数据，
             *    下面行少了一格会让整行左移。真实泵注表里 rowspan 主要出现在
             *    表头（「射孔井段」跨两行），展开后两行都要能看到这列名。
             */
            grid[rr][cc] = cell.text
            if (!grid[rr].__blocked) grid[rr].__blocked = []
            grid[rr].__blocked.push(cc)
          }
        }
      }
      c += cell.colspan
    })
  })

  // 收尾：补齐空洞（跨行占位之外的未定义格）
  return grid.map(r => (r || []).map(v => (v === undefined ? '' : v)))

  /*
   * 收尾：把占位标记转成空串，并补齐所有空洞。
   * ⚠️ rowspan 占住的格必须显式转空串 —— 它表示「这一格已被上面合并走了」，
   *    下面行的 <td> 顺序会自然跳过它，不需要也不应该填内容。
   */
  return grid.map(r => (r || []).filter(() => true).map(v => (v === OCCUPIED || v === undefined ? '' : v)))
}

/** HTML 片段 → 纯文本（去标签、解实体、<br> 转换行） */
function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/gi, '&')
}

/* ============================================================
 *  三、二维数组 → 泵注表行
 * ============================================================ */

/** 单元格 → 干净字符串（保留内部换行，压缩其它空白） */
function cellStr(v) {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** 单元格 → 数字；'2.0-8.0' 这类区间文本返回 null，由调用方另处理 */
function cellNum(v) {
  const s = String(v == null ? '' : v).replace(/[，,\s]/g, '')
  if (!s) return null
  const n = Number(s)
  return isFinite(n) ? n : null
}

/**
 * 表头单元格 → 命中的字段候选列表（按「关键字长度 → 字段优先级」降序）。
 *
 * 为什么返回列表而不是单个字段：
 *   「累积砂量」既含 `砂量`（sand）也含 `累积砂量`（cumSand），
 *   只取第一条规则会看 HEADER_RULES 的书写顺序碰运气。
 *   现在把命中的都列出来，交给 findHeader 做**全局最优分配** ——
 *   让「累积砂量」拿 cumSand，剩下的 `砂量` 列才归 sand。
 *
 * @returns {Array<{prop: String, len: Number, prio: Number}>}
 */
function headerProps(text) {
  // 先剥单位括号再压空格：「砂液量(m³)」→「砂液量」，「砂 浓 度」→「砂浓度」
  let s = String(text == null ? '' : text).replace(/\s+/g, '')
  s = s.replace(UNIT_SUFFIX, '').replace(/\s+/g, '')
  if (!s) return []

  const hits = []
  HEADER_RULES.forEach(r => {
    r.keys.forEach(k => {
      const key = k.replace(/\s+/g, '')
      if (key && s.indexOf(key) >= 0) {
        hits.push({ prop: r.prop, len: key.length, prio: PROP_PRIORITY[r.prop] || 0 })
      }
    })
  })
  if (!hits.length) return []

  // 同一字段只留最长的那条命中（`砂比` 与 `综合砂比` 命中同一格时，取长的，代表更明确）
  const byProp = {}
  hits.forEach(h => {
    const cur = byProp[h.prop]
    if (!cur || h.len > cur.len) byProp[h.prop] = h
  })
  return Object.keys(byProp).map(p => byProp[p]).sort((a, b) => {
    if (b.len !== a.len) return b.len - a.len
    return b.prio - a.prio
  })
}

/** 兼容老调用：只要最可能的那个字段 */
function headerProp(text) {
  const list = headerProps(text)
  return list.length ? list[0].prop : ''
}

/**
 * 找表头行，并把列分配到字段。
 *
 * 两阶段：
 *   ① 逐列算出「候选字段列表」，同时挑出最像表头的那一行
 *   ② 在该行上做贪心分配 —— 每轮取全局「最强」（长度优先、其次字段优先级）的
 *      (列, 字段) 配对，配过的列与字段都不再参与，直到配完
 *
 * 第 ② 步是关键：只按「第一次见面就占位」分配（旧实现），
 * 一列被短别名抢走字段名后，真正的列就只能因为 `!(p in cols)` 被丢掉，
 * 表现为「砂液量」「阶段时间」整列读不到。
 *
 * @returns {{ headerIdx: Number, cols: Object, score: Number }}
 */
function findHeader(matrix) {
  let best = { headerIdx: -1, cols: {}, score: 0 }
  const limit = Math.min(matrix.length, 8)

  for (let i = 0; i < limit; i++) {
    const cands = (matrix[i] || []).map((cell, j) => ({ j, list: headerProps(cell) }))

    // —— 全局贪心分配 ——
    const pairs = []
    cands.forEach(c => c.list.forEach(h => pairs.push({ j: c.j, prop: h.prop, len: h.len, prio: h.prio })))
    pairs.sort((a, b) => {
      if (b.len !== a.len) return b.len - a.len
      if (b.prio !== a.prio) return b.prio - a.prio
      return a.j - b.j
    })

    const cols = {}
    const usedCol = {}
    let score = 0
    pairs.forEach(p => {
      if (p.prop in cols) return
      if (usedCol[p.j]) return
      cols[p.prop] = p.j
      usedCol[p.j] = true
      score++
    })

    // 序号、阶段、净液量三者至少有俩才算真表头
    const essential = ['no', 'stage', 'fluid'].filter(k => k in cols).length
    const s = score + essential
    if (s > best.score) best = { headerIdx: i, cols, score: s }
  }
  return best
}

/** 阶段名 → 分组 kind（与 pumpSheetParser.guessKind 同一口径） */
function guessKind(stage, ratio, prev) {
  const s = stage || ''
  if (/泵送桥塞|送桥塞|桥塞/.test(s)) return 'plug'
  if (/送球/.test(s)) return 'ball'
  if (/顶替/.test(s)) return 'flush'
  if (/前置|活性水|滑溜水|基液/.test(s) && ratio == null) return 'pad'
  if (ratio != null) return 'carry'
  if (!s && prev) return prev
  return ''
}

/** 数据行判据：格里有数字或已知阶段名，且不是合计行 */
function looksLikeData(rowTexts) {
  const joined = rowTexts.join('|')
  if (!joined.replace(/[|\s]/g, '')) return false
  if (/^合计|^合\s*计/.test(rowTexts.find(t => t) || '')) return false
  return true
}

/**
 * 把二维数组解析成泵注行。
 *
 * 三种输入都会走这里：
 *   ① 用户连表头一起复制（最常见）→ 走 findHeader 定位列
 *   ② 用户只复制了数据区（没有表头行）→ 走「按内容猜列」
 *   ③ 用户只复制了单列（比如只有一列净液量）→ 走单列模式
 *
 * @param {String[][]} matrix
 * @param {Object} opt
 * @returns {{ rows: Array, mode: String, warnings: Array, matchedCols: Object }}
 *   mode: 'header'（有表头）| 'guess'（无表头按内容猜）| 'single'（单列）
 */
export function matrixToPumpRows(matrix, opt) {
  const o = opt || {}
  // 砍掉完全空白的行尾/列尾（Excel 总会带一堆）
  const grid = trimMatrix(matrix)

  if (!grid.length) {
    return { rows: [], mode: 'empty', warnings: ['粘贴内容里没有任何数据'], matchedCols: {} }
  }

  const head = findHeader(grid)
  // 至少要认出「阶段 + 净液量」或「净液量 + 砂比」，否则当无表头处理
  const hasFluid = 'fluid' in head.cols
  const usable = head.headerIdx >= 0 && hasFluid && head.score >= 4

  if (usable) {
    const { rows, warnings } = readByHeader(grid, head)
    return { rows, mode: 'header', warnings, matchedCols: head.cols }
  }

  // ---- 无表头：按内容猜 ----
  const guessed = guessColumns(grid)
  if (guessed) {
    const { rows, warnings } = readByGuess(grid, guessed)
    return { rows, mode: 'guess', warnings, matchedCols: guessed.cols }
  }

  // ---- 单列 ----
  const single = readSingleColumn(grid)
  if (single.rows.length) {
    return {
      rows: single.rows,
      mode: 'single',
      warnings: single.warnings,
      matchedCols: { fluid: single.col }
    }
  }

  return {
    rows: [],
    mode: 'empty',
    warnings: [
      '没能从粘贴内容里认出泵注列。请在 Excel 里把表头行（含「阶段 / 净液量 / 砂比」）一起选中再复制。'
    ],
    matchedCols: {}
  }
}

/** 去掉末尾全空的行与列 */
function trimMatrix(matrix) {
  const rows = (matrix || []).filter(r => Array.isArray(r))
  let maxCol = 0
  rows.forEach(r => {
    for (let j = r.length - 1; j >= 0; j--) {
      if (cellStr(r[j]) !== '') { maxCol = Math.max(maxCol, j + 1); break }
    }
  })
  const out = []
  rows.forEach(r => {
    const line = []
    for (let j = 0; j < maxCol; j++) line.push(r[j] == null ? '' : r[j])
    out.push(line)
  })
  // 去掉顶部/底部的纯空行
  let s = 0
  let e = out.length
  while (s < e && out[s].every(c => cellStr(c) === '')) s++
  while (e > s && out[e - 1].every(c => cellStr(c) === '')) e--
  return out.slice(s, e)
}

/** 有表头：按列下标读 */
function readByHeader(grid, head) {
  const c = head.cols
  const rows = []
  const warnings = []

  for (let i = head.headerIdx + 1; i < grid.length; i++) {
    const r = grid[i] || []
    const stageRaw = c.stage != null ? cellStr(r[c.stage]) : ''
    const noRaw = c.no != null ? cellStr(r[c.no]) : ''

    // 单位行 / 二次表头行：整行都不像数据就跳过
    if (!looksLikeData(r)) continue
    const isDataNo = /^\d+$/.test(noRaw)
    // 数据行：阶段列有字，或序号是数字
    if (!stageRaw && !isDataNo) continue
    if (/^合\s*计/.test(stageRaw) || /^合\s*计/.test(noRaw)) continue

    const row = buildRow(r, c, stageRaw)
    if (row) rows.push(row)
  }

  if (!rows.length) {
    warnings.push('表头认出来了，但表头下面没读到数据行。是不是把数据区漏选了？')
  }
  return { rows: renumber(rows), warnings }
}

/** 按列映射构造一行；数值全空且阶段为空 → 返回 null（丢弃） */
function buildRow(r, cols, stageRaw) {
  const row = {
    no: 0,
    stage: stripStageParenthesis(stageRaw),
    stageRaw: stageRaw,
    note: '',
    proppant: '',
    kind: ''
  }
  NUMERIC_PROPS.forEach(p => {
    const idx = cols[p]
    row[p] = idx == null ? null : cellNum(r[idx])
  })
  if (cols.note != null) row.note = cellStr(r[cols.note]).replace(/\n/g, ' ')
  if (cols.proppant != null) row.proppant = cellStr(r[cols.proppant]).replace(/\n/g, ' ')

  // 排量是区间文本（'2.0-8.0'）→ 取上限，原文本留 rateRaw
  if (row.rate == null && cols.rate != null) {
    const raw = cellStr(r[cols.rate])
    const m = /([\d.]+)\s*[-~－—]\s*([\d.]+)/.exec(raw)
    if (m) {
      row.rateRaw = raw
      row.rate = Number(m[2])
    }
  }
  // 一行里既没阶段名也没任何数值 → 不是数据行
  if (!row.stage && NUMERIC_PROPS.every(p => row[p] == null)) return null
  return row
}

/** '前置液（1110m³）' → '前置液'；内嵌液量原表里只是标注，真值在净液量列 */
function stripStageParenthesis(s) {
  return String(s || '')
    .replace(/[（(][^（()）]*[)）]\s*$/, '')
    .replace(/\n/g, ' ')
    .trim()
}

/** 行号重排 + kind 继承（同组续行的阶段列是空的，必须继承上一行） */
function renumber(rows) {
  const out = []
  rows.forEach(row => {
    // ⚠️ 必须先算 kind 再 push，否则续行继承的是「已重排的上一行」，本行 kind 永远为空。
    //    真实泵注表只在组首行写阶段名，前置液第 2 行、携砂液第 3/4 行阶段列都是空的，
    //    继承丢了会让 STAGE_GROUP 写成空 → 报告里整组都没有阶段名。
    const prev = out.length ? out[out.length - 1].kind : ''
    out.push(Object.assign({}, row, {
      no: out.length + 1,
      kind: guessKind(row.stage, row.ratio, prev)
    }))
  })
  return out
}

/* ============================================================
 *  四、无表头时的列推断
 * ============================================================ */

/** 某列里「像阶段名」的格数 */
function stageScore(col) {
  let n = 0
  col.forEach(t => {
    const s = cellStr(t)
    if (!s) return
    if (KNOWN_STAGES.some(k => s.indexOf(k) >= 0)) n += 3
    else if (/^第[一二三四五六七八九十\d]+段$/.test(s)) n += 2
    else if (/[\u4e00-\u9fa5]/.test(s) && s.length <= 8) n += 1
  })
  return n
}

/** 某列里数字格的比例 */
function numRatio(col) {
  let num = 0
  let total = 0
  col.forEach(t => {
    const s = cellStr(t)
    if (!s) return
    total++
    if (cellNum(s) != null) num++
  })
  return total ? num / total : 0
}

/**
 * 无表头时按内容推列。
 *
 * 判据（依次）：
 *   ① 阶段列：命中已知阶段名的格最多，且以中文为主
 *   ② 序号列：全程是 1,2,3… 递增的整数（可选，识别到就跳过该列）
 *   ③ 其余数字列按顺序对齐「净液量 / 砂浓度 / 砂比 / 砂量 / 累积砂量 / 砂液量 / 排量 / 时间」
 *      —— 与真实泵注表的列序完全一致，这是靠 509 张表核实过的固定顺序
 *
 * @returns {{ cols: Object, startCol: Number }|null}
 */
function guessColumns(grid) {
  const cols = []
  const depth = grid.reduce((m, r) => Math.max(m, r.length), 0)
  for (let j = 0; j < depth; j++) cols.push(grid.map(r => r[j]))

  const stageIdx = pickStageColumn(cols)
  if (stageIdx < 0) return null

  // 阶段列右侧的所有列，剔除序号列后按顺序当数值列
  const right = []
  for (let j = stageIdx + 1; j < cols.length; j++) {
    if (numRatio(cols[j]) >= 0.5) right.push(j)
  }
  if (!right.length) return null

  // 序号列：整数 1..n 连续递增
  const seqPos = right.findIndex(j => isSeqColumn(cols[j]))
  if (seqPos >= 0) right.splice(seqPos, 1)

  /*
   * 真实表列序（D~M）：净液量、砂浓度、砂比、砂量、累积砂量、砂液量、排量、时间
   * 缺列时不能硬套 —— 用「哪几列有值」判断：
   *   · 有砂比的列，砂浓度列通常也存在；但如果只有 5 列，优先认为缺的是砂浓度这类派生列
   * 这里按「从左到右依次填」并给最常用的顺序，剩余列命名为 unknown 供用户核对。
   */
  const ORDER = ['fluid', 'conc', 'ratio', 'sand', 'cumSand', 'liquidVol', 'rate', 'minutes']
  const map = {}
  right.forEach((j, i) => {
    const p = ORDER[i]
    if (p) map[p] = j
  })

  // 至少要认出净液量（第一列）
  if (!('fluid' in map)) return null
  // 砂比 / 砂浓度两列容易错位：如果 ratio 那列有小数值（<=20 且带小数）而 conc 是整数大值，
  // 说明顺序是对的；若反过来（conc 列值都很小），把两者换回来
  if (map.ratio != null && map.conc != null) {
    const avgRatio = avgNums(cols[map.ratio])
    const avgConc = avgNums(cols[map.conc])
    if (avgRatio > avgConc && avgConc > 0) {
      const t = map.ratio
      map.ratio = map.conc
      map.conc = t
    }
  }

  return { cols: map, startCol: stageIdx, guessed: true }
}

/** 找阶段列：阶段名命中最多的那列；打平时取最左（真实表就在最左） */
function pickStageColumn(cols) {
  let best = -1
  let bestScore = 0
  cols.forEach((col, j) => {
    const s = stageScore(col)
    if (s > bestScore) { bestScore = s; best = j }
  })
  // 分数太低说明整片都没有中文阶段名（可能用户只抄了数字）→ 认为没有阶段列
  return bestScore >= 3 ? best : -1
}

/** 是否是 1,2,3… 连续整数列 */
function isSeqColumn(col) {
  const nums = col.map(cellNum).filter(v => v != null)
  if (nums.length < 2) return false
  for (let i = 0; i < nums.length; i++) {
    if (!Number.isInteger(nums[i])) return false
    if (i > 0 && nums[i] !== nums[i - 1] + 1) return false
  }
  return nums[0] === 1
}

function avgNums(col) {
  const nums = col.map(cellNum).filter(v => v != null)
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/** 无表头 + 猜出列 → 读行（阶段名左补一列空白，便于列映射统一） */
function readByGuess(grid, guessed) {
  const c = guessed.cols
  const rows = []
  const warnings = []
  // 阶段列下标比数值列小，统一按原矩阵下标读
  const cols = Object.assign({ stage: guessed.startCol }, c)

  grid.forEach(r => {
    const stageRaw = cellStr(r[cols.stage])
    if (!looksLikeData(r)) return
    const row = buildRow(r, cols, stageRaw)
    if (row) rows.push(row)
  })

  if (rows.length) {
    warnings.push(
      '这次粘贴没带表头，已按「阶段 + 数值列顺序」自动对应：' +
      '净液量 / 砂浓度 / 砂比 / 砂量 / 累积砂量 / 砂液量 / 排量 / 时间。' +
      '请核对一遍列是否对上了，不对就在 Excel 里连表头一起复制。'
    )
  }
  return { rows: renumber(rows), warnings }
}

/** 单列：整片只有一个数字列 → 当作净液量，阶段名留空让用户自己填 */
function readSingleColumn(grid) {
  const depth = grid.reduce((m, r) => Math.max(m, r.length), 0)
  let numCol = -1
  for (let j = 0; j < depth; j++) {
    if (numRatio(grid.map(r => r[j])) >= 0.8) { numCol = j; break }
  }
  if (numCol < 0) return { rows: [], col: -1, warnings: [] }

  const rows = []
  grid.forEach(r => {
    const v = cellNum(r[numCol])
    if (v == null) return
    rows.push({ no: rows.length + 1, stage: '', stageRaw: '', fluid: v, ratio: null, rate: null, note: '', proppant: '', kind: '' })
  })
  const warnings = rows.length
    ? ['只粘进来一列数字，已当作「净液量」，阶段名与砂比需要自己补。']
    : []
  return { rows, col: numCol, warnings }
}

/* ============================================================
 *  五、对外入口
 * ============================================================ */

/**
 * 从剪贴板事件里取二维数组。
 *
 * 优先 text/html（带合并信息），拿不到退回 text/plain。
 *
 * @param {ClipboardEvent} e
 * @returns {{ matrix: String[][], from: String }}
 */
export function matrixFromClipboard(e) {
  const dt = e && (e.clipboardData || e.originalEvent && e.originalEvent.clipboardData)
  if (!dt) return { matrix: [], from: '' }

  let html = ''
  let text = ''
  try { html = dt.getData('text/html') || '' } catch (err) { html = '' }
  try { text = dt.getData('text/plain') || '' } catch (err) { text = '' }

  if (html) {
    const m = parseHtmlTable(html)
    // HTML 里至少要有两行才算解析成功（Excel 单格也会给 <table>）
    if (m.length >= 1 && m.some(r => r.some(c => cellStr(c) !== ''))) {
      return { matrix: m, from: 'html' }
    }
  }
  if (text) return { matrix: parseTsv(text), from: 'text' }
  return { matrix: [], from: '' }
}

/** 一行里列数最多的值 —— 判断粘贴区域「宽不宽」 */
export function maxCols(matrix) {
  return (matrix || []).reduce((m, r) => Math.max(m, (r || []).length), 0)
}

/** 非空行数 */
export function nonEmptyRows(matrix) {
  return (matrix || []).filter(r => (r || []).some(c => cellStr(c) !== '')).length
}
