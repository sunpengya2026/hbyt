<template>
  <div class="login-box">
    <div class="form">
      <div class="title">
        {{ appStore.appTitle }}
        <p style="font-size: 16px">{{ appStore.appTitleTips }}</p>
      </div>

      <el-input
        class="inp"
        v-model="loginData.username"
        placeholder="请输入正确的账户"
      />
      <el-input
        class="inp"
        v-model="loginData.password"
        type="password"
        placeholder="请输入你的密码"
        show-password
        @keyup.enter.native="handleLogin"
      />
      <div class="checkbox">
        <input id="jzmm" name="jzmm" type="checkbox" v-model="rememberMe" />
        <label for="jzmm">记住用户名</label>
      </div>
      <el-button
        class="btn"
        type="primary"
        @click="handleLogin"
        :loading="loading"
      >登&nbsp;&nbsp;录</el-button>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex'

export default {
  name: 'LoginIndex',
  data() {
    return {
      loginData: {
        username: '',
        password: ''
      },
      rememberMe: false,
      loading: false
    }
  },
  computed: {
    appStore() {
      return this.$store.state.app
    }
  },
  created() {
    this.loadSavedLogin()
  },
  methods: {
    ...mapActions('user', ['login']),

    // 加载保存的登录信息
    loadSavedLogin() {
      const savedLoginInfo = localStorage.getItem('loginInfo')
      if (savedLoginInfo) {
        try {
          const parsed = JSON.parse(savedLoginInfo)
          if (parsed && parsed.username) {
            this.loginData.username = parsed.username
            this.rememberMe = true
          }
        } catch (e) {
          console.error('读取登录信息失败', e)
        }
      }
    },

    // 登录
    handleLogin() {
      if (!this.loginData.username) {
        this.$message.warning('请输入用户名')
        return
      }
      if (!this.loginData.password) {
        this.$message.warning('请输入密码')
        return
      }

      this.loading = true

      // 保存登录信息（本地仅存用户名，不存口令）
      if (this.rememberMe) {
        localStorage.setItem('loginInfo', JSON.stringify({
          username: this.loginData.username
        }))
      } else {
        localStorage.removeItem('loginInfo')
      }

      const loginParams = {
        username: this.loginData.username,
        password: this.loginData.password
      }

      this.login(loginParams)
        .then(() => {
          this.$message.success('登录成功')
          this.$router.push('/')
        })
        .catch(err => {
          this.$message.error(err.message || '登录失败，请检查用户名和密码')
        })
        .finally(() => {
          this.loading = false
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.login-box {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form {
  width: 420px;
  height: auto;
  min-height: 400px;
  background: #ffffff;
  box-shadow: 0px 0px 20px 0px rgba(41, 111, 186, 0.28);
  border-radius: 8px;
  padding: 40px;
  display: flex;
  flex-direction: column;

  .title {
    font-size: 22px;
    color: #3389e5;
    line-height: 30px;
    text-align: center;
    margin-bottom: 30px;
    margin-top: 10px;
    font-weight: 600;
  }

  .inp {
    margin-top: 20px;
  }

  .checkbox {
    margin-top: 15px;
    display: flex;
    font-size: 14px;
    gap: 6px;
    align-items: center;
    color: #595959;

    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    label {
      cursor: pointer;
    }
  }

  .btn {
    margin-top: 25px;
    width: 100%;
    height: 42px;
    font-size: 16px;
    letter-spacing: 4px;
  }
}
</style>
