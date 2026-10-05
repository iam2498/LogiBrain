import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";

export default function Trucks() {
  const { user, logout } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Truck State
  const [drivers, setDrivers] = useState([]);
  const [editTruckForm, setEditTruckForm] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Add Truck Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTruckForm, setNewTruckForm] = useState({
    registrationNumber: "",
    truckType: "",
    model: "",
    capacity: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Truck History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [truckHistory, setTruckHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const handleOpenHistory = async (truckId) => {
    setIsHistoryModalOpen(true);
    setIsHistoryLoading(true);
    try {
      const res = await axiosClient.get(`/trips?truckId=${truckId}`);
      setTruckHistory(res.data.data);
    } catch (error) {
      console.error("Failed to fetch truck history", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleFormChange = (e) => {
    setNewTruckForm({ ...newTruckForm, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (selectedTruck) {
      setEditTruckForm({
        registrationNumber: selectedTruck.registrationNumber || "",
        capacity: selectedTruck.capacity || "",
        imageUrl: selectedTruck.imageUrl || "",
        currentDriverId: selectedTruck.currentDriverId?._id || selectedTruck.currentDriverId || "",
      });
    }
  }, [selectedTruck]);

  const handleUpdateTruckChange = (e) => {
    setEditTruckForm({ ...editTruckForm, [e.target.name]: e.target.value });
  };

  const handleUpdateTruck = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const payload = { ...editTruckForm };
      if (!payload.currentDriverId || payload.currentDriverId === "") {
        payload.currentDriverId = null;
      }
      const res = await axiosClient.put("/trucks/" + selectedTruck._id, payload);
      
      // Update local state
      const updatedTruck = res.data.data;
      // We need to re-populate the driver info locally since backend returns unpopulated on update
      if (updatedTruck.currentDriverId) {
         const d = drivers.find(drv => drv._id === updatedTruck.currentDriverId);
         if (d) {
           updatedTruck.currentDriverId = { _id: d._id, userId: d.userId, licenseNumber: d.licenseNumber };
         }
      }

      setTrucks(trucks.map(t => t._id === selectedTruck._id ? updatedTruck : t));
      setSelectedTruck(updatedTruck);
      setIsEditModalOpen(false); // Close the edit modal
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditTruckForm({ ...editTruckForm, imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTruck = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await axiosClient.post("/trucks", newTruckForm);
      setTrucks([res.data.data, ...trucks]); // prepend new truck
      setIsAddModalOpen(false);
      setNewTruckForm({ registrationNumber: "", truckType: "", model: "", capacity: "" }); // reset
      if (!selectedTruck) setSelectedTruck(res.data.data);
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Failed to add truck");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (truck) => {
    setSelectedTruck(truck);
    setIsEditModalOpen(true);
  };

  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const [res, driversRes] = await Promise.all([
          axiosClient.get("/trucks"),
          axiosClient.get("/drivers")
        ]);
        setTrucks(res.data.data);
        setDrivers(driversRes.data.data);
        if (res.data.data.length > 0) {
          setSelectedTruck(res.data.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrucks();
  }, []);

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased overflow-hidden flex h-screen">
      
      {/* SideNavBar */}
      <aside className="bg-primary-container h-screen w-sidebar-width fixed left-0 top-0 shadow-lg flex flex-col py-6 z-50 hidden md:flex">
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
          <Link to="/owner/dashboard" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
          </Link>
          <Link to="/owner/trips" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">route</span> Trips
          </Link>
          <Link to="/owner/trucks" className="flex items-center gap-3 px-4 py-3 text-secondary bg-surface-container-highest/10 rounded-lg hover:bg-surface-container-highest/20 transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px] fill-icon">local_shipping</span> Trucks
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
      <div className="flex-1 flex flex-col md:ml-[240px] h-screen overflow-hidden bg-background">
        
        {/* TopNavBar */}
        <header className="bg-surface/80 backdrop-blur-md h-16 sticky top-0 z-40 border-b border-outline-variant flex justify-between items-center w-full px-6 md:px-10">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-on-surface-variant p-2 -ml-2 rounded-lg hover:bg-surface-container-low">
            <span className="material-symbols-outlined">menu</span>
          </button>
          


          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-3 py-1.5 border border-outline-variant/30 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm py-1 px-2 w-48 text-on-surface placeholder:text-on-surface-variant outline-none" placeholder="Search trucks..." type="text"/>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-all relative">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
            </div>
            <div className="h-6 w-px bg-outline-variant/50 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-3">
              <button onClick={() => setIsAddModalOpen(true)} className="bg-[#0a0a0a] text-white px-4 py-2 rounded-lg font-label-md text-[13px] font-medium hover:bg-black transition-transform duration-200 active:scale-95 flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                Add Truck
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
                  <h2 className="font-headline-lg text-[32px] font-bold text-on-surface tracking-tight mb-1">Fleet Management</h2>
                  <p className="font-body-md text-[14px] text-on-surface-variant mt-1 max-w-2xl">Manage every truck, monitor utilization, maintenance, and fleet status from one dashboard.</p>
                </div>

              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Trucks</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trucks.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Available</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trucks.filter(t => t.status === 'AVAILABLE').length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">route</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">On Trip</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trucks.filter(t => t.status === 'ON_TRIP').length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-red-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-red-600">build</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Maintenance</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trucks.filter(t => t.status === 'MAINTENANCE').length}</div>
                </div>
              </div>

              {/* Filters & View Toggle Row */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setFilter('ALL')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'ALL' ? 'bg-on-surface text-surface-container-lowest border border-on-surface' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/50 hover:bg-surface-variant'}`}>All</button>
                  <button onClick={() => setFilter('AVAILABLE')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'AVAILABLE' ? 'bg-on-surface text-surface-container-lowest border border-on-surface' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'}`}>Available</button>
                  <button onClick={() => setFilter('ON_TRIP')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'ON_TRIP' ? 'bg-on-surface text-surface-container-lowest border border-on-surface' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'}`}>On Trip</button>
                  <button onClick={() => setFilter('MAINTENANCE')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'MAINTENANCE' ? 'bg-on-surface text-surface-container-lowest border border-on-surface' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'}`}>Maintenance</button>
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
                    {trucks.filter(t => filter === 'ALL' || t.status === filter).filter(t => 
                      t.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      t.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.capacity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.currentDriverId?.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.truckType?.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(truck => (
                      <div 
                        key={truck._id} 
                        onClick={() => setSelectedTruck(truck)}
                        className={`bg-white rounded-xl border ${selectedTruck?._id === truck._id ? 'border-2 border-secondary shadow-md' : 'border-outline-variant/50 shadow-sm'} p-4 relative cursor-pointer hover:shadow-md transition-all`}
                      >
                        <div className="absolute top-4 right-4 flex gap-1">
                          {truck.status === 'ON_TRIP' ? (
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> On Trip
                            </span>
                          ) : truck.status === 'AVAILABLE' ? (
                            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Available
                            </span>
                          ) : (
                            <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Maintenance
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-4 mb-4">
                          <div className="relative">
                            {truck.imageUrl ? (
                              <div className="w-14 h-14 rounded-full border-2 border-surface overflow-hidden">
                                <img src={truck.imageUrl} alt={truck.registrationNumber} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-xl border-2 border-surface">
                                <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                              </div>
                            )}
                            {truck.status && (
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface flex items-center justify-center ${truck.status === 'AVAILABLE' ? 'bg-emerald-500' : truck.status === 'ON_TRIP' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-title-md text-[16px] font-bold text-on-surface font-mono">{truck.registrationNumber}</h3>
                            <p className="text-sm text-on-surface-variant font-medium capitalize">{truck.capacity} • {truck.truckType || 'Truck'}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-between items-center text-[12px] text-on-surface-variant font-medium">
                           <div className="flex items-center gap-1.5">
                             <span className="material-symbols-outlined text-[14px]">person</span>
                             {truck.currentDriverId?.userId?.name || 'No Driver'}
                           </div>
                           <div className="flex items-center gap-1.5">
                             <span className="material-symbols-outlined text-[14px]">local_gas_station</span>
                             Good
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Pane: Quick Preview (30%) */}
                {selectedTruck ? (
                  <div className="hidden lg:flex w-[30%] h-full flex-col">
                    <div className="bg-white rounded-xl border border-outline-variant/50 shadow-sm h-full overflow-y-auto custom-scrollbar flex flex-col relative">
                      {/* Header Background Graphic */}
                      <div className="h-24 w-full bg-gradient-to-r from-[#316bf3] to-[#0051d5] rounded-t-xl opacity-20 absolute top-0 left-0"></div>
                      <div className="p-6 relative z-10 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div className="relative mt-4">
                            {selectedTruck.imageUrl ? (
                              <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                                <img src={selectedTruck.imageUrl} alt={selectedTruck.registrationNumber} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-24 h-24 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-bold text-4xl border-4 border-white shadow-md">
                                <span className="material-symbols-outlined text-[40px]">local_shipping</span>
                              </div>
                            )}
                            <div className={`absolute bottom-1 right-1 ${selectedTruck.status === 'AVAILABLE' ? 'bg-emerald-500' : selectedTruck.status === 'ON_TRIP' ? 'bg-blue-500' : 'bg-red-500'} w-5 h-5 rounded-full border-2 border-white flex items-center justify-center`}></div>
                          </div>
                          <div className="flex gap-2 relative">
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors border border-outline-variant/50">
                              <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </button>
                            {isDropdownOpen && (
                              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-outline-variant/30 py-1 z-50">
                                <button onClick={() => { setIsDropdownOpen(false); handleOpenEditModal(selectedTruck); }} className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-on-surface hover:bg-surface-container-low flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">edit</span> Edit Profile
                                </button>
                                <button onClick={() => { setIsDropdownOpen(false); alert("Functionality mocked."); }} className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">build</span> Maintenance
                                </button>
                                <button onClick={() => { setIsDropdownOpen(false); alert("Functionality mocked."); }} className="w-full text-left px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">delete</span> Remove Truck
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mb-6">
                          <h2 className="text-[20px] font-bold text-on-surface mb-1 font-mono">{selectedTruck.registrationNumber}</h2>
                          <p className="text-on-surface-variant font-medium text-[13px] flex items-center gap-2 mb-3">
                              ID: {selectedTruck._id.slice(-6).toUpperCase()} <span className="w-1 h-1 rounded-full bg-outline-variant"></span> {selectedTruck.status}
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => handleOpenEditModal(selectedTruck)} className="flex-1 bg-secondary text-white font-medium text-[13px] py-2 rounded-lg shadow-sm hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">edit</span> Edit
                            </button>
                            <button onClick={() => handleOpenHistory(selectedTruck._id)} className="flex-1 bg-surface-container-low text-on-surface font-medium text-[13px] py-2 rounded-lg border border-outline-variant/50 hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">history</span> History
                            </button>
                          </div>
                        </div>
                        <div className="space-y-6 flex-1">
                          {/* Compliance Section */}
                          <div>
                            <h4 className="font-bold text-[11px] uppercase text-on-surface-variant mb-3 tracking-wider">Specifications</h4>
                            <ul className="space-y-3">
                              <li className="flex justify-between items-center text-[13px]">
                                <span className="text-on-surface-variant">Capacity</span>
                                <span className="text-on-surface font-medium capitalize">{selectedTruck.capacity || 'Not specified'}</span>
                              </li>
                              <li className="flex justify-between items-center text-[13px]">
                                <span className="text-on-surface-variant">Truck Type</span>
                                <span className="text-on-surface font-medium capitalize">{selectedTruck.truckType || 'Not specified'}</span>
                              </li>
                              <li className="flex justify-between items-center text-[13px]">
                                <span className="text-on-surface-variant">Model/Make</span>
                                <span className="text-on-surface font-medium capitalize">{selectedTruck.model || 'Not specified'}</span>
                              </li>
                            </ul>
                          </div>

                          {/* Address Section */}
                          <div>
                            <h4 className="font-bold text-[11px] uppercase text-on-surface-variant mb-3 tracking-wider">Assignment Details</h4>
                            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 text-[13px] text-on-surface">
                              <p className="mb-2"><span className="font-semibold text-on-surface-variant">Current Driver:</span> {selectedTruck.currentDriverId?.userId?.name || 'None Assigned'}</p>
                              <p><span className="font-semibold text-on-surface-variant">Added On:</span> {new Date(selectedTruck.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleOpenHistory(selectedTruck._id)} className="w-full mt-6 py-3 border-t border-outline-variant/30 text-secondary text-[13px] font-medium hover:underline text-center">
                          View Full History
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="hidden lg:flex w-[30%] h-full flex-col">
                    <div className="bg-white rounded-xl border border-outline-variant/50 shadow-sm flex flex-col h-full items-center justify-center p-8 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">touch_app</span>
                      <h3 className="text-[18px] font-bold text-on-surface mb-2">Select a Truck</h3>
                      <p className="text-[14px]">Click on any truck in the grid to view their complete profile, specifications, and history.</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

    {/* Edit Truck Modal */}
    {isEditModalOpen && selectedTruck && editTruckForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-[18px] font-bold text-on-surface">Edit Truck Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleUpdateTruck} className="p-6 space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Registration Number <span className="text-red-500">*</span></label>
                <input required type="text" name="registrationNumber" value={editTruckForm.registrationNumber} onChange={handleUpdateTruckChange} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface uppercase font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-on-surface-variant">Capacity</label>
                  <input type="text" name="capacity" value={editTruckForm.capacity} onChange={handleUpdateTruckChange} placeholder="e.g. 25 Ton" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[13px] font-semibold text-on-surface-variant flex justify-between">
                    <span>Truck Image</span>
                    <label className="text-secondary cursor-pointer hover:underline text-[11px] font-bold">
                      Upload Photo
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </label>
                  <input type="text" name="imageUrl" value={editTruckForm.imageUrl} onChange={handleUpdateTruckChange} placeholder="Or paste image URL here..." className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Assign Driver</label>
                <select name="currentDriverId" value={editTruckForm.currentDriverId} onChange={handleUpdateTruckChange} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface">
                  <option value="">-- No Driver Assigned --</option>
                  {drivers.map(d => (
                    <option key={d._id} value={d._id}>{d.userId?.name} (Lic: {d.licenseNumber})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2 bg-white border border-outline-variant/50 rounded-lg font-medium text-[13px] text-on-surface hover:bg-surface-container-low transition-colors">Cancel</button>
                <button type="submit" disabled={isUpdating} className={`flex-1 px-4 py-2 bg-secondary text-white rounded-lg font-medium text-[13px] hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 shadow-sm ${isUpdating ? 'opacity-80 cursor-not-allowed' : ''}`}>
                  {isUpdating ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Truck Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[450px] overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-[18px] font-bold text-on-surface">Add New Truck</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateTruck} className="p-6 space-y-4">
              {submitError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] border border-red-100 flex items-center gap-2">
                   <span className="material-symbols-outlined text-[16px]">error</span>
                   {submitError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Registration Number <span className="text-red-500">*</span></label>
                <input required type="text" name="registrationNumber" value={newTruckForm.registrationNumber} onChange={handleFormChange} placeholder="e.g. MH-12-AB-1234" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface placeholder:text-on-surface-variant/50 uppercase font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-on-surface-variant">Truck Type</label>
                  <input type="text" name="truckType" value={newTruckForm.truckType} onChange={handleFormChange} placeholder="e.g. 10 Wheeler" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface placeholder:text-on-surface-variant/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-on-surface-variant">Capacity</label>
                  <input type="text" name="capacity" value={newTruckForm.capacity} onChange={handleFormChange} placeholder="e.g. 25 Ton" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface placeholder:text-on-surface-variant/50" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-on-surface-variant">Model / Make</label>
                <input type="text" name="model" value={newTruckForm.model} onChange={handleFormChange} placeholder="e.g. Tata Signa 4825.T" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-[14px] text-on-surface placeholder:text-on-surface-variant/50" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 bg-white border border-outline-variant/50 rounded-lg font-medium text-[13px] text-on-surface hover:bg-surface-container-low transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`flex-1 px-4 py-2 bg-secondary text-white rounded-lg font-medium text-[13px] hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 shadow-sm ${isSubmitting ? 'opacity-80 cursor-not-allowed' : ''}`}>
                  {isSubmitting ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Save Truck
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Truck History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">history</span>
                <h3 className="text-[18px] font-bold text-on-surface">Truck History - {selectedTruck?.registrationNumber}</h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-surface">
              {isHistoryLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-secondary border-t-transparent"></div>
                </div>
              ) : truckHistory.length === 0 ? (
                <div className="text-center text-on-surface-variant py-10">
                  <span className="material-symbols-outlined text-[48px] opacity-20 mb-2">rv_hookup</span>
                  <p>No trip history found for this truck.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {truckHistory.map(trip => (
                    <div key={trip._id} className="bg-white border border-outline-variant/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${trip.status === 'COMPLETED' ? 'bg-green-500' : trip.status === 'ON_TRIP' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                          <span className="font-bold text-[13px] tracking-wide text-on-surface">{trip.status}</span>
                        </div>
                        <span className="text-[12px] font-medium text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded-md border border-outline-variant/30">
                          {new Date(trip.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mb-4 bg-surface-container-low/50 p-3 rounded-lg border border-outline-variant/20">
                        <div className="flex-1">
                          <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Source</p>
                          <p className="text-[14px] font-medium text-on-surface">{trip.source}</p>
                        </div>
                        <span className="material-symbols-outlined text-outline-variant">arrow_right_alt</span>
                        <div className="flex-1 text-right">
                          <p className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Destination</p>
                          <p className="text-[14px] font-medium text-on-surface">{trip.destination}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[13px]">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[16px]">person</span>
                          {trip.driverId?.userId?.name || 'Unknown Driver'}
                        </div>
                        <div className="font-bold text-on-surface font-mono">
                          ₹{trip.expectedRevenue?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
