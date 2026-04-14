// src/store/fundStore.js
import { defineStore } from 'pinia'
import {
  getStoredFunds,
  addFundRecord,
  updateFundRecord,
  removeFundRecord,
  refreshFundQuotes
} from '../services/fundService'
import { recordAssetSnapshot } from '../services/assetTrendService'

export const useFundStore = defineStore('fund', {
  state: () => ({
    funds: [],
    loading: false,
    error: null,
    toast: {
      show: false,
      message: '',
      type: 'success'
    }
  }),

  getters: {
    totalMarketValue: (state) => {
      return state.funds.reduce((sum, f) => {
        return sum + f.shares * (f.gsz || f.dwjz || 0)
      }, 0)
    },

    totalDailyProfit: (state) => {
      return state.funds.reduce((sum, f) => {
        const priceChange = (f.gsz || f.dwjz || 0) - (f.dwjz || 0)
        return sum + f.shares * priceChange
      }, 0)
    },

    totalAllProfit: (state) => {
      return state.funds.reduce((sum, f) => {
        return sum + f.shares * ((f.gsz || f.dwjz || 0) - f.costPrice)
      }, 0)
    },

    totalCost: (state) => {
      return state.funds.reduce((sum, f) => {
        return sum + f.shares * f.costPrice
      }, 0)
    }
  },

  actions: {
    async withLoading(fn) {
      this.loading = true
      this.error = null

      try {
        return await fn()
      } catch (err) {
        console.error(err)
        this.error = err.message || '操作失败'
      } finally {
        this.loading = false
      }
    },

    async fetchFunds() {
      await this.withLoading(async () => {
        this.funds = await getStoredFunds()
      })
    },

    async addFund(fund) {
      await this.withLoading(async () => {
        this.funds = await addFundRecord(this.funds, fund)
      })
    },

    async updateFund(code, payload) {
      await this.withLoading(async () => {
        this.funds = await updateFundRecord(this.funds, code, payload)
      })
    },

    async removeFund(code) {
      await this.withLoading(async () => {
        this.funds = await removeFundRecord(this.funds, code)
      })
    },

    async updatePrices() {
      await this.withLoading(async () => {
        this.funds = await refreshFundQuotes(this.funds)
        recordAssetSnapshot(this.totalMarketValue, this.totalAllProfit)
      })
    },

    async initHomeData() {
      await this.fetchFunds()
      if (this.funds.length) {
        await this.updatePrices()
      }
    }
  }
})