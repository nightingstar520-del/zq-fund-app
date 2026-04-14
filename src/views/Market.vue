<!-- src/views/Market.vue -->
<template>
  <div class="market-container">
    <van-nav-bar title="行情中心" fixed placeholder />

    <van-pull-refresh v-model="refreshing" @refresh="fetchAllMarketData">
      <div class="section-title">全球指数</div>
      <van-grid :column-num="3" direction="vertical" inset clickable>
        <van-grid-item v-for="idx in indexList" :key="idx.symbol">
          <div :class="['index-val', idx.diff >= 0 ? 'red' : 'green']">{{ idx.price }}</div>
          <div class="index-name">{{ idx.name }}</div>
          <div :class="['index-rate', idx.diff >= 0 ? 'red' : 'green']">{{ formatRate(idx.rate) }}</div>
        </van-grid-item>
      </van-grid>

      <div class="section-title">大宗商品</div>
      <van-cell-group inset>
        <van-cell title="上海黄金交易所（AU9999）" icon="gold-coin" :label="updateTime || '下拉可刷新'">
          <template #value>
            <span class="gold-price">{{ goldPrice }}</span>
          </template>
        </van-cell>
      </van-cell-group>

      <div class="section-title">热门行业涨幅</div>
      <van-tabs v-model:active="activeTab" color="#FF976A" sticky offset-top="46">
        <van-tab v-for="cat in industryData" :key="cat.name" :title="cat.name">
          <van-cell
            v-for="fund in cat.list"
            :key="fund.code"
            :title="fund.label"
            :label="fund.code"
            is-link
            @click="goFundDetail(fund.code)"
          >
            <template #value>
              <span :class="Number(fund.rate) >= 0 ? 'red' : 'green'">
                {{ formatRate(fund.rate) }}
              </span>
            </template>
          </van-cell>
        </van-tab>
      </van-tabs>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getDefaultIndexList,
  getDefaultIndustryData,
  formatRate,
  fetchMarketQuotes,
  fetchIndustryRates
} from '../services/marketService'

const router = useRouter()
const refreshing = ref(false)
const activeTab = ref(0)
const goldPrice = ref('--')
const updateTime = ref('')

const indexList = ref(getDefaultIndexList())
const industryData = ref(getDefaultIndustryData())

const fetchAllMarketData = async () => {
  refreshing.value = true

  try {
    const marketResult = await fetchMarketQuotes(indexList.value)
    indexList.value = marketResult.indexList
    goldPrice.value = marketResult.goldPrice
    updateTime.value = marketResult.updateTime

    industryData.value = await fetchIndustryRates(industryData.value)
  } catch (error) {
    console.log('行情获取失败', error)
  } finally {
    refreshing.value = false
  }
}

const goFundDetail = (code) => {
  router.push(`/detail/${code}`)
}

onMounted(fetchAllMarketData)
</script>

<style scoped>
.market-container { background: #f7f8fa; min-height: 100vh; padding-bottom: 80px; }
.section-title { padding: 15px; font-size: 14px; color: #969799; font-weight: bold; }
.index-val { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
.index-name {
  font-size: 11px;
  color: #969799;
  text-align: center;
  line-height: 1.4;
  min-height: 30px;
}
.index-rate { font-size: 12px; margin-top: 4px; font-weight: 500; }
.gold-price { color: #FF976A; font-weight: bold; font-size: 18px; }
.red { color: #ee0a24 !important; }
.green { color: #07c160 !important; }
@media (min-width: 768px) {
  .market-container {
    max-width: 760px;
    margin: 0 auto;
  }
}
</style>