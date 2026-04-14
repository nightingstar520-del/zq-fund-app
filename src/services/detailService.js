// src/services/detailService.js
import axios from 'axios'

const WORKER_BASE_URL = 'https://zq-fund-proxy.nightingstar520.workers.dev'

export const RANGE_OPTIONS = [
  { label: '近1月', value: '1m', days: 30 },
  { label: '近3月', value: '3m', days: 90 },
  { label: '近1年', value: '1y', days: 365 }
]

export function formatRate(value) {
  const num = Number(value || 0)
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

export function pickHistoryList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.Datas)) return data.Datas
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.Data)) return data.Data
  if (Array.isArray(data.LSJZList)) return data.LSJZList
  if (Array.isArray(data.Trend)) return data.Trend
  if (Array.isArray(data.Series)) return data.Series
  return []
}

export function parseDate(item) {
  return String(
    item?.FSRQ ??
    item?.JZRQ ??
    item?.date ??
    item?.DATE ??
    item?.x ??
    ''
  )
}

export function parseDisplayDate(item) {
  const raw = parseDate(item)
  if (!raw) return ''
  if (raw.includes('-')) return raw.slice(5, 10)
  return raw
}

export function parseValue(item) {
  const value = Number(
    item?.DWJZ ??
    item?.NETVALUE ??
    item?.UnitNetWorth ??
    item?.value ??
    item?.y ??
    item?.NAV ??
    0
  )
  return Number.isFinite(value) ? value : 0
}

export function filterHistoryByRange(historyList = [], range = '1m') {
  const option = RANGE_OPTIONS.find((item) => item.value === range) || RANGE_OPTIONS[0]
  return historyList.slice(-option.days)
}

export function buildChartData(historyList = [], range = '1m') {
  const filtered = filterHistoryByRange(historyList, range)

  return {
    dates: filtered.map(parseDisplayDate),
    values: filtered.map(parseValue)
  }
}

export function buildMockHistory(currentValue = 1, days = 365) {
  const list = []
  const base = Number(currentValue || 1) || 1

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)

    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')

    const drift = Math.sin(i / 12) * 0.03
    const noise = (Math.random() - 0.5) * 0.02
    const value = Math.max(0.01, base * (1 + drift + noise))

    list.push({
      date: `${y}-${m}-${d}`,
      value: Number(value.toFixed(4))
    })
  }

  return list
}

async function fetchFromWorker(code) {
  try {
    const res = await axios.get(`${WORKER_BASE_URL}/api/fund-history`, {
      params: { code }
    })

    const responseData =
      typeof res.data === 'string' ? JSON.parse(res.data) : res.data

    const historyList = pickHistoryList(responseData)
      .map((item) => {
        const date = parseDate(item)
        const value = parseValue(item)
        return { date, value }
      })
      .filter((item) => item.date && Number.isFinite(item.value) && item.value > 0)

    return historyList
  } catch (error) {
    console.warn('Worker 历史净值接口失败：', error)
    return []
  }
}

export async function fetchFundHistory(code, fallbackValue = 1) {
  const realList = await fetchFromWorker(code)

  if (realList.length) {
    return {
      list: realList,
      isMock: false,
      source: 'worker'
    }
  }

  return {
    list: buildMockHistory(fallbackValue, 365),
    isMock: true,
    source: 'mock'
  }
}