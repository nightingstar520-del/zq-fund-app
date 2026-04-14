<template>
  <div class="login-container">
    <div class="login-logo">
      <van-icon name="balance-o" size="80" color="#FF976A" />
      <h2>我的基金看板</h2>
      <p class="login-tip">请输入 Supabase 已创建账号的邮箱和密码</p>
    </div>

    <van-form @submit="onSubmit" class="login-form">
      <van-cell-group inset>
        <van-field
          v-model="email"
          label="邮箱"
          type="email"
          placeholder="请输入邮箱"
          clearable
        />
        <van-field
          v-model="password"
          type="password"
          label="密码"
          placeholder="请输入密码"
          clearable
        />
      </van-cell-group>

      <div class="login-btn-wrap">
        <van-button
          round
          block
          type="primary"
          native-type="submit"
          :loading="loading"
        >
          立即登录
        </van-button>
      </div>

      <div class="login-desc">
        当前版本仅支持后台已创建用户登录，不开放前端注册
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { supabase } from '../utils/supabaseClient'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    router.replace('/')
  }
})

const onSubmit = async () => {
  if (!email.value || !password.value) {
    showFailToast('请输入邮箱和密码')
    return
  }

  loading.value = true

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    })

    if (error) {
      throw error
    }

    if (data.user) {
      showSuccessToast('登录成功')
      router.replace('/')
    }
  } catch (error) {
    showFailToast(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  padding: 72px 16px 24px;
  box-sizing: border-box;
  background: #fff7f1;
}

.login-logo {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo h2 {
  margin: 12px 0 8px;
  color: #323233;
  font-weight: 600;
  font-size: 24px;
}

.login-tip {
  color: #969799;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.login-form {
  max-width: 520px;
  margin: 0 auto;
}

.login-btn-wrap {
  margin: 28px 16px 16px;
}

.login-desc {
  text-align: center;
  color: #999;
  font-size: 13px;
  line-height: 1.6;
  padding: 0 12px;
}
</style>