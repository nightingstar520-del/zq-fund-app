<!-- src/views/Detail.vue -->
<template>
  <div class="detail-container">
    <van-nav-bar
      :title="fundInfo.name || '基金详情'"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <div class="detail-header">
      <van-row gutter="12">
        <van-col span="12">
          <div class="d-label">
            当前估值
            <span v-if="hasEstimate && fundInfo.gztime">（{{ fundInfo.gztime }}）</span>
          </div>
          <div :class="['d-value', currentChangeRate >= 0 ? 'red' : 'green']">
            {{ currentPriceDisplay }}
          </div>
        </van-col>
        <van-col span="12" style="text-align: right">
          <div class="d-label">预估涨跌幅</div>
          <div :class="['d-rate', currentChangeRate >= 0 ? 'red' : 'green']">
            {{ hasEstimate ? formatRate(currentChangeRate) : '--' }}
          </div>
        </van-col>
      </van-row>

      <div class="header-sub-info">
        <div class="sub-item">
          <span class="sub-label">当日盈亏</span>
          <span :class="['sub-value', dailyProfit >= 0 ? 'red' : 'green']">
            {{ signedMoney(dailyProfit) }}
          </span>
        </div>
        <div class="sub-item">
          <span class="sub-label">持仓收益率</span>
          <span :class="['sub-value', totalProfitRate >= 0 ? 'red' : 'green']">
            {{ formatRate(totalProfitRate) }}
          </span>
        </div>
      </div>

      <div class="update-tip">
        {{
          hasEstimate
            ? `估值更新时间：${fundInfo.gztime}`
            : '当前可能为非交易时段，暂无实时估值'
        }}
      </div>
    </div>

    <div class="trend-card">
      <div class="trend-top">
        <div class="trend-left">
          <div class="chart-title">净值走势</div>
          <div v-if="isMockHistory" class="mock-tag">模拟走势</div>
        </div>

        <van-tabs
          v-model:active="activeRange"
          shrink
          line-width="18"
          color="#FF976A"
          class="range-tabs"
        >
          <van-tab
            v-for="item in rangeOptions"
            :key="item.value"
            :title="item.label"
            :name="item.value"
          />
        </van-tabs>
      </div>

      <div ref="chartRef" class="echarts-dom"></div>

      <div v-if="loading" class="chart-loading">
        <van-loading color="#FF976A" />
      </div>

      <div v-if="!loading && !chartReady" class="chart-empty">
        {{ chartError || '暂无走势图数据' }}
      </div>

      <div v-if="isMockHistory && chartReady" class="chart-tip">
        当前基金历史接口暂不可用，已使用模拟走势进行展示
      </div>
    </div>

    <div class="mini-card-group">
      <div class="mini-card">
        <div class="mini-label">成本单价</div>
        <div class="mini-value">{{ formatMoney(fundInfo.costPrice) }}</div>
      </div>
      <div class="mini-card">
        <div class="mini-label">当前净值/估值</div>
        <div class="mini-value">{{ formatMoney(currentPrice) }}</div>
      </div>
      <div class="mini-card">
        <div class="mini-label">当日变化</div>
        <div :class="['mini-value', unitDiff >= 0 ? 'red' : 'green']">
          {{ signedMoney(unitDiff, 4) }}
        </div>
      </div>
      <div class="mini-card">
        <div class="mini-label">持仓市值</div>
        <div class="mini-value">¥{{ currentValue }}</div>
      </div>
    </div>

    <van-cell-group inset class="info-group">
      <van-cell title="基金代码" :value="fundInfo.code || '--'" />
      <van-cell title="持有份额" :value="formatNumber(fundInfo.shares)" />
      <van-cell title="持仓成本" :value="formatMoney(fundInfo.costPrice)" />
      <van-cell title="当前市值" :value="`¥${currentValue}`" />

      <van-cell title="单位成本线">
        <template #value>
          <span>{{ formatMoney(fundInfo.costPrice) }}</span>
        </template>
      </van-cell>

      <van-cell title="单位当日变化">
        <template #value>
          <span :class="unitDiff >= 0 ? 'red' : 'green'">
            {{ signedMoney(unitDiff, 4) }}
          </span>
        </template>
      </van-cell>

      <van-cell title="当日收益">
        <template #value>
          <span :class="dailyProfit >= 0 ? 'red' : 'green'">
            {{ signedMoney(dailyProfit) }}
          </span>
        </template>
      </van-cell>

      <van-cell title="当日收益率">
        <template #value>
          <span :class="currentChangeRate >= 0 ? 'red' : 'green'">
            {{ hasEstimate ? formatRate(currentChangeRate) : '--' }}
          </span>
        </template>
      </van-cell>

      <van-cell title="累计收益">
        <template #value>
          <span :class="totalProfit >= 0 ? 'red' : 'green'">
            {{ signedMoney(totalProfit) }}
          </span>
        </template>
      </van-cell>

      <van-cell title="累计收益率">
        <template #value>
          <span :class="totalProfitRate >= 0 ? 'red' : 'green'">
            {{ formatRate(totalProfitRate) }}
          </span>
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import * as echarts from 'echarts'
import { useFundStore } from '../store/fundStore'
import {
  RANGE_OPTIONS,
  formatRate,
  fetchFundHistory,
  buildChartData
} from '../services/detailService'

const route = useRoute()
const router = useRouter()
const store = useFundStore()

const chartRef = ref(null)
const loading = ref(true)
const chartReady = ref(false)
const chartError = ref('')
const activeRange = ref('1m')
const rangeOptions = RANGE_OPTIONS
const historyList = ref([])
const isMockHistory = ref(false)

let myChart = null

const fundInfo = computed(() => {
  return store.funds.find((f) => f.code === route.params.code) || {}
})

const currentPrice = computed(() => {
  return Number(fundInfo.value.gsz || fundInfo.value.dwjz || 0)
})

const currentPriceDisplay = computed(() => {
  const val = currentPrice.value
  return val ? formatMoney(val) : '--'
})

const currentChangeRate = computed(() => {
  return Number(fundInfo.value.gszzl || 0)
})

const hasEstimate = computed(() => {
  return Number(fundInfo.value.gsz || 0) > 0 && !!fundInfo.value.gztime
})

const unitDiff = computed(() => {
  return Number(fundInfo.value.gsz || fundInfo.value.dwjz || 0) - Number(fundInfo.value.dwjz || 0)
})

const dailyProfit = computed(() => {
  return Number(fundInfo.value.shares || 0) * unitDiff.value
})

const totalProfit = computed(() => {
  return Number(fundInfo.value.shares || 0) * (
    currentPrice.value - Number(fundInfo.value.costPrice || 0)
  )
})

const totalProfitRate = computed(() => {
  const totalCost = Number(fundInfo.value.shares || 0) * Number(fundInfo.value.costPrice || 0)
  if (!totalCost) return 0
  return (totalProfit.value / totalCost) * 100
})

const currentValue = computed(() => {
  const value = Number(fundInfo.value.shares || 0) * currentPrice.value
  return value.toFixed(2)
})

const formatMoney = (value) => Number(value || 0).toFixed(4)
const formatNumber = (value) => Number(value || 0).toFixed(2)
const signedMoney = (value, digits = 2) => {
  const num = Number(value || 0)
  return `${num >= 0 ? '+' : ''}${num.toFixed(digits)}`
}

const resizeHandler = () => {
  myChart?.resize()
}

const renderChart = async () => {
  const { dates, values } = buildChartData(historyList.value, activeRange.value)

  chartReady.value = false

  if (!chartRef.value || !dates.length || !values.length) {
    if (myChart) {
      myChart.dispose()
      myChart = null
    }
    return
  }

  await nextTick()

  if (myChart) {
    myChart.dispose()
  }

  myChart = echarts.init(chartRef.value)
  myChart.setOption({
    grid: { top: 30, left: '10%', right: '6%', bottom: '14%' },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const param = params[0] || {}
        const date = param.name
        const value = Number(param.value || 0)
        const costPrice = Number(fundInfo.value.costPrice || 0)
        const diffFromCost = value - costPrice
        const diffFromCostRate = costPrice
          ? ((diffFromCost / costPrice) * 100).toFixed(2)
          : '0.00'

        return `
          <div>${date}</div>
          <div>净值：${value.toFixed(4)}</div>
          <div>相对成本线偏离：${diffFromCost.toFixed(4)} (${diffFromCostRate}%)</div>
        `
      }
    },
    legend: {
      top: 0,
      right: 0,
      data: ['单位净值', '成本线']
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLabel: { color: '#999', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: '#999', fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed' } }
    },
    series: [
      {
        name: '单位净值',
        data: values,
        type: 'line',
        smooth: true,
        showSymbol: false,
        itemStyle: { color: '#FF976A' },
        lineStyle: { width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 151, 106, 0.35)' },
            { offset: 1, color: 'rgba(255, 151, 106, 0)' }
          ])
        },
        markLine: {
          symbol: 'none',
          label: {
            formatter: '成本线'
          },
          lineStyle: {
            type: 'dashed'
          },
          data: [
            {
              yAxis: Number(fundInfo.value.costPrice || 0)
            }
          ]
        }
      },
      {
        name: '成本线',
        type: 'line',
        showSymbol: false,
        data: values.map(() => Number(fundInfo.value.costPrice || 0)),
        lineStyle: {
          type: 'dashed',
          width: 1.5
        },
        emphasis: { disabled: true }
      }
    ]
  })

  chartReady.value = true
  resizeHandler()
}

const loadData = async () => {
  loading.value = true
  chartError.value = ''
  chartReady.value = false

  try {
    if (!store.funds.length) {
      await store.fetchFunds()
    }

    if (!fundInfo.value.code) {
      chartError.value = '未找到该基金持仓信息'
      return
    }

    await store.updatePrices()

    const historyResult = await fetchFundHistory(
      route.params.code,
      Number(
        fundInfo.value.dwjz ||
        fundInfo.value.gsz ||
        fundInfo.value.costPrice ||
        1
      )
    )

    historyList.value = historyResult.list
    isMockHistory.value = historyResult.isMock

    if (!historyList.value.length) {
      chartError.value = '该基金暂不支持历史走势'
      return
    }

    await renderChart()
  } catch (error) {
    console.error('获取详情数据失败:', error)
    chartError.value = '数据加载失败，请稍后重试'
    showToast('详情数据加载失败')
  } finally {
    loading.value = false
  }
}

watch(activeRange, async () => {
  if (!historyList.value.length) return
  await renderChart()
})

watch(
  () => route.params.code,
  async () => {
    await loadData()
  }
)

onMounted(async () => {
  await loadData()
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  if (myChart) {
    myChart.dispose()
    myChart = null
  }
  window.removeEventListener('resize', resizeHandler)
})
</script>

<style scoped>
.detail-container {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 20px;
}

.detail-header {
  background: white;
  padding: 20px;
  margin-bottom: 10px;
}

.d-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 8px;
}

.d-value {
  font-size: clamp(24px, 7vw, 30px);
  font-weight: bold;
}

.d-rate {
  font-size: 20px;
  font-weight: bold;
  margin-top: 5px;
}

.header-sub-info {
  margin-top: 16px;
  display: flex;
  gap: 12px;
}

.sub-item {
  flex: 1;
  background: #f7f8fa;
  border-radius: 10px;
  padding: 10px 12px;
}

.sub-label {
  display: block;
  font-size: 12px;
  color: #969799;
  margin-bottom: 6px;
}

.sub-value {
  font-size: 16px;
  font-weight: 600;
}

.update-tip {
  margin-top: 12px;
  font-size: 12px;
  color: #969799;
}

.trend-card {
  background: white;
  margin: 10px;
  padding: 15px;
  border-radius: 12px;
  position: relative;
}

.trend-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.trend-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-title {
  font-size: 14px;
  font-weight: bold;
  color: #323233;
}

.mock-tag {
  font-size: 12px;
  color: #ff976a;
  background: rgba(255, 151, 106, 0.12);
  padding: 4px 8px;
  border-radius: 999px;
}

.range-tabs {
  flex: 1;
  min-width: 0;
}

.range-tabs :deep(.van-tabs__wrap) {
  height: 32px;
}

.range-tabs :deep(.van-tab) {
  font-size: 12px;
  padding: 0 8px;
}

.echarts-dom {
  width: 100%;
  height: clamp(260px, 48vw, 360px);
}

.chart-loading,
.chart-empty {
  position: absolute;
  left: 50%;
  top: 58%;
  transform: translate(-50%, -50%);
  color: #969799;
  text-align: center;
  width: 80%;
}

.chart-tip {
  margin-top: 10px;
  font-size: 12px;
  color: #969799;
}

.mini-card-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 10px;
}

.mini-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
}

.mini-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 8px;
}

.mini-value {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.info-group {
  margin-top: 15px;
}

.red {
  color: #ee0a24;
}

.green {
  color: #07c160;
}

@media (min-width: 768px) {
  .detail-container {
    max-width: 760px;
    margin: 0 auto;
  }
}
</style>