import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [overallReport, setOverallReport] = useState(null);
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [kpiRes, reportRes, tripsRes] = await Promise.all([
          axiosClient.get("/reports/dashboard"),
          axiosClient.get("/reports/overall"),
          axiosClient.get("/trips?status=ACTIVE")
        ]);
        setKpis(kpiRes.data.data);
        setOverallReport(reportRes.data.data);
        setActiveTrips(tripsRes.data.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // Real-time polling every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const COLORS = ['#0051d5', '#316bf3', '#b4c5ff', '#dbe1ff', '#e0e3e5'];

  // Formatting Revenue/Expense to look better with 1 data point (splitting into 2 bars on X axis)
  const revenueExpenseData = [
    { name: 'Revenue', amount: kpis?.totalRevenue || 0, fill: '#0051d5' },
    { name: 'Expenses', amount: kpis?.totalExpenses || 0, fill: '#ba1a1a' },
    { name: 'Net Profit', amount: kpis?.netProfit || 0, fill: '#16a34a' }
  ];

  return (
    <div className="bg-background text-on-surface font-body-md antialiased overflow-x-hidden min-h-screen flex">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[90] md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* SideNavBar */}
      <aside className={`bg-primary-container h-screen w-[240px] fixed left-0 top-0 shadow-lg flex flex-col py-6 z-[100] transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-[24px]">local_shipping</span>
            </div>
            <div>
              <h1 className="font-headline-md text-[20px] font-bold text-white tracking-wide">LogiBrain</h1>
              <p className="font-label-sm text-[12px] text-on-primary-container">Owner Portal</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          <Link to="/owner/dashboard" className="flex items-center gap-3 px-4 py-3 text-secondary bg-surface-container-highest/10 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px] fill-icon">dashboard</span> Dashboard
          </Link>
          <Link to="/owner/trips" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">route</span> Trips
          </Link>
          <Link to="/owner/trucks" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span> Trucks
          </Link>
          <Link to="/owner/drivers" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">person</span> Drivers
          </Link>
          <Link to="/owner/expenses" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px] fill-icon">payments</span> Expenses
          </Link>
          <Link to="/owner/reports" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">assessment</span> Reports
          </Link>
        </nav>

        <div className="px-6 pt-6 border-t border-on-primary-container/20 mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest/20 flex items-center justify-center text-white font-bold border border-on-primary-container/30">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-[14px] font-medium truncate">{user?.name}</p>
              <p className="text-on-primary-container text-[12px] truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">logout</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-[240px] w-full">
        
        {/* TopNavBar */}
        <nav className="bg-surface/80 backdrop-blur-xl h-[72px] sticky top-0 z-40 border-b border-outline-variant/50 flex justify-between items-center px-6 md:px-10 w-full shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="font-headline-md text-[20px] font-semibold text-on-surface hidden sm:block">Overview</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/owner/trips" className="bg-secondary text-white px-5 py-2.5 rounded-lg font-medium text-[14px] hover:bg-secondary-container hover:shadow-md transition-all flex items-center gap-2 active:scale-95">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span className="hidden sm:inline">New Dispatch</span>
            </Link>
            <div className="w-px h-8 bg-outline-variant/30 mx-2 hidden sm:block"></div>
            <button onClick={() => alert("Notifications feature coming soon")} className="p-2.5 text-on-surface-variant hover:bg-surface-container-low hover:text-secondary rounded-full transition-colors relative">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-surface border-red-500"></span>
            </button>
            <button onClick={() => alert("Settings feature coming soon")} className="p-2.5 text-on-surface-variant hover:bg-surface-container-low hover:text-secondary rounded-full transition-colors">
              <span className="material-symbols-outlined text-[22px]">settings</span>
            </button>
          </div>
        </nav>

        {/* Scrollable Content */}
        <main className="flex-1 p-6 md:p-10 max-w-[1600px] w-full mx-auto space-y-8">
          {loading ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Welcome Section */}
          <section className="bg-secondary rounded-[24px] p-8 md:p-10 shadow-lg relative overflow-hidden flex items-center justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-secondary to-[#1e3a8a] z-0"></div>
            
            {/* Abstract Decorative Shapes */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl z-0"></div>
            <div className="absolute -bottom-24 right-24 w-72 h-72 bg-white opacity-10 rounded-full blur-2xl z-0"></div>

            <div className="z-10 relative text-white">
              <h2 className="text-[32px] md:text-[40px] font-bold mb-2 tracking-tight">Good Morning, {user?.name?.split(' ')[0]} 👋</h2>
              <p className="text-[16px] text-blue-100 mb-6 font-medium max-w-[500px]">Here's your fleet's command center. All systems are operating normally.</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/20 backdrop-blur-md rounded-full font-medium text-[13px] border border-white/10 shadow-inner">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </section>

          {/* Key Metrics Row */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <Link to="/owner/trucks" className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow group block cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <span className="font-medium text-[14px] text-on-surface-variant group-hover:text-secondary transition-colors">Total Trucks</span>
                <span className="material-symbols-outlined text-[22px] text-secondary group-hover:scale-110 transition-transform">local_shipping</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[36px] font-bold text-on-surface font-mono leading-none">{kpis?.totalTrucks || 0}</span>
              </div>
            </Link>
            
            <Link to="/owner/trips" className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden block cursor-pointer">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-full z-0"></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="font-medium text-[14px] text-on-surface-variant group-hover:text-green-600 transition-colors">Active Trips</span>
                <span className="material-symbols-outlined text-[22px] text-green-600 group-hover:scale-110 transition-transform">route</span>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <span className="text-[36px] font-bold text-on-surface font-mono leading-none">{kpis?.activeTrips || 0}</span>
                <span className="bg-green-100 text-green-700 text-[12px] font-bold px-2 py-0.5 rounded-md mt-1 border border-green-200">Live</span>
              </div>
            </Link>

            <Link to="/owner/drivers" className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow group block cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <span className="font-medium text-[14px] text-on-surface-variant group-hover:text-secondary transition-colors">Total Drivers</span>
                <span className="material-symbols-outlined text-[22px] text-secondary group-hover:scale-110 transition-transform">groups</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[36px] font-bold text-on-surface font-mono leading-none">{kpis?.totalDrivers || 0}</span>
              </div>
            </Link>

            <Link to="/owner/reports" className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow group block cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <span className="font-medium text-[14px] text-on-surface-variant group-hover:text-secondary transition-colors">Total Revenue</span>
                <span className="material-symbols-outlined text-[22px] text-secondary group-hover:scale-110 transition-transform">account_balance_wallet</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold text-on-surface font-mono leading-none tracking-tight">₹{kpis?.totalRevenue?.toLocaleString() || 0}</span>
              </div>
            </Link>

            <Link to="/owner/expenses" className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm hover:shadow-md transition-shadow group block cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <span className="font-medium text-[14px] text-on-surface-variant group-hover:text-red-500 transition-colors">Total Expenses</span>
                <span className="material-symbols-outlined text-[22px] text-red-500 group-hover:scale-110 transition-transform">receipt_long</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold text-red-600 font-mono leading-none tracking-tight">₹{kpis?.totalExpenses?.toLocaleString() || 0}</span>
              </div>
            </Link>

            <Link to="/owner/reports" className="bg-[#f0fdf4] rounded-2xl p-6 border border-[#bbf7d0] shadow-sm hover:shadow-md transition-shadow group block cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <span className="font-medium text-[14px] text-green-800">Net Profit</span>
                <span className="material-symbols-outlined text-[22px] text-green-600 group-hover:scale-110 transition-transform">trending_up</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold text-green-700 font-mono leading-none tracking-tight">₹{kpis?.netProfit?.toLocaleString() || 0}</span>
              </div>
            </Link>
          </section>

          {/* Charts Row */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Revenue vs Expenses */}
            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/40 shadow-sm xl:col-span-2 flex flex-col h-[420px]">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-[20px] font-bold text-on-surface">Financial Performance</h3>
                  <p className="text-[14px] text-on-surface-variant mt-1">Revenue vs Expenses vs Profit across all trips</p>
                </div>
              </div>
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueExpenseData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 14, fontWeight: 500 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} tick={{ fill: '#64748b', fontSize: 13 }} dx={-10} />
                    <RechartsTooltip 
                      formatter={(value) => `₹${value.toLocaleString()}`}
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={80}>
                      {revenueExpenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/40 shadow-sm flex flex-col h-[420px]">
              <div>
                <h3 className="text-[20px] font-bold text-on-surface">Expense Breakdown</h3>
                <p className="text-[14px] text-on-surface-variant mt-1">Categorized spending analysis</p>
              </div>
              <div className="flex-1 flex items-center justify-center relative mt-4">
                {overallReport?.expenseBreakdown?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={overallReport.expenseBreakdown}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={4}
                        stroke="none"
                      >
                        {overallReport.expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value) => `₹${value.toLocaleString()}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-on-surface-variant font-medium text-[14px] flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant/50">pie_chart</span>
                    No expenses recorded
                  </div>
                )}
                {/* Center text for donut */}
                {overallReport?.expenseBreakdown?.length > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-4">
                    <span className="text-[20px] font-bold text-on-surface font-mono">₹{(kpis?.totalExpenses/1000).toFixed(1)}k</span>
                    <span className="text-[12px] text-on-surface-variant">Total</span>
                  </div>
                )}
              </div>
              
              {/* Custom Legend */}
              {overallReport?.expenseBreakdown?.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3 justify-center max-h-[80px] overflow-y-auto">
                  {overallReport.expenseBreakdown.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 px-2 py-1 bg-surface rounded-md border border-outline-variant/20">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="font-medium text-[12px] text-on-surface-variant">{entry.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Tables Row */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Active Trips Table */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm xl:col-span-2 flex flex-col overflow-hidden">
              <div className="p-6 border-b border-outline-variant/40 flex justify-between items-center bg-white">
                <h3 className="text-[18px] font-bold text-on-surface">Active Trips ({activeTrips.length})</h3>
                <Link to="/owner/trips" className="text-secondary font-medium text-[14px] hover:text-secondary-container hover:underline transition-colors flex items-center gap-1">
                  View All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="py-4 px-6 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider">Truck & Driver</th>
                      <th className="py-4 px-6 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider">Route</th>
                      <th className="py-4 px-6 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider">Status</th>
                      <th className="py-4 px-6 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider text-right">Revenue</th>
                      <th className="py-4 px-6 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {activeTrips.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-on-surface-variant font-medium bg-white">
                          <div className="flex flex-col items-center gap-3">
                            <span className="material-symbols-outlined text-[48px] text-outline-variant/40">rv_hookup</span>
                            No active trips right now.
                          </div>
                        </td>
                      </tr>
                    )}
                    {activeTrips.map((trip) => (
                      <tr key={trip._id} className="bg-white hover:bg-blue-50/50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-[14px] text-on-surface font-mono">{trip.truckId?.registrationNumber || 'N/A'}</span>
                            <span className="text-[13px] text-on-surface-variant">{trip.driverId?.userId?.name || "Unknown Driver"}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-medium text-on-surface">{trip.source}</span>
                            <span className="material-symbols-outlined text-[16px] text-outline-variant">arrow_right_alt</span>
                            <span className="text-[14px] font-medium text-on-surface">{trip.destination}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-bold border
                            ${trip.status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              trip.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-green-50 text-green-700 border-green-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${trip.status === 'ACTIVE' ? 'bg-blue-500 animate-pulse' : trip.status === 'PENDING' ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                            {trip.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-bold text-[14px] text-on-surface font-mono">₹{trip.expectedRevenue?.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <Link to="/owner/trips" className="inline-block text-outline hover:text-secondary p-1.5 rounded-md hover:bg-secondary-fixed/50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activities (Enhanced) */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/40 shadow-sm flex flex-col h-full">
              <h3 className="text-[18px] font-bold text-on-surface mb-6">Recent Alerts</h3>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="relative border-l-2 border-outline-variant/20 ml-4 space-y-8 pb-4">
                  
                  {activeTrips.length > 0 ? (
                    <div className="relative pl-6">
                      <div className="absolute -left-[13px] top-0.5 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm">
                        <span className="material-symbols-outlined text-[14px] text-blue-600">play_arrow</span>
                      </div>
                      <div>
                        <p className="text-[14px] text-on-surface"><span className="font-bold">{activeTrips[0]?.driverId?.userId?.name || 'A driver'}</span> is en-route to {activeTrips[0]?.destination}</p>
                        <p className="text-[12px] text-on-surface-variant mt-1 font-medium">Just now</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-6">
                      <div className="absolute -left-[13px] top-0.5 w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-white shadow-sm">
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">info</span>
                      </div>
                      <div>
                        <p className="text-[14px] text-on-surface">No active dispatches currently.</p>
                      </div>
                    </div>
                  )}

                  <div className="relative pl-6">
                    <div className="absolute -left-[13px] top-0.5 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="material-symbols-outlined text-[14px] text-green-600">check_circle</span>
                    </div>
                    <div>
                      <p className="text-[14px] text-on-surface">Daily summary report generated successfully.</p>
                      <p className="text-[12px] text-on-surface-variant mt-1 font-medium">2 hours ago</p>
                    </div>
                  </div>
                  
                  {/* System notice */}
                  <div className="mt-8 bg-surface-container-low rounded-xl p-4 border border-outline-variant/30 flex gap-3">
                    <span className="material-symbols-outlined text-secondary text-[24px]">verified_user</span>
                    <div>
                      <h4 className="text-[14px] font-bold text-on-surface">System Secure</h4>
                      <p className="text-[13px] text-on-surface-variant mt-1">All trackers are online and syncing.</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>

            </>
          )}
        </main>
      </div>
    </div>
  );
}
