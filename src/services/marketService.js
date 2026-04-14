// src/services/marketService.js
import axios from 'axios'

const WORKER_BASE_URL = 'https://zq-fund-proxy.nightingstar520.workers.dev'

const DEFAULT_INDEX_LIST = [
  { name: '上证指数', symbol: 's_sh000001', price: '--', rate: 0, diff: 0 },
  { name: '创业板指', symbol: 's_sz399006', price: '--', rate: 0, diff: 0 },
  { name: '恒生指数', symbol: 'int_hangseng', price: '--', rate: 0, diff: 0 },
  { name: '纳斯达克', symbol: 'int_nasdaq', price: '--', rate: 0, diff: 0 },
  { name: '标普500', symbol: 'int_sp500', price: '--', rate: 0, diff: 0 },
  { name: '日经225', symbol: 'int_nikkei', price: '--', rate: 0, diff: 0 },
  { name: '韩国KOSPI', symbol: 'int_kospi', price: '--', rate: 0, diff: 0 },
  { name: '德国DAX', symbol: 'int_dax', price: '--', rate: 0, diff: 0 },
  { name: '富时100', symbol: 'int_ftse', price: '--', rate: 0, diff: 0 }
]

const DEFAULT_INDUSTRY_DATA = [
  {
    name: '科技核心',
    list: [
      { label: '半导体ETF', code: '512480', rate: 0 },
      { label: '人工智能ETF', code: '515070', rate: 0 },
      { label: '恒生科技ETF', code: '513130', rate: 0 }
    ]
  },
  {
    name: '大消费',
    list: [
      { label: '酒ETF', code: '512690', rate: 0 },
      { label: '食品饮料ETF', code: '515170', rate: 0 },
      { label: '医疗ETF', code: '512170', rate: 0 }
    ]
  },
  {
    name: '新能源',
    list: [
      { label: '光伏ETF', code: '515790', rate: 0 },
      { label: '新能源车ETF', code: '515030', rate: 0 }
    ]
  },
  {
    name: '跨境互联',
    list: [
      { label: '纳指100ETF', code: '159941', rate: 0 },
      { label: '标普500ETF', code: '513500', rate: 0 },
      { label: '日经225ETF', code: '513520', rate: 0 },
      { label: '德国ETF', code: '513030', rate: 0 }
    ]
  }
]

export function getDefaultIndexList() {
  return DEFAULT_INDEX_LIST.map(item => ({ ...item }))
}

export function getDefaultIndustryData() {
  return DEFAULT_INDUSTRY_DATA.map(cat => ({
    ...cat,
    list: cat.list.map(item => ({ ...item }))
  }))
}

export function formatRate(value) {
  const num = Number(value || 0)
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

export function parseSinaLine(line) {
  const matched = line.match(/var\s+hq_str_([^=]+)="([^"]*)"/)
  if (!matched) return null

  const symbol = matched[1]
  const raw = matched[2]

  if (!raw) {
    return { symbol, price: '--', diff: 0, rate: 0 }
  }

  const values = raw.split(',')
  if (!values.length) {
    return { symbol, price: '--', diff: 0, rate: 0 }
  }

  let price = '--'
  let diff = 0
  let rate = 0

  if (symbol.startsWith('s_')) {
    price = values[1] || '--'
    diff = Number(values[2] || 0)
    rate = Number(values[3] || 0)
  } else if (symbol.startsWith('int_')) {
  price = values[1] || '--'
  diff = Number(values[2] || 0)
  rate = Number(values[3] || 0)
} else if (symbol === 'gds_AU9999') {
    price = values[0] ? `¥${Number(values[0]).toFixed(2)}` : '--'
  }

  return { symbol, price, diff, rate }
}

export async function fetchMarketQuotes(indexList = []) {
  const symbols = indexList.map(item => item.symbol).concat('gds_AU9999').join(',')

  const res = await axios.get(`${WORKER_BASE_URL}/api/market`, {
    params: { symbols },
    responseType: 'text'
  })


  const rows = String(res.data || '')
    .split(';')
    .map(item => item.trim())
    .filter(Boolean)


  const quoteMap = {}

  rows.forEach((line) => {
    const parsed = parseSinaLine(line)
    if (parsed) {
      quoteMap[parsed.symbol] = parsed
    }
  })


  const nextIndexList = indexList.map((item) => {
    const quote = quoteMap[item.symbol]
    return quote
      ? { ...item, price: quote.price, diff: quote.diff, rate: quote.rate }
      : item
  })

  return {
    indexList: nextIndexList,
    goldPrice: quoteMap.gds_AU9999?.price || '--',
    updateTime: `更新于 ${new Date().toLocaleTimeString()}`
  }
}
async function requestFundRate(code) {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
      delete window.jsonpgz
    }

    window.jsonpgz = (data) => {
      cleanup()
      resolve(Number(data?.gszzl || 0))
    }

    script.src = url

    script.onerror = () => {
      cleanup()
      resolve(0)
    }

    document.body.appendChild(script)

    setTimeout(() => {
      cleanup()
      resolve(0)
    }, 3000)
  })
}

export async function fetchIndustryRates(industryData = []) {
  const nextIndustryData = industryData.map(cat => ({
    ...cat,
    list: cat.list.map(item => ({ ...item }))
  }))

  for (const cat of nextIndustryData) {
    for (const fund of cat.list) {
      fund.rate = await requestFundRate(fund.code)
    }
  }

  return nextIndustryData
}