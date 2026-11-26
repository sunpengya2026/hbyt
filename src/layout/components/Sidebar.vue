<template>
  <div class="sidebar-container">
    <div class="top-nav">
      <!-- Logo 区域 -->
      <div class="logo-area">
        <span class="logo-icon"></span>
        <span class="logo-text">煤层气压裂工程设计方案智能生成</span>
      </div>
      <!-- 一级菜单：首页 / 工作台 / 知识库 / 技能包 / 模板管理 -->
      <div class="core-menu">
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          :background-color="navbarBg"
          text-color="#ffffff"
          active-text-color="#ffffff"
          :ellipsis="false"
          router
        >
          <el-menu-item index="/report-index/index">
            <i class="el-icon-s-home"></i>
            <span slot="title">首页</span>
          </el-menu-item>
          <el-menu-item index="/workbench/index">
            <i class="el-icon-s-platform"></i>
            <span slot="title">工作台</span>
          </el-menu-item>
          <el-menu-item index="/knowledge/list">
            <i class="el-icon-collection"></i>
            <span slot="title">知识库</span>
          </el-menu-item>
          <el-menu-item index="/skill/list">
            <i class="el-icon-s-tools"></i>
            <span slot="title">技能包</span>
          </el-menu-item>
          <el-menu-item index="/template/list">
            <i class="el-icon-box"></i>
            <span slot="title">模板管理</span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 用户信息区域 -->
      <div class="user-area">
        <el-dropdown trigger="click">
          <span class="user-info">
            <i class="el-icon-user-solid"></i>
            <!--
              姓名来自 store（user/getUserInfo → GET /v1/auth/userinfo）
              参考 5370dh-cbm-front：name = state.user.user.userName
              取不到时兜底「管理员」，绝不显示空白
            -->
            <span class="user-name">{{ displayName }}</span>
            <i class="el-icon-arrow-down el-icon--right"></i>
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item>
              <i class="el-icon-user"></i> 个人中心
            </el-dropdown-item>
            <el-dropdown-item>
              <i class="el-icon-setting"></i> 系统设置
            </el-dropdown-item>
            <!-- 免登录模式下没有登录态可退出，隐藏入口 -->
            <el-dropdown-item v-if="!freeLogin" divided>
              <i class="el-icon-switch-button"></i> 退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Sidebar',
  props: {
    basePath: {
      type: String,
      default: ''
    }
  },
  computed: {
    activeMenu() {
      const route = this.$route
      const { meta, path } = route
      if (meta.activeMenu) {
        return meta.activeMenu
      }
      return path
    },
    // 当前登录用户姓名（导航条右上角显示）
    // 数据源：store.modules.user 的 name，由 user/getUserInfo 调
    //         GET /v1/auth/userinfo 写入；接口失败时 store 已降级为「管理员」
    displayName() {
      const s = this.$store.state.user
      return (
        s.name ||
        (s.userInfo && (s.userInfo.name || s.userInfo.userName)) ||
        '管理员'
      )
    },
    // 免登录模式（VUE_APP_FREE_LOGIN !== 'false'）下隐藏「退出登录」
    freeLogin() {
      return process.env.VUE_APP_FREE_LOGIN !== 'false'
    },
    // el-menu 的 background-color 需要 JS 值（它塞进内联 style，SCSS 变量进不来）。
    // 这里和下面 <style> 里的 $navbar-bg 保持同一色值 —— 两处都写 #2F82EB。
    navbarBg() {
      return '#2F82EB'
    }
  },
  created() {
    // 兜底：正常流程下路由守卫已经拉过一次。
    // Sidebar 在 layout/index.vue 里是常驻组件，若 store 仍为空
    // （比如微前端子应用直连、单页调试），补一次拉取，否则会一直是「管理员」。
    if (!this.$store.state.user.userInfo) {
      this.$store.dispatch('user/getUserInfo')
    }
  }
}
</script>

<style lang="scss" scoped>
// ============================================================
// 顶部导航条
// 视觉口径对齐 5370dh-cbm-front（华北煤层气一体化平台）：
//   底色 #2F82EB / 悬停 rgba(255,255,255,.1) / 激活 rgba(255,255,255,.2)
//   菜单项圆角 5px / 字号 14px / 激活时底部 3px 白条
// 变量统一取自 styles/variables.scss（vue.config.js 已全局 prependData）。
//
// ⚠️ 三处 #2F82EB 必须同步：本文件的 $navbar-bg、本文件 computed 的
//    navbarBg()、layout/index.vue 的 .horizontal-sidebar。
//    漏一处导航栏和下方就露一条深色/浅色接缝。
// ============================================================

.sidebar-container {
  width: 100%;
  background-color: $navbar-bg;

  .top-nav {
    display: flex;
    align-items: center;
    height: 56px;
    padding: 0 16px;
    // 亮蓝色背景不需要分割线；用轻微内阴影增加层次，避免与白底内容区「粘」在一起
    box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  }

  // Logo 区域
  .logo-area {
    display: flex;
    align-items: center;
    padding-right: 24px;
    flex-shrink: 0;

    // 换成中石油花瓣徽标（与 5370dh-cbm-front 同一张 logo@2x.png）。
    // 走 CSS background-image 而不是 <img>：36×36 固定尺寸下
    // background-size: contain 能保证任意长宽比的图都不变形，
    // 且不占 DOM 语义（logo 属于装饰，不需要 alt）。
    .logo-icon {
      width: 36px;
      height: 36px;
      margin-right: 10px;
      flex-shrink: 0;
      /* [验收裁剪] 图片已删除
    background-image: url('~@/assets/images/logo@2x.png');
    */
    background-image: none;
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
    }

    // 标题较长（15 字），必须锁死单行：换行会把 56px 的 nav 撑破；
    // 同时给 max-width + ellipsis 兜底，极端窄屏下宁可省略也不挤压右侧菜单。
    // 字号/字重对齐参考项目 headerMenu 的 .tilte（加粗 700 + 白字）。
    .logo-text {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
      // 亮蓝底上的白字加一点点投影，小字号下更清晰
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    }
  }

  // 一级菜单
  .core-menu {
    flex: 1;
    display: flex;

    .el-menu {
      background-color: transparent !important;
      border: none;
    }

    .el-menu--horizontal {
      .el-menu-item {
        // 参考项目 el-menu--horizontal 的菜单项是「文字 + 5px 圆角高亮块」，
        // 上下留 8px 空白，高亮块不顶满 56px，看起来更轻。
        margin: 8px 2px;
        height: 40px;
        line-height: 40px;
        padding: 0 16px;
        border-radius: $navbar-item-radius;
        // 激活态另有一根 2px 白条压在底部，用 inline-block 定位参考系
        position: relative;
        border-bottom: none;
        font-size: $font-size-base;
        color: $navbar-text;
        display: flex;
        align-items: center;
        transition: background-color 0.2s, color 0.2s;

        i {
          margin-right: 6px;
          font-size: 14px;
        }

        // 半透明白叠在 #2F82EB 上自然变亮，比自己调色值更稳：
        // 将来换品牌色不用回来重算 hover/active。
        &:hover,
        &:focus {
          background-color: $navbar-hover-bg !important;
          color: $navbar-text-active !important;
        }

        &.is-active {
          background-color: $navbar-active-bg !important;
          color: $navbar-text-active !important;
          font-weight: 600;

          // 底部 3px 白条（对齐参考项目 headerMenu 的 .nav-item.active::after）。
          // 圆角只在上面两个角，否则底部横条两端会「翘」出高亮块之外。
          &::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: -8px;
            height: 3px;
            background-color: #fff;
            border-radius: 3px 3px 0 0;
          }
        }
      }
    }
  }

  // 用户区域
  .user-area {
    flex-shrink: 0;
    padding-left: 24px;
    border-left: 1px solid rgba(255, 255, 255, 0.22);
    margin-left: 16px;

    .user-info {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 4px;
      color: #fff;
      font-size: $font-size-base;
      transition: background-color 0.2s;

      i {
        margin-right: 6px;
      }

      // 中文姓名一般 2~5 字；接统一认证后可能是英文账号/邮箱，
      // 必须锁死单行 + 省略号，否则会把 56px 的导航条撑成两行。
      .user-name {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &:hover {
        background-color: $navbar-hover-bg;
        color: #fff;
      }
    }
  }

  // 窄屏收缩：标题 15 字叠加亮蓝底后视觉更「重」，
  // 1366/1440 屏下若不收菜单内边距会挤出右侧用户区。
  @media screen and (max-width: 1600px) {
    .logo-area {
      padding-right: 16px;

      .logo-icon {
        width: 30px;
        height: 30px;
        margin-right: 8px;
      }

      .logo-text {
        font-size: 15px;
        letter-spacing: 0;
        max-width: 230px;
      }
    }

    .core-menu .el-menu--horizontal .el-menu-item {
      padding: 0 12px;
    }

    .user-area {
      padding-left: 16px;
      margin-left: 8px;
    }
  }
}
</style>
