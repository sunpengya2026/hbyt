import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

/**
 * Note: sub-menu only appear when route children.length >= 1
 * Detail see: https://panjiachen.github.io/vue-element-admin-site/guide/essentials/router-and-nav.html
 */

// ⚠️ 免登录开关（与 main.js / store / request.js 保持一致）
// 开启时 /login 路由直接重定向到首页，浏览器里输入 xxx/#/login 也进不去登录页，
// 彻底避免「访问首页被弹到登录页」。
const FREE_LOGIN = process.env.VUE_APP_FREE_LOGIN !== 'false'

export const constantRoutes = [
  FREE_LOGIN
    ? {
        // 免登录：任何对 /login 的访问都回首页
        path: '/login',
        redirect: '/report-index/index',
        hidden: true
      }
    : {
        path: '/login',
        component: () => import('@/views/login/index'),
        hidden: true
      },
  {
    path: '/404',
    component: () => import('@/views/error-page/404'),
    hidden: true
  },
  {
    path: '/401',
    component: () => import('@/views/error-page/401'),
    hidden: true
  }
]

export const asyncRoutes = [
  // 根路径重定向到首页
  {
    path: '/',
    redirect: '/report-index/index',
    hidden: true
  },
  // 首页 - 驾驶舱（数据看板）
  // 全局态势：工作台井数 / 文档生成进度 / 知识库概况 / 压裂日动态
  // 数据来自后端聚合接口 GET /api/v1/dashboard/overview（一次取全，避免首屏多请求）
  {
    path: '/report-index',
    component: Layout,
    redirect: '/report-index/index',
    meta: { title: '首页', icon: 'home' },
    children: [
      {
        path: 'index',
        name: 'ReportIndex',
        component: () => import(/* webpackChunkName: "dashboard" */ '@/views/dashboard/cockpit'),
        meta: { title: '首页' }
      }
    ]
  },
  // 工作台 (一级菜单)：左侧对象树 + 右侧井号列表，点井号进入单井工作台
  {
    path: '/workbench',
    component: Layout,
    redirect: '/workbench/index',
    meta: { title: '工作台', icon: 's-platform' },
    children: [
      {
        path: 'index',
        name: 'Workbench',
        // 关键：对象树在 dev server 热更新时保留展开 / 选中状态
        component: () => import(/* webpackChunkName: "workbench" */ '@/views/workbench/index'),
        meta: { title: '工作台', noCache: false }
      },
      {
        path: 'well/:wellId',
        name: 'WellWorkbench',
        component: () => import(/* webpackChunkName: "workbench" */ '@/views/workbench/well-workbench'),
        meta: { title: '单井工作台', noCache: true, activeMenu: '/workbench/index' },
        hidden: true
      },
      {
        // 压裂设计智能体：内置模板骨架 + 内置数据来源规则，不用上传模板。
        // 工作台「进入压裂智能体」按钮进入，对话式展示执行过程，完成后跳编辑器。
        path: 'agent',
        name: 'FracturingAgent',
        component: () => import(/* webpackChunkName: "workbench" */ '@/views/workbench/fracturing-agent'),
        meta: { title: '压裂智能体', noCache: true, activeMenu: '/workbench/index' },
        hidden: true
      },
      {
        // 射孔方案智能生成：按井号读取 MSE / 套管接箍 / 总烃 / 伽马曲线，
        // 做分段优化 + MSE 避让，输出射孔井段表。
        // 井号列表「射孔方案」按钮进入，query 带 wellName / wbWellId。
        path: 'perforation-agent',
        name: 'PerforationAgent',
        component: () => import(/* webpackChunkName: "workbench" */ '@/views/workbench/PerforationAgentPage'),
        meta: { title: '射孔方案', noCache: true, activeMenu: '/workbench/index' },
        hidden: true
      },
      {
        // 泵注程序编写：只填 7 个原始参数，砂比/排量阶梯与砂量砂液量时间全部自动派生。
        // 参数与手动覆盖按井存 localStorage，生成文档时带入。
        // 单井工作台「泵注程序」卡片按钮进入，query 带 wellName / wbWellId。
        path: 'pump-program',
        name: 'PumpProgram',
        component: () => import(/* webpackChunkName: "workbench" */ '@/views/workbench/PumpProgramPage'),
        meta: { title: '泵注程序', noCache: true, activeMenu: '/workbench/index' },
        hidden: true
      }
    ]
  },
  // ------------------------------------------------------------------
  // 以下页面保留路由（代码未删除、可直达），但已不在顶部一级菜单中展示。
  // 一级菜单统一收敛为：首页 / 工作台 / 知识库 / 技能包 / 模板管理。
  // 入口：工作台/首页按钮跳转、编辑器返回、历史报告详情等内部跳转。
  // ------------------------------------------------------------------
  // 文档生成
  {
    path: '/report-generate',
    component: Layout,
    redirect: '/report-generate/index',
    meta: { title: '文档生成', icon: 'document-add' },
    hidden: true,
    children: [
      {
        path: 'index',
        name: 'ReportGenerate',
        component: () => import('@/views/report/generate'),
        meta: { title: '文档生成' }
      }
    ]
  },
  // 文档编辑
  {
    path: '/report-editor',
    component: Layout,
    redirect: '/report-editor/list',
    meta: { title: '文档编辑', icon: 'edit' },
    hidden: true,
    children: [
      {
        path: 'list',
        name: 'ReportEditor',
        component: () => import('@/views/report/editor'),
        meta: { title: '文档编辑', noCache: true }
      }
    ]
  },
  // 智能提取
  {
    path: '/report-extract',
    component: Layout,
    redirect: '/report-extract/index',
    meta: { title: '智能提取', icon: 'magic-stick' },
    hidden: true,
    children: [
      {
        path: 'index',
        name: 'ReportExtract',
        component: () => import('@/views/report/extract'),
        meta: { title: '智能提取' }
      }
    ]
  },
  // 报告管理（历史报告 / 地质设计生成 / 工程设计生成 / 规则分析）
  {
    path: '/report-manage',
    component: Layout,
    redirect: '/report-manage/history',
    meta: { title: '报告管理', icon: 'document' },
    hidden: true,
    children: [
      {
        path: 'history',
        name: 'ReportHistory',
        component: () => import('@/views/report/history'),
        meta: { title: '历史报告' }
      },
      {
        path: 'geological-extract',
        name: 'GeologicalExtract',
        component: () => import('@/views/report/geological-extract'),
        meta: { title: '地质设计生成' }
      },
      {
        path: 'reverse-extract',
        name: 'ReverseExtraction',
        component: () => import('@/views/report/reverse-extract'),
        meta: { title: '工程设计生成' }
      },
      {
        path: 'rule-analyzer',
        name: 'RuleAnalyzer',
        component: () => import('@/views/report/rule-analyzer'),
        meta: { title: '规则分析' }
      },
      {
        path: 'monitor/:reportId/:sessionId?',
        name: 'ExecutionMonitor',
        component: () => import('@/views/report/monitor'),
        meta: { title: '执行监控', noCache: true },
        hidden: true
      },
      {
        path: 'detail/:id',
        name: 'ReportDetail',
        component: () => import('@/views/report/detail'),
        meta: { title: '报告详情', noCache: true },
        hidden: true
      }
    ]
  },
  {
    path: '/template',
    component: Layout,
    redirect: '/template/list',
    meta: { title: '模板管理', icon: 'template' },
    children: [
      {
        path: 'list',
        name: 'TemplateList',
        component: () => import('@/views/template/list'),
        meta: { title: '模板列表' }
      },
      {
        path: 'editor/:id?',
        name: 'TemplateEditor',
        component: () => import('@/views/template/editor'),
        meta: { title: '模板编辑', noCache: true },
        hidden: true
      }
    ]
  },
  {
    path: '/schedule',
    component: Layout,
    redirect: '/schedule/list',
    meta: { title: '定时任务', icon: 'time' },
    hidden: true,
    children: [
      {
        path: 'list',
        name: 'ScheduleList',
        component: () => import('@/views/schedule/list'),
        meta: { title: '任务列表' }
      }
    ]
  },
  {
    path: '/history',
    component: Layout,
    redirect: '/history/list',
    meta: { title: '执行记录', icon: 'history' },
    hidden: true,
    children: [
      {
        path: 'list',
        name: 'HistoryList',
        component: () => import('@/views/history/list'),
        meta: { title: '执行记录' }
      }
    ]
  },
  {
    path: '/skill',
    component: Layout,
    redirect: '/skill/list',
    meta: { title: '技能包', icon: 'skill' },
    children: [
      {
        path: 'list',
        name: 'SkillList',
        component: () => import('@/views/skill/list'),
        meta: { title: '技能包管理' }
      },
      {
        // 压裂文档自动生成：上传模板 → 抽取 → 生成 → 导出 Word。
        // 原先挂在首页路由上，首页改成驾驶舱后搬到这里保留功能。
        // 工作台单井流程里有等价入口，这里是「批量/独立使用」的入口。
        path: 'fracturing',
        name: 'SkillFracturing',
        component: () => import(/* webpackChunkName: "skill" */ '@/views/report/fracturing-extract'),
        meta: { title: '压裂文档生成' }
      },
      {
        path: 'doc-parser',
        name: 'DocParser',
        component: () => import('@/views/skill/doc-parser'),
        meta: { title: '文档解析' }
      }
    ]
  },
  {
    path: '/knowledge',
    component: Layout,
    redirect: '/knowledge/list',
    meta: { title: '知识库', icon: 'knowledge' },
    children: [
      {
        path: 'list',
        name: 'KnowledgeList',
        component: () => import('@/views/knowledge/list'),
        meta: { title: '知识库管理' }
      }
    ]
  },
  {
    path: '/datasource',
    component: Layout,
    redirect: '/datasource/list',
    meta: { title: '数据源管理', icon: 'database', requiresAdmin: true },
    hidden: true,
    children: [
      {
        path: 'list',
        name: 'DataSourceList',
        component: () => import('@/views/datasource/list'),
        meta: { title: '数据源配置' }
      }
    ]
  },
  { path: '*', redirect: '/404', hidden: true }
]

// ⚠️ 发布形态是 https://www.hbepicp.petrochina/dh-desdoc-cbm/#/
//    即 hash 路由（路径在 # 之后）。这里必须与发布形态保持一致，否则本地
//    能跑、发上去所有深链都 404。
//    hash 模式下 base 由 publicPath 决定（vue.config.js 的 publicPath=/dh-desdoc-cbm/），
//    访问 /dh-desdoc-cbm/ 会自动跳到 /dh-desdoc-cbm/#/，无需 nginx 做 try_files 回退。
const createRouter = () => new Router({
  mode: 'hash',
  base: '/dh-desdoc-cbm/',
  scrollBehavior: () => ({ y: 0 }),
  // ⚠️ 这里只注册 constantRoutes（登录/404/401）。
  // asyncRoutes 由 main.js 的路由守卫在拿到用户角色后 addRoutes 注入，二者不能同时注册，
  // 否则每个路由都会被注册两次 → 控制台 24 条 "Duplicate named routes definition"。
  routes: constantRoutes
})

const router = createRouter()

// ⚠️ 动态路由只注册一次的标记放在 router 实例上，resetRouter 时一并复位，
// 否则退出登录再登录会因标记仍为 true 而拿不到 asyncRoutes（表现为登录后白屏）
router.__asyncRoutesAdded = false

export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher
  router.__asyncRoutesAdded = false
}

export default router
