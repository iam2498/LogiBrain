import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";

export default function Trips() {
  const { user, logout } = useAuth();
  const [trips, setTrips] = useState([]);
  const [availableTrucks, setAvailableTrucks] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [allTrucks, setAllTrucks] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [truckFilter, setTruckFilter] = useState("ALL");
  const [driverFilter, setDriverFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  // Create Trip Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTripForm, setNewTripForm] = useState({
    truckId: "",
    driverId: "",
    source: "",
    destination: "",
    material: "",
    quantity: "",
    expectedRevenue: "",
    startDate: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Edit Trip Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTripForm, setEditTripForm] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState("");

  const selectedNewTruck = availableTrucks.find(t => t._id === newTripForm.truckId);
  const newTripQuantityNum = Number(newTripForm.quantity);
  const newTripTruckCapacity = selectedNewTruck?.capacity ? parseFloat(selectedNewTruck.capacity) : null;
  const newTripCapacityError = (!isNaN(newTripQuantityNum) && newTripTruckCapacity !== null && newTripQuantityNum > newTripTruckCapacity)
    ? `Quantity cannot exceed the selected truck's capacity of ${selectedNewTruck.capacity}.`
    : null;

  const selectedEditTruck = allTrucks.find(t => t._id === editTripForm?.truckId);
  const editTripQuantityNum = Number(editTripForm?.quantity);
  const editTripTruckCapacity = selectedEditTruck?.capacity ? parseFloat(selectedEditTruck.capacity) : null;
  const editTripCapacityError = (!isNaN(editTripQuantityNum) && editTripTruckCapacity !== null && editTripQuantityNum > editTripTruckCapacity)
    ? `Quantity cannot exceed the selected truck's capacity of ${selectedEditTruck.capacity}.`
    : null;

  const handleOpenEditModal = (trip) => {
    setEditTripForm({
      id: trip._id,
      truckId: trip.truckId?._id || trip.truckId,
      driverId: trip.driverId?._id || trip.driverId,
      source: trip.source,
      destination: trip.destination,
      material: trip.material,
      quantity: trip.quantity,
      expectedRevenue: trip.expectedRevenue,
      startDate: trip.startDate ? new Date(trip.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setEditSubmitError("");
    setIsEditModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    const { source, destination, truckId, driverId, material, quantity, expectedRevenue, startDate } = newTripForm;

    if (!source?.trim() || source.trim().length < 3) {
      errors.source = "Source must be at least 3 characters.";
    }
    if (!destination?.trim() || destination.trim().length < 3) {
      errors.destination = "Destination must be at least 3 characters.";
    }
    if (!truckId) {
      errors.truckId = "Please select a truck.";
    }
    if (!driverId) {
      errors.driverId = "Please select a driver.";
    }
    if (!material?.trim() || material.trim().length < 2) {
      errors.material = "Material must be at least 2 characters.";
    }
    
    const qtyNum = Number(quantity);
    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      errors.quantity = "Quantity must be greater than 0.";
    }

    const revNum = Number(expectedRevenue);
    if (!expectedRevenue || isNaN(revNum) || revNum <= 0) {
      errors.expectedRevenue = "Trip rate must be greater than ₹0.";
    }

    if (!startDate || isNaN(new Date(startDate).getTime())) {
      errors.startDate = "Please select a valid start date.";
    }

    if (newTripCapacityError) {
      errors.quantity = newTripCapacityError;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "truckId") {
      const selectedTruck = availableTrucks.find(t => t._id === value);
      let newDriverId = "";
      
      if (selectedTruck && selectedTruck.currentDriverId) {
        const defaultDriverId = typeof selectedTruck.currentDriverId === 'object' 
          ? selectedTruck.currentDriverId._id 
          : selectedTruck.currentDriverId;
          
        const isAvailable = availableDrivers.some(d => d._id === defaultDriverId);
        if (isAvailable) {
          newDriverId = defaultDriverId;
        }
      }
      
      setNewTripForm({ ...newTripForm, [name]: value, driverId: newDriverId });
      
      if (formErrors[name]) {
        setFormErrors({ ...formErrors, [name]: "" });
      }
      if (newDriverId && formErrors.driverId) {
        setFormErrors(prev => ({ ...prev, driverId: "" }));
      }
    } else {
      setNewTripForm({ ...newTripForm, [name]: value });
      if (formErrors[name]) {
        setFormErrors({ ...formErrors, [name]: "" });
      }
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "truckId") {
      const selectedTruck = allTrucks.find(t => t._id === value);
      let newDriverId = "";
      
      if (selectedTruck && selectedTruck.currentDriverId) {
        const defaultDriverId = typeof selectedTruck.currentDriverId === 'object' 
          ? selectedTruck.currentDriverId._id 
          : selectedTruck.currentDriverId;
          
        const isAvailable = availableDrivers.some(d => d._id === defaultDriverId) || editTripForm.driverId === defaultDriverId;
        if (isAvailable) {
          newDriverId = defaultDriverId;
        }
      }
      
      setEditTripForm({ ...editTripForm, [name]: value, driverId: newDriverId });
    } else {
      setEditTripForm({ ...editTripForm, [name]: value });
    }
  };

  const fetchTripsAndResources = async () => {
    try {
      const [tripsRes, trucksRes, driversRes] = await Promise.all([
        axiosClient.get("/trips"),
        axiosClient.get("/trucks?status=AVAILABLE"),
        axiosClient.get("/drivers?status=AVAILABLE")
      ]);
      setTrips(tripsRes.data.data);
      // Ensure we only keep AVAILABLE drivers who are not already on a pending/active trip
      // Filtering on the frontend to guarantee we only show AVAILABLE resources
      const activeTrucks = trucksRes.data.data.filter(t => t.status === "AVAILABLE");
      const activeDrivers = driversRes.data.data.filter(d => d.status === "AVAILABLE");
      
      setAvailableTrucks(activeTrucks);
      setAvailableDrivers(activeDrivers);
      setAllTrucks(trucksRes.data.data);
      setAllDrivers(driversRes.data.data);
      
      setSelectedTrip(prev => {
        if (prev) {
          const updated = tripsRes.data.data.find(t => t._id === prev._id);
          return updated || prev;
        }
        return tripsRes.data.data.length > 0 ? tripsRes.data.data[0] : null;
      });
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsAndResources();
  }, []);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...newTripForm,
        source: newTripForm.source.trim(),
        destination: newTripForm.destination.trim(),
        material: newTripForm.material.trim(),
        quantity: String(Number(newTripForm.quantity)),
        expectedRevenue: Number(newTripForm.expectedRevenue),
      };
      const res = await axiosClient.post("/trips", payload);
      setTrips([res.data.data, ...trips]);
      setIsAddModalOpen(false);
      setNewTripForm({
        truckId: "", driverId: "", source: "", destination: "",
        material: "", quantity: "", expectedRevenue: "", startDate: new Date().toISOString().split('T')[0]
      });
      setSelectedTrip(res.data.data);
      fetchTripsAndResources(); // Refresh trucks/drivers
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Failed to create trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTrip = async (e) => {
    e.preventDefault();
    setIsEditSubmitting(true);
    setEditSubmitError("");
    try {
      const payload = {
        ...editTripForm,
        source: editTripForm.source.trim(),
        destination: editTripForm.destination.trim(),
        material: editTripForm.material.trim(),
        quantity: String(Number(editTripForm.quantity)),
        expectedRevenue: Number(editTripForm.expectedRevenue),
      };
      await axiosClient.put(`/trips/${editTripForm.id}`, payload);
      setIsEditModalOpen(false);
      setEditTripForm(null);
      fetchTripsAndResources();
    } catch (error) {
      setEditSubmitError(error.response?.data?.message || "Failed to update trip");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleStatusChange = async (tripId, newStatus) => {
    try {
      if (newStatus === "COMPLETED") {
        await axiosClient.patch(`/trips/${tripId}/confirm-end`, {});
      } else if (newStatus === "CANCELLED") {
        await axiosClient.patch(`/trips/${tripId}/cancel`);
      }
      // Refresh trips
      fetchTripsAndResources();
    } catch (error) {
      alert("Failed to update trip status: " + (error.response?.data?.message || "Unknown error"));
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm("Are you sure you want to permanently delete this trip? This action cannot be undone.")) return;
    try {
      await axiosClient.delete(`/trips/${tripId}`);
      setSelectedTrip(null);
      fetchTripsAndResources();
    } catch (error) {
      alert("Failed to delete trip: " + (error.response?.data?.message || "Unknown error"));
    }
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
          <Link to="/owner/dashboard" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
          </Link>
          <Link to="/owner/trips" className="flex items-center gap-3 px-4 py-3 text-secondary bg-surface-container-highest/10 rounded-lg hover:bg-surface-container-highest/20 transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">route</span> Trips
          </Link>
          <Link to="/owner/trucks" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span> Trucks
          </Link>
          <Link to="/owner/drivers" className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]">
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
        <header className="bg-surface/80 backdrop-blur-md h-16 sticky top-0 z-40 border-b border-outline-variant flex justify-between items-center w-full px-6 md:px-10 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-on-surface-variant p-2 -ml-2 rounded-lg hover:bg-surface-container-low">
            <span className="material-symbols-outlined">menu</span>
          </button>
          


          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-3 py-1.5 border border-outline-variant/30 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm py-1 px-2 w-48 text-on-surface placeholder:text-on-surface-variant outline-none" placeholder="Search trips..." type="text"/>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-all relative">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
            </div>
            <div className="h-6 w-px bg-outline-variant/50 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-3">
              <button onClick={() => setIsAddModalOpen(true)} className="bg-[#0a0a0a] text-white px-4 py-2 rounded-lg font-label-md text-[13px] font-medium hover:bg-black transition-transform duration-200 active:scale-95 flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create Trip
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
                  <h2 className="font-headline-lg text-[32px] font-bold text-on-surface tracking-tight mb-1">Trip Management</h2>
                  <p className="font-body-md text-[14px] text-on-surface-variant mt-1 max-w-2xl">Dispatch trucks, monitor active journeys, and verify completed deliveries.</p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">map</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Trips</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trips.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">route</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">On Trip</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trips.filter(t => t.status === 'ON_TRIP').length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Completed</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trips.filter(t => t.status === 'COMPLETED').length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-red-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-red-600">cancel</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Cancelled</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trips.filter(t => t.status === 'CANCELLED').length}</div>
                </div>
              </div>

              {/* Filters Section */}
              <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                 <div className="flex flex-col min-w-[150px]">
                   <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Status</label>
                   <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-[13px] outline-none focus:border-secondary transition-colors">
                     <option value="ALL">All Statuses</option>
                     <option value="ON_TRIP">On Trip</option>
                     <option value="COMPLETED">Completed</option>
                     <option value="CANCELLED">Cancelled</option>
                   </select>
                 </div>
                 <div className="flex flex-col min-w-[150px]">
                   <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Truck</label>
                   <select value={truckFilter} onChange={e => setTruckFilter(e.target.value)} className="h-9 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-[13px] outline-none focus:border-secondary transition-colors">
                     <option value="ALL">All Trucks</option>
                     {Array.from(new Set(trips.filter(t => t.truckId).map(t => t.truckId._id))).map(truckId => {
                       const truck = trips.find(t => t.truckId?._id === truckId).truckId;
                       return <option key={truckId} value={truckId}>{truck.registrationNumber}</option>;
                     })}
                   </select>
                 </div>
                 <div className="flex flex-col min-w-[150px]">
                   <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Driver</label>
                   <select value={driverFilter} onChange={e => setDriverFilter(e.target.value)} className="h-9 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-[13px] outline-none focus:border-secondary transition-colors">
                     <option value="ALL">All Drivers</option>
                     {Array.from(new Set(trips.filter(t => t.driverId).map(t => t.driverId._id))).map(driverId => {
                       const driver = trips.find(t => t.driverId?._id === driverId).driverId;
                       return <option key={driverId} value={driverId}>{driver.userId?.name || driver.licenseNumber}</option>;
                     })}
                   </select>
                 </div>
                 <div className="flex flex-col min-w-[150px]">
                   <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Start Date</label>
                   <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="h-9 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-[13px] outline-none focus:border-secondary transition-colors" />
                 </div>
                 <div className="flex flex-col justify-end">
                   <button onClick={() => {setStatusFilter("ALL"); setTruckFilter("ALL"); setDriverFilter("ALL"); setDateFilter(""); setSearchQuery("");}} className="h-9 px-4 bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg text-[13px] font-medium transition-colors border border-outline-variant/50 flex items-center gap-1.5">
                     <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                     Clear
                   </button>
                 </div>
              </div>

              {/* Dual Pane Layout */}
              <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-320px)] min-h-[500px]">
                {/* Left Pane: Grid (70%) */}
                <div className="w-full lg:w-[65%] h-full flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-8 custom-scrollbar h-full content-start">
                    {trips.filter(t => {
                      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
                      if (truckFilter !== "ALL" && t.truckId?._id !== truckFilter) return false;
                      if (driverFilter !== "ALL" && t.driverId?._id !== driverFilter) return false;
                      if (dateFilter && new Date(t.startDate).toISOString().split('T')[0] !== dateFilter) return false;
                      
                      if (searchQuery) {
                        const sq = searchQuery.toLowerCase();
                        if (!t.source?.toLowerCase().includes(sq) && 
                            !t.destination?.toLowerCase().includes(sq) &&
                            !t.truckId?.registrationNumber?.toLowerCase().includes(sq) &&
                            !t.driverId?.userId?.name?.toLowerCase().includes(sq) &&
                            !t.driverId?.licenseNumber?.toLowerCase().includes(sq) &&
                            !t.status?.toLowerCase().includes(sq)) {
                          return false;
                        }
                      }
                      return true;
                    }).map(trip => (
                      <div 
                        key={trip._id} 
                        onClick={() => setSelectedTrip(trip)}
                        className={`bg-white rounded-xl border ${selectedTrip?._id === trip._id ? 'border-2 border-secondary shadow-md' : 'border-outline-variant/50 shadow-sm'} p-4 relative cursor-pointer hover:shadow-md transition-all`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider
                            ${trip.status === 'ON_TRIP' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              trip.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-surface-container-high text-on-surface border-outline-variant'}`}>
                            {trip.status === 'ON_TRIP' ? 'On Trip' : trip.status}
                          </span>
                          <span className="text-[11px] font-medium text-on-surface-variant">
                            {new Date(trip.startDate).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1">
                            <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Source</p>
                            <p className="text-[14px] font-bold text-on-surface truncate" title={trip.source}>{trip.source}</p>
                          </div>
                          <span className="material-symbols-outlined text-outline-variant">arrow_right_alt</span>
                          <div className="flex-1 text-right">
                            <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Destination</p>
                            <p className="text-[14px] font-bold text-on-surface truncate" title={trip.destination}>{trip.destination}</p>
                          </div>
                        </div>

                        <div className="bg-surface-container-low rounded-lg p-3 grid grid-cols-2 gap-2 text-[12px]">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">local_shipping</span>
                            <span className="font-mono font-bold">{trip.truckId?.registrationNumber || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
                            <span className="font-medium truncate">{trip.driverId?.userId?.name || trip.driverId?.licenseNumber || 'Driver'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {trips.length === 0 && (
                      <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-on-surface-variant bg-white rounded-xl border border-outline-variant/50">
                        <span className="material-symbols-outlined text-[48px] opacity-20 mb-3">route</span>
                        <p className="font-medium text-[14px]">No trips created yet.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right Pane: Detail View (35%) */}
                {selectedTrip && (
                  <div className="hidden lg:flex w-[35%] h-full flex-col">
                    <div className="bg-white rounded-xl border border-outline-variant/50 shadow-sm h-full overflow-y-auto custom-scrollbar flex flex-col relative">
                      <div className="h-16 w-full bg-surface-container-highest rounded-t-xl absolute top-0 left-0 border-b border-outline-variant/30 flex items-center px-6">
                         <h3 className="font-bold text-on-surface text-[15px] flex items-center gap-2">
                           <span className="material-symbols-outlined text-[18px]">receipt_long</span> Trip Manifesto
                         </h3>
                      </div>
                      
                      <div className="p-6 relative z-10 flex-1 flex flex-col mt-16">
                        <div className="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4">
                           <div>
                             <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Trip ID</p>
                             <p className="font-mono text-[14px] text-on-surface font-bold">{selectedTrip._id}</p>
                           </div>
                           <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider
                              ${selectedTrip.status === 'ON_TRIP' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                selectedTrip.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                                'bg-surface-container-high text-on-surface border-outline-variant'}`}>
                              {selectedTrip.status === 'ON_TRIP' ? 'On Trip' : selectedTrip.status}
                           </span>
                        </div>

                        <div className="space-y-6 flex-1">
                           <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-4 shadow-sm relative overflow-hidden">
                             <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-outline-variant/30 z-0"></div>
                             
                             <div className="relative z-10 flex gap-4 mb-4">
                               <div className="w-3 h-3 rounded-full bg-secondary ring-4 ring-white mt-1 shrink-0"></div>
                               <div>
                                 <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Source</p>
                                 <p className="font-bold text-[14px] text-on-surface">{selectedTrip.source}</p>
                               </div>
                             </div>
                             
                             <div className="relative z-10 flex gap-4">
                               <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-white mt-1 shrink-0"></div>
                               <div>
                                 <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Destination</p>
                                 <p className="font-bold text-[14px] text-on-surface">{selectedTrip.destination}</p>
                               </div>
                             </div>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                             <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
                               <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Truck</p>
                               <p className="font-mono text-[14px] font-bold">{selectedTrip.truckId?.registrationNumber || 'N/A'}</p>
                             </div>
                             <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/30 flex flex-col justify-center">
                               <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">Driver</p>
                               <p className="text-[14px] font-bold leading-tight">
                                 {selectedTrip.driverId?.userId?.name || 'N/A'}
                                 {selectedTrip.driverId?.licenseNumber && (
                                   <span className="block text-[11px] text-on-surface-variant font-medium mt-0.5">
                                     {selectedTrip.driverId.licenseNumber}
                                   </span>
                                 )}
                               </p>
                             </div>
                           </div>

                           <div>
                             <h4 className="font-bold text-[11px] uppercase text-on-surface-variant mb-3 tracking-wider">Cargo Details</h4>
                             <ul className="space-y-3 bg-white p-4 rounded-lg border border-outline-variant/30 shadow-sm">
                               <li className="flex justify-between items-center text-[13px]">
                                 <span className="text-on-surface-variant font-medium">Material</span>
                                 <span className="text-on-surface font-bold">{selectedTrip.material}</span>
                               </li>
                               <li className="flex justify-between items-center text-[13px] border-t border-outline-variant/20 pt-3">
                                 <span className="text-on-surface-variant font-medium">Quantity</span>
                                 <span className="text-on-surface font-bold">{selectedTrip.quantity}</span>
                               </li>
                               <li className="flex justify-between items-center text-[13px] border-t border-outline-variant/20 pt-3">
                                 <span className="text-on-surface-variant font-medium">Start Date</span>
                                 <span className="text-on-surface font-bold">{new Date(selectedTrip.startDate).toLocaleDateString()}</span>
                               </li>
                               <li className="flex justify-between items-center text-[13px] border-t border-outline-variant/20 pt-3">
                                 <span className="text-on-surface-variant font-medium">Trip Rate</span>
                                 <span className="text-emerald-600 font-bold font-mono">₹{selectedTrip.expectedRevenue?.toLocaleString()}</span>
                               </li>
                             </ul>
                           </div>
                        </div>
                        
                        <div className="pt-6 mt-4 border-t border-outline-variant/30 flex flex-col gap-3">
                          <div className="flex gap-3 w-full">
                            {selectedTrip.status === "ON_TRIP" && (
                              <>
                                <button onClick={() => handleStatusChange(selectedTrip._id, "COMPLETED")} className="flex-1 bg-secondary text-white font-medium text-[13px] py-2.5 rounded-lg shadow-sm hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">done_all</span> Complete Trip
                                </button>
                                <button onClick={() => handleStatusChange(selectedTrip._id, "CANCELLED")} className="flex-1 bg-surface-container-low text-red-600 font-medium text-[13px] py-2.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">cancel</span> Cancel Trip
                                </button>
                              </>
                            )}
                            {selectedTrip.status === "COMPLETED" && (
                              <div className="flex-1 bg-emerald-50 text-emerald-700 font-bold text-[13px] py-2.5 rounded-lg border border-emerald-200 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span> Trip Completed
                              </div>
                            )}
                          </div>
                          
                          {/* Delete Trip Button */}
                          <div className="flex gap-3 mt-2 w-full">
                            <button onClick={() => handleDeleteTrip(selectedTrip._id)} className="flex-1 bg-red-50 text-red-600 font-medium text-[13px] py-2 rounded-lg border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">delete</span> Delete Trip
                            </button>
                            <button onClick={() => handleOpenEditModal(selectedTrip)} className="flex-1 bg-surface-container-low text-on-surface font-medium text-[13px] py-2 rounded-lg border border-outline-variant/50 hover:bg-surface-variant transition-colors flex items-center justify-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">edit</span> Edit Trip
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Add Trip Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">route</span>
                <h3 className="text-[18px] font-bold text-on-surface">Dispatch New Trip</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background">
              <form onSubmit={handleCreateTrip} className="space-y-6">
                {submitError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] border border-red-100 flex items-center gap-2">
                     <span className="material-symbols-outlined text-[16px]">error</span>
                     {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Route Section */}
                  <div className="space-y-4 col-span-full bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">Route Details</h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Source <span className="text-red-500">*</span></label>
                        <input required type="text" name="source" value={newTripForm.source} onChange={handleFormChange} placeholder="e.g. Mumbai Port" className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${formErrors.source ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`} />
                        {formErrors.source && <p className="text-red-500 text-[11px] mt-1 font-medium">{formErrors.source}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Destination <span className="text-red-500">*</span></label>
                        <input required type="text" name="destination" value={newTripForm.destination} onChange={handleFormChange} placeholder="e.g. Pune Warehouse" className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${formErrors.destination ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`} />
                        {formErrors.destination && <p className="text-red-500 text-[11px] mt-1 font-medium">{formErrors.destination}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Assignment Section */}
                  <div className="space-y-4 col-span-full bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">Assignment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Select Truck <span className="text-red-500">*</span></label>
                        <select required name="truckId" value={newTripForm.truckId} onChange={handleFormChange} className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] font-mono border ${formErrors.truckId ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`}>
                          <option value="">{availableTrucks.length > 0 ? '-- Choose Truck --' : '-- No Available Trucks --'}</option>
                          {availableTrucks.map(t => (
                            <option key={t._id} value={t._id}>{t.registrationNumber} ({t.capacity})</option>
                          ))}
                        </select>
                        {formErrors.truckId && <p className="text-red-500 text-[11px] mt-1 font-medium">{formErrors.truckId}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Select Driver <span className="text-red-500">*</span></label>
                        <select required name="driverId" value={newTripForm.driverId} onChange={handleFormChange} className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${formErrors.driverId ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`}>
                          <option value="">{availableDrivers.length > 0 ? '-- Choose Driver --' : '-- No Available Drivers --'}</option>
                          {availableDrivers.map(d => (
                            <option key={d._id} value={d._id}>{d.userId?.name} (Lic: {d.licenseNumber})</option>
                          ))}
                        </select>
                        {(() => {
                          const selectedTruck = availableTrucks.find(t => t._id === newTripForm.truckId);
                          const defaultDriverId = selectedTruck?.currentDriverId?._id || selectedTruck?.currentDriverId;
                          const isAvailable = defaultDriverId ? availableDrivers.some(d => d._id === defaultDriverId) : false;
                          
                          if (selectedTruck && defaultDriverId) {
                            if (isAvailable && newTripForm.driverId === defaultDriverId) {
                              return <p className="text-[11px] mt-1 font-medium text-emerald-600">Default driver for this truck</p>;
                            } else if (!isAvailable) {
                              const defaultDriverName = selectedTruck.currentDriverId?.userId?.name || "Default driver";
                              return <p className="text-[11px] mt-1 font-medium text-amber-600">{defaultDriverName} is currently unavailable. Please select another driver.</p>;
                            }
                          }
                          return null;
                        })()}
                        {formErrors.driverId && <p className="text-red-500 text-[11px] mt-1 font-medium">{formErrors.driverId}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Cargo Section */}
                  <div className="space-y-4 col-span-full bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">Cargo & Financials</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Material <span className="text-red-500">*</span></label>
                        <input required type="text" name="material" value={newTripForm.material} onChange={handleFormChange} placeholder="e.g. Steel Coils" className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${formErrors.material ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`} />
                        {formErrors.material && <p className="text-red-500 text-[11px] mt-1 font-medium">{formErrors.material}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant flex justify-between items-center">
                          <span>Quantity <span className="text-red-500">*</span></span>
                          {selectedNewTruck?.capacity && (
                            <span className="text-secondary font-medium">Max capacity: {selectedNewTruck.capacity}</span>
                          )}
                        </label>
                        <input required type="text" name="quantity" value={newTripForm.quantity} onChange={handleFormChange} placeholder="e.g. 20" className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${formErrors.quantity || newTripCapacityError ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`} />
                        {formErrors.quantity && <p className="text-red-500 text-[11px] mt-1 font-medium">{formErrors.quantity}</p>}
                        {newTripCapacityError && !formErrors.quantity && <p className="text-red-500 text-[11px] mt-1 font-medium">{newTripCapacityError}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Trip Rate (₹) <span className="text-red-500">*</span></label>
                        <input required type="number" name="expectedRevenue" value={newTripForm.expectedRevenue} onChange={handleFormChange} placeholder="e.g. 15000" className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] font-mono border ${formErrors.expectedRevenue ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`} />
                        {formErrors.expectedRevenue && <p className="text-red-500 text-[11px] mt-1 font-medium">{formErrors.expectedRevenue}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Start Date <span className="text-red-500">*</span></label>
                        <input required type="date" name="startDate" value={newTripForm.startDate} onChange={handleFormChange} className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${formErrors.startDate ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`} />
                        {formErrors.startDate && <p className="text-red-500 text-[11px] mt-1 font-medium">{formErrors.startDate}</p>}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="pt-2 flex gap-3 pb-4">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-outline-variant/50 rounded-lg font-medium text-[14px] text-on-surface hover:bg-surface-container-low transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting || !!newTripCapacityError} className={`flex-1 px-4 py-3 bg-[#0a0a0a] text-white rounded-lg font-medium text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm ${isSubmitting || newTripCapacityError ? 'opacity-80 cursor-not-allowed' : ''}`}>
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">route</span>
                        Dispatch Trip
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {isEditModalOpen && editTripForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">edit</span>
                <h3 className="text-[18px] font-bold text-on-surface">Edit Trip</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background">
              <form onSubmit={handleUpdateTrip} className="space-y-6">
                {editSubmitError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] border border-red-100 flex items-center gap-2">
                     <span className="material-symbols-outlined text-[16px]">error</span>
                     {editSubmitError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-4 col-span-full bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">Route Details</h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Source <span className="text-red-500">*</span></label>
                        <input required type="text" name="source" value={editTripForm.source} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Destination <span className="text-red-500">*</span></label>
                        <input required type="text" name="destination" value={editTripForm.destination} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">Resources</h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant flex justify-between items-center">
                          <span>Assign Truck <span className="text-red-500">*</span></span>
                        </label>
                        <select required name="truckId" value={editTripForm.truckId} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary">
                          <option value="">Select a truck</option>
                          {allTrucks.filter(t => t.status === "AVAILABLE" || t._id === editTripForm.truckId).map(t => (
                            <option key={t._id} value={t._id}>{t.registrationNumber} ({t.capacity || 'N/A'})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Assign Driver <span className="text-red-500">*</span></label>
                        <select required name="driverId" value={editTripForm.driverId} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary">
                          <option value="">Select a driver</option>
                          {allDrivers.filter(d => d.status === "AVAILABLE" || d._id === editTripForm.driverId).map(d => (
                            <option key={d._id} value={d._id}>{d.userId?.name} (Lic: {d.licenseNumber})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">Cargo & Timeline</h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Material <span className="text-red-500">*</span></label>
                        <input required type="text" name="material" value={editTripForm.material} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary" />
                      </div>
                      <div className="flex gap-3">
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[12px] font-semibold text-on-surface-variant flex justify-between items-center">
                            <span>Quantity <span className="text-red-500">*</span></span>
                            {selectedEditTruck?.capacity && (
                              <span className="text-secondary font-medium">Max capacity: {selectedEditTruck.capacity}</span>
                            )}
                          </label>
                          <input required type="number" step="0.01" name="quantity" value={editTripForm.quantity} onChange={handleEditFormChange} className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${editTripCapacityError ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-outline-variant/50 focus:border-secondary'}`} />
                          {editTripCapacityError && <p className="text-red-500 text-[11px] mt-1 font-medium">{editTripCapacityError}</p>}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <label className="text-[12px] font-semibold text-on-surface-variant">Trip Rate (₹) <span className="text-red-500">*</span></label>
                          <input required type="number" name="expectedRevenue" value={editTripForm.expectedRevenue} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">Start Date <span className="text-red-500">*</span></label>
                        <input required type="date" name="startDate" value={editTripForm.startDate} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-outline-variant/20">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2 bg-white border border-outline-variant/50 rounded-lg font-medium text-[13px] text-on-surface hover:bg-surface-container-low transition-colors">Cancel</button>
                  <button type="submit" disabled={isEditSubmitting || !!editTripCapacityError} className={`flex-1 px-4 py-2 bg-[#0a0a0a] text-white rounded-lg font-medium text-[13px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm ${isEditSubmitting || editTripCapacityError ? 'opacity-80 cursor-not-allowed' : ''}`}>
                    {isEditSubmitting ? (
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
        </div>
      )}
    </div>
  );
}
