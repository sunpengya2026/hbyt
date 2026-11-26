<template>
  <div class="navbar">
    <!-- Logo区域 -->
    <div class="logo">
      <!-- <i class="el-icon-document"></i> -->
      <!-- <span>文档智能处理系统</span> -->
    </div>

    <!-- 主导航 -->
    <div class="nav-tabs">
      <router-link
        v-for="tab in navTabs"
        :key="tab.path"
        :to="tab.path"
        :class="['nav-tab', { active: isActiveTab(tab.path) }]"
      >
        <i :class="tab.icon"></i>
        {{ tab.name }}
      </router-link>
    </div>

    <div class="right-menu">
      <el-dropdown class="avatar-container" trigger="click">
        <div class="avatar-wrapper">
          <!--
            姓名来自 store（user/getUserInfo → GET /v1/auth/userinfo）。
            参考 5370dh-cbm-front 的 Navbar：name 取 state.user.user.userName。
            取不到时兜底「管理员」，保证导航条不出现空白/undefined。
          -->
          <span class="user-name">{{ displayName }}</span>
          <i class="el-icon-arrow-down"></i>
        </div>
        <el-dropdown-menu slot="dropdown" class="user-dropdown">
          <el-dropdown-item>个人中心</el-dropdown-item>
          <!-- 免登录模式下没有登录态可退出（退出后守卫会立刻重新自动登录），隐藏入口避免误导 -->
          <el-dropdown-item v-if="!freeLogin" divided @click.native="logout">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Navbar',
  data() {
    return {
      navTabs: [
        { path: '/report/generate', name: '文档生成', icon: 'el-icon-document-add' },
        { path: '/report/editor', name: '文档编辑', icon: 'el-icon-edit' },
        { path: '/report/extract', name: '智能提取', icon: 'el-icon-magic-stick' }
      ]
    }
  },
  computed: {
    sidebar() {
      return this.$store.state.app.sidebar
    },
    // 当前登录用户姓名（导航条右上角显示）
    // 数据源：store.modules.user 的 name，由 user/getUserInfo 调用
    //         GET /v1/auth/userinfo 后写入；接口失败时 store 已降级为「管理员」
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
    }
  },
  created() {
    // 兜底：正常流程下路由守卫已经拉过一次。
    // 但 Navbar 可能被单独挂载（单页调试 / 微前端子应用直连），
    // 这时 store 里是空的，会一直显示「管理员」。补一次拉取。
    if (!this.$store.state.user.userInfo) {
      this.$store.dispatch('user/getUserInfo')
    }
  },
  methods: {
    isActiveTab(path) {
      return this.$route.path.startsWith(path)
    },
    toggleSideBar() {
      this.$store.dispatch('app/toggleSideBar')
    },
    logout() {
      this.$store.dispatch('user/logout')
      // 免登录模式下不存在登录页，返回首页
      this.$router.push(this.freeLogin ? '/' : '/login')
    }
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  height: 48px;
  overflow: hidden;
  position: relative;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.logo {
  font-size: 16px;
  font-weight: 600;
  color: $base-color;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-tabs {
  display: flex;
  margin-left: 32px;
  gap: 4px;
}

.nav-tab {
  padding: 8px 20px;
  cursor: pointer;
  color: #595959;
  border-radius: 4px;
  font-size: 13px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  &.active {
    background: $base-color;
    color: #fff;
  }
}

.right-menu {
  margin-left: auto;
  display: flex;
  align-items: center;

  .avatar-container {
    cursor: pointer;
    .avatar-wrapper {
      display: flex;
      align-items: center;
      padding: 0 8px;
      color: #595959;
      font-size: 13px;
      gap: 4px;
    }

    // 中文姓名一般 2~5 字；超长（英文账号/邮箱）也不能把导航条挤变形
    .user-name {
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &:hover .avatar-wrapper {
      color: $base-color;
    }
  }
}
</style>
