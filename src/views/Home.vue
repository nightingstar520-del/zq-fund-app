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
  min-height: 100vh;
  padding-bottom: 92px;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.12), transparent 24%),
    radial-gradient(circle at top left, rgba(255, 138, 61, 0.14), transparent 28%),
    linear-gradient(180deg, #eef6ff 0%, #f7fbff 52%, #fcfdff 100%);
}

.home-container {
  background: red !important;
}

.assets-card {
  position: relative;
  overflow: hidden;
  margin: 12px 10px 14px;
  padding: 22px 18px;
  border-radius: 24px;
  color: white;
  background:
    linear-gradient(
      135deg,
      rgba(255, 138, 61, 0.96) 0%,
      rgba(255, 106, 61, 0.94) 38%,
      rgba(59, 130, 246, 0.92) 100%
    );
  box-shadow:
    0 16px 38px rgba(255, 106, 61, 0.22),
    0 10px 28px rgba(59, 130, 246, 0.14);
}

.assets-card::before {
  content: "";
  position: absolute;
  top: -36px;
  right: -36px;
  width: 148px;
  height: 148px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
}

.assets-card::after {
  content: "";
  position: absolute;
  bottom: -42px;
  left: -18px;
  width: 126px;
  height: 126px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.09);
}

.total-amount {
  position: relative;
  z-index: 1;
  font-size: clamp(30px, 7vw, 38px);
  font-weight: 800;
  letter-spacing: 0.6px;
  margin: 14px 0 18px;
  word-break: break-all;
}

.label {
  position: relative;
  z-index: 1;
  font-size: 12px;
  opacity: 0.88;
  margin-bottom: 5px;
  letter-spacing: 0.2px;
}

.value {
  position: relative;
  z-index: 1;
  font-size: 20px;
  font-weight: 700;
}

.footer-row {
  position: relative;
  z-index: 1;
  font-size: 13px;
  opacity: 0.95;
}

.assets-card .red,
.assets-card .green {
  color: #fff !important;
  background: rgba(255, 255, 255, 0.16);
  padding: 2px 8px;
  border-radius: 999px;
  display: inline-block;
}

.trend-summary-card {
  margin: 0 10px 14px;
  padding: 16px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.90) 0%, rgba(248,251,255,0.86) 100%);
  border: 1px solid rgba(255, 255, 255, 0.56);
  box-shadow: 0 10px 28px rgba(37, 99, 235, 0.08);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.trend-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.2px;
}

.trend-time {
  font-size: 12px;
  color: #94a3b8;
  text-align: right;
  line-height: 1.5;
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.trend-item {
  background: linear-gradient(180deg, #f8fbff 0%, #f3f8ff 100%);
  border-radius: 14px;
  padding: 12px 10px;
  border: 1px solid rgba(59, 130, 246, 0.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
}

.trend-label {
  font-size: 12px;
  color: #7b8aa5;
  margin-bottom: 8px;
  line-height: 1.45;
}

.trend-value {
  font-size: 16px;
  font-weight: 700;
  word-break: break-all;
}

.tools-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 2px;
}

.tools-bar :deep(.van-search) {
  flex: 1;
  padding: 0;
}

.sort-select {
  height: 34px;
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 18px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.90);
  color: #334155;
  font-size: 12px;
  box-shadow: 0 6px 14px rgba(59, 130, 246, 0.06);
  outline: none;
}

.search-suggest-wrap {
  padding: 0 10px;
}

.suggest-box {
  margin-top: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.56);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.suggest-item {
  padding: 10px 2px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.10);
  font-size: 14px;
  color: #334155;
}

.suggest-item:last-child {
  border-bottom: none;
}

.list-section {
  margin-top: 14px;
}

.section-header {
  padding: 0 16px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
}

.fund-card {
  position: relative;
  margin: 0 10px 12px;
  padding: 15px 14px;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.84) 100%);
  border: 1px solid rgba(255, 255, 255, 0.58);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.fund-card:active {
  transform: scale(0.99);
}

.fund-main {
  min-width: 0;
  flex: 1;
}

.batch-check-wrap {
  margin-bottom: 8px;
}

.top-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.2px;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.meta-row {
  margin-top: 9px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}

.meta-row span {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.06);
}

.fund-stats {
  text-align: right;
  min-width: 104px;
}

.rate {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.3px;
}

.profit-line {
  font-size: 12px;
  margin-top: 4px;
  font-weight: 600;
}

.profit {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.expand-action {
  margin-top: 8px;
  font-size: 12px;
  color: #ff7c3b;
  font-weight: 600;
  cursor: pointer;
}

.fund-extra {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(148, 163, 184, 0.24);
}

.extra-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.extra-item {
  background: linear-gradient(180deg, #f8fbff 0%, #f3f7fb 100%);
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.10);
}

.extra-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.extra-value {
  font-size: 14px;
  color: #334155;
  font-weight: 600;
  word-break: break-all;
}

.sort-select:focus,
.sort-select:active {
  border-color: rgba(255, 138, 61, 0.26);
}

.batch-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  margin: 10px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.90);
  border: 1px solid rgba(255, 255, 255, 0.56);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.batch-info {
  font-size: 13px;
  color: #64748b;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  height: 100%;
}

.loading {
  margin: 8px 10px;
  padding: 12px;
  text-align: center;
  color: #64748b;
  background: rgba(255,255,255,0.84);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.error {
  margin: 8px 10px;
  padding: 12px;
  color: #ff6b57;
  text-align: center;
  background: rgba(255,255,255,0.84);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

@media (max-width: 560px) {
  .trend-grid {
    grid-template-columns: 1fr;
  }

  .trend-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .trend-time {
    text-align: left;
  }

  .tools-bar {
    flex-wrap: wrap;
  }

  .sort-select {
    flex: 1;
    min-width: 120px;
  }
}

@media (min-width: 768px) {
  .home-container {
    max-width: 760px;
    margin: 0 auto;
  }
}
</style>