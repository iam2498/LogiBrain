import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function Reports() {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const [reportData, setReportData] = useState(null);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mainSearchQuery, setMainSearchQuery] = useState("");
  const [modalFilterDate, setModalFilterDate] = useState("");
  const [modalFilterTruck, setModalFilterTruck] = useState("ALL");
  const [modalFilterDriver, setModalFilterDriver] = useState("ALL");
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filter options
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);

  // Filter state
  const [filters, setFilters] = useState({
    tripId: "",
    truckId: "",
    driverId: "",
    status: "",
    dateType: "", // specific, range, month, year
    date: "", // used for specific date, month, year
    startDate: "",
    endDate: ""
  });

  const fetchReports = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (currentFilters.tripId) queryParams.append("tripId", currentFilters.tripId);
      if (currentFilters.truckId) queryParams.append("truckId", currentFilters.truckId);
      if (currentFilters.driverId) queryParams.append("driverId", currentFilters.driverId);
      if (currentFilters.status) queryParams.append("status", currentFilters.status);
      
      if (currentFilters.dateType === 'specific' && currentFilters.date) {
        queryParams.append("date", currentFilters.date);
      } else if (currentFilters.dateType === 'range' && currentFilters.startDate && currentFilters.endDate) {
        queryParams.append("startDate", currentFilters.startDate);
        queryParams.append("endDate", currentFilters.endDate);
      } else if (currentFilters.dateType === 'month' && currentFilters.date) {
        const [year, month] = currentFilters.date.split('-');
        if (year && month) {
          const startDate = new Date(year, parseInt(month) - 1, 1).toISOString();
          const endDate = new Date(year, parseInt(month), 0, 23, 59, 59, 999).toISOString();
          queryParams.append("startDate", startDate);
          queryParams.append("endDate", endDate);
        }
      } else if (currentFilters.dateType === 'year' && currentFilters.date) {
        const year = currentFilters.date;
        const startDate = new Date(year, 0, 1).toISOString();
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();
        queryParams.append("startDate", startDate);
        queryParams.append("endDate", endDate);
      }

      const res = await axiosClient.get(`/reports/analytics?` + queryParams.toString());
      setReportData(res.data.data);
      setCompletedTrips(res.data.data.completedTrips || []);
    } catch (error) {
      console.error("Failed to fetch reports", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [trucksRes, driversRes, tripsRes] = await Promise.all([
          axiosClient.get("/trucks"),
          axiosClient.get("/drivers"),
          axiosClient.get("/trips")
        ]);
        setTrucks(trucksRes.data.data);
        setDrivers(driversRes.data.data);
        setTrips(tripsRes.data.data);
      } catch (err) {
        console.error("Failed to fetch filter options", err);
      }
    };
    fetchOptions();
    fetchReports();
  }, []);

  const handleApplyFilters = () => {
    fetchReports();
  };

  const handleResetFilters = () => {
    const resetState = {
      tripId: "",
      truckId: "",
      driverId: "",
      status: "",
      dateType: "",
      date: "",
      startDate: "",
      endDate: ""
    };
    setFilters(resetState);
    fetchReports(resetState);
  };

  const generateExportParams = () => {
    const queryParams = new URLSearchParams();
    if (filters.tripId) queryParams.append("tripId", filters.tripId);
    if (filters.truckId) queryParams.append("truckId", filters.truckId);
    if (filters.driverId) queryParams.append("driverId", filters.driverId);
    if (filters.status) queryParams.append("status", filters.status);
    
    if (filters.dateType === 'specific' && filters.date) {
      queryParams.append("date", filters.date);
    } else if (filters.dateType === 'range' && filters.startDate && filters.endDate) {
      queryParams.append("startDate", filters.startDate);
      queryParams.append("endDate", filters.endDate);
    } else if (filters.dateType === 'month' && filters.date) {
      const [year, month] = filters.date.split('-');
      if (year && month) {
        const startDate = new Date(year, parseInt(month) - 1, 1).toISOString();
        const endDate = new Date(year, parseInt(month), 0, 23, 59, 59, 999).toISOString();
        queryParams.append("startDate", startDate);
        queryParams.append("endDate", endDate);
      }
    } else if (filters.dateType === 'year' && filters.date) {
      const year = filters.date;
      const startDate = new Date(year, 0, 1).toISOString();
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();
      queryParams.append("startDate", startDate);
      queryParams.append("endDate", endDate);
    }
    return queryParams.toString();
  };

  const handleExport = () => {
    setIsModalOpen(true);
    // Optionally pre-fill search with currently filtered truck
    if (filters.truckId) {
      const t = trucks.find(tr => tr._id === filters.truckId);
      if (t) setSearchQuery(t.registrationNumber);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedTripId) return;
    setIsGeneratingPdf(true);
    try {
      const res = await axiosClient.get(`/reports/trip/${selectedTripId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `LogiBrain_Trip_Report_${selectedTripId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setIsModalOpen(false);
      setSelectedTripId(null);
      showSuccess("Trip report PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      showError("Unable to generate trip report. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const filteredModalTrips = trips.filter(t => {
    const query = searchQuery.toLowerCase();
    const truckRegs = (t.truckIds?.length ? t.truckIds.map(tr => tr.registrationNumber).join(' ') : (t.truckId?.registrationNumber || '')).toLowerCase();
    const driverNames = (t.driverIds?.length ? t.driverIds.map(dr => dr.userId?.name || dr.licenseNumber).join(' ') : (t.driverId?.userId?.name || t.driverId?.licenseNumber || '')).toLowerCase();
    const source = t.source?.toLowerCase() || "";
    const dest = t.destination?.toLowerCase() || "";
    const tid = t._id.toLowerCase();
    
    const matchesSearch = truckRegs.includes(query) || driverNames.includes(query) || 
                          source.includes(query) || dest.includes(query) || tid.includes(query);
                          
    const matchesDate = !modalFilterDate || (t.startDate && new Date(t.startDate).toISOString().split('T')[0] === modalFilterDate);
    const matchesTruck = modalFilterTruck === "ALL" || 
      (t.truckIds && t.truckIds.some(tr => (tr._id || tr) === modalFilterTruck)) ||
      (t.truckId && (t.truckId._id || t.truckId) === modalFilterTruck);
    const matchesDriver = modalFilterDriver === "ALL" || 
      (t.driverIds && t.driverIds.some(dr => (dr._id || dr) === modalFilterDriver)) ||
      (t.driverId && (t.driverId._id || t.driverId) === modalFilterDriver);
    
    return matchesSearch && matchesDate && matchesTruck && matchesDriver;
  });
  
  const selectedTripDetails = trips.find(t => t._id === selectedTripId);

  // Visualizer Colors
  const categoryColors = {
    "Fuel": "#f97316", // orange
    "Toll": "#a855f7", // purple
    "Food": "#eab308", // yellow
    "Parking": "#64748b", // slate
    "Repair": "#ef4444", // red
    "Loading/Unloading": "#3b82f6", // blue
    "Insurance/Permit": "#10b981", // emerald
    "Other": "#9ca3af" // gray
  };

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased overflow-hidden flex h-screen">
      
      {/* SideNavBar */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[90] md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`bg-primary-container h-screen w-[240px] fixed left-0 top-0 shadow-lg flex flex-col py-6 z-[100] transition-transform duration-300 md:translate-x-0 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[24px]">local_shipping</span>
          </div>
          <div>
            <h1 className="font-headline-md text-[20px] font-bold text-white tracking-wide">LogiBrain</h1>
            <p className="font-label-sm text-[12px] text-on-primary-container">Owner Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
          <Link to="/owner/dashboard" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
          </Link>
          <Link to="/owner/trips" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">route</span> Trips
          </Link>
          <Link to="/owner/trucks" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span> Trucks
          </Link>
          <Link to="/owner/drivers" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">person</span> Drivers
          </Link>
          <Link to="/owner/expenses" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">payments</span> Expenses
          </Link>
          <Link to="/owner/reports" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-secondary bg-surface-container-highest/10 rounded-lg hover:bg-surface-container-highest/20 transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px] fill-icon">assessment</span> Reports
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
      <div className="flex-1 flex flex-col md:ml-[240px] h-screen overflow-hidden bg-background">
        
        {/* TopNavBar */}
        <header className="bg-surface/80 backdrop-blur-md h-16 sticky top-0 z-40 border-b border-outline-variant flex justify-between items-center w-full px-6 md:px-10 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-on-surface-variant p-2 -ml-2 rounded-lg hover:bg-surface-container-low">
            <span className="material-symbols-outlined">menu</span>
          </button>
          


          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-3 py-1.5 border border-outline-variant/30 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input value={mainSearchQuery} onChange={(e) => setMainSearchQuery(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm py-1 px-2 w-48 text-on-surface placeholder:text-on-surface-variant outline-none" placeholder="Search trips..." type="text"/>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-all relative">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
            </div>
            <div className="h-6 w-px bg-outline-variant/50 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <button onClick={handleExport} className="bg-[#0a0a0a] text-white px-3 sm:px-4 py-2 rounded-lg font-label-md text-[13px] font-medium hover:bg-black transition-transform duration-200 active:scale-95 flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Export Report</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 w-full max-w-[1440px] mx-auto">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="font-headline-lg text-[32px] font-bold text-on-surface tracking-tight mb-1">Financial Analytics</h2>
              <p className="font-body-md text-[14px] text-on-surface-variant mt-1 max-w-2xl">High-level insights into your fleet's profitability, revenue streams, and expense distribution.</p>
            </div>
          </div>

          {/* Analytics Filters */}
          <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm mb-8 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-on-surface-variant mb-1">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span className="text-[13px] font-bold uppercase tracking-wider">Dynamic Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Specific Trip */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Trip</label>
                <select 
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                  value={filters.tripId}
                  onChange={(e) => setFilters({...filters, tripId: e.target.value})}
                >
                  <option value="">All Trips</option>
                  {trips.map(trip => (
                    <option key={trip._id} value={trip._id}>
                      {trip.source} to {trip.destination} ({new Date(trip.startDate).toLocaleDateString('en-GB')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Truck */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Truck</label>
                <select 
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                  value={filters.truckId}
                  onChange={(e) => setFilters({...filters, truckId: e.target.value})}
                >
                  <option value="">All Trucks</option>
                  {trucks.map(truck => (
                    <option key={truck._id} value={truck._id}>
                      {truck.registrationNumber}
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Driver</label>
                <select 
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                  value={filters.driverId}
                  onChange={(e) => setFilters({...filters, driverId: e.target.value})}
                >
                  <option value="">All Drivers</option>
                  {drivers.map(driver => (
                    <option key={driver._id} value={driver._id}>
                      {driver.userId?.name || driver.licenseNumber}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Status</label>
                <select 
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                >
                  <option value="">All Statuses</option>
                  <option value="ON_TRIP">On Trip</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Date Filter Type */}
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Time Period</label>
                <select 
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                  value={filters.dateType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setFilters({...filters, dateType: newType, date: "", startDate: "", endDate: ""});
                  }}
                >
                  <option value="">All Time</option>
                  <option value="specific">Specific Date</option>
                  <option value="range">Date Range</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>

              {/* Dynamic Date Inputs based on selection */}
              {filters.dateType === 'specific' && (
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Date</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                  />
                </div>
              )}

              {filters.dateType === 'range' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">From</label>
                    <input 
                      type="date"
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                      value={filters.startDate}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">To</label>
                    <input 
                      type="date"
                      className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                      value={filters.endDate}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    />
                  </div>
                </>
              )}

              {filters.dateType === 'month' && (
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Month</label>
                  <input 
                    type="month"
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                  />
                </div>
              )}

              {filters.dateType === 'year' && (
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Year</label>
                  <select
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-white text-on-surface"
                    value={filters.date}
                    onChange={(e) => setFilters({...filters, date: e.target.value})}
                  >
                    <option value="">Select Year</option>
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

            </div>
            
            <div className="flex items-center gap-3 mt-2">
              <button 
                onClick={handleApplyFilters}
                className="bg-secondary text-white px-5 py-2 rounded-lg font-label-md text-[13px] font-bold hover:bg-secondary/90 transition-transform duration-200 active:scale-95 shadow-sm"
              >
                Apply Filters
              </button>
              <button 
                onClick={handleResetFilters}
                className="bg-surface-container-highest text-on-surface px-5 py-2 rounded-lg font-label-md text-[13px] font-medium hover:bg-outline-variant/30 transition-transform duration-200 active:scale-95"
              >
                Reset
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-secondary border-t-transparent"></div>
            </div>
          ) : !reportData ? (
             <div className="flex-1 flex items-center justify-center h-48 text-on-surface-variant bg-white rounded-xl border border-outline-variant/50">No report data available.</div>
          ) : (
            <>
              {reportData.totalTrips === 0 && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-[14px]">
                  <span className="material-symbols-outlined text-[20px]">info</span>
                  No financial data found for the selected filters.
                </div>
              )}
              
              {/* Profitability KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-emerald-700 text-white p-6 rounded-2xl shadow-md relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="flex items-center gap-2 mb-3 opacity-90">
                    <span className="material-symbols-outlined text-[20px]">account_balance</span>
                    <span className="text-[13px] font-bold uppercase tracking-wider">Gross Revenue</span>
                  </div>
                  <div className="text-[36px] font-bold font-mono">₹{reportData.grossRevenue.toLocaleString()}</div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-rose-700 text-white p-6 rounded-2xl shadow-md relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="flex items-center gap-2 mb-3 opacity-90">
                    <span className="material-symbols-outlined text-[20px]">money_off</span>
                    <span className="text-[13px] font-bold uppercase tracking-wider">Total Expenses</span>
                  </div>
                  <div className="text-[36px] font-bold font-mono">₹{reportData.totalExpenses.toLocaleString()}</div>
                </div>

                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#333] text-white p-6 rounded-2xl shadow-md relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="flex items-center gap-2 mb-3 opacity-90">
                    <span className="material-symbols-outlined text-[20px]">trending_up</span>
                    <span className="text-[13px] font-bold uppercase tracking-wider">Net Profit</span>
                  </div>
                  <div className="text-[36px] font-bold font-mono">₹{reportData.netProfit.toLocaleString()}</div>
                  <div className="mt-2 text-[12px] opacity-80">
                    Margin: {reportData.profitMarginPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-6 mb-8">
                <h3 className="text-[18px] font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">donut_large</span>
                  Expense Breakdown
                </h3>
                
                {reportData.totalExpenses === 0 ? (
                  <div className="py-8 text-center text-on-surface-variant font-medium text-[14px]">No expenses recorded for this selection.</div>
                ) : (
                  <div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-8 rounded-full flex overflow-hidden shadow-inner mb-6">
                      {reportData.expenseBreakdown.map((exp) => {
                        const width = `${(exp.amount / reportData.totalExpenses) * 100}%`;
                        return (
                          <div 
                            key={exp.category} 
                            style={{ width, backgroundColor: categoryColors[exp.category] || categoryColors["Other"] }}
                            title={`${exp.category}: ₹${exp.amount.toLocaleString()}`}
                            className="h-full hover:brightness-110 transition-all cursor-pointer"
                          ></div>
                        );
                      })}
                    </div>

                    {/* Legend Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {reportData.expenseBreakdown.sort((a,b) => b.amount - a.amount).map((exp) => (
                        <div key={exp.category} className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30">
                          <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: categoryColors[exp.category] || categoryColors["Other"] }}></div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider truncate">{exp.category}</p>
                            <p className="text-[15px] font-bold text-on-surface font-mono truncate">₹{exp.amount.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Completed Trips Overview */}
              <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant/30 bg-surface-container-lowest">
                  <h3 className="text-[16px] font-bold text-on-surface">Recently Completed Trips</h3>
                  <p className="text-[12px] text-on-surface-variant mt-1">Review profitability on a per-trip basis for your latest deliveries.</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-lowest text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-outline-variant/50">
                        <th className="px-6 py-3 font-bold">Route</th>
                        <th className="px-6 py-3 font-bold">Date Completed</th>
                        <th className="px-6 py-3 font-bold text-right">Trip Rate</th>
                        <th className="px-6 py-3 font-bold text-right">Actual Rev.</th>
                        <th className="px-6 py-3 font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 text-[13px]">
                      {completedTrips.filter(trip => {
                        const sq = mainSearchQuery.toLowerCase();
                        const truckMatch = (trip.truckIds?.some(tr => tr.registrationNumber?.toLowerCase().includes(sq))) || trip.truckId?.registrationNumber?.toLowerCase().includes(sq);
                        return trip.source?.toLowerCase().includes(sq) || trip.destination?.toLowerCase().includes(sq) || truckMatch;
                      }).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-[48px] opacity-20 mb-3 block">history</span>
                            <p className="font-medium text-[14px]">No matching trips found.</p>
                          </td>
                        </tr>
                      ) : (
                        completedTrips.filter(trip => {
                          const sq = mainSearchQuery.toLowerCase();
                          const truckMatch = (trip.truckIds?.some(tr => tr.registrationNumber?.toLowerCase().includes(sq))) || trip.truckId?.registrationNumber?.toLowerCase().includes(sq);
                          return trip.source?.toLowerCase().includes(sq) || trip.destination?.toLowerCase().includes(sq) || truckMatch;
                        }).map((trip) => (
                          <tr key={trip._id} className="hover:bg-surface-container-lowest/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-on-surface">{trip.source} → {trip.destination}</div>
                              <div className="text-on-surface-variant text-[11px]">
                                Truck: {trip.truckIds && trip.truckIds.length > 0
                                  ? trip.truckIds.map(tr => tr.registrationNumber).join(', ')
                                  : trip.truckId?.registrationNumber || "Unknown"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant font-medium">
                              {trip.actualEndDate ? new Date(trip.actualEndDate).toLocaleDateString('en-GB') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-on-surface-variant">
                              ₹{trip.expectedRevenue?.toLocaleString() || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-green-600">
                              ₹{trip.actualRevenue?.toLocaleString() || trip.expectedRevenue?.toLocaleString() || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[11px] bg-green-100 text-green-800 border border-green-200">
                                COMPLETED
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </main>
      </div>

      {/* Trip Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-start bg-surface-container-lowest">
              <div>
                <h3 className="font-headline-sm text-[24px] font-bold text-on-surface">Generate Trip Report</h3>
                <p className="font-body-md text-[13px] text-on-surface-variant mt-1">Select a trip to generate a detailed PDF report.</p>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedTripId(null); }}
                className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container-low transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-surface">
              
              {/* Left Column: List & Search */}
              <div className="flex-1 flex flex-col border-r border-outline-variant/30">
                <div className="p-4 border-b border-outline-variant/30 bg-surface">
                  <div className="relative mb-3">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[20px]">search</span>
                    <input 
                      type="text" 
                      placeholder="Search by ID, route, truck, or driver..."
                      className="w-full pl-10 pr-4 py-2.5 text-[13px] rounded-xl border border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none bg-surface-container-lowest text-on-surface transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                    <input 
                      type="date"
                      className="flex-1 min-w-[130px] text-[12px] p-2 rounded-lg border border-outline-variant/50 bg-white text-on-surface outline-none focus:border-secondary transition-colors"
                      value={modalFilterDate}
                      onChange={(e) => setModalFilterDate(e.target.value)}
                    />
                    
                    <select 
                      className="flex-1 min-w-[100px] text-[12px] p-2 rounded-lg border border-outline-variant/50 bg-white text-on-surface outline-none focus:border-secondary transition-colors"
                      value={modalFilterTruck}
                      onChange={(e) => setModalFilterTruck(e.target.value)}
                    >
                      <option value="ALL">All Trucks</option>
                      {trucks.map(t => (
                        <option key={t._id} value={t._id}>{t.registrationNumber}</option>
                      ))}
                    </select>

                    <select 
                      className="flex-1 min-w-[100px] text-[12px] p-2 rounded-lg border border-outline-variant/50 bg-white text-on-surface outline-none focus:border-secondary transition-colors"
                      value={modalFilterDriver}
                      onChange={(e) => setModalFilterDriver(e.target.value)}
                    >
                      <option value="ALL">All Drivers</option>
                      {drivers.map(d => (
                        <option key={d._id} value={d._id}>{d.userId?.name || d.licenseNumber}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setModalFilterDate("");
                        setModalFilterTruck("ALL");
                        setModalFilterDriver("ALL");
                      }}
                      className="px-3 py-2 bg-surface-container-low text-on-surface-variant hover:text-on-surface rounded-lg text-[12px] font-bold border border-outline-variant/50 hover:bg-surface-container transition-colors flex items-center justify-center shrink-0"
                      title="Reset Filters"
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-surface-container-lowest/30">
                  {filteredModalTrips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-70">
                      <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">search_off</span>
                      <p className="text-[13px] font-medium">No trips found matching your search.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredModalTrips.map(trip => (
                        <div 
                          key={trip._id}
                          onClick={() => setSelectedTripId(trip._id)}
                          className={`p-4 rounded-xl cursor-pointer border transition-all duration-200 ${selectedTripId === trip._id ? 'border-secondary bg-secondary/5 shadow-md scale-[1.02]' : 'border-outline-variant/50 hover:border-outline-variant bg-white shadow-sm hover:shadow-md'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-[14px] text-on-surface">
                              {trip.source} <span className="text-secondary/60 mx-1">→</span> {trip.destination}
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${trip.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : (trip.status === 'ON_TRIP' || trip.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800')}`}>
                              {trip.status === 'ON_TRIP' || trip.status === 'ACTIVE' ? 'On Trip' : trip.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-[12px] text-on-surface-variant mb-2">
                            <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {new Date(trip.startDate).toLocaleDateString('en-GB')}</div>
                          </div>

                          <div className="flex items-center gap-3 pt-2 border-t border-outline-variant/30">
                            <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-md text-[11px] font-medium text-on-surface">
                              <span className="material-symbols-outlined text-[14px] text-secondary">local_shipping</span>
                              {trip.truckIds && trip.truckIds.length > 0
                                ? trip.truckIds.map(tr => tr.registrationNumber).join(', ')
                                : trip.truckId?.registrationNumber || 'Unknown'}
                            </div>
                            <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-md text-[11px] font-medium text-on-surface">
                              <span className="material-symbols-outlined text-[14px] text-primary">person</span>
                              {trip.driverIds && trip.driverIds.length > 0
                                ? trip.driverIds.map(dr => dr.userId?.name || dr.licenseNumber).join(', ')
                                : trip.driverId?.userId?.name || trip.driverId?.licenseNumber || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Summary & Generate */}
              <div className="w-full md:w-[320px] bg-surface-container-lowest flex flex-col">
                {selectedTripId && selectedTripDetails ? (
                  <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                    <h4 className="font-bold text-[12px] uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> Selected Trip
                    </h4>
                    
                    <div className="bg-white rounded-xl border border-outline-variant/50 p-4 shadow-sm space-y-4 mb-6">
                      <div>
                        <div className="text-[11px] font-bold text-on-surface-variant uppercase mb-1">Route</div>
                        <div className="text-[14px] font-bold text-on-surface">{selectedTripDetails.source} → {selectedTripDetails.destination}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[11px] font-bold text-on-surface-variant uppercase mb-1">Date</div>
                          <div className="text-[13px] text-on-surface font-medium">{new Date(selectedTripDetails.startDate).toLocaleDateString('en-GB')}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-on-surface-variant uppercase mb-1">Status</div>
                          <div className="text-[13px] font-bold" style={{ color: selectedTripDetails.status === 'COMPLETED' ? '#16a34a' : '#ea580c' }}>{selectedTripDetails.status}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold text-on-surface-variant uppercase mb-1">Trip ID</div>
                        <div className="text-[11px] text-on-surface font-mono bg-surface-container-low px-2 py-1 rounded truncate">{selectedTripDetails._id}</div>
                      </div>
                      
                      <div className="pt-3 border-t border-outline-variant/30 grid grid-cols-2 gap-4">
                         <div>
                          <div className="text-[11px] font-bold text-on-surface-variant uppercase mb-1">Truck</div>
                          <div className="text-[13px] font-medium text-on-surface">
                            {selectedTripDetails.truckIds && selectedTripDetails.truckIds.length > 0
                              ? selectedTripDetails.truckIds.map(tr => tr.registrationNumber).join(', ')
                              : selectedTripDetails.truckId?.registrationNumber || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-on-surface-variant uppercase mb-1">Driver</div>
                          <div className="text-[13px] font-medium text-on-surface truncate">
                            {selectedTripDetails.driverIds && selectedTripDetails.driverIds.length > 0
                              ? selectedTripDetails.driverIds.map(dr => dr.userId?.name || dr.licenseNumber).join(', ')
                              : selectedTripDetails.driverId?.userId?.name || selectedTripDetails.driverId?.licenseNumber || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto bg-surface-container-low rounded-xl p-4 text-[12px] text-on-surface-variant flex items-start gap-2 border border-outline-variant/30">
                      <span className="material-symbols-outlined text-[16px] text-secondary shrink-0">description</span>
                      <p>The generated PDF will contain detailed route info, cargo, truck/driver stats, and complete itemized expenses.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
                     <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-4">
                       <span className="material-symbols-outlined text-[32px] opacity-40">touch_app</span>
                     </div>
                     <p className="font-medium text-[14px]">Select a trip from the list</p>
                     <p className="text-[12px] mt-1 opacity-70">A summary will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/30 bg-surface flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedTripId(null); }}
                className="px-5 py-2.5 rounded-xl font-label-md text-[13px] font-medium text-on-surface hover:bg-surface-container-highest transition-colors"
                disabled={isGeneratingPdf}
              >
                Cancel
              </button>
              <button 
                onClick={handleGeneratePDF}
                disabled={!selectedTripId || isGeneratingPdf}
                className="bg-secondary text-white px-6 py-2.5 rounded-xl font-label-md text-[13px] font-bold hover:bg-secondary/90 transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isGeneratingPdf ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    Generate PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
