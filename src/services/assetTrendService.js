// src/services/assetTrendService.js
const STORAGE_KEY = 'asset_trend_snapshots'
const MAX_RECORDS = 90

function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getAssetSnapshots() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch (error) {
    console.error('读取资产趋势快照失败：', error)
    return []
  }
}

export function saveAssetSnapshots(list = []) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function recordAssetSnapshot(totalMarketValue, totalProfit) {
  const today = getTodayKey()
  const snapshots = getAssetSnapshots()
  const nowTime = new Date().toLocaleString()

  const nextSnapshots = [...snapshots]
  const index = nextSnapshots.findIndex(item => item.date === today)

  const payload = {
    date: today,
    totalMarketValue: Number(totalMarketValue || 0),
    totalProfit: Number(totalProfit || 0),
    updatedAt: nowTime
  }

  if (index >= 0) {
    nextSnapshots[index] = payload
  } else {
    nextSnapshots.push(payload)
  }

  const trimmed = nextSnapshots.slice(-MAX_RECORDS)
  saveAssetSnapshots(trimmed)
  return trimmed
}

export function getTrendSummary() {
  const snapshots = getAssetSnapshots()
  const latest = snapshots[snapshots.length - 1]

  if (!latest) {
    return {
      lastUpdatedAt: '--',
      weekChange: 0,
      monthChange: 0,
      hasData: false
    }
  }

  const getBaseValue = (days) => {
    if (snapshots.length <= days) {
      return snapshots[0]?.totalMarketValue ?? latest.totalMarketValue
    }
    return snapshots[snapshots.length - 1 - days]?.totalMarketValue ?? latest.totalMarketValue
  }

  const weekBase = getBaseValue(7)
  const monthBase = getBaseValue(30)

  return {
    lastUpdatedAt: latest.updatedAt || '--',
    weekChange: Number(latest.totalMarketValue || 0) - Number(weekBase || 0),
    monthChange: Number(latest.totalMarketValue || 0) - Number(monthBase || 0),
    hasData: true
  }
}