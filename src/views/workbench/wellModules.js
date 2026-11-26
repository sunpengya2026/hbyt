/**
 * 单井工作台 · 功能模块配置
 *
 * 每个模块对应压裂工程设计文档的一组章节来源，模块内收集完数据即可支撑对应章节生成。
 *
 * 数据结构：
 *   key         模块唯一标识（与后端 docType / attachmentType 对应）
 *   title       模块标题
 *   icon        ElementUI 图标
 *   purpose     这个模块在生成文档时的作用（给用户看的）
 *   docType     存入文档中心 COMM_WB_WELL_DOC.DOC_TYPE
 *   sections    该模块支撑的工程设计方案章节（材料驱动，需要有数据才能填）
 *   autoSections 无需本模块材料、由系统模板 / 常量自动生成的章节
 *               （卡片上单独一行灰字展示，避免用户以为这些章节漏了）
 *   inputs[]    需要收集的材料
 *     - key       附件类型编码（attachmentType / SPEC 时用文件槽位）
 *     - label     显示名
 *     - accept    允许的扩展名（字符串，与 el-upload accept 一致）
 *     - required  是否必需
 *     - desc      格式要求说明（如「需含 MD 列和 MSE 值列」）
 *     - note      额外提示
 *
 * ⚠️ sections / autoSections 里的章节名必须与后端模板严格一致，权威源两处：
 *    后端 resources/agent/fracturing-agent-spec.json（生成用）
 *    后端 resources/doc-template-default.json（导出目录用）
 *    两份都是 11 个一级章节（三份《压裂工程设计》模板逐段核对过，都是 11 章）：
 *      封面 / 一 基本数据 / 二 设计依据 / 三 压裂工程设计方案 / 四 压裂前各项准备 /
 *      五 压裂施工步骤 / 六 施工泵注程序 / 七 压裂、射孔后施工步骤 /
 *      八 施工注意事项 / 九 附图及附表 / 十 设计执行的标准、规定和规程 / 十一 压裂液检测指标
 *    2026-11-08 修：「六、施工泵注程序」是一章两块（小压测试表 + 各段主压裂泵注表），
 *    曾经被拆成「六 压前测试」+「七 各级施工主压裂泵注程序设计」两章，导致六之后章号整体 +1。
 */

export const MODULES = [
  {
    key: 'base',
    title: '基础资料',
    icon: 'el-icon-document',
    purpose: '提供封面、基本数据表、套管数据、压裂层段范围，以及本区块渗透率 / 邻井压裂及排采 / 历史措施 / 效果预测（第一章 3~6 节）与压裂目的、设计依据（第二章），是整份设计文档的地基。',
    docType: 'GEOLOGICAL_DESIGN',
    /**
     * 全部由「压裂地质设计文档」里抽出来的章节。
     *
     * 为什么第二章也算这里：spec 里 fracPurposeText / designBasisText 两个字段
     * 的 SOURCE_SECTION 指向地质设计「历史措施及本次改造的目的、依据、效果预测、
     * 压裂工艺建议」的第 5 章子节（2）改造目的 / 3）改造依据，
     * 和第一章 3~6 节是同一份源文档、同一套抽取机制。
     * 2026-11-05 之前这里只写了封面/一/三.1，用户看不到第二章的去处。
     */
    sections: [
      '封面',
      '一 基本数据',
      '二 设计依据',
      '三.1 压裂层段'
    ],
    /** 一 1~2 节的表数据同样抽自地质设计；本模块不额外要材料，但已在 sections 覆盖 */
    autoSections: [],
    // 地质设计文档不在本模块上传：它由「输出与归档 → 设计文档（文档中心）」统一管理，
    // 避免同一份文件出现两个上传入口。此处只登记该必需项，进度统计仍按文档中心
    // GEOLOGICAL_DESIGN 记录数计算（见 well-workbench.vue 的 moduleStatus）。
    docCenterRequired: {
      docType: 'GEOLOGICAL_DESIGN',
      label: '压裂地质设计文档',
      desc: '必须含「压裂点参数表」（分段 / 簇号 / MD / TVD 等列），用于提取段簇结构与基本数据表',
      hint: '在页面底部「输出与归档 → 设计文档」中上传或选择'
    },
    inputs: [
      {
        key: 'SOURCE_GEODESIGN',
        label: '邻井地质设计（可多份）',
        accept: '.doc,.docx',
        required: false,
        desc: '用于「本区块渗透率」「邻井压裂及排采情况」「历史措施情况」等章节的参考',
        roles: ['NEIGHBOR_GEOLOGICAL']
      },
      {
        key: 'SOURCE_ENGDESIGN',
        label: '邻井工程设计（可多份）',
        accept: '.doc,.docx',
        required: false,
        desc: '用于借鉴施工参数、泵注程序、液体体系等',
        roles: ['NEIGHBOR_ENGINEERING']
      }
    ]
  },
  {
    key: 'perforation',
    title: '分段射孔方案',
    icon: 'el-icon-s-grid',
    purpose:
      '以地质设计压裂点参数表为初始点位，结合 MSE 曲线与全烃值优化簇顶深，再与套管接箍避让 ≥2m 生成封隔器位置，最终产出「分段射孔方案表」与「煤岩破碎指数表」。',
    docType: 'OTHER',
    /**
     * 三.1（1）（2）由本模块材料算出。
     * 四（一）作业队负责虽然正文是模板制式，但里面要填「射孔位置」，
     * 数据来自 MD_RANGES 字段（按射孔方案的分段区间汇总），所以归到这里。
     */
    sections: [
      '三.1（1）分段射孔方案',
      '三.1（2）计算煤岩破碎指数',
      '四（一）作业队负责（射孔位置）'
    ],
    /**
     * 卡片头部扩展按钮：材料收齐后可直接进射孔方案页调整参数。
     *
     * 为什么放在这里而不是页面顶部：射孔方案要用到 MSE / 套管接箍 / 全烃值三份材料，
     * 用户在这个卡片上刚传完就能就地进入，不用滚回页头找入口。
     * 未收齐时按钮置灰，悬停提示还差哪几项（见 WellModuleCard 的 actionDisabledTip）。
     */
    action: {
      key: 'go-perforation',
      label: '进入射孔方案',
      icon: 'el-icon-s-grid',
      /** 必需项收齐才可点（MSE / 套管接箍 / 全烃值，伽马曲线选填） */
      needAll: true,
      tip: '先上传 MSE 曲线、套管接箍数据、全烃值数据，收齐后即可进入射孔方案调整'
    },
    inputs: [
      {
        key: 'MSE',
        label: '机械比能曲线（MSE）',
        accept: '.xls,.xlsx,.doc,.docx',
        required: true,
        desc: '需含 MD 列与 MSE 值列；用于优选 MSE ≤ 阈值的点位',
        note: '阈值默认 10，可在射孔方案页调整'
      },
      {
        key: 'CASING_COLLAR',
        label: '套管接箍数据',
        accept: '.xls,.xlsx,.doc,.docx',
        required: true,
        desc: '需含深度列；簇顶深 / 底深 / 封隔器位置均需与其间隔 ≥2m',
        note: '避让距离默认 2m，可在射孔方案页调整'
      },
      {
        key: 'TOTAL_HC',
        label: '全烃值数据',
        accept: '.xls,.xlsx,.doc,.docx,.pdf',
        required: true,
        desc: '需含 MD 列与全烃值列；用于在 ±5m 浮动范围内优选高值点位'
      },
      {
        key: 'GAMMA',
        label: '伽马曲线',
        accept: '.xls,.xlsx,.csv',
        required: false,
        desc: '需含 MD 列与 GR 值列；可选，辅助判断岩性'
      }
    ]
  },
  {
    key: 'pump',
    title: '泵注程序',
    icon: 'el-icon-s-marketing',
    purpose:
      '一类是压前测试（系统内置 2 套模板，选模板即可）；另一类是正式压裂泵注程序，在泵注程序功能页上传或填写后保存，这里可直接查看并下载。泵注程序里的桥塞位置即分段射孔方案中的封隔器位置。',
    docType: 'OTHER',
    /**
     * ⚠️ 编号以模板为准：
     *   六 = 施工泵注程序  ← 一章两块：小压测试表（内置 2 套档位模板）+ 各段主压裂泵注表（上传/编写）
     * 2026-11-08 修：三份《压裂工程设计》模板都是 11 章，「六、施工泵注程序」内部
     *   才是「小压表 → 各段主压裂表」。此前拆成「六 压前测试」+「七 主压裂设计」
     *   两章，会让六之后所有章号整体 +1（模板的「七、压裂、射孔后施工步骤」印成「八、」）。
     *
     * 2026-11-11 改：正式泵注表不再由用户上传，改为从工程设计文档第六章按段直读预览。
     */
    sections: [
      '六 施工泵注程序'
    ],
    /**
     * 卡片头部扩展按钮：进入泵注程序编写页。
     *
     * 为什么不设 needAll：泵注表的全部数值由 7 个参数（段数/最高排量/前置液/携砂液/
     * 最高砂比/桥塞深度/支撑剂）公式派生，不依赖任何已上传材料，
     * 空手也能进去先把参数配好。桥塞深度会自动从分段射孔方案带入。
     */
    action: {
      key: 'go-pump',
      label: '进入泵注程序',
      icon: 'el-icon-edit-outline',
      needAll: false,
      tip: '进入后填 7 个参数，砂比阶梯与砂量/砂液量/时间自动算；也可逐格手动覆盖'
    },
    inputs: [
      {
        key: 'PUMP_PRETEST',
        label: '压前测试泵注程序',
        accept: '.xls,.xlsx',
        required: false,
        desc: '两个内置模板可二选一，也可上传自有表格覆盖',
        note: '内置模板：①阶梯升排量 ②单台阶升排量',
        /**
         * 内置模板档位选择 + 表格预览。
         *
         * 标记为 variant 的输入项不渲染上传按钮，改为渲染「档位勾选 + 预览表格」：
         * 用户在这里勾选 12方 / 15方 并直接看到泵注程序全表，
         * 选择结果按井存 localStorage，进入压裂智能体时自动带入。
         * 数据源见 preTestVariants.js。
         */
        variant: 'PRETEST',
        /** 该选项写入文档的章节（页面上要明示，用户才知道选了会落在哪） */
        targetSection: '六、施工泵注程序'
      },
      {
        key: 'PUMP_MAIN',
        label: '正式压裂泵注程序结果表',
        required: false,
        desc: '读取泵注程序功能页已保存的版本，支持按段预览与下载 Excel',
        note: '上传/编辑请点「进入泵注程序」；桥塞位置需与分段射孔方案的封隔器位置一致',
        /**
         * 只读：展示 + 下载，不再是上传入口。
         *
         * <p>数据源是**泵注程序功能页保存的那一版**（COMM_WB_PUMP_TABLE / COMM_WB_PUMP_ROW），
         * 也就是用户自己上传 Excel 或逐格填写后点保存的结果。
         * 工作台这里只负责「看一眼 + 下载」，所有写入动作都在泵注功能页完成。</p>
         *
         * <p>⚠️ 不要改成读工程设计文档第六章：那是另一条链路（生成出来的报告），
         * 和用户在泵注页确认过的数据可能不一致，用户会分不清哪个才是准的。</p>
         */
        variant: 'DOC_PUMP',
        /** 数据在哪一章（页面上明示，用户才知道这份泵注表最终会落到报告哪里） */
        targetSection: '六、施工泵注程序'
      }
    ]
  },
  {
    key: 'material',
    title: '化工原材料',
    icon: 'el-icon-box',
    purpose:
      '支撑剂建议准备量自动从泵注程序汇总（20-40 目与 40-70 目分别累加）；压裂液配方表按 3 类名称生成并可编辑，数量自动计算：清水量 = Σ净液量 × 110%，氯化钾量 = 清水量 / 1000。',
    docType: 'OTHER',
    /**
     * 化工原材料准备在施工组织上属于「压裂队负责」，
     * 支撑剂建议准备量 / 压裂液配方都写进 四（二）。
     */
    sections: [
      '四（二）压裂队负责（化工原材料准备）'
    ],
    inputs: [
      {
        key: 'FLUID_FORMULA',
        label: '压裂液配方表（可选覆盖）',
        accept: '.xls,.xlsx',
        required: false,
        desc: '上传后按表中 3 类名称与备注生成；不传则使用系统内置配方',
        note: '数量列由系统按泵注程序自动计算，可在生成后手工修正'
      },
      {
        key: 'PROPPANT_SPEC',
        label: '支撑剂制式说明',
        accept: '.doc,.docx,.xls,.xlsx',
        required: false,
        desc: '自悬浮支撑剂等制式内容；不传则使用模板固定制式'
      }
    ]
  },
  {
    key: 'figures',
    title: '附图及附表',
    icon: 'el-icon-picture-outline',
    purpose:
      '附图 1-4（录井综合图 / 导向图 / 构造图 / 井位部署图）从地质设计文档自动抽取；附图 5-6 无数据源，需人工上传或由系统按制式绘制。',
    docType: 'OTHER',
    /**
     * ⚠️ 附图及附表是第九章（第八章是施工注意事项）。
     * 附图 1-4 从地质设计文档按图题抽取（spec 里的 geoFigure → C1），
     * 附图 5-6 需本模块上传或按射孔方式制式生成。
     */
    sections: [
      '九 附图及附表（附图1-4 抽自地质设计，附图5-6 见下方材料）'
    ],
    inputs: [
      {
        key: 'FIG_STRINGS',
        label: '附图5 施工管柱示意图',
        accept: '.jpg,.jpeg,.png,.bmp',
        /*
         * 2026-11-16 改为必填（业务要求）：附图 5、6 两张图没有可自动抽取的数据源，
         * 不传就只能出占位文字，用户拿到 docx 才发现第九章缺图 —— 太晚。
         * 改成必填后，卡片头部直接显示「必需 N/M」，未收齐会拉低资料收集百分比。
         *
         * note 仍保留「不传则按模板生成」这句会对用户产生误导（既然必填就不会走到
         * 那个分支），所以同步改成「按射孔方式自动绘制也需先确认」的口径。
         */
        required: true,
        desc: '人工上传；按射孔方式制式绘制的示意图也需在此确认',
        note: '全程固井 / 半程固井 / 滑套压裂 各对应一套管柱示意图'
      },
      {
        key: 'FIG_SITE',
        label: '附图6 井场布置图',
        accept: '.jpg,.jpeg,.png,.bmp',
        required: true,
        desc: '人工上传；无数据源，必须人工提供',
        note: '建议 300dpi 以上，横向排版'
      },
      {
        key: 'FIG_SOURCE',
        label: '源文档附图（补充）',
        accept: '.jpg,.jpeg,.png,.bmp,.zip',
        required: false,
        desc: '当源文档图片无法自动抽取时，可在此手工补齐'
      }
    ]
  },
  {
    key: 'misc',
    title: '其他补充材料',
    icon: 'el-icon-files',
    purpose:
      '施工管柱 / 注入方式 / 压裂井口按模板固定生成；井控要求中的地面环境条件、文档编号与日期由系统按规则自动生成，无需上传。',
    docType: 'OTHER',
    /**
     * 三.2/3/4 施工管柱、注入方式、压裂井口 → 模板制式，随射孔方式切换。
     * 九.4 井控要求 → wellControlText 字段，从地质设计「井控提示」抽取，
     *              本模块的「井控 / 地面环境资料」是它的补充来源。
     */
    sections: [
      '三.2 施工管柱',
      '三.3 注入方式',
      '三.4 压裂井口',
      // 施工注意事项现在也归到自动生成（本模块集中说明）
      '八.4 井控要求'
    ],
    /**
     * 剩余无需任何材料、由模板 / 常量 / 规则自动生成的章节。
     *
     * 放在「其他补充材料」这一张卡片上集中说明，而不是每个模块都重复一遍，
     * 否则 6 张卡都挂着同样的「五/八/十一/十二」，用户反而看不出哪个模块管什么。
     * 这里是 11 章「全覆盖」的兜底：只要不在这张列表、也不在任何模块 sections 里，
     * 就说明映射漏了（可用 tmp/check_sections.js 校验）。
     */
    autoSections: [
      '四（二）压裂队负责（除化工原材料部分）',
      '四（三）山西煤层气公司负责',
      '五 压裂施工步骤',
      '七 压裂、射孔后施工步骤',
      '八.1~8.3 安全 / 环保及质量 / 安全预案',
      '十 设计执行的标准、规定和规程',
      '十一 压裂液检测指标'
    ],
    inputs: [
      {
        key: 'WELL_CONTROL',
        label: '井控 / 地面环境资料',
        accept: '.doc,.docx,.xls,.xlsx,.pdf',
        required: false,
        desc: '地面环境条件、周边敏感目标等；不传则由大模型根据区块信息生成提示'
      },
      {
        key: 'OTHER',
        label: '其他过程材料',
        accept: '.doc,.docx,.xls,.xlsx,.pdf,.txt,.csv',
        required: false,
        desc: '无法归类但生成时可能需要参考的材料'
      }
    ]
  }
]

/** 模块 key → 配置 */
export const MODULE_MAP = MODULES.reduce((acc, m) => {
  acc[m.key] = m
  return acc
}, {})

/**
 * 资料收集进度（0~100，整数）。
 *
 * <p><b>为什么抽成公共函数</b>：井号列表（`workbench/index.vue`）和单井工作台
 * （`workbench/well-workbench.vue`）都要显示这个百分比。两处各写一遍必然跑偏 ——
 * 工作台那边算的是「模块内必需项 got/need」，列表这边是「整口井的必需项」，
 * 只要有一处漏了 `docCenterRequired`，同一口井就会在两个页面显示不同数字。
 *
 * <p><b>分母只有必需项</b>：可选项（邻井地质设计、伽马曲线、压裂液配方覆盖…）
 * 传了不加分，不传也不扣分。用户看到的「资料已收集 60%」必须对应
 * 「还差哪几份必需材料」，掺入可选项会让百分比永远到不了 100。
 *
 * <p><b>`docCenterRequired` 要计入分母</b>：基础资料的「压裂地质设计文档」不在附件表里，
 * 由文档中心（`DOC_TYPE='GEOLOGICAL_DESIGN'`）统一管理。漏掉它 → 一口只传了地质设计的井
 * 会算成 0%，用户以为白传了。
 *
 * @param {Object} opts
 * @param {String[]} [opts.attachmentTypes] 该井已有附件的类型编码列表（大小写不敏感）
 * @param {Number}   [opts.geoDocCount]     该井地质设计文档份数
 * @returns {{percent: Number, got: Number, need: Number, lack: String[]}}
 *          `lack` 是还缺的必需材料**中文名**，直接给 tooltip 用
 */
export function collectProgress({ attachmentTypes, geoDocCount } = {}) {
  const have = {}
  ;(attachmentTypes || []).forEach(t => {
    if (t != null) have[String(t).toUpperCase()] = true
  })
  const geo = Number(geoDocCount) || 0

  let got = 0
  let need = 0
  const lack = []
  MODULES.forEach(m => {
    ;(m.inputs || []).forEach(inp => {
      if (!inp.required) return
      need += 1
      if (have[String(inp.key).toUpperCase()]) got += 1
      // 报中文名而不是 key：tooltip 是给业务看的，写 MSE / CASING_COLLAR 没人认得
      else lack.push(inp.label)
    })
    if (m.docCenterRequired) {
      need += 1
      if (geo > 0) got += 1
      else lack.push(m.docCenterRequired.label)
    }
  })

  return {
    percent: need ? Math.round((got / need) * 100) : 0,
    got,
    need,
    lack
  }
}

/**
 * 生成文档时由后端自动套用的制式规则（给用户看的说明，弹窗「生成规则」的数据源）。
 *
 * ⚠️ 这里只放「代码里真的这么做」的规则，不放需求文档的说法：
 *    - 已删除「文档编号 CMY-{年份}-{4位流水号}」——后端 spec 里 header 硬编码
 *      `XXXX年压裂工程设计 № CMY-25-`，4 位流水号没有任何生成逻辑（查遍 src/ 与 sql/
 *      无 SEQUENCE / 流水表），写出来等于承诺一个不存在的功能。
 *    - 规则项若日后在代码里落地了，再把对应条目加回来。
 */
export const GENERATION_RULES = [
  { label: '模板 × 射孔方式', value: '全程固井 / 半程固井 / 滑套压裂 各一套模板，章节结构一致、制式内容不同' },
  { label: '文档标题', value: '井号 + 井压裂工程设计，取当前井号自动拼接' },
  { label: '封面日期', value: '取文档生成当日日期（中文年月日）' },
  { label: '簇顶深', value: '以地质设计压裂点表为初值，在 ±5m 内取 MSE ≤ 10 的点；同条件优先全烃值高者，并按全烃降序逐个校验套管接箍（顶、底各自距最近接箍 ≥ 2m），取第一个满足的点，结果取整数米' },
  { label: '簇底深', value: '不分簇按 2m、分簇按 1m 厚度由簇顶深向下推算，并同样满足距最近接箍 ≥ 2m；不满足则换下一个候选簇顶深，直至顶底都满足，结果取整数米' },
  { label: '封隔器位置', value: '簇顶深 + 20 取整为初始位置；在套管接箍数据中取夹住该位置的上下两个接箍，与两侧距离均需 ≥ 2m，不满足则在夹持区间内按 1m 步进调整' },
  { label: '套管接箍位置', value: '取夹住封隔器位置的上、下两个接箍中距封隔器较近的一个；套管数据只覆盖单侧时直接用该侧，两侧都无数据则留空' },
  { label: '桥塞位置', value: '等于分段射孔方案中的封隔器位置' },
  { label: '章节制式内容', value: '施工步骤 / 安全环保 / 执行标准 / 压裂液检测指标等，由模板固定文案填充，不随井变化' }
]
