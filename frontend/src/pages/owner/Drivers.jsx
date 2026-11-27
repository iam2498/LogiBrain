import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { validateLicenseNumber } from "../../utils/licenseValidator";

export default function Drivers() {
  const { user, logout } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const [drivers, setDrivers] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Driver Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDriverForm, setNewDriverForm] = useState({ name: "", email: "", phone: "", licenseNumber: "", truckId: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Profile & Edit State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [driverHistory, setDriverHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [editDriverForm, setEditDriverForm] = useState({ name: "", email: "", phone: "", licenseNumber: "", address: "", emergencyContact: "", imageUrl: "", truckId: "" });
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  
  // Real-time license number rule validation checks
  const newLicenseValidation = useMemo(() => {
    if (!newDriverForm.licenseNumber) return null;
    return validateLicenseNumber(newDriverForm.licenseNumber);
  }, [newDriverForm.licenseNumber]);

  const editLicenseValidation = useMemo(() => {
    if (!editDriverForm.licenseNumber) return null;
    return validateLicenseNumber(editDriverForm.licenseNumber);
  }, [editDriverForm.licenseNumber]);
  
  // Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleAddDriverChange = (e) => {
    setNewDriverForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateDriver = async (e) => {
    e.preventDefault();
    if (!newDriverForm.licenseNumber?.trim()) {
      setSubmitError("License number is required");
      return;
    }
    const check = validateLicenseNumber(newDriverForm.licenseNumber);
    if (!check.isValid) {
      setSubmitError(check.message);
      showError(check.message);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...newDriverForm,
        password: "123123123",
        email: newDriverForm.email?.trim() || `driver_${newDriverForm.phone}@temp.com`
      };
      await axiosClient.post("/drivers", payload);
      const [dRes, tRes] = await Promise.all([axiosClient.get("/drivers"), axiosClient.get("/trucks")]);
      setDrivers(dRes.data.data || []);
      setAllTrucks(tRes.data.data || []);
      setIsAddModalOpen(false);
      setNewDriverForm({ name: "", email: "", phone: "", licenseNumber: "", truckId: "" });
      showSuccess("Driver added successfully!");
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Failed to add driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProfileModal = async (driver) => {
    setSelectedDriver(driver);
    setEditDriverForm({
      name: driver.userId?.name || "",
      email: driver.userId?.email || "",
      phone: driver.userId?.phone || "",
      licenseNumber: driver.licenseNumber || "",
      address: driver.address || "",
      emergencyContact: driver.emergencyContact || "",
      imageUrl: driver.imageUrl || "",
      truckId: driver.assignedTruck?._id || ""
    });
    setIsProfileModalOpen(true);
    
    setIsHistoryLoading(true);
    try {
      const res = await axiosClient.get(`/trips?driverId=${driver._id}`);
      setDriverHistory(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleUpdateDriver = async (e) => {
    e.preventDefault();
    if (editDriverForm.licenseNumber?.trim()) {
      const check = validateLicenseNumber(editDriverForm.licenseNumber);
      if (!check.isValid) {
        showError(check.message);
        return;
      }
    }

    setIsUpdateSubmitting(true);
    try {
      const res = await axiosClient.put(`/drivers/${selectedDriver._id}`, editDriverForm);
      setDrivers(prev => prev.map(d => d._id === selectedDriver._id ? res.data.data : d));
      setSelectedDriver(res.data.data);
      const [dRes, tRes] = await Promise.all([axiosClient.get("/drivers"), axiosClient.get("/trucks")]);
      setDrivers(dRes.data.data || []);
      setAllTrucks(tRes.data.data || []);
      setIsProfileModalOpen(false);
      showSuccess("Driver updated successfully!");
    } catch (error) {
      showError(error.response?.data?.message || "Failed to update driver");
    } finally {
      setIsUpdateSubmitting(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditDriverForm({ ...editDriverForm, imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const [driversRes, trucksRes] = await Promise.all([
          axiosClient.get("/drivers"),
          axiosClient.get("/trucks")
        ]);
        const driverList = driversRes.data.data || [];
        setDrivers(driverList);
        setAllTrucks(trucksRes.data.data || []);
        if (driverList.length > 0) {
          setSelectedDriver((prev) => {
            if (prev) {
              const matched = driverList.find((d) => d._id === prev._id);
              return matched || driverList[0];
            }
            return driverList[0];
          });
        }
      } catch (error) {
        console.error("Failed to fetch drivers", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased overflow-hidden flex h-screen">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[90] md:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      {/* SideNavBar */}
      <aside className={`bg-primary-container h-screen w-[240px] fixed left-0 top-0 shadow-lg flex flex-col py-6 z-[100] transition-transform duration-300 md:translate-x-0 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
          <Link to="/owner/dashboard" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
          </Link>
          <Link to="/owner/trips" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">route</span> Trips
          </Link>
          <Link to="/owner/trucks" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span> Trucks
          </Link>
          <Link to="/owner/drivers" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-secondary bg-surface-container-highest/10 rounded-lg hover:bg-surface-container-highest/20 transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px] fill-icon">person</span> Drivers
          </Link>
          <Link to="/owner/expenses" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px] fill-icon">payments</span> Expenses
          </Link>
          <Link to="/owner/reports" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
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
      <div className="flex-1 flex flex-col md:ml-[240px] h-screen overflow-hidden bg-background">
        
        {/* TopNavBar */}
        <header className="bg-surface/80 backdrop-blur-md h-16 sticky top-0 z-40 border-b border-outline-variant flex justify-between items-center w-full px-6 md:px-10 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-on-surface-variant p-2 -ml-2 rounded-lg hover:bg-surface-container-low">
            <span className="material-symbols-outlined">menu</span>
          </button>
          


          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-3 py-1.5 border border-outline-variant/30 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm py-1 px-2 w-48 text-on-surface placeholder:text-on-surface-variant outline-none" placeholder="Search drivers..." type="text"/>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-all relative">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
            </div>
            <div className="h-6 w-px bg-outline-variant/50 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsAddModalOpen(true)} className="bg-[#0a0a0a] text-white px-3 sm:px-4 py-2 rounded-lg font-label-md text-[13px] font-medium hover:bg-black transition-transform duration-200 active:scale-95 flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Add Driver</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 w-full max-w-[1440px] mx-auto">
          {loading ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-headline-lg text-[32px] font-bold text-on-surface tracking-tight mb-1">Driver Management</h2>
                  <p className="font-body-md text-[14px] text-on-surface-variant mt-1 max-w-2xl">Manage drivers, monitor performance, licenses, attendance, salaries, safety, and trip history.</p>
                </div>

              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">group</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Drivers</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{drivers.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{drivers.filter(d => d.status === 'AVAILABLE').length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">local_shipping</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">On Trip</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{drivers.filter(d => d.status === 'ON_TRIP').length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-orange-600">event_busy</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">On Leave</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{drivers.filter(d => d.status === 'ON_LEAVE').length}</div>
                </div>
              </div>

              {/* Filters & View Toggle Row */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilter('ALL')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'ALL' ? 'bg-on-surface text-surface-container-lowest border border-on-surface' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/50 hover:bg-surface-variant'}`}>All</button>
                  <button onClick={() => setFilter('AVAILABLE')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'AVAILABLE' ? 'bg-on-surface text-surface-container-lowest border border-on-surface' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>Available</button>
                  <button onClick={() => setFilter('ON_TRIP')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'ON_TRIP' ? 'bg-on-surface text-surface-container-lowest border border-on-surface' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'}`}>On Trip</button>
                  <button onClick={() => setFilter('ON_LEAVE')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'ON_LEAVE' ? 'bg-on-surface text-surface-container-lowest border border-on-surface' : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'}`}>On Leave</button>
                </div>
                <div className="flex items-center bg-white p-1 rounded-lg border border-outline-variant/50 shrink-0">
                  <button className="p-1 rounded-md bg-surface-container-highest shadow-sm text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  </button>
                  <button className="p-1 rounded-md text-on-surface-variant hover:text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">table_rows</span>
                  </button>
                </div>
              </div>

              {/* Dual Pane Layout */}
              <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-360px)] min-h-[500px]">
                {/* Left Pane: Grid (70%) */}
                <div className="w-full lg:w-[70%] h-full flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-8 custom-scrollbar h-full content-start">
                    {drivers.filter(d => filter === 'ALL' || d.status === filter).filter(d =>
                      d.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.userId?.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.licenseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.assignedTruck?.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(driver => (
                      <div 
                        key={driver._id} 
                        onClick={() => setSelectedDriver(driver)}
                        className={`bg-white rounded-xl border ${selectedDriver?._id === driver._id ? 'border-2 border-secondary shadow-md' : 'border-outline-variant/50 shadow-sm'} p-4 relative cursor-pointer hover:shadow-md transition-all`}
                      >
                        <div className="absolute top-4 right-4 flex gap-1">
                          {driver.status === 'ON_TRIP' ? (
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> On Trip
                            </span>
                          ) : driver.status === 'AVAILABLE' ? (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
                            </span>
                          ) : (
                            <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full border border-orange-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> On Leave
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            {driver.imageUrl ? (
                              <div className="w-14 h-14 rounded-full border-2 border-surface overflow-hidden">
                                <img src={driver.imageUrl} alt={driver.userId?.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-xl border-2 border-surface">
                                {driver.userId?.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {driver.status && (
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface flex items-center justify-center ${driver.status === 'AVAILABLE' ? 'bg-emerald-500' : driver.status === 'ON_TRIP' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-title-md text-[16px] font-bold text-on-surface">{driver.userId?.name}</h3>
                            <p className="text-sm text-on-surface-variant font-medium">{driver.userId?.phone || 'No phone'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mb-4">
                          <div>
                            <p className="text-on-surface-variant text-xs mb-1">License</p>
                            <p className="font-medium text-[13px]">{driver.licenseNumber}</p>
                          </div>
                          <div>
                            <p className="text-on-surface-variant text-xs mb-1">Expiry</p>
                            <p className="font-medium text-[13px] text-amber-600">
                              {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center text-[12px] text-on-surface-variant font-medium">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="material-symbols-outlined text-[15px] shrink-0 text-primary">local_shipping</span>
                            <span className="truncate font-mono font-bold text-on-surface">
                              {driver.assignedTruck?.registrationNumber || 'No Truck Assigned'}
                            </span>
                            {driver.assignedTruck?.capacity && (
                              <span className="text-[11px] text-on-surface-variant font-normal">
                                ({driver.assignedTruck.capacity})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Right Pane: Quick Preview (30%) */}
                {selectedDriver && (
                  <div className="hidden lg:flex w-[30%] h-full flex-col">
                    <div className="bg-white rounded-xl border border-outline-variant/50 shadow-sm h-full overflow-y-auto custom-scrollbar flex flex-col relative">
                      {/* Header Background Graphic */}
                      <div className="h-24 w-full bg-gradient-to-r from-[#316bf3] to-[#0051d5] rounded-t-xl opacity-20 absolute top-0 left-0"></div>
                      <div className="p-6 relative z-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div className="relative mt-4">
                            {selectedDriver.imageUrl ? (
                              <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                                <img src={selectedDriver.imageUrl} alt={selectedDriver.userId?.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-4xl border-4 border-white shadow-md">
                                {selectedDriver.userId?.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className={`absolute bottom-1 right-1 ${selectedDriver.status === 'AVAILABLE' ? 'bg-emerald-500' : selectedDriver.status === 'ON_TRIP' ? 'bg-blue-500' : 'bg-orange-500'} w-5 h-5 rounded-full border-2 border-white flex items-center justify-center`}></div>
                          </div>
                          <div className="flex gap-2 relative">
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors border border-outline-variant/50">
                              <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>
                            {isDropdownOpen && (
                              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-outline-variant/30 py-1 z-50">
                                <button onClick={() => { setIsDropdownOpen(false); handleOpenProfileModal(selectedDriver); }} className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-on-surface hover:bg-surface-container-low flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">edit</span> Edit Profile
                                </button>
                                <button onClick={() => { setIsDropdownOpen(false); showInfo("Suspend driver coming soon"); }} className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">block</span> Suspend Driver
                                </button>
                                <button onClick={() => { setIsDropdownOpen(false); showInfo("Delete account coming soon"); }} className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">delete</span> Delete Account
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mb-6">
                          <h2 className="text-[20px] font-bold text-on-surface mb-1">{selectedDriver.userId?.name}</h2>
                          <p className="text-on-surface-variant font-medium text-[13px] flex items-center gap-2 mb-3">
                              ID: {selectedDriver._id.slice(-6).toUpperCase()} <span className="w-1 h-1 rounded-full bg-outline-variant"></span> {selectedDriver.status}
                          </p>
                          <div className="flex gap-2">
                            <button className="flex-1 bg-secondary text-white font-medium text-[13px] py-2 rounded-lg shadow-sm hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">call</span> Call
                            </button>
                            <button className="flex-1 bg-surface-container-low text-on-surface font-medium text-[13px] py-2 rounded-lg border border-outline-variant/50 hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">chat</span> Message
                            </button>
                          </div>
                        </div>
                        <div className="space-y-6 flex-1">
                          {/* Compliance Section */}
                          <div>
                            <h4 className="font-bold text-[11px] uppercase text-on-surface-variant mb-3 tracking-wider">Compliance Details</h4>
                            <ul className="space-y-3">
                              <li className="flex justify-between items-center text-[13px]">
                                <span className="text-on-surface-variant">License Number</span>
                                <span className="text-on-surface font-medium font-mono">{selectedDriver.licenseNumber}</span>
                              </li>
                              <li className="flex justify-between items-center text-[13px]">
                                <span className="text-on-surface-variant">License Expiry</span>
                                <span className={`font-medium flex items-center gap-1 ${new Date(selectedDriver.licenseExpiry) < new Date() ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {new Date(selectedDriver.licenseExpiry) < new Date() ? (
                                    <span className="material-symbols-outlined text-[14px]">warning</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                  )}
                                  {selectedDriver.licenseExpiry ? new Date(selectedDriver.licenseExpiry).toLocaleDateString() : 'N/A'}
                                </span>
                              </li>
                            </ul>
                          </div>

                          {/* Assignment Details */}
                          <div>
                            <h4 className="font-bold text-[11px] uppercase text-on-surface-variant mb-3 tracking-wider">Assignment Details</h4>
                            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 text-[13px] text-on-surface">
                              <p className="mb-2">
                                <span className="font-semibold text-on-surface-variant">Assigned Truck:</span>{" "}
                                <span className="font-mono font-bold text-on-surface">
                                  {selectedDriver.assignedTruck?.registrationNumber || 'None Assigned'}
                                </span>
                                {selectedDriver.assignedTruck?.capacity && (
                                  <span className="text-[11px] text-on-surface-variant ml-1.5 font-normal">
                                    ({selectedDriver.assignedTruck.capacity}{selectedDriver.assignedTruck.truckType ? ` • ${selectedDriver.assignedTruck.truckType}` : ''})
                                  </span>
                                )}
                              </p>
                              {selectedDriver.activeTrip && (
                                <p className="mb-2 text-[12px] text-secondary flex items-center gap-1 font-medium bg-blue-50/70 p-2 rounded-lg border border-blue-200/50">
                                  <span className="material-symbols-outlined text-[15px]">navigation</span>
                                  <span>Live Trip: {selectedDriver.activeTrip.source} ➔ {selectedDriver.activeTrip.destination}</span>
                                </p>
                              )}
                              <p><span className="font-semibold text-on-surface-variant">Joined On:</span> {new Date(selectedDriver.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          {/* Address Section */}
                          <div>
                            <h4 className="font-bold text-[11px] uppercase text-on-surface-variant mb-3 tracking-wider">Contact & Address</h4>
                            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 text-[13px] text-on-surface space-y-1.5">
                              {selectedDriver.userId?.email && (
                                <p><span className="font-semibold text-on-surface-variant">Email:</span> {selectedDriver.userId.email}</p>
                              )}
                              <p><span className="font-semibold text-on-surface-variant">Phone:</span> {selectedDriver.userId?.phone || 'Not specified'}</p>
                              <p><span className="font-semibold text-on-surface-variant">Address:</span> {selectedDriver.address || 'Not specified'}</p>
                              <p><span className="font-semibold text-on-surface-variant">Emergency:</span> {selectedDriver.emergencyContact || 'Not specified'}</p>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleOpenProfileModal(selectedDriver)} className="w-full mt-6 py-3 border-t border-outline-variant/30 text-secondary text-[13px] font-medium hover:underline text-center">
                          View Full Profile & History
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Add Driver Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <h3 className="text-[18px] font-bold text-on-surface">Add New Driver</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateDriver} className="p-6 space-y-4 flex-1 overflow-y-auto">
              {submitError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] border border-red-100 flex items-center gap-2">
                   <span className="material-symbols-outlined text-[16px]">error</span>
                   {submitError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Full Name <span className="text-red-500">*</span></label>
                <input required type="text" name="name" value={newDriverForm.name} onChange={handleAddDriverChange} placeholder="e.g. Ramesh Kumar" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface placeholder:text-on-surface-variant/50" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-on-surface-variant">Email Address <span className="text-red-500">*</span></label>
                  <input required type="email" name="email" value={newDriverForm.email} onChange={handleAddDriverChange} placeholder="e.g. ramesh@example.com" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface placeholder:text-on-surface-variant/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-on-surface-variant">Phone Number <span className="text-red-500">*</span></label>
                  <input required type="tel" name="phone" value={newDriverForm.phone} onChange={handleAddDriverChange} placeholder="e.g. 9876543210" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface placeholder:text-on-surface-variant/50" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[13px] font-semibold text-on-surface-variant">License Number <span className="text-red-500">*</span></label>
                  {newLicenseValidation && (
                    <span className={`text-[11px] font-semibold flex items-center gap-1 ${newLicenseValidation.isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {newLicenseValidation.isValid ? 'check_circle' : 'warning'}
                      </span>
                      {newLicenseValidation.isValid ? 'Valid' : 'Rule Check'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input 
                    required 
                    type="text" 
                    name="licenseNumber" 
                    value={newDriverForm.licenseNumber} 
                    onChange={handleAddDriverChange} 
                    placeholder="e.g. MH-12-2023-1234567" 
                    className={`w-full h-10 px-3 bg-surface-container-lowest border rounded-lg outline-none transition-all text-[14px] text-on-surface placeholder:text-on-surface-variant/50 uppercase font-mono pr-8 ${
                      newLicenseValidation
                        ? newLicenseValidation.isValid
                          ? 'border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500'
                          : 'border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-400'
                        : 'border-outline-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary'
                    }`} 
                  />
                  {newLicenseValidation && (
                    <span className={`material-symbols-outlined text-[18px] absolute right-2.5 top-2.5 pointer-events-none ${newLicenseValidation.isValid ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {newLicenseValidation.isValid ? 'check_circle' : 'info'}
                    </span>
                  )}
                </div>
                {/* Real-time Rule Checker Message */}
                {newLicenseValidation ? (
                  <p className={`text-[11.5px] leading-tight flex items-start gap-1 font-medium ${newLicenseValidation.isValid ? 'text-emerald-600' : 'text-amber-700'}`}>
                    <span>{newLicenseValidation.isValid ? '✓' : '•'}</span>
                    <span>{newLicenseValidation.message}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-on-surface-variant/70">
                    Rule format: SS-RR-YYYY-NNNNNNN (e.g. MH-12-2023-1234567)
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-on-surface-variant flex justify-between items-center">
                  <span>Assign to Truck (Optional)</span>
                  {newDriverForm.truckId && (
                    <button
                      type="button"
                      onClick={() => setNewDriverForm(p => ({ ...p, truckId: "" }))}
                      className="text-[11px] text-red-500 hover:text-red-700 hover:underline font-medium cursor-pointer"
                    >
                      Unselect Truck
                    </button>
                  )}
                </label>
                <select
                  name="truckId"
                  value={newDriverForm.truckId || ""}
                  onChange={handleAddDriverChange}
                  className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px] font-mono"
                >
                  <option value="">-- No Truck Assigned (Unselected) --</option>
                  {allTrucks
                    .filter((t) => !t.currentDriverId && t.status !== "ON_TRIP" && !t.activeTrip)
                    .map(t => (
                      <option key={t._id} value={t._id}>
                        {t.registrationNumber} ({t.capacity || "N/A"}) {t.truckType ? `• ${t.truckType}` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-[13px] border border-blue-100 flex items-start gap-2">
                 <span className="material-symbols-outlined text-[16px] mt-0.5">info</span>
                 <div>
                   <p className="font-semibold mb-0.5">Driver Login Details</p>
                   <p>The driver will be able to log in using this <b>Email</b> or <b>Phone Number</b> and the default password <b>123123123</b>.</p>
                 </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 bg-white border border-outline-variant/50 rounded-lg font-medium text-[13px] text-on-surface hover:bg-surface-container-low transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`flex-1 px-4 py-2 bg-[#0a0a0a] text-white rounded-lg font-medium text-[13px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm ${isSubmitting ? 'opacity-80 cursor-not-allowed' : ''}`}>
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">person_add</span>
                      Add Driver
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Profile & History Modal */}
      {isProfileModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1000px] h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                {selectedDriver.imageUrl ? (
                  <div className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden">
                    <img src={selectedDriver.imageUrl} alt={selectedDriver.userId?.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-lg border border-outline-variant">
                    {selectedDriver.userId?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-[18px] font-bold text-on-surface leading-tight">{selectedDriver.userId?.name}</h3>
                  <p className="text-[13px] text-on-surface-variant">Driver Profile & History</p>
                </div>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-2 rounded-full transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background flex flex-col lg:flex-row gap-6">
              
              {/* Left Column: Edit Form */}
              <div className="w-full lg:w-1/3 flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-outline-variant/40 p-5 shadow-sm">
                  <h4 className="text-[15px] font-bold text-on-surface mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">edit</span>
                    Edit Information
                  </h4>
                  <form onSubmit={handleUpdateDriver} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Full Name</label>
                      <input required type="text" value={editDriverForm.name} onChange={(e) => setEditDriverForm(p => ({...p, name: e.target.value}))} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Email Address</label>
                      <input required type="email" value={editDriverForm.email} onChange={(e) => setEditDriverForm(p => ({...p, email: e.target.value}))} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Phone Number</label>
                      <input required type="tel" value={editDriverForm.phone} onChange={(e) => setEditDriverForm(p => ({...p, phone: e.target.value}))} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[12px] font-semibold text-on-surface-variant">License Number</label>
                        {editLicenseValidation && (
                          <span className={`text-[11px] font-semibold flex items-center gap-1 ${editLicenseValidation.isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {editLicenseValidation.isValid ? 'check_circle' : 'warning'}
                            </span>
                            {editLicenseValidation.isValid ? 'Valid' : 'Rule Check'}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                          required 
                          type="text" 
                          value={editDriverForm.licenseNumber} 
                          onChange={(e) => setEditDriverForm(p => ({...p, licenseNumber: e.target.value}))} 
                          className={`w-full h-10 px-3 bg-surface-container-lowest border rounded-lg focus:outline-none transition-all text-[13px] uppercase font-mono pr-8 ${
                            editLicenseValidation
                              ? editLicenseValidation.isValid
                                ? 'border-emerald-500 focus:border-emerald-600'
                                : 'border-amber-400 focus:border-amber-500'
                              : 'border-outline-variant/50 focus:border-secondary'
                          }`} 
                        />
                        {editLicenseValidation && (
                          <span className={`material-symbols-outlined text-[18px] absolute right-2.5 top-2.5 pointer-events-none ${editLicenseValidation.isValid ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {editLicenseValidation.isValid ? 'check_circle' : 'info'}
                          </span>
                        )}
                      </div>
                      {editLicenseValidation ? (
                        <p className={`text-[11.5px] leading-tight flex items-start gap-1 font-medium ${editLicenseValidation.isValid ? 'text-emerald-600' : 'text-amber-700'}`}>
                          <span>{editLicenseValidation.isValid ? '✓' : '•'}</span>
                          <span>{editLicenseValidation.message}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-on-surface-variant/70">
                          Rule format: SS-RR-YYYY-NNNNNNN (e.g. MH-12-2023-1234567)
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Address</label>
                      <input type="text" value={editDriverForm.address} onChange={(e) => setEditDriverForm(p => ({...p, address: e.target.value}))} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Emergency Contact</label>
                      <input type="text" value={editDriverForm.emergencyContact} onChange={(e) => setEditDriverForm(p => ({...p, emergencyContact: e.target.value}))} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant flex justify-between items-center">
                        <span>Assigned Truck</span>
                        {editDriverForm.truckId && (
                          <button
                            type="button"
                            onClick={() => setEditDriverForm(p => ({ ...p, truckId: "" }))}
                            className="text-[11px] text-red-500 hover:text-red-700 hover:underline font-medium cursor-pointer"
                          >
                            Unselect Truck
                          </button>
                        )}
                      </label>
                      <select
                        value={editDriverForm.truckId || ""}
                        onChange={(e) => setEditDriverForm(p => ({ ...p, truckId: e.target.value }))}
                        className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px] font-mono"
                      >
                        <option value="">-- No Truck Assigned (Unselected) --</option>
                        {allTrucks
                          .filter((t) => {
                            if (editDriverForm.truckId === t._id) return true;
                            if (t.status === "ON_TRIP" || t.activeTrip) return false;
                            const assignedDriverId = t.currentDriverId?._id || t.currentDriverId;
                            if (assignedDriverId && assignedDriverId !== selectedDriver?._id) return false;
                            return true;
                          })
                          .map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.registrationNumber} ({t.capacity || "N/A"}{t.truckType ? ` • ${t.truckType}` : ""})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant flex justify-between">
                        <span>Profile Photo</span>
                        <label className="text-secondary cursor-pointer hover:underline text-[11px] font-bold">
                          Upload Photo
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </label>
                      <input type="text" value={editDriverForm.imageUrl} onChange={(e) => setEditDriverForm(p => ({...p, imageUrl: e.target.value}))} placeholder="Or paste image URL here..." className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]" />
                    </div>
                    
                    <button type="submit" disabled={isUpdateSubmitting} className="w-full py-2.5 mt-2 bg-secondary text-white rounded-lg font-medium text-[13px] hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2">
                      {isUpdateSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Trip History */}
              <div className="w-full lg:w-2/3 flex flex-col gap-4">
                <div className="bg-white rounded-xl border border-outline-variant/40 shadow-sm flex flex-col h-full overflow-hidden">
                  <div className="p-5 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
                    <h4 className="text-[15px] font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-secondary">history</span>
                      Dispatch History
                    </h4>
                    <span className="text-[12px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">{driverHistory.length} Trips</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {isHistoryLoading ? (
                       <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-secondary border-t-transparent rounded-full"></div></div>
                    ) : driverHistory.length === 0 ? (
                       <div className="p-12 text-center flex flex-col items-center justify-center text-on-surface-variant">
                         <span className="material-symbols-outlined text-[48px] opacity-20 mb-3">rv_hookup</span>
                         <p className="font-medium text-[14px]">No trip history found.</p>
                       </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-surface-container-low/30 sticky top-0 backdrop-blur-md">
                          <tr>
                            <th className="py-3 px-5 font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider">Date</th>
                            <th className="py-3 px-5 font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider">Route</th>
                            <th className="py-3 px-5 font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider">Status</th>
                            <th className="py-3 px-5 font-semibold text-[11px] text-on-surface-variant uppercase tracking-wider text-right">Trip Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                          {driverHistory.map((trip) => (
                            <tr key={trip._id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-3 px-5 text-[13px] text-on-surface whitespace-nowrap">
                                {new Date(trip.startDate).toLocaleDateString('en-GB')}
                              </td>
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-1.5 text-[13px] font-medium text-on-surface">
                                  <span>{trip.source}</span>
                                  <span className="material-symbols-outlined text-[14px] text-outline-variant">arrow_right_alt</span>
                                  <span>{trip.destination}</span>
                                </div>
                                <div className="text-[11px] text-on-surface-variant mt-0.5 font-mono">
                                  {trip.truckIds && trip.truckIds.length > 0
                                    ? trip.truckIds.map(t => t.registrationNumber).join(', ')
                                    : trip.truckId?.registrationNumber || 'Unknown Truck'}
                                </div>
                              </td>
                              <td className="py-3 px-5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider
                                  ${trip.status === 'ON_TRIP' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                    trip.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-surface-container-high text-on-surface border-outline-variant'}`}>
                                  {trip.status === 'ON_TRIP' ? 'On Trip' : trip.status}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-right font-mono text-[13px] font-bold text-on-surface whitespace-nowrap">
                                ₹{trip.actualRevenue?.toLocaleString() || trip.expectedRevenue?.toLocaleString() || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
