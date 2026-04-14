// src/services/fundService.js
import { fundMockList } from '../mock/fundMock'
import { supabase } from '../utils/supabaseClient'

export function normalizeFund(raw = {}) {
  return {
    code: String(raw.code || '').trim(),
    name: raw.name || '未命名基金',
    shares: Number(raw.shares || 0),
    costPrice: Number(raw.costPrice || 0),
    gsz: Number(raw.gsz || 0),
    gszzl: Number(raw.gszzl || 0),
    dwjz: Number(raw.dwjz || 0),
    gztime: raw.gztime || ''
  }
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    throw new Error(error.message || '获取用户信息失败')
  }

  if (!data.user) {
    throw new Error('当前未登录')
  }

  return data.user
}

export async function getStoredFunds() {
  const user = await getCurrentUser()

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('读取数据库失败：', error)
    return []
  }

  return data.map((item) =>
    normalizeFund({
      code: item.fund_code,
      name: item.fund_name,
      shares: item.amount,
      costPrice: item.cost_price
    })
  )
}

export async function addFundRecord(funds = [], fund = {}) {
  const user = await getCurrentUser()

  const { error } = await supabase.from('positions').insert([
    {
      user_id: user.id,
      fund_code: fund.code,
      fund_name: fund.name,
      amount: fund.shares,
      cost_price: fund.costPrice
    }
  ])

  if (error) {
    throw new Error('新增失败：' + error.message)
  }

  return await getStoredFunds()
}

export async function updateFundRecord(funds = [], code, payload = {}) {
  const user = await getCurrentUser()

  const { error } = await supabase
    .from('positions')
    .update({
      amount: payload.shares,
      cost_price: payload.costPrice,
      fund_name: payload.name
    })
    .eq('fund_code', code)
    .eq('user_id', user.id)

  if (error) {
    throw new Error('更新失败：' + error.message)
  }

  return await getStoredFunds()
}

export async function removeFundRecord(funds = [], code) {
  const user = await getCurrentUser()

  const { error } = await supabase
    .from('positions')
    .delete()
    .eq('fund_code', code)
    .eq('user_id', user.id)

  if (error) {
    throw new Error('删除失败：' + error.message)
  }

  return await getStoredFunds()
}

export async function refreshFundQuotes(funds = []) {
  const nextFunds = [...funds]

  const requestOneFund = (fund) => {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      const url = `https://fundgz.1234567.com.cn/js/${fund.code}.js?rt=${Date.now()}`

      const cleanup = () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
        delete window.jsonpgz
      }

      window.jsonpgz = (data) => {
        if (data) {
          fund.name = data.name || fund.name
          fund.gsz = Number(data.gsz || fund.gsz || 0)
          fund.gszzl = Number(data.gszzl || fund.gszzl || 0)
          fund.dwjz = Number(data.dwjz || fund.dwjz || 0)
          fund.gztime = data.gztime || fund.gztime || ''
        }

        cleanup()
        resolve()
      }

      script.src = url

      script.onerror = () => {
        console.error('请求失败:', fund.code)
        cleanup()
        resolve()
      }

      document.body.appendChild(script)

      setTimeout(() => {
        cleanup()
        resolve()
      }, 3000)
    })
  }

  for (const fund of nextFunds) {
    await requestOneFund(fund)
  }

  return nextFunds.map(normalizeFund)
}

export function searchFunds(keyword) {
  const text = String(keyword || '').trim()
  if (!text) return []

  return fundMockList.filter((item) => {
    return item.name.includes(text) || item.code.includes(text)
  })
}