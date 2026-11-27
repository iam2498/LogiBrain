import { useState, useEffect } from "react";
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
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

export default function AdminReports() {
  const { showSuccess, showError } = useToast();
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await axiosClient.get("/admin/reports");
      setReportsData(res.data.data);
      if (isManual) showSuccess("Platform reports refreshed successfully");
    } catch (err) {
      console.error("Failed to fetch reports", err);
      showError(err.response?.data?.message || "Failed to load platform reports");
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const formatCurrency = (amt) => `₹${(amt || 0).toLocaleString("en-IN")}`;

  const monthlyTrends = reportsData?.monthlyTrends || [];
  const expensesByCategory = reportsData?.expensesByCategory || [];
  const topOwners = reportsData?.topOwners || [];

  const totalExpenseSum = expensesByCategory.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  const CATEGORY_COLORS = ["#0051d5", "#316bf3", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#64748b"];

  const handleExportCSV = () => {
    try {
      if (!monthlyTrends.length) {
        showError("No data available to export");
        return;
      }

      const headers = ["Month", "Trips Count", "Revenue (INR)", "Expenses (INR)", "Net Profit (INR)"];
      const rows = monthlyTrends.map((m) => [
        `"${m.name}"`,
        m.trips,
        m.revenue,
        m.expenses,
        m.profit,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `LogiBrain_Platform_Report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSuccess("Report exported successfully to CSV!");
    } catch (err) {
      console.error("Export error", err);
      showError("Failed to generate CSV export");
    }
  };

  return (
    <AdminLayout
      title="Platform Reports & Analytics"
      subtitle="Macro-level operational analytics, fiscal performance, and fleet efficiency benchmarks"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary/10 hover:bg-secondary/20 text-secondary text-[13px] font-semibold transition-colors border border-secondary/20"
            title="Download report as CSV"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => fetchReports(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-[13px] font-medium transition-colors border border-outline-variant/30 disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
          >
            <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin text-secondary" : ""}`}>
              refresh
            </span>
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="py-24 text-center text-on-surface-variant flex items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin text-[26px] text-secondary">
            progress_activity
          </span>
          <span>Compiling platform analytics...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Monthly Revenue & Expenses Trend Chart */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <div>
                <h3 className="text-[17px] font-bold text-on-surface">6-Month Fiscal Performance Trend</h3>
                <p className="text-[12px] text-on-surface-variant">
                  Monthly platform revenue vs operating expenses and net profits
                </p>
              </div>
              <div className="flex items-center gap-4 text-[12px] font-medium text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#0051d5]"></span> Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#ba1a1a]"></span> Expenses
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-[#16a34a]"></span> Profit
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(val, name) => [`₹${Number(val).toLocaleString("en-IN")}`, name]}
                    contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "10px", border: "none" }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#0051d5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ba1a1a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name="Net Profit" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Middle Row: Expense Category Breakdown & Top Fleets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Categories Breakdown */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold text-on-surface">System Expenses by Category</h3>
                  <p className="text-[12px] text-on-surface-variant">
                    Total recorded expenses: {formatCurrency(totalExpenseSum)}
                  </p>
                </div>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                {expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="totalAmount"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell
                            key={`cat-cell-${index}`}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [formatCurrency(val), "Expense"]}
                        contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-on-surface-variant text-[13px]">No operational expenses logged</p>
                )}
              </div>

              {/* Category Legend list */}
              <div className="mt-auto pt-4 border-t border-outline-variant/20 space-y-2">
                {expensesByCategory.map((cat, idx) => {
                  const pct = totalExpenseSum > 0 ? ((cat.totalAmount / totalExpenseSum) * 100).toFixed(1) : 0;
                  return (
                    <div key={cat._id} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        ></span>
                        <span className="font-medium text-on-surface">{cat._id}</span>
                        <span className="text-on-surface-variant">({cat.count} logged)</span>
                      </div>
                      <div className="font-semibold text-on-surface">
                        {formatCurrency(cat.totalAmount)}{" "}
                        <span className="text-on-surface-variant text-[11px] font-normal">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Fleet Owners Leaderboard */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[16px] font-bold text-on-surface">Top Fleet Owners by Revenue</h3>
                  <p className="text-[12px] text-on-surface-variant">Leading platform contributors</p>
                </div>
              </div>

              <div className="space-y-3">
                {topOwners.length > 0 ? (
                  topOwners.map((owner, idx) => (
                    <div
                      key={owner._id}
                      className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary font-bold text-[13px] flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-[14px]">
                            {owner.businessName || owner.name}
                          </p>
                          <p className="text-[11px] text-on-surface-variant">
                            {owner.name} • {owner.totalTrips} Total Trips ({owner.completedTrips} Delivered)
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-secondary text-[14px]">
                          {formatCurrency(owner.revenue)}
                        </p>
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Top Contributor
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-on-surface-variant py-10 text-[13px]">
                    No fleet activity logged yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3. Monthly Aggregate Data Table */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 shadow-xs">
            <h3 className="text-[16px] font-bold text-on-surface mb-3">Monthly Summary Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface-container-low text-on-surface-variant text-[11px] uppercase tracking-wider font-semibold border-b border-outline-variant/30">
                  <tr>
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-4">Trip Volume</th>
                    <th className="py-3 px-4">Platform Revenue</th>
                    <th className="py-3 px-4">Platform Expenses</th>
                    <th className="py-3 px-4 text-right">Net Platform Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {monthlyTrends.map((row) => (
                    <tr key={row.name} className="hover:bg-surface-container-low/40">
                      <td className="py-3.5 px-4 font-semibold text-on-surface">{row.name}</td>
                      <td className="py-3.5 px-4 text-on-surface">{row.trips} Trips</td>
                      <td className="py-3.5 px-4 font-semibold text-blue-600">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-red-500">
                        {formatCurrency(row.expenses)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        {formatCurrency(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
