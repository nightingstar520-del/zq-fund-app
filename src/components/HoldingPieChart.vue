<template>
  <div class="pie-card">
    <div class="card-title">持仓占比</div>
    <div v-if="chartData.length" ref="chartRef" class="pie-chart"></div>
    <van-empty v-else description="暂无持仓数据" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as echarts from "echarts";


const emit = defineEmits(['select'])
const props = defineProps({
  chartData: {
    type: Array,
    default: () => [],
  },
});

const chartRef = ref(null);
let chartInstance = null;

const resizeHandler = () => {
  chartInstance?.resize();
};

const renderChart = async () => {
  if (!chartRef.value || !props.chartData.length) return;

  await nextTick();

  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = echarts.init(chartRef.value);
  chartInstance.setOption({
    tooltip: {
      trigger: "item",
      formatter: "{b}<br/>市值：¥{c}<br/>占比：{d}%",
    },
    title: {
      text: `总资产\n¥${props.chartData.reduce((sum, item) => sum + item.value, 0).toFixed(2)}`,
      left: "center",
      top: "34%",
      textAlign: "center",
      textStyle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#323233",
        lineHeight: 22,
      },
    },
    legend: {
      bottom: 0,
      left: "center",
      type: "scroll",
      textStyle: {
        fontSize: 12,
        color: "#666",
      },
    },
    series: [
      {
        name: "持仓占比",
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: "{b}\n{d}%",
          fontSize: 11,
        },
        labelLine: {
          length: 10,
          length2: 8,
        },
        data: props.chartData,
      },
    ],
  });

  chartInstance.off('click')
chartInstance.on('click', (params) => {
  if (params.data?.code) {
    emit('select', params.data.code)
  }
})
};

watch(
  () => props.chartData,
  () => {
    if (props.chartData.length) {
      renderChart();
    } else if (chartInstance) {
      chartInstance.dispose();
      chartInstance = null;
    }
  },
  { deep: true },
);

onMounted(() => {
  if (props.chartData.length) {
    renderChart();
  }
  window.addEventListener("resize", resizeHandler);
});

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  window.removeEventListener("resize", resizeHandler);
});
</script>

<style scoped>
.pie-card {
  background: #fff;
  margin: 10px;
  padding: 15px;
  border-radius: 12px;
}

.card-title {
  font-size: 14px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 10px;
}

.pie-chart {
  width: 100%;
  height: 320px;
}
</style>
