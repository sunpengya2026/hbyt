/**
 * 泵注程序表生成引擎（单一数据源）
 *
 * 规则来源：39 份真实泵注表（522 张 sheet）的单元格公式反查归纳，
 * 详见 <workspace>/泵注程序表规则总结.md。所有常数都有出处，不是猜的。
 *
 * ⚠️ 与后端 `FracturingDesignAgent.buildPumpProgramTables` 的两处差异（后端是错的）：
 *    - 砂浓度：后端 ratio*1000/(100+ratio)，真实 ratio*1.58*10
 *    - 顶替液：后端 maxRate*2，真实 桥塞深度*12.15/1000+2
 * 本模块按真实规则实现，后端待同步修正。
 */

/** 支撑剂密度 t/m³（石英砂实测 1.58） */
export const SAND_DENSITY = 1.58
/** 砂液量折算系数：砂体积 → 携带该砂所需的液量增量 = 密度 / (堆密度-密度比) */
export const SAND_LIQUID_RATIO = 1.58 / 2.62
/** 砂浓度系数：砂浓度(kg/m³) = 砂比(%) × 15.8 */
export const SAND_CONC_COEF = 15.8
/** 套管内单位容积 L/m（对应 ID≈248.8mm，取偏大安全值） */
export const CASING_VOLUME_PER_M = 12.15
/** 顶替液附加余量 m³ */
export const FLUSH_EXTRA = 2

/** 固定前置段（每段表的第一、二行，仅首段带泵送桥塞时才有） */
export const FIXED_HEAD_ROWS = {
  plug: { stage: '泵送桥塞', fluid: 50, rate: 2.5, liquid: '滑溜水/活性水' },
  ball: { stage: '送球液', fluid: 25, rate: 2.5, liquid: '活性水' }
}

/**
 * 砂比阶梯：首两级恒为 5%，之后每级 +1%，升至 maxRatio。
 * 实测 242/522 张表完全一致（5,5,6,7,8,9,10,11,12）。
 *
 * @param {Number} maxRatio 目标最高砂比，默认 12
 * @returns {Number[]}
 */
export function buildSandLadder(maxRatio) {
  const top = Math.max(6, Math.round(maxRatio || 12))
  const out = [5, 5]
  for (let r = 6; r <= top; r++) out.push(r)
  return out
}

/**
 * 升排量阶梯：从起始排量按 1 m³/min 步长升到 maxRate，到顶后保持。
 *
 * @param {Number} maxRate 档位最高排量
 * @param {Number} startRate 起始排量（前置液首行），默认 maxRate/2 取整到 1
 * @param {Number} count 需要的总级数（= 砂比阶梯长度）
 * @returns {Number[]}
 */
export function buildRateLadder(maxRate, startRate, count) {
  const top = Math.max(2, Math.round(maxRate || 12))
  let start = Math.round(startRate || Math.max(2, Math.round(top / 2)))
  if (start >= top) start = Math.max(2, top - 1)
  const out = []
  for (let i = 0; i < count; i++) {
    const r = start + i
    out.push(r >= top ? top : r)
  }
  return out
}

/** 一位小数，去掉多余的 .0 */
export function fmt1(v) {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  if (!isFinite(n)) return ''
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

/** 两位小数 */
export function fmt2(v) {
  if (v === null || v === undefined || v === '') return ''
  const n = Number(v)
  if (!isFinite(n)) return ''
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? String(r) : r.toFixed(2)
}

/**
 * 生成单段泵注程序表。
 *
 * 用户只给 5 个原始参数，其余全部派生：
 *   砂量 = 净液量 × 砂比 / 100
 *   砂浓度 = 砂比 × 15.8
 *   砂液量 = 净液量 + 砂量 × 1.58 / 2.62
 *   阶段时间 = 砂液量 / 排量
 *   累积砂量 = 上行 + 本行砂量
 *
 * @param {Object} opt
 * @param {Number} opt.maxRate        档位最高排量 m³/min
 * @param {Number} opt.padFluid       前置液总液量 m³
 * @param {Number} opt.carryFluid     携砂液总液量 m³
 * @param {Number} opt.maxRatio       目标最高砂比 %
 * @param {Number} opt.plugDepth      桥塞深度 m（用于顶替液）
 * @param {Boolean} opt.withPlug      是否带「泵送桥塞 + 送球液」两行，默认 true
 * @param {String} opt.proppant       支撑剂名称，默认 20/40目石英砂
 * @param {String} opt.carryProppant  携砂液支撑剂，默认同 proppant
 * @returns {{rows: Array, summary: Object}}
 */
export function buildPumpStage(opt) {
  const o = opt || {}
  const maxRate = Number(o.maxRate) || 12
  const padFluid = Math.max(0, Number(o.padFluid) || 0)
  const carryFluid = Math.max(0, Number(o.carryFluid) || 0)
  const maxRatio = Number(o.maxRatio) || 12
  const plugDepth = Math.max(0, Number(o.plugDepth) || 0)
  const withPlug = o.withPlug !== false
  const proppant = o.proppant || '20/40目石英砂'

  const ladder = buildSandLadder(maxRatio)
  // 前置液纯液台阶数：实测前置液一般 4~6 行，取阶梯前半段
  const padStepCount = Math.min(ladder.length - 1, Math.max(2, Math.round(ladder.length * 0.55)))
  const carryStepCount = ladder.length

  // 排量阶梯覆盖「前置液台阶 + 携砂台阶」
  const rates = buildRateLadder(maxRate, o.startRate, padStepCount + carryStepCount)

  const rows = []
  let no = 0
  let cumSand = 0
  let cumFluidTotal = 0
  /** 参数异常提示，交给页面显式告警（不静默出错误数据） */
  const warnings = []

  const pushRow = (row) => {
    no += 1
    rows.push(Object.assign({ no }, row))
  }

  // ---- ① 泵送桥塞 / 送球液 ----
  if (withPlug) {
    const p = FIXED_HEAD_ROWS.plug
    const b = FIXED_HEAD_ROWS.ball
    pushRow({
      stage: p.stage, fluid: p.fluid, ratio: null, conc: null, sand: null,
      cumSand: null, liquidVol: p.fluid, rate: p.rate,
      minutes: round2(p.fluid / p.rate), note: p.liquid, proppant: '',
      kind: 'plug'
    })
    pushRow({
      stage: b.stage, fluid: b.fluid, ratio: null, conc: null, sand: null,
      cumSand: null, liquidVol: b.fluid, rate: b.rate,
      minutes: round2(b.fluid / b.rate), note: b.liquid, proppant: '',
      kind: 'ball'
    })
    cumFluidTotal += p.fluid + b.fluid
  }

  // ---- ② 前置液（纯液，按排量阶梯分台阶）----
  const padPer = padStepCount > 0 ? padFluid / padStepCount : 0
  for (let i = 0; i < padStepCount; i++) {
    // 最后一行吃掉除不尽的小数尾巴，保证合计精确等于 padFluid
    const fluid = i === padStepCount - 1 ? round4(padFluid - padPer * (padStepCount - 1)) : round4(padPer)
    const rate = rates[i]
    cumFluidTotal += fluid
    pushRow({
      stage: i === 0 ? '前置液' : '',
      stageGroup: '前置液',
      fluid,
      ratio: null, conc: null, sand: null, cumSand: null,
      liquidVol: fluid,
      rate,
      minutes: round2(fluid / rate),
      note: '活性水',
      proppant: '',
      kind: 'pad'
    })
  }

  // ---- ③ 携砂液（按砂比阶梯逐级加砂）----
  const carryPer = carryStepCount > 0 ? carryFluid / carryStepCount : 0
  for (let i = 0; i < carryStepCount; i++) {
    const fluid = i === carryStepCount - 1
      ? round4(carryFluid - carryPer * (carryStepCount - 1))
      : round4(carryPer)
    const ratio = ladder[i]
    const sand = fluid * ratio / 100
    const liquidVol = fluid + sand * SAND_LIQUID_RATIO
    const rate = rates[padStepCount + i]
    cumSand += sand
    cumFluidTotal += fluid
    pushRow({
      stage: i === 0 ? '携砂液' : '',
      stageGroup: '携砂液',
      fluid,
      ratio,
      conc: round1(ratio * SAND_CONC_COEF),
      sand: round2(sand),
      cumSand: round2(cumSand),
      liquidVol: round2(liquidVol),
      rate,
      minutes: round2(liquidVol / rate),
      note: '活性水',
      proppant,
      kind: 'carry'
    })
  }

  // ---- ④ 顶替液（无砂，按桥塞深度折算套管容积）----
  // ⚠️ 深度为 0 时公式退化成「只有 2 m³ 附加余量」，这不是合法工程值。
  //    真实表该井顶替液 27.89 m³（≈2130m 桥塞深度），必须提示用户补深度。
  if (plugDepth <= 0) {
    warnings.push('桥塞深度未填，顶替液只算出了 2 m³ 附加余量。请填深度或先在射孔页做分段方案，否则顶替液不可用。')
  }
  const flush = round2(plugDepth * CASING_VOLUME_PER_M / 1000 + FLUSH_EXTRA)

  pushRow({
    stage: '顶替液',
    stageGroup: '顶替液',
    fluid: flush, ratio: null, conc: null, sand: null,
    cumSand: round2(cumSand),
    liquidVol: flush,
    rate: maxRate,
    minutes: round2(flush / maxRate),
    note: '活性水',
    proppant: '',
    kind: 'flush'
  })
  cumFluidTotal += flush
  // ---- ⑤ 合计 ----
  const sumFluid = rows.reduce((s, r) => s + (Number(r.fluid) || 0), 0)
  const sumLiquidVol = rows.reduce((s, r) => s + (Number(r.liquidVol) || 0), 0)
  const sumMinutes = rows.reduce((s, r) => s + (Number(r.minutes) || 0), 0)

  return {
    rows,
    warnings,
    summary: {
      // 总计（不含送塞送球）—— 与真实表一致，扣掉 plug/ball 两行
      totalFluid: round2(rows
        .filter(r => r.kind !== 'plug' && r.kind !== 'ball')
        .reduce((s, r) => s + (Number(r.fluid) || 0), 0)),
      totalSand: round2(cumSand),
      totalLiquidVol: round2(sumLiquidVol),
      totalMinutes: round2(sumMinutes),
      maxRate,
      maxRatio,
      padTotal: round2(padFluid),
      carryTotal: round2(carryFluid),
      flush
    }
  }
}

function round1(v) { return Math.round(v * 10) / 10 }
function round2(v) { return Math.round(v * 100) / 100 }
function round4(v) { return Math.round(v * 10000) / 10000 }

/**
 * 按段数批量生成（多段井每段一张表）。
 * 段与段之间默认同参数，可由调用方传 stages 覆盖。
 *
 * @param {Object} base buildPumpStage 的参数
 * @param {Number} stageCount 段数
 * @returns {Array<{stageNo:Number, rows:Array, summary:Object}>}
 */
export function buildAllStages(base, stageCount) {
  const n = Math.max(1, Math.round(stageCount || 1))
  const out = []
  for (let i = 1; i <= n; i++) {
    const res = buildPumpStage(Object.assign({}, base, {
      // 只有首段带泵送桥塞（真实表如此：后续段直接从前置液开始）
      withPlug: i === 1
    }))
    out.push({ stageNo: i, rows: res.rows, summary: res.summary, warnings: res.warnings })
  }
  return out
}

/* ============================================================
 *  引用段（「本段泵注程序同第 N 段」）
 *
 *  工程背景：12 段井里各段的前置液/携砂液往往完全一样，只有桥塞深度不同。
 *  文档里写成「3、第三段（桥塞位置1747m）、第七段（1340m）… 泵注程序同第二段，
 *  按深度减少相应顶替量。」—— 所以「复制」复制的是除顶替液之外的部分，
 *  顶替液必须按本段自己的桥塞深度重算。
 * ============================================================ */

/** 靠井口那一行，永远跟着本段桥塞深度走，不参与复制 */
const FLUSH_KIND = 'flush'

/**
 * 取某段可被复制的「主体行」（去掉顶替液）。
 *
 * 为什么去掉顶替液：
 *   顶替液 = 桥塞深度 × 12.15/1000 + 2，深度是段级的，复制过来一定是错的。
 *   泵送桥塞 / 送球液也保留 —— 但只有首段有，引用段本来就从第 1 段之后开始，
 *   若用户让第 5 段引用第 1 段，那两行也会一并复制（工程上少见，但语义自洽）。
 *
 * @param {Array} rows 源段的行
 * @returns {Array}
 */
export function bodyRowsOf(rows) {
  return (rows || []).filter(r => r && r.kind !== FLUSH_KIND)
}

/**
 * 按本段桥塞深度生成顶替液行。
 *
 * @param {Number} plugDepth 本段桥塞深度 m
 * @param {Number} maxRate   排量（顶替液按最高排量注入）
 * @param {Number} cumSand   本段累积砂量，顶替液行要沿用
 * @returns {Object}
 */
export function buildFlushRow(plugDepth, maxRate, cumSand) {
  const depth = Math.max(0, Number(plugDepth) || 0)
  const rate = Math.max(1, Number(maxRate) || 12)
  const flush = round2(depth * CASING_VOLUME_PER_M / 1000 + FLUSH_EXTRA)
  return {
    stage: '顶替液',
    stageGroup: '顶替液',
    fluid: flush,
    ratio: null,
    conc: null,
    sand: null,
    cumSand: cumSand == null ? null : round2(cumSand),
    liquidVol: flush,
    rate,
    minutes: round2(flush / rate),
    note: '活性水',
    proppant: '',
    kind: 'flush'
  }
}

/**
 * 把源段的行「套用」到目标段：主体行照搬，顶替液按目标段桥塞深度重算，行号重排。
 *
 * ⚠️ 必须深拷贝：直接返回源段对象的引用会让两段的单元格编辑互相污染
 *    （改第 2 段的一格，第 7 段跟着变，用户会以为页面串数据了）。
 *
 * @param {Array}  srcRows   源段行
 * @param {Object} opt       { plugDepth, maxRate }
 * @returns {Array}
 */
export function cloneStageRows(srcRows, opt) {
  const o = opt || {}
  const body = bodyRowsOf(srcRows)
  const cum = body.length ? body[body.length - 1].cumSand : null
  const out = body.map(r => Object.assign({}, r))
  out.push(buildFlushRow(o.plugDepth, o.maxRate, cum))
  out.forEach((r, i) => { r.no = i + 1 })
  return out
}

/**
 * 把「段配置」编译成可以渲染的段列表。
 *
 * 段配置由调用方给（通常是页面上那张段签表），每段形如
 *   { stageNo, refStageNo, plugDepth }
 * 语义：
 *   refStageNo 为空  → 本段自带明细（params 按公式生成，或从已保存版本还原）
 *   refStageNo 有值  → 明细来自第 refStageNo 段，顶替液按本段 plugDepth 重算
 *
 * 引用可以链式指向另一个引用段（第 7 段引用第 3 段、第 3 段又引用第 2 段），
 * 所以解析时要一路回溯到真正带数据的那一段，并防成环。
 *
 * @param {Array}  stageDefs 段配置数组
 * @param {Object} params    生成参数（maxRate/padFluid/carryFluid/maxRatio/proppant）
 * @param {Object} ownRows   自带明细：{ [stageNo]: rows }
 * @returns {Array<{stageNo, refStageNo, plugDepth, rows, summary, warnings, resolvedFrom}>}
 */
export function buildStagesWithRefs(stageDefs, params, ownRows) {
  const defs = (stageDefs || []).slice().sort((a, b) => Number(a.stageNo) - Number(b.stageNo))
  const defByNo = {}
  defs.forEach(d => { defByNo[Number(d.stageNo)] = d })

  /** 解析某段的「真实数据来源段号」；返回 null 表示本段自带数据 */
  const resolveSource = (d) => {
    let cur = d
    const seen = {}
    while (cur && cur.refStageNo != null && cur.refStageNo !== '') {
      const key = Number(cur.stageNo)
      if (seen[key]) return null          // 成环 → 退化成本段自带，避免死循环
      seen[key] = true
      const next = defByNo[Number(cur.refStageNo)]
      if (!next) return null              // 指向不存在的段 → 退化
      cur = next
    }
    return cur === d ? null : cur
  }

  const out = defs.map(d => {
    const stageNo = Number(d.stageNo)
    const plugDepth = Number(d.plugDepth) || 0
    const src = resolveSource(d)

    let rows
    if (src) {
      // 引用段：拿源段的明细，顶替液按本段深度重算
      const srcOwn = (ownRows && ownRows[Number(src.stageNo)]) || null
      if (srcOwn && srcOwn.length) {
        rows = cloneStageRows(srcOwn, { plugDepth, maxRate: params.maxRate })
      } else {
        // 源段自己还没数据 → 本段也没得引用，留空等用户上传
        rows = []
      }
    } else if (ownRows && ownRows[stageNo] && ownRows[stageNo].length) {
      // 自带明细（从已保存版本还原 / 上传表还原）：原样用，只把顶替液按本段深度对齐
      rows = ownRows[stageNo].map(r => Object.assign({}, r))
    } else {
      /*
       * 既没有上传数据、也没有已保存版本 → **不自动生成占位数据**。
       *
       * 页面已移除「生成参数」，公式派生的前提（前置液/携砂液总液量、最高排量）
       * 用户再也无法在界面上确认，继续按默认值生成会得到一串不知道从哪来的数字，
       * 比空表更危险。明确留空 + 页面提示「上传 Excel 覆盖本段」，让数据来源唯一。
       */
      rows = []
    }

    const warnings = []
    // 没有明细时优先提示「去上传」，深度告警只在有数据时才有意义
    if (!rows.length) {
      warnings.push(src
        ? '第 ' + stageNo + ' 段引用第 ' + src.stageNo + ' 段，但第 ' + src.stageNo
          + ' 段还没有数据，请先给第 ' + src.stageNo + ' 段上传泵注表。'
        : '第 ' + stageNo + ' 段还没有数据，请点「上传覆盖本段」导入这一段的泵注表。')
    } else if (plugDepth <= 0) {
      // 第 1 段本来就没有「泵送桥塞」这道工序（射孔方案的首段也不会给封隔器位置），
      // 拿「桥塞深度未填」去告警会让人以为是漏填、甚至去找一个不存在的字段。
      warnings.push(stageNo === 1
        ? '第 1 段是首段，没有泵送桥塞工序，无需桥塞深度；顶替液按附加余量 '
          + FLUSH_EXTRA + ' m³ 计。'
        : '第 ' + stageNo + ' 段桥塞深度未填，顶替液只算出了 '
          + FLUSH_EXTRA + ' m³ 附加余量，不可用于施工。')
    }
    return {
      stageNo,
      refStageNo: d.refStageNo == null || d.refStageNo === '' ? null : Number(d.refStageNo),
      plugDepth,
      startDepth: d.startDepth == null ? null : Number(d.startDepth),
      endDepth: d.endDepth == null ? null : Number(d.endDepth),
      /** 实际取数的源段号（引用链解析后的终点），用于页面提示与报告合并 */
      resolvedFrom: src ? Number(src.stageNo) : null,
      rows,
      summary: summarizeRows(rows),
      warnings
    }
  })
  return out
}

/** 统一口径的段合计（引用段与非引用段都走这个，避免两套算法对不上） */
export function summarizeRows(rows) {
  const list = rows || []
  const notHead = list.filter(r => r.kind !== 'plug' && r.kind !== 'ball')
  const sum = k => list.reduce((s, r) => s + (Number(r[k]) || 0), 0)
  const maxOf = k => Math.max.apply(null, [0].concat(list.map(r => Number(r[k]) || 0)))
  return {
    totalFluid: round2(notHead.reduce((s, r) => s + (Number(r.fluid) || 0), 0)),
    totalSand: round2(sum('sand')),
    totalLiquidVol: round2(sum('liquidVol')),
    totalMinutes: round2(sum('minutes')),
    maxRate: maxOf('rate'),
    maxRatio: maxOf('ratio'),
    flush: round2(list.filter(r => r.kind === 'flush')
      .reduce((s, r) => s + (Number(r.fluid) || 0), 0))
  }
}

/**
 * 泵注表列定义（主形态，396/522 张表一致）。
 * 变体（自悬浮 / 伴氮 / 综合砂比）见规则文档，按需扩展。
 */
export const PUMP_COLUMNS = [
  { prop: 'no', label: '序号', width: 56, align: 'center', editable: false },
  { prop: 'stage', label: '阶段', width: 96, align: 'center', editable: false },
  { prop: 'fluid', label: '净液量(m³)', width: 98, align: 'right', editable: true, type: 'number' },
  { prop: 'conc', label: '砂浓度(kg/m³)', width: 112, align: 'right', editable: false },
  { prop: 'ratio', label: '砂比(%)', width: 84, align: 'right', editable: true, type: 'number' },
  { prop: 'sand', label: '砂量(m³)', width: 92, align: 'right', editable: false },
  { prop: 'cumSand', label: '累积砂量(m³)', width: 108, align: 'right', editable: false },
  { prop: 'liquidVol', label: '砂液量(m³)', width: 100, align: 'right', editable: false },
  { prop: 'rate', label: '排量(m³/min)', width: 108, align: 'right', editable: true, type: 'number' },
  { prop: 'minutes', label: '阶段时间(min)', width: 112, align: 'right', editable: false },
  { prop: 'note', label: '备注', minWidth: 110, editable: true, type: 'text' },
  { prop: 'proppant', label: '支撑剂', minWidth: 130, editable: true, type: 'text' }
]
