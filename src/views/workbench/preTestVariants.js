/**
 * 压前测试（小压测试）泵注程序 · 内置模板档位
 *
 * 单一数据源：工作台「泵注程序」模块的勾选/预览、压裂智能体页的档位选择，
 * 都从这里读，避免两处各存一份数值最后对不上。
 *
 * 数值必须与后端 `fracturing-agent-spec.json → preTestProgram.variants` 保持一致。
 * 前端这份只用于「勾选 + 预览 + 摘要」，真正写进文档的表格由后端按所选档位渲染。
 *
 * 数据来源：《小压测试.xlsx》的 12方 / 15方 两个工作表。
 * 归属章节：工程设计文档「六、压前测试（小压测试）泵注程序」整节。
 */

/** 表格列定义（预览与文档表格同序） */
export const PRETEST_COLUMNS = [
  { key: 'no', label: '序号', width: 60 },
  { key: 'stage', label: '阶段', width: 110 },
  { key: 'sub', label: '子阶段', width: 100 },
  { key: 'fluid', label: '净液量(m³)', width: 100 },
  { key: 'rate', label: '套管排量(m³/min)', width: 130 },
  { key: 'minutes', label: '阶段时间(min)', width: 110 },
  { key: 'liquid', label: '压裂液', width: 90 }
]

export const PRETEST_VARIANTS = [
  {
    key: '12方',
    label: '12方',
    /** 最高排量 m³/min */
    maxRate: 12,
    /** 合计净液量 m³ */
    totalFluid: 100,
    /** 合计时间 min */
    totalTime: 81,
    desc: '8 级阶梯升排量 + 稳定排量 + 5 级阶梯降排量 + 测压降',
    rows: [
      { no: 1, stage: '阶梯升排量', sub: '阶段1', fluid: 2, rate: 1, minutes: 2, liquid: '活性水' },
      { no: 2, stage: '', sub: '阶段2', fluid: 4, rate: 2, minutes: 2, liquid: '活性水' },
      { no: 3, stage: '', sub: '阶段3', fluid: 6, rate: 3, minutes: 2, liquid: '活性水' },
      { no: 4, stage: '', sub: '阶段4', fluid: 4, rate: 4, minutes: 1, liquid: '活性水' },
      { no: 5, stage: '', sub: '阶段5', fluid: 5, rate: 5, minutes: 1, liquid: '活性水' },
      { no: 6, stage: '', sub: '阶段6', fluid: 6, rate: 6, minutes: 1, liquid: '活性水' },
      { no: 7, stage: '', sub: '阶段7', fluid: 8, rate: 8, minutes: 1, liquid: '活性水' },
      { no: 8, stage: '', sub: '阶段8', fluid: 10, rate: 10, minutes: 1, liquid: '活性水' },
      { no: 9, stage: '稳定排量', sub: '稳定阶段', fluid: 36, rate: 12, minutes: 3, liquid: '活性水' },
      { no: 10, stage: '阶梯降排量', sub: '阶段1', fluid: 5, rate: 10, minutes: 0.5, liquid: '活性水' },
      { no: 11, stage: '', sub: '阶段2', fluid: 4, rate: 8, minutes: 0.5, liquid: '活性水' },
      { no: 12, stage: '', sub: '阶段3', fluid: 3, rate: 6, minutes: 0.5, liquid: '活性水' },
      { no: 13, stage: '', sub: '阶段4', fluid: 2, rate: 4, minutes: 0.5, liquid: '活性水' },
      { no: 14, stage: '', sub: '阶段5', fluid: 5, rate: 1, minutes: 5, liquid: '活性水' },
      { no: 15, stage: '测压降', sub: '', fluid: null, rate: null, minutes: 60, liquid: '' }
    ]
  },
  {
    key: '15方',
    label: '15方',
    maxRate: 15,
    totalFluid: 108,
    totalTime: 80,
    desc: '7 级阶梯升排量 + 稳定排量 + 5 级阶梯降排量 + 测压降',
    rows: [
      { no: 1, stage: '阶梯升排量', sub: '阶段1', fluid: 2, rate: 1, minutes: 2, liquid: '活性水' },
      { no: 2, stage: '', sub: '阶段2', fluid: 4, rate: 2, minutes: 2, liquid: '活性水' },
      { no: 3, stage: '', sub: '阶段3', fluid: 6, rate: 3, minutes: 2, liquid: '活性水' },
      { no: 4, stage: '', sub: '阶段4', fluid: 4, rate: 4, minutes: 1, liquid: '活性水' },
      { no: 5, stage: '', sub: '阶段5', fluid: 6, rate: 6, minutes: 1, liquid: '活性水' },
      { no: 6, stage: '', sub: '阶段6', fluid: 9, rate: 9, minutes: 1, liquid: '活性水' },
      { no: 7, stage: '', sub: '阶段7', fluid: 12, rate: 12, minutes: 1, liquid: '活性水' },
      { no: 8, stage: '稳定排量', sub: '稳定阶段', fluid: 45, rate: 15, minutes: 3, liquid: '活性水' },
      { no: 9, stage: '阶梯降排量', sub: '阶段1', fluid: 6, rate: 12, minutes: 0.5, liquid: '活性水' },
      { no: 10, stage: '', sub: '阶段2', fluid: 4.5, rate: 9, minutes: 0.5, liquid: '活性水' },
      { no: 11, stage: '', sub: '阶段3', fluid: 3, rate: 6, minutes: 0.5, liquid: '活性水' },
      { no: 12, stage: '', sub: '阶段4', fluid: 1.5, rate: 3, minutes: 0.5, liquid: '活性水' },
      { no: 13, stage: '', sub: '阶段5', fluid: 5, rate: 1, minutes: 5, liquid: '活性水' },
      { no: 14, stage: '测压降', sub: '', fluid: null, rate: null, minutes: 60, liquid: '' }
    ]
  }
]

/** 默认档位 */
export const PRETEST_DEFAULT = '12方'

/**
 * 档位在 localStorage 中的 key（按井区分）。
 *
 * 选择属于「这口井这次要用哪套模板」，不是登录态，也不该进 sessionStorage
 * （刷新页面就丢，用户会以为没保存）。用 localStorage + 井 ID 隔离。
 */
export const PRETEST_STORAGE_PREFIX = 'preTestVariant:'

/** 读取某口井已选的档位，未选过返回默认档 */
export function loadPreTestVariant(wbWellId) {
  if (!wbWellId) return PRETEST_DEFAULT
  try {
    const v = window.localStorage.getItem(PRETEST_STORAGE_PREFIX + wbWellId)
    if (v && PRETEST_VARIANTS.some(x => x.key === v)) return v
  } catch (e) {
    /* localStorage 不可用时静默回落默认档 */
  }
  return PRETEST_DEFAULT
}

/** 保存某口井选择的档位 */
export function savePreTestVariant(wbWellId, variant) {
  if (!wbWellId || !variant) return
  try {
    window.localStorage.setItem(PRETEST_STORAGE_PREFIX + wbWellId, variant)
  } catch (e) {
    /* 忽略写入失败（隐私模式等），不影响本次生成 */
  }
}

/** 按 key 取档位数据 */
export function getPreTestVariant(key) {
  return PRETEST_VARIANTS.find(v => v.key === key) || null
}

/** 数值格式化：整数不带小数点，空值显示 - */
export function fmtCell(v) {
  if (v === null || v === undefined || v === '') return '-'
  if (typeof v !== 'number') return String(v)
  return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(v)
}
