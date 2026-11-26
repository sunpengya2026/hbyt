<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">401</div>
      <div class="error-message">
        <h2>抱歉，您没有权限访问</h2>
        <p>您可能没有访问该页面的权限，请联系管理员申请权限</p>
      </div>
      <div class="error-actions">
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <!-- 免登录模式下不存在登录页，「重新登录」按钮隐藏 -->
        <el-button v-if="!freeLogin" @click="handleLogout">重新登录</el-button>
      </div>
      <div class="error-suggestion">
        <p>可能的原因：</p>
        <ul>
          <li v-if="!freeLogin">您尚未登录或登录已过期</li>
          <li>您没有访问该页面的权限</li>
          <li v-if="!freeLogin">您的账户已被禁用</li>
        </ul>
      </div>
    </div>

    <!-- 装饰元素 -->
    <div class="error-decoration">
      <div class="deco-circle deco-circle-1"></div>
      <div class="deco-circle deco-circle-2"></div>
      <div class="deco-icon">
        <i class="el-icon-lock"></i>
      </div>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'Error401',
  computed: {
    // 免登录模式（VUE_APP_FREE_LOGIN !== 'false'）下隐藏登录相关文案与按钮
    freeLogin() {
      return process.env.VUE_APP_FREE_LOGIN !== 'false'
    }
  },
  methods: {
    ...mapActions('user', ['logout']),
    ...mapActions('permission', ['clearRoutes']),

    goHome() {
      this.$router.push('/')
    },

    handleLogout() {
      // 免登录模式下不存在登录页，返回首页
      const target = process.env.VUE_APP_FREE_LOGIN !== 'false' ? '/' : '/login'
      this.logout()
        .then(() => {
          this.$router.push(target)
        })
        .catch(() => {
          this.$router.push(target)
        })
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 84px);
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  position: relative;
  overflow: hidden;

  .error-content {
    text-align: center;
    z-index: 10;
    padding: 40px;

    .error-code {
      font-size: 180px;
      font-weight: 700;
      color: #e6a23c;
      opacity: 0.15;
      line-height: 1;
      margin-bottom: -40px;
      letter-spacing: 10px;
    }

    .error-message {
      margin-bottom: 30px;

      h2 {
        font-size: 32px;
        color: #303133;
        margin: 0 0 10px 0;
      }

      p {
        font-size: 16px;
        color: #909399;
        margin: 0;
      }
    }

    .error-actions {
      margin-bottom: 40px;

      .el-button {
        margin: 0 10px;
        padding: 12px 30px;
      }
    }

    .error-suggestion {
      background: #fff;
      padding: 20px 30px;
      border-radius: 8px;
      display: inline-block;
      text-align: left;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

      p {
        font-size: 14px;
        color: #606266;
        margin: 0 0 10px 0;
        font-weight: 500;
      }

      ul {
        margin: 0;
        padding-left: 20px;
        color: #909399;

        li {
          font-size: 14px;
          line-height: 1.8;
        }
      }
    }
  }

  .error-decoration {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;

    .deco-circle {
      position: absolute;
      border-radius: 50%;
      border: 2px solid #e6a23c;

      &.deco-circle-1 {
        width: 200px;
        height: 200px;
        top: 15%;
        left: 10%;
        opacity: 0.1;
        animation: float 6s ease-in-out infinite;
      }

      &.deco-circle-2 {
        width: 150px;
        height: 150px;
        bottom: 25%;
        right: 15%;
        opacity: 0.12;
        animation: float 8s ease-in-out infinite reverse;
      }
    }

    .deco-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 300px;
      color: #e6a23c;
      opacity: 0.03;
    }
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
</style>
