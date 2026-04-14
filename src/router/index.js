// src/router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import { supabase } from '../utils/supabaseClient'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/market',
    component: () => import('../views/Market.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/detail/:code',
    component: () => import('../views/Detail.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  const { data } = await supabase.auth.getSession()
  const isLogin = !!data.session

  if (to.meta.requiresAuth && !isLogin) {
    return '/login'
  }

  if (to.path === '/login' && isLogin) {
    return '/'
  }

  return true
})

export default router