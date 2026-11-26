<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">404</div>
      <div class="error-message">
        <h2>抱歉，页面不存在</h2>
        <p>您访问的页面可能已删除、更名或暂时不可用</p>
      </div>
      <div class="error-actions">
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </div>
      <div class="error-suggestion">
        <p>您可以尝试：</p>
        <ul>
          <li>检查URL地址是否正确</li>
          <li>使用导航菜单访问页面</li>
          <li>联系管理员获取帮助</li>
        </ul>
      </div>
    </div>

    <!-- 装饰元素 -->
    <div class="error-decoration">
      <div class="deco-circle deco-circle-1"></div>
      <div class="deco-circle deco-circle-2"></div>
      <div class="deco-line deco-line-1"></div>
      <div class="deco-line deco-line-2"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Error404',
  methods: {
    goHome() {
      this.$router.push('/')
    },
    goBack() {
      if (window.history.length > 1) {
        this.$router.go(-1)
      } else {
        this.goHome()
      }
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
      color: #409eff;
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
      border: 2px solid #409eff;

      &.deco-circle-1 {
        width: 200px;
        height: 200px;
        top: 10%;
        right: 15%;
        opacity: 0.1;
        animation: float 6s ease-in-out infinite;
      }

      &.deco-circle-2 {
        width: 100px;
        height: 100px;
        bottom: 20%;
        left: 10%;
        opacity: 0.15;
        animation: float 8s ease-in-out infinite reverse;
      }
    }

    .deco-line {
      position: absolute;
      background: linear-gradient(90deg, transparent, #409eff, transparent);

      &.deco-line-1 {
        width: 300px;
        height: 2px;
        top: 30%;
        left: 5%;
        opacity: 0.2;
        transform: rotate(-15deg);
      }

      &.deco-line-2 {
        width: 200px;
        height: 2px;
        bottom: 35%;
        right: 10%;
        opacity: 0.15;
        transform: rotate(10deg);
      }
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
