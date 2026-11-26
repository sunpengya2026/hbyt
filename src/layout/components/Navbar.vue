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
          <el-dropdown-item divided @click.native="logout">退出登录</el-dropdown-item>
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
    // 由路由守卫在服务端确认会话后写入
    displayName() {
      const s = this.$store.state.user
      return (
        s.name ||
        (s.userInfo && (s.userInfo.name || s.userInfo.userName)) ||
        '用户'
      )
    }
  },
  methods: {
    isActiveTab(path) {
      return this.$route.path.startsWith(path)
    },
    toggleSideBar() {
      this.$store.dispatch('app/toggleSideBar')
    },
    async logout() {
      await this.$store.dispatch('user/logout')
      this.$router.replace('/login')
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
