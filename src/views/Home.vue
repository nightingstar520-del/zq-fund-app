<template>
  <div class="home-container">
    <van-nav-bar title="我的基金看板" fixed placeholder />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="assets-card">
        <div class="label">总资产（元）</div>
        <div class="total-amount">¥{{ totalMarketValue.toFixed(2) }}</div>
        <van-row gutter="12">
          <van-col span="12">
            <div class="label">今日预估盈亏</div>
            <div :class="['value', totalDailyProfit >= 0 ? 'red' : 'green']">
              {{ totalDailyProfit >= 0 ? "+" : "" }}{{ totalDailyProfit.toFixed(2) }}
            </div>
          </van-col>
          <van-col span="12">
            <div class="label">累计收益</div>
            <div :class="['value', totalAllProfit >= 0 ? 'red' : 'green']">
              {{ totalAllProfit >= 0 ? "+" : "" }}{{ totalAllProfit.toFixed(2) }}
            </div>
          </van-col>
        </van-row>
        <van-row class="footer-row" style="margin-top: 16px">
          <van-col span="12">总涨幅：{{ formatRate(totalAllRate) }}</van-col>
          <van-col span="12">当日涨幅：{{ formatRate(totalDailyRate) }}</van-col>
        </van-row>
      </div>

      <div class="trend-summary-card">
        <div class="trend-header">
          <div class="trend-title">资产趋势</div>
          <div class="trend-time">
            最近记录：{{ trendSummary.lastUpdatedAt }}
          </div>
        </div>

        <div class="trend-grid">
          <div class="trend-item">
            <div class="trend-label">近7日变化</div>
            <div
              :class="[
                'trend-value',
                trendSummary.weekChange >= 0 ? 'red' : 'green',
              ]"
            >
              {{ signedMoney(trendSummary.weekChange) }}
            </div>
          </div>
          <div class="trend-item">
            <div class="trend-label">近30日变化</div>
            <div
              :class="[
                'trend-value',
                trendSummary.monthChange >= 0 ? 'red' : 'green',
              ]"
            >
              {{ signedMoney(trendSummary.monthChange) }}
            </div>
          </div>
          <div class="trend-item">
            <div class="trend-label">当前累计收益</div>
            <div
              :class="['trend-value', totalAllProfit >= 0 ? 'red' : 'green']"
            >
              {{ signedMoney(totalAllProfit) }}
            </div>
          </div>
        </div>
      </div>

      <HoldingPieChart :chart-data="pieChartData" @select="goDetail" />

      <div class="tools-bar">
        <van-search
          v-model="keyword"
          shape="round"
          background="transparent"
          placeholder="搜索基金代码 / 名称"
        />
        <select v-model="sortType" class="sort-select">
          <option value="default">默认排序</option>
          <option value="profitRate">按收益率</option>
          <option value="marketValue">按持仓市值</option>
          <option value="dailyRate">按涨跌幅</option>
        </select>
        <van-button
          round
          plain
          type="primary"
          size="small"
          @click="toggleBatchMode"
        >
          {{ batchMode ? "取消批量" : "批量管理" }}
        </van-button>
        <van-button round type="primary" size="small" @click="openAdd">
          添加基金
        </van-button>
      </div>

      <div v-if="suggestions.length" class="search-suggest-wrap">
        <div class="suggest-box">
          <div
            v-for="item in suggestions"
            :key="item.code"
            class="suggest-item"
            @click="quickFill(item)"
          >
            {{ item.name }}（{{ item.code }}）
          </div>
        </div>
      </div>

      <div class="list-section">
        <div class="section-header">
          <span>我的持仓（{{ displayFunds.length }}）</span>
        </div>

        <van-empty
          v-if="!displayFunds.length"
          description="暂无符合条件的基金"
        />

        <van-swipe-cell v-for="fund in displayFunds" :key="fund.code">
          <div
            class="fund-card"
            @click="batchMode ? toggleSelect(fund.code) : goDetail(fund.code)"
          >
            <div>
              <div class="fund-main">
                <div v-if="batchMode" class="batch-check-wrap">
                  <van-checkbox
                    :model-value="isSelected(fund.code)"
                    @click.stop="toggleSelect(fund.code)"
                  />
                </div>
                <div class="top-line">
                  <div class="name ellipsis">{{ fund.name }}</div>
                </div>
                <div class="code">{{ fund.code }}</div>
                <div class="meta-row">
                  <span>份额 {{ formatNumber(fund.shares) }}</span>
                  <span>成本 {{ formatMoney(fund.costPrice) }}</span>
                  <span>现价 {{ formatMoney(fund.gsz || fund.dwjz) }}</span>
                  <span>
                    占比
                    {{ formatRate(fund.assetPercent).replace("+", "") }}
                  </span>
                </div>
              </div>
            </div>

            <div class="fund-stats">
              <div :class="['rate', (fund.gszzl || 0) >= 0 ? 'red' : 'green']">
                {{ formatRate(fund.gszzl || 0) }}
              </div>
              <div
                :class="[
                  'profit-line',
                  getFundTotalProfit(fund) >= 0 ? 'red' : 'green',
                ]"
              >
                累计 {{ signedMoney(getFundTotalProfit(fund)) }}
              </div>
              <div
                :class="[
                  'profit-line',
                  getFundDailyProfit(fund) >= 0 ? 'red' : 'green',
                ]"
              >
                今日 {{ signedMoney(getFundDailyProfit(fund)) }}
              </div>
              <div class="profit">收益率 {{ formatRate(fund.profitRate) }}</div>
              <div class="profit">市值 ¥{{ fund.marketValue.toFixed(2) }}</div>
              <div class="expand-action" @click.stop="toggleExpand(fund.code)">
                {{ isExpanded(fund.code) ? "收起详情" : "展开详情" }}
              </div>
            </div>

            <div v-if="isExpanded(fund.code)" class="fund-extra">
              <div class="extra-grid">
                <div class="extra-item">
                  <div class="extra-label">持仓市值</div>
                  <div class="extra-value">
                    ¥{{ fund.marketValue.toFixed(2) }}
                  </div>
                </div>
                <div class="extra-item">
                  <div class="extra-label">资产占比</div>
                  <div class="extra-value">
                    {{ fund.assetPercent.toFixed(2) }}%
                  </div>
                </div>
                <div class="extra-item">
                  <div class="extra-label">单位成本</div>
                  <div class="extra-value">
                    {{ formatMoney(fund.costPrice) }}
                  </div>
                </div>
                <div class="extra-item">
                  <div class="extra-label">单位当日变化</div>
                  <div
                    :class="[
                      'extra-value',
                      Number(fund.gsz || fund.dwjz || 0) -
                        Number(fund.dwjz || 0) >= 0
                        ? 'red'
                        : 'green',
                    ]"
                  >
                    {{
                      signedMoney(
                        Number(fund.gsz || fund.dwjz || 0) -
                          Number(fund.dwjz || 0)
                      )
                    }}
                  </div>
                </div>
                <div class="extra-item">
                  <div class="extra-label">估值时间</div>
                  <div class="extra-value">
                    {{ formatDateTime(fund.gztime) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <template #right>
            <van-button
              square
              type="warning"
              text="编辑"
              class="action-button"
              @click="openEdit(fund)"
            />
            <van-button
              square
              type="danger"
              text="删除"
              class="action-button"
              @click="store.removeFund(fund.code)"
            />
          </template>
        </van-swipe-cell>
      </div>

      <div v-if="batchMode" class="batch-bar">
        <div class="batch-info">已选 {{ selectedCodes.length }} 项</div>
        <div class="batch-actions">
          <van-button size="small" type="danger" @click="batchDelete">
            批量删除
          </van-button>
        </div>
      </div>
    </van-pull-refresh>

    <van-dialog
      v-model:show="showEditor"
      :title="editorMode === 'add' ? '添加基金' : '编辑持仓'"
      show-cancel-button
      @confirm="confirmSave"
      @closed="resetForm"
    >
      <van-cell-group inset>
        <van-field
          v-model="form.code"
          label="基金代码"
          placeholder="请输入 6 位基金代码"
          :readonly="editorMode === 'edit'"
        />
        <van-field
          v-model="form.shares"
          label="持有份额"
          type="number"
          placeholder="请输入份额"
        />
        <van-field
          v-model="form.costPrice"
          label="成本单价"
          type="number"
          placeholder="请输入平均成本价"
        />
        <van-field
          v-model="form.name"
          label="基金名称"
          placeholder="可不填，更新估值后自动获取"
        />
      </van-cell-group>
    </van-dialog>
  </div>

  <div v-if="store.loading" class="loading">加载中...</div>

  <div v-if="store.error" class="error">
    {{ store.error }}
    <button @click="store.error = null">关闭</button>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { useFundStore } from "../store/fundStore";
import { searchFunds } from "../services/fundService";
import HoldingPieChart from "../components/HoldingPieChart.vue";
import { getTrendSummary } from "../services/assetTrendService";

const store = useFundStore();
const router = useRouter();

const funds = computed(() => store.funds);
const totalMarketValue = computed(() => store.totalMarketValue);
const totalDailyProfit = computed(() => store.totalDailyProfit);
const totalAllProfit = computed(() => store.totalAllProfit);

const keyword = ref("");
const suggestions = ref([]);
const refreshing = ref(false);
const showEditor = ref(false);
const editorMode = ref("add");

const sortType = ref("default");
const batchMode = ref(false);
const selectedCodes = ref([]);
const expandedCodes = ref([]);

const trendSummary = ref({
  lastUpdatedAt: "--",
  weekChange: 0,
  monthChange: 0,
  hasData: false,
});

const form = ref({
  code: "",
  shares: "",
  costPrice: "",
  name: "",
});

let timer = null;

watch(keyword, (val) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const text = String(val || "").trim();
    suggestions.value = text ? searchFunds(text) : [];
  }, 300);
});

const pieChartData = computed(() => {
  return funds.value
    .map((fund) => {
      const unitPrice = Number(fund.gsz || fund.dwjz || 0);
      const marketValue = Number(fund.shares || 0) * unitPrice;
      return {
        name: fund.name || fund.code,
        value: Number(marketValue.toFixed(2)),
        code: fund.code,
      };
    })
    .filter((item) => item.value > 0);
});

const totalAllRate = computed(() => {
  return store.totalCost === 0
    ? 0
    : (totalAllProfit.value / store.totalCost) * 100;
});

const totalDailyRate = computed(() => {
  const lastDayValue = totalMarketValue.value - totalDailyProfit.value;
  return lastDayValue === 0 ? 0 : (totalDailyProfit.value / lastDayValue) * 100;
});

const displayFunds = computed(() => {
  const text = keyword.value.trim().toLowerCase();

  let list = funds.value.map((fund) => ({
    ...fund,
    marketValue: getFundMarketValue(fund),
    profitRate: getFundProfitRate(fund),
    dailyProfit: getFundDailyProfit(fund),
    totalProfit: getFundTotalProfit(fund),
    assetPercent: getFundAssetPercent(fund),
  }));

  if (text) {
    list = list.filter((item) => {
      return (
        String(item.code).includes(text) ||
        String(item.name || "").toLowerCase().includes(text)
      );
    });
  }

  if (sortType.value === "profitRate") {
    list.sort((a, b) => b.profitRate - a.profitRate);
  } else if (sortType.value === "marketValue") {
    list.sort((a, b) => b.marketValue - a.marketValue);
  } else if (sortType.value === "dailyRate") {
    list.sort((a, b) => Number(b.gszzl || 0) - Number(a.gszzl || 0));
  }

  return list;
});

const formatMoney = (value) => Number(value || 0).toFixed(4);
const formatNumber = (value) => Number(value || 0).toFixed(2);
const formatRate = (value) =>
  `${Number(value || 0) >= 0 ? "+" : ""}${Number(value || 0).toFixed(2)}%`;
const signedMoney = (value) =>
  `${Number(value || 0) >= 0 ? "+" : ""}${Number(value || 0).toFixed(2)}`;

const getFundDailyProfit = (fund) => {
  const currentPrice = Number(fund.gsz || fund.dwjz || 0);
  const lastPrice = Number(fund.dwjz || 0);
  return Number(fund.shares || 0) * (currentPrice - lastPrice);
};

const getFundTotalProfit = (fund) => {
  const currentPrice = Number(fund.gsz || fund.dwjz || 0);
  return Number(fund.shares || 0) * (currentPrice - Number(fund.costPrice || 0));
};

const getFundProfitRate = (fund) => {
  const cost = Number(fund.shares || 0) * Number(fund.costPrice || 0);
  if (!cost) return 0;
  return (getFundTotalProfit(fund) / cost) * 100;
};

const getFundMarketValue = (fund) => {
  const currentPrice = Number(fund.gsz || fund.dwjz || 0);
  return Number(fund.shares || 0) * currentPrice;
};

const getFundAssetPercent = (fund) => {
  if (!totalMarketValue.value) return 0;
  return (getFundMarketValue(fund) / totalMarketValue.value) * 100;
};

const isSelected = (code) => selectedCodes.value.includes(code);

const toggleSelect = (code) => {
  if (isSelected(code)) {
    selectedCodes.value = selectedCodes.value.filter((item) => item !== code);
  } else {
    selectedCodes.value.push(code);
  }
};

const toggleBatchMode = () => {
  batchMode.value = !batchMode.value;
  selectedCodes.value = [];
};

const batchDelete = async () => {
  if (!selectedCodes.value.length) {
    showToast("请先选择基金");
    return;
  }

  for (const code of selectedCodes.value) {
    await store.removeFund(code);
  }

  selectedCodes.value = [];
  batchMode.value = false;
  await store.updatePrices();
  await loadTrendSummary();
  showToast("批量删除成功");
};

const isExpanded = (code) => expandedCodes.value.includes(code);

const toggleExpand = (code) => {
  if (isExpanded(code)) {
    expandedCodes.value = expandedCodes.value.filter((item) => item !== code);
  } else {
    expandedCodes.value.push(code);
  }
};

const formatDateTime = (value) => {
  return value || "--";
};

const resetForm = () => {
  form.value = {
    code: "",
    shares: "",
    costPrice: "",
    name: "",
  };
};

const openAdd = () => {
  editorMode.value = "add";
  resetForm();
  showEditor.value = true;
};

const openEdit = (fund) => {
  editorMode.value = "edit";
  form.value = {
    code: fund.code,
    shares: String(fund.shares),
    costPrice: String(fund.costPrice),
    name: fund.name || "",
  };
  showEditor.value = true;
};

const quickFill = (item) => {
  openAdd();
  form.value.code = item.code;
  form.value.name = item.name;
  suggestions.value = [];
};

const validateForm = () => {
  const code = String(form.value.code).trim();
  const shares = Number(form.value.shares);
  const costPrice = Number(form.value.costPrice);
  const name = String(form.value.name || "").trim();

  if (!/^\d{6}$/.test(code)) {
    showToast("请输入正确的 6 位基金代码");
    return null;
  }
  if (!(shares > 0)) {
    showToast("持有份额必须大于 0");
    return null;
  }
  if (!(costPrice >= 0)) {
    showToast("成本单价不能小于 0");
    return null;
  }
  if (
    editorMode.value === "add" &&
    funds.value.some((item) => item.code === code)
  ) {
    showToast("该基金已经添加过了");
    return null;
  }

  return {
    code,
    shares,
    costPrice,
    name: name || "加载中...",
  };
};

const confirmSave = async () => {
  const payload = validateForm();
  if (!payload) return false;

  if (editorMode.value === "add") {
    await store.addFund({
      ...payload,
      gsz: 0,
      gszzl: 0,
      dwjz: 0,
    });
  } else {
    await store.updateFund(payload.code, payload);
  }

  await store.updatePrices();
  await loadTrendSummary();
  showEditor.value = false;
  showToast(editorMode.value === "add" ? "添加成功" : "更新成功");
  resetForm();
  keyword.value = "";
  suggestions.value = [];
  return true;
};

const onRefresh = async () => {
  refreshing.value = true;
  await store.initHomeData();
  await endSummary();
  refreshing.value = false;
};

const goDetail = (code) => {
  router.push(`/detail/${code}`);
};

const loadTrendSummary = async () => {
  trendSummary.value = await getTrendSummary();
};

onMounted(async () => {
  await store.initHomeData();
  await loadTrendSummary();
});
</script>

<style scoped>
.home-container {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 80px;
}

.assets-card {
  background: linear-gradient(135deg, #ff976a 0%, #ffbb43 100%);
  color: white;
  padding: 22px 18px;
  margin: 10px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(255, 151, 106, 0.3);
}

.total-amount {
  font-size: clamp(28px, 7vw, 34px);
  font-weight: bold;
  margin: 15px 0;
  word-break: break-all;
}

.label {
  font-size: 12px;
  opacity: 0.86;
  margin-bottom: 5px;
}

.value {
  font-size: 18px;
  font-weight: bold;
}

.footer-row {
  font-size: 13px;
  opacity: 0.95;
}

.tools-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 0;
}

.tools-bar :deep(.van-search) {
  flex: 1;
  padding: 0;
}

.search-suggest-wrap {
  padding: 0 10px;
}

.suggest-box {
  background: #fff;
  border-radius: 8px;
  margin-top: 6px;
  padding: 5px 10px;
}

.suggest-item {
  padding: 8px 0;
  border-bottom: 1px solid #f2f2f2;
  font-size: 14px;
}

.suggest-item:last-child {
  border-bottom: none;
}

.list-section {
  margin-top: 12px;
}

.section-header {
  padding: 0 20px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #646566;
}

.fund-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.expand-action {
  margin-top: 6px;
  font-size: 12px;
  color: #ff976a;
  cursor: pointer;
}

.fund-extra {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ebedf0;
}

.extra-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.extra-item {
  background: #f7f8fa;
  border-radius: 10px;
  padding: 10px 12px;
}

.extra-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 6px;
}

.extra-value {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
  word-break: break-all;
}

.fund-card {
  background: white;
  margin: 0 10px 10px;
  padding: 14px;
  border-radius: 12px;
}

.fund-main {
  min-width: 0;
  flex: 1;
}

.top-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
}

.meta-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #646566;
}

.fund-stats {
  text-align: right;
  min-width: 96px;
}

.rate {
  font-size: 18px;
  font-weight: bold;
}

.profit-line {
  font-size: 12px;
  margin-top: 3px;
}

.profit {
  font-size: 12px;
  color: #969799;
  margin-top: 3px;
}

.sort-select {
  height: 32px;
  border: 1px solid #dcdee0;
  border-radius: 16px;
  padding: 0 10px;
  background: #fff;
  color: #323233;
  font-size: 12px;
}

.batch-check-wrap {
  margin-bottom: 8px;
}

.batch-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  background: #fff;
  border-top: 1px solid #f2f3f5;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.batch-info {
  font-size: 13px;
  color: #646566;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.red {
  color: #ee0a24 !important;
}

.green {
  color: #07c160 !important;
}

.assets-card .red,
.assets-card .green {
  color: white !important;
  background: rgba(255, 255, 255, 0.18);
  padding: 0 5px;
  border-radius: 4px;
}

.action-button {
  height: 100%;
}

.trend-summary-card {
  background: #fff;
  margin: 10px;
  padding: 14px;
  border-radius: 12px;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.trend-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.trend-time {
  font-size: 12px;
  color: #969799;
  text-align: right;
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.trend-item {
  background: #f7f8fa;
  border-radius: 10px;
  padding: 12px 10px;
}

.trend-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 8px;
}

.trend-value {
  font-size: 16px;
  font-weight: 600;
  word-break: break-all;
}

.loading {
  padding: 10px;
  text-align: center;
  color: #666;
}

.error {
  padding: 10px;
  color: red;
  text-align: center;
}

@media (min-width: 768px) {
  .home-container {
    max-width: 760px;
    margin: 0 auto;
  }
}
</style>