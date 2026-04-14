<template>
  <van-config-provider :theme-vars="themeVars">
    <router-view />

    <div v-if="showLogoutBtn" class="logout-float" @click="handleLogout">
      退出
    </div>

    <van-tabbar v-if="showTabbar" v-model="activeTab" active-color="#FF976A" route>
      <van-tabbar-item icon="gold-coin-o" to="/">资产</van-tabbar-item>
      <van-tabbar-item icon="chart-trending-o" to="/market">行情</van-tabbar-item>
    </van-tabbar>
  </van-config-provider>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast } from 'vant'
import { supabase } from './utils/supabaseClient'

const route = useRoute()
const router = useRouter()
const activeTab = ref(0)

const showTabbar = computed(() => route.path !== '/login')
const showLogoutBtn = computed(() => route.path !== '/login')

const themeVars = {
  navBarTitleTextColor: '#FF976A',
  buttonPrimaryBackgroundColor: '#FF976A',
  buttonPrimaryBorderColor: '#FF976A',
  tabbarItemActiveColor: '#FF976A'
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  localStorage.removeItem('isLogin')
  localStorage.removeItem('currentUser')
  showSuccessToast('已退出登录')
  router.replace('/login')
}
</script>

<style scoped>
.logout-float {
  position: fixed;
  right: 12px;
  top: 58px;
  z-index: 1000;
  padding: 6px 12px;
  font-size: 12px;
  color: #fff;
  background: #ff976a;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(255, 151, 106, 0.28);
}
</style>