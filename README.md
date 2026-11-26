# Report Processing Engine Frontend

**智能报告生成引擎前端** - 基于 Vue 2.6 + Element UI 的报告管理界面

## 项目概述

前端项目负责报告生成的配置、任务管理、历史报告查看等功能界面。

## 技术栈

- **框架**: Vue 2.6.10
- **UI 组件库**: Element UI 2.15.6
- **状态管理**: Vuex 3.1.0
- **路由**: Vue Router 3.0.6
- **HTTP 客户端**: Axios 0.26.1
- **构建工具**: Vue CLI 4.5.16

## 目录结构

```
report-processing-engine-front/
├── public/
│   └── index.html           # HTML模板
├── src/
│   ├── api/                 # API接口
│   │   ├── report.js        # 报告相关接口
│   │   ├── template.js      # 模板相关接口
│   │   ├── task.js          # 任务相关接口
│   │   └── knowledge.js     # 知识库相关接口
│   ├── components/          # 公共组件
│   ├── layout/              # 布局组件
│   │   ├── index.vue        # 主布局
│   │   └── components/      # 布局子组件
│   ├── router/              # 路由配置
│   │   └── index.js
│   ├── store/               # Vuex状态管理
│   │   ├── index.js
│   │   ├── getters.js
│   │   └── modules/         # 状态模块
│   ├── styles/              # 样式文件
│   │   ├── index.scss
│   │   ├── variables.scss
│   │   ├── mixin.scss
│   │   └── element-variables.scss
│   ├── utils/               # 工具函数
│   │   ├── request.js       # Axios封装
│   │   └── auth.js          # Token管理
│   ├── views/               # 页面组件
│   │   ├── report/          # 报告模块
│   │   │   ├── generate.vue # 报告生成
│   │   │   ├── history.vue  # 历史报告
│   │   │   └── detail.vue  # 报告详情
│   │   ├── template/        # 模板模块
│   │   │   ├── list.vue     # 模板列表
│   │   │   └── editor.vue   # 模板编辑
│   │   ├── task/            # 任务模块
│   │   │   └── list.vue     # 任务列表
│   │   └── knowledge/       # 知识库模块
│   │       └── list.vue     # 知识库管理
│   ├── App.vue              # 根组件
│   ├── main.js              # 入口文件
│   └── settings.js          # 项目配置
├── .env.development         # 开发环境配置
├── .env.production          # 生产环境配置
├── vue.config.js            # Vue CLI配置
├── package.json             # 依赖配置
└── README.md                # 项目说明
```

## 功能模块

### 1. 报告生成
- 选择报告类型和模板
- 配置数据源
- 选择输出格式
- 提交生成任务
- 查看生成进度

### 2. 历史报告
- 报告列表展示
- 条件搜索过滤
- 报告查看和下载
- 报告删除

### 3. 模板管理
- 模板列表查看
- 模板创建和编辑
- 模板复制和删除

### 4. 任务管理
- 任务状态监控
- 任务日志查看
- 任务重试和取消

### 5. 知识库
- 知识条目管理
- 知识分类
- 批量导入导出

## 快速开始

### 安装依赖

```bash
cd report-processing-engine-front
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build:prod
```

## 环境配置

创建 `.env.local` 文件：

```env
VUE_APP_BASE_API=/api
VUE_APP_URL=http://localhost:8080
```

## 与后端对接

前端通过 `/api` 前缀代理请求到后端服务，配置见 `vue.config.js`：

```javascript
proxy: {
  '/api': {
    target: process.env.VUE_APP_URL,
    changeOrigin: true
  }
}
```

## License

Internal Use Only
