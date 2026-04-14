import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/zq-fund-app/',
  plugins: [vue()],
  server: {
    // 强制 Vite 使用 5173 端口，方便我们调试
    port: 5175,
    proxy: {
      // 1. 天天基金详情接口代理
      '/api': {
        target: 'https://fundmobapi.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // 必须伪装成来自天天基金的请求，否则会被拦截
        headers: {
          'Referer': 'https://fundmobapi.eastmoney.com',
          'Origin': 'https://fundmobapi.eastmoney.com',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
        }
      },
      // 2. 新浪大盘行情代理
      '/sinahq': {
        target: 'https://hq.sinajs.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sinahq/, ''),
        headers: {
          'Referer': 'https://finance.sina.com.cn'
        }
      }
    }
  }
})