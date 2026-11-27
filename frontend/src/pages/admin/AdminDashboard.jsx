import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showSuccess, showError } = useToast();

  const fetchStats = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await axiosClient.get("/admin/stats");
      setStats(res.data.data);
      if (isManual) {
        showSuccess("Dashboard metrics refreshed successfully");
      }
    } catch (err) {
      console.error("Failed to load admin stats", err);
      showError(err.response?.data?.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const counts = stats?.counts || {
    totalOwners: 0,
    totalDrivers: 0,
    totalTrucks: 0,
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
  };

  const financials = stats?.financials || {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
  };

  const tripStatusData = [
    { name: "Active (On Trip)", value: counts.activeTrips, color: "#316bf3" },
    { name: "Completed", value: counts.completedTrips, color: "#16a34a" },
    { name: "Cancelled", value: counts.cancelledTrips, color: "#dc2626" },
  ].filter((item) => item.value > 0);

  const financeBarData = [
    { name: "Platform Revenue", amount: financials.totalRevenue, fill: "#0051d5" },
    { name: "Total Expenses", amount: financials.totalExpenses, fill: "#ba1a1a" },
    { name: "Net Profit", amount: financials.netProfit, fill: "#16a34a" },
  ];

  const formatCurrency = (amt) => {
    return `₹${(amt || 0).toLocaleString("en-IN")}`;
  };

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="Overview of platform performance, fleet owners, trips, and system metrics"
      actions={
        <button
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-[13px] font-medium transition-colors border border-outline-variant/30 disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
          title="Refresh metrics"
        >
          <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin text-secondary" : ""}`}>
            refresh
          </span>
          <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      }
    >
      {/* 1. High-Level KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Owners */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-on-surface-variant">Fleet Owners</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
            </div>
          </div>
          <div className="text-[30px] font-bold text-on-surface tracking-tight">
            {loading ? "..." : counts.totalOwners}
          </div>
          <p className="text-[12px] text-on-surface-variant mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-blue-500">domain</span>
            Registered Logistics Providers
          </p>
        </div>

        {/* Total Drivers */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-on-surface-variant">Total Drivers</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
          </div>
          <div className="text-[30px] font-bold text-on-surface tracking-tight">
            {loading ? "..." : counts.totalDrivers}
          </div>
          <p className="text-[12px] text-on-surface-variant mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-indigo-500">verified</span>
            Active Verified Profiles
          </p>
        </div>

        {/* Total Trucks */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-on-surface-variant">Total Fleet Trucks</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            </div>
          </div>
          <div className="text-[30px] font-bold text-on-surface tracking-tight">
            {loading ? "..." : counts.totalTrucks}
          </div>
          <p className="text-[12px] text-on-surface-variant mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-amber-500">speed</span>
            Across All Fleets
          </p>
        </div>

        {/* Total Trips */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium text-on-surface-variant">System Trips</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">route</span>
            </div>
          </div>
          <div className="text-[30px] font-bold text-on-surface tracking-tight flex items-baseline gap-2">
            <span>{loading ? "..." : counts.totalTrips}</span>
            <span className="text-[13px] font-medium text-emerald-600">
              ({counts.activeTrips} Live)
            </span>
          </div>
          <p className="text-[12px] text-on-surface-variant mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
            {counts.completedTrips} Delivered Successfully
          </p>
        </div>
      </div>

      {/* 2. Platform Financial Overview Cards */}
      <div className="bg-gradient-to-r from-primary-container via-slate-900 to-primary-container p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-secondary/20 to-transparent pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[12px] font-medium mb-3">
              <span className="material-symbols-outlined text-[16px] text-secondary">payments</span>
              Platform Financial Summary
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">System Revenue & Profits</h2>
            <p className="text-on-primary-container text-[13px] mt-1.5 max-w-[560px] leading-relaxed">
              Consolidated financial indicators aggregated from all fleet trips, billing revenues, and logged operational expenses.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[140px]">
              <p className="text-[12px] text-on-primary-container uppercase font-semibold">Total Revenue</p>
              <p className="text-xl md:text-2xl font-bold mt-1 text-white">
                {formatCurrency(financials.totalRevenue)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[140px]">
              <p className="text-[12px] text-on-primary-container uppercase font-semibold">Total Expenses</p>
              <p className="text-xl md:text-2xl font-bold mt-1 text-red-300">
                {formatCurrency(financials.totalExpenses)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[140px]">
              <p className="text-[12px] text-on-primary-container uppercase font-semibold">Net Profit</p>
              <p className="text-xl md:text-2xl font-bold mt-1 text-emerald-300">
                {formatCurrency(financials.netProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Financial Ledger Comparison</h3>
              <p className="text-[12px] text-on-surface-variant">Revenue vs Expenses vs Net Profit</p>
            </div>
            <Link
              to="/admin/reports"
              className="text-[13px] text-secondary font-medium hover:underline flex items-center gap-1"
            >
              Detailed Reports <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString("en-IN")}`, "Amount"]}
                  contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "10px", border: "none" }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {financeBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trip Status Pie Chart */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Trip Status Distribution</h3>
              <p className="text-[12px] text-on-surface-variant">System-wide trip fulfillment</p>
            </div>
          </div>
          <div className="h-52 w-full flex-1 flex items-center justify-center">
            {tripStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tripStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {tripStatusData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-on-surface-variant text-[13px]">
                No trip records recorded yet
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-outline-variant/20 flex flex-wrap justify-center gap-3">
            {tripStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-[12px]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-on-surface font-medium">{item.name}:</span>
                <span className="text-on-surface-variant">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Recent Platform Trips & Recent Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Trips */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Recent Platform Trips</h3>
              <p className="text-[12px] text-on-surface-variant">Latest movements across all fleets</p>
            </div>
            <Link
              to="/admin/trips"
              className="text-[13px] text-secondary font-medium hover:underline flex items-center gap-1"
            >
              View All Trips <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-medium text-[11px] uppercase tracking-wider">
                  <th className="pb-3">Route</th>
                  <th className="pb-3">Owner</th>
                  <th className="pb-3">Revenue</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {stats?.recentTrips?.length > 0 ? (
                  stats.recentTrips.map((trip) => (
                    <tr key={trip._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3">
                        <div className="font-semibold text-on-surface">
                          {trip.source} → {trip.destination}
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          {trip.material || "Freight"}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="text-on-surface font-medium">
                          {trip.ownerId?.businessName || trip.ownerId?.name || "Fleet Owner"}
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-on-surface">
                        {formatCurrency(trip.actualRevenue || trip.expectedRevenue)}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            trip.status === "ON_TRIP"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : trip.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}
                        >
                          {trip.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-on-surface-variant">
                      No recent trips found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Registered Users */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[16px] font-bold text-on-surface">Recent System Users</h3>
              <p className="text-[12px] text-on-surface-variant">Newest platform registrations</p>
            </div>
            <Link
              to="/admin/users"
              className="text-[13px] text-secondary font-medium hover:underline flex items-center gap-1"
            >
              Manage Users <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant font-medium text-[11px] uppercase tracking-wider">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {stats?.recentUsers?.length > 0 ? (
                  stats.recentUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold flex items-center justify-center text-[12px]">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface">{u.name}</div>
                            <div className="text-[11px] text-on-surface-variant">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            u.role === "ADMIN"
                              ? "bg-amber-400 text-slate-900"
                              : u.role === "OWNER"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-indigo-500/10 text-indigo-600"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-on-surface-variant text-[12px]">
                        {u.phone}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            u.isActive ? "bg-emerald-500" : "bg-red-400"
                          }`}
                          title={u.isActive ? "Active" : "Inactive"}
                        ></span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-on-surface-variant">
                      No user records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
