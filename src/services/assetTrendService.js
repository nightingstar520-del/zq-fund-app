// src/services/assetTrendService.js
import { supabase } from "../utils/supabaseClient";

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message || "获取用户信息失败");
  }

  if (!data.user) {
    throw new Error("当前未登录");
  }

  return data.user;
}

export async function getAssetSnapshots() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("asset_snapshots")
    .select("snapshot_date, total_market_value, total_profit, updated_at")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: true });

  if (error) {
    console.error("读取资产趋势快照失败：", error);
    return [];
  }

  return (data || []).map((item) => ({
    date: item.snapshot_date,
    totalMarketValue: Number(item.total_market_value || 0),
    totalProfit: Number(item.total_profit || 0),
    updatedAt: item.updated_at || "",
  }));
}

export async function recordAssetSnapshot(totalMarketValue, totalProfit) {
  const user = await getCurrentUser();
  const today = getTodayKey();

  const payload = {
    user_id: user.id,
    snapshot_date: today,
    total_market_value: Number(totalMarketValue || 0),
    total_profit: Number(totalProfit || 0),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("asset_snapshots")
    .upsert(payload, {
      onConflict: "user_id,snapshot_date",
    });

  if (error) {
    console.error("保存资产趋势快照失败：", error);
    throw new Error(error.message || "保存资产趋势快照失败");
  }

  return true;
}

function getBaseRecord(snapshots, targetDate) {
  if (!snapshots.length) return null;

  for (let i = snapshots.length - 1; i >= 0; i--) {
    if (snapshots[i].date <= targetDate) {
      return snapshots[i];
    }
  }

  return snapshots[0];
}

function shiftDate(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() - days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function getTrendSummary() {
  const snapshots = await getAssetSnapshots();
  const latest = snapshots[snapshots.length - 1];

  if (!latest) {
    return {
      lastUpdatedAt: "--",
      weekChange: 0,
      monthChange: 0,
      hasData: false,
    };
  }

  const weekTargetDate = shiftDate(latest.date, 7);
  const monthTargetDate = shiftDate(latest.date, 30);

  const weekBase = getBaseRecord(snapshots, weekTargetDate) || latest;
  const monthBase = getBaseRecord(snapshots, monthTargetDate) || latest;

  return {
    lastUpdatedAt: formatDateTime(latest.updatedAt),
    weekChange:
      Number(latest.totalMarketValue || 0) -
      Number(weekBase.totalMarketValue || 0),
    monthChange:
      Number(latest.totalMarketValue || 0) -
      Number(monthBase.totalMarketValue || 0),
    hasData: true,
  };
}