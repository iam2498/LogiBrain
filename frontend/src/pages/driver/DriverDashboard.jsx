import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [myTrips, setMyTrips] = useState([]);
  const [tripExpenses, setTripExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [tripHistory, setTripHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "Fuel",
    description: ""
  });
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(true);

  const categoryOptions = [
    { name: "Fuel", icon: "local_gas_station" },
    { name: "Toll", icon: "add_road" },
    { name: "Food", icon: "restaurant" },
    { name: "Parking", icon: "local_parking" },
    { name: "Repair", icon: "build" },
    { name: "Loading/Unloading", icon: "inventory_2" },
    { name: "Insurance/Permit", icon: "description" },
    { name: "Other", icon: "wallet" }
  ];

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const [meRes, tripsRes] = await Promise.all([
          axiosClient.get("/auth/me"),
          axiosClient.get("/trips?status=ACTIVE") // Only get active trips for dashboard
        ]);
        setProfile(meRes.data.data);
        setMyTrips(tripsRes.data.data);
        
        if (tripsRes.data.data.length > 0) {
          try {
            const expensesRes = await axiosClient.get(`/expenses?tripId=${tripsRes.data.data[0]._id}`);
            setTripExpenses(expensesRes.data.data);
          } catch (e) {
            console.error("Failed to fetch expenses", e);
          }
        }
      } catch (error) {
        console.error("Failed to fetch driver data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDriverData();
  }, []);

  const handleEndTrip = async (tripId) => {
    if (!window.confirm("Are you sure you want to request this trip to be ended?")) return;
    try {
      await axiosClient.patch(`/trips/${tripId}/end`);
      alert("Trip end requested successfully. Waiting for owner confirmation.");
      // Refresh
      const tripsRes = await axiosClient.get("/trips?status=ACTIVE");
      setMyTrips(tripsRes.data.data);
    } catch (error) {
      alert("Failed to end trip: " + error.response?.data?.message);
    }
  };

  const fetchTripHistory = async () => {
    setIsHistoryLoading(true);
    setIsHistoryModalOpen(true);
    try {
      const res = await axiosClient.get("/trips");
      setTripHistory(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleExpenseChange = (e) => {
    setExpenseForm({ ...expenseForm, [e.target.name]: e.target.value });
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    if (myTrips.length === 0) return;

    if (parseFloat(expenseForm.amount) <= 0) {
      setExpenseError("Amount must be a positive number.");
      return;
    }

    setIsSubmittingExpense(true);
    setExpenseError("");

    try {
      await axiosClient.post("/expenses", {
        tripId: myTrips[0]._id, // Automatically assign to the current active trip
        amount: String(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description,
        date: new Date().toISOString()
      });
      alert("Expense added successfully!");
      setIsExpenseModalOpen(false);
      setExpenseForm({ amount: "", category: "Fuel", description: "" });
      
      // Refresh expenses
      const expensesRes = await axiosClient.get(`/expenses?tripId=${myTrips[0]._id}`);
      setTripExpenses(expensesRes.data.data);
    } catch (error) {
      setExpenseError(error.response?.data?.message || "Failed to add expense");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent"></div>
      </div>
    );
  }

  const currentTrip = myTrips.length > 0 ? myTrips[0] : null;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md flex flex-col antialiased">
      
      {/* TopNavBar */}
      <nav className="bg-surface/80 backdrop-blur-xl h-[64px] md:h-[72px] sticky top-0 z-40 border-b border-outline-variant/50 flex justify-between items-center px-4 md:px-6 w-full shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-secondary rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[20px] md:text-[24px]">local_shipping</span>
          </div>
          <h2 className="font-headline-md text-[18px] md:text-[20px] font-bold text-on-surface tracking-wide">LogiBrain</h2>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-medium text-[14px] text-on-surface">{user.name}</span>
            <span className="text-[12px] text-on-surface-variant font-medium tracking-wide uppercase">Driver</span>
          </div>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[14px] md:text-[16px] shadow-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="w-px h-6 md:h-8 bg-outline-variant/30 mx-0.5 md:mx-1 hidden sm:block"></div>
          <button onClick={logout} className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-50 rounded-full transition-colors relative group touch-manipulation">
            <span className="material-symbols-outlined text-[20px] md:text-[22px]">logout</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-10 max-w-[1000px] w-full mx-auto space-y-6 md:space-y-8 pb-10">
        
        {/* Welcome & Profile Section */}
        <section className="bg-secondary rounded-[20px] md:rounded-[24px] p-6 md:p-10 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary to-[#1e3a8a] z-0"></div>
          {/* Abstract Decorative Shapes */}
          <div className="absolute -top-16 -right-16 md:-top-24 md:-right-24 w-64 h-64 md:w-96 md:h-96 bg-white opacity-10 rounded-full blur-2xl md:blur-3xl z-0"></div>
          
          <div className="z-10 relative text-white w-full">
            <div className="flex flex-col md:flex-row justify-between items-start w-full gap-4 md:gap-0">
              <div>
                <h2 className="text-[24px] md:text-[36px] font-bold mb-1 tracking-tight">On the Road, {user.name.split(' ')[0]}!</h2>
                <p className="text-[14px] md:text-[16px] text-blue-100 font-medium opacity-90">Stay safe and drive carefully today.</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] md:text-[13px] font-bold border backdrop-blur-md shadow-sm self-start md:self-auto
                ${profile?.driverInfo?.status === "ACTIVE" 
                  ? "bg-green-500/20 text-green-100 border-green-400/30" 
                  : "bg-amber-500/20 text-amber-100 border-amber-400/30"}`}>
                <span className={`w-2 h-2 rounded-full ${profile?.driverInfo?.status === "ACTIVE" ? "bg-green-400 animate-pulse" : "bg-amber-400"}`}></span>
                {profile?.driverInfo?.status || "INACTIVE"}
              </span>
            </div>
            
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/10 shadow-inner flex-1">
                <p className="text-[11px] md:text-[12px] text-blue-200 uppercase tracking-wider font-bold mb-0.5 md:mb-1">License Number</p>
                <p className="font-mono text-[14px] md:text-[16px] font-bold">{profile?.driverInfo?.licenseNumber || "Not Registered"}</p>
              </div>
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/10 shadow-inner flex-1">
                <p className="text-[11px] md:text-[12px] text-blue-200 uppercase tracking-wider font-bold mb-0.5 md:mb-1">Contact</p>
                <p className="font-mono text-[14px] md:text-[16px] font-bold">{user.phone || user.email}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Current Trip Section */}
        <section>
          <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
            <h3 className="text-[18px] md:text-[20px] font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px] md:text-[24px]">navigation</span>
              Current Assignment
            </h3>
          </div>
          
          {currentTrip ? (
            <div className="bg-surface-container-lowest rounded-[20px] md:rounded-2xl border border-outline-variant/50 shadow-md overflow-hidden relative group">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 md:h-1.5 bg-secondary"></div>
              
              <div className="p-5 md:p-8">
                {/* Trip Header */}
                <div className="flex flex-col mb-6 md:mb-8 pb-5 md:pb-6 border-b border-outline-variant/30">
                  <div className="flex justify-between items-start mb-4 md:hidden">
                    <span className="bg-blue-50 text-blue-700 text-[11px] px-3 py-1 rounded-full uppercase font-bold tracking-wide border border-blue-200 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                      {currentTrip.status}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:justify-between">
                    <div className="flex flex-col w-full md:w-auto text-center md:text-left">
                      <span className="text-[12px] md:text-[13px] text-on-surface-variant font-bold uppercase tracking-wider mb-0.5 md:mb-1">Source</span>
                      <span className="text-[18px] md:text-[20px] font-black text-on-surface">{currentTrip.source}</span>
                    </div>
                    
                    <div className="flex flex-col items-center w-full md:flex-1 md:px-4 py-2 md:py-0 opacity-50 md:opacity-100">
                      <span className="material-symbols-outlined text-outline-variant text-[24px] md:text-[28px] mb-1 transform rotate-90 md:rotate-0">local_shipping</span>
                      <div className="hidden md:flex w-full h-0.5 bg-outline-variant/30 relative items-center justify-center min-w-[100px]">
                        <div className="absolute w-2 h-2 rounded-full bg-secondary left-0 -translate-y-1/2"></div>
                        <div className="absolute w-2 h-2 rounded-full bg-secondary right-0 -translate-y-1/2"></div>
                      </div>
                    </div>

                    <div className="flex flex-col w-full md:w-auto text-center md:text-right">
                      <span className="text-[12px] md:text-[13px] text-on-surface-variant font-bold uppercase tracking-wider mb-0.5 md:mb-1">Destination</span>
                      <span className="text-[18px] md:text-[20px] font-black text-on-surface">{currentTrip.destination}</span>
                    </div>

                    <div className="hidden md:block">
                      <span className="bg-blue-50 text-blue-700 text-[13px] px-4 py-1.5 rounded-full uppercase font-bold tracking-wide border border-blue-200 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        {currentTrip.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Trip Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8 bg-surface-container-low/50 md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none">
                  <div>
                    <p className="text-[11px] md:text-[12px] text-on-surface-variant font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] md:text-[16px]">tag</span> Truck
                    </p>
                    <p className="font-mono font-bold text-[13px] md:text-[15px] text-on-surface">{currentTrip.truckId?.registrationNumber || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] md:text-[12px] text-on-surface-variant font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] md:text-[16px]">inventory_2</span> Material
                    </p>
                    <p className="font-bold text-[13px] md:text-[15px] text-on-surface">{currentTrip.material}</p>
                  </div>
                  <div>
                    <p className="text-[11px] md:text-[12px] text-on-surface-variant font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] md:text-[16px]">scale</span> Quantity
                    </p>
                    <p className="font-bold text-[13px] md:text-[15px] text-on-surface">{currentTrip.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[11px] md:text-[12px] text-on-surface-variant font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] md:text-[16px]">calendar_clock</span> Date
                    </p>
                    <p className="font-bold text-[13px] md:text-[15px] text-on-surface">{new Date(currentTrip.startDate).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 md:bg-surface-container-low md:p-4 rounded-xl md:border border-outline-variant/30">
                  <button onClick={() => setIsExpenseModalOpen(true)} className="w-full sm:flex-1 bg-white text-on-surface px-5 py-3.5 md:py-3 rounded-[12px] md:rounded-lg font-bold text-[14px] md:text-[15px] hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 border border-outline-variant/50 shadow-sm touch-manipulation min-h-[48px]">
                    <span className="material-symbols-outlined text-[20px] text-green-600">receipt_long</span>
                    Add Expense
                  </button>
                  <button onClick={() => handleEndTrip(currentTrip._id)} className="w-full sm:flex-1 bg-[#0a0a0a] text-white px-5 py-3.5 md:py-3 rounded-[12px] md:rounded-lg font-bold text-[14px] md:text-[15px] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] touch-manipulation min-h-[48px]">
                    <span className="material-symbols-outlined text-[20px] text-yellow-400">flag</span>
                    Request Trip End
                  </button>
                </div>

                {/* Expenses List */}
                {tripExpenses.length > 0 && (
                  <div className="mt-8 border-t border-outline-variant/30 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[14px] font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">payments</span> Recorded Expenses
                      </h4>
                      <button 
                        onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors text-on-surface-variant touch-manipulation"
                        aria-expanded={isExpensesExpanded}
                        aria-label="Toggle recorded expenses"
                      >
                        <span className="material-symbols-outlined transition-transform duration-300">
                          {isExpensesExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </div>
                    <div className={`transition-all duration-300 overflow-hidden ${isExpensesExpanded ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0'}`}>
                      <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2 pb-2">
                        {tripExpenses.map(exp => (
                          <div key={exp._id} className="flex justify-between items-center bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-on-surface-variant shadow-sm border border-outline-variant/20">
                                <span className="material-symbols-outlined text-[20px]">local_mall</span>
                              </div>
                              <div>
                                <p className="font-bold text-[13px]">{exp.category}</p>
                                <p className="text-[11px] text-on-surface-variant truncate max-w-[150px] md:max-w-[300px]">{exp.description || 'No description'}</p>
                              </div>
                            </div>
                            <span className="font-bold font-mono text-red-600 text-[14px]">₹{exp.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[250px] md:min-h-[300px]">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px] md:text-[40px] text-on-surface-variant">check_circle</span>
              </div>
              <h3 className="text-[20px] md:text-[22px] font-bold text-on-surface mb-2">No Active Trips</h3>
              <p className="text-[14px] md:text-[15px] text-on-surface-variant max-w-[400px]">You're all caught up! There are no active trips assigned to you at the moment. Take a rest.</p>
            </div>
          )}
        </section>

        {/* Action Buttons Container */}
        <section className="mt-8 flex justify-center gap-6 md:gap-8 flex-wrap">
          
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={fetchTripHistory}
              className="w-14 h-14 bg-secondary text-white rounded-full shadow-md hover:shadow-lg hover:bg-secondary/90 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center touch-manipulation"
            >
              <span className="material-symbols-outlined text-[24px]">history</span>
            </button>
            <span className="text-[12px] font-bold text-on-surface-variant tracking-wide">Trip History</span>
          </div>
          
          {/* Add more buttons here in the future following the same div structure */}

        </section>

      </main>



      {/* Add Expense Mobile-Optimized Bottom Sheet / Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-10">
          <div className="bg-white rounded-t-[24px] md:rounded-[20px] shadow-2xl w-full max-w-[500px] flex flex-col animate-slide-up md:animate-fade-in max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0 rounded-t-[24px] md:rounded-t-[20px]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600 text-[24px]">receipt_long</span>
                <h3 className="text-[18px] font-bold text-on-surface">Record Expense</h3>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-on-surface-variant hover:text-on-surface bg-surface-container-low p-2 rounded-full transition-colors touch-manipulation">
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-background pb-12 md:pb-8">
              <form onSubmit={submitExpense} className="space-y-6">
                {expenseError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] border border-red-100 flex items-center gap-2">
                     <span className="material-symbols-outlined text-[16px]">error</span>
                     {expenseError}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-on-surface-variant">Amount (₹) <span className="text-red-500">*</span></label>
                  <input required type="number" min="1" step="any" name="amount" value={expenseForm.amount} onChange={handleExpenseChange} placeholder="e.g. 1500" className="w-full h-12 md:h-11 px-4 bg-white border border-outline-variant/60 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all text-[15px] font-medium" />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-on-surface-variant">Category <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryOptions.map(cat => {
                      const isSelected = expenseForm.category === cat.name;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setExpenseForm({ ...expenseForm, category: cat.name })}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${isSelected ? 'bg-secondary/10 border-secondary text-secondary shadow-sm' : 'bg-white border-outline-variant/50 text-on-surface hover:bg-surface-container-lowest hover:border-outline-variant'}`}
                        >
                          <span className={`material-symbols-outlined text-[20px] ${isSelected ? 'text-secondary' : 'text-on-surface-variant'}`}>{cat.icon}</span>
                          <span className="font-bold text-[13px] md:text-[14px] leading-tight">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-on-surface-variant">Description <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <textarea name="description" value={expenseForm.description} onChange={handleExpenseChange} placeholder="Add a short note... (e.g. 'Diesel filled', 'Toll at Ahmedabad')" rows="2" className="w-full p-4 bg-white border border-outline-variant/60 rounded-xl focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all text-[15px] font-medium resize-none"></textarea>
                </div>

                <button disabled={isSubmittingExpense} type="submit" className="w-full bg-secondary text-white font-bold text-[16px] py-4 md:py-3.5 rounded-[12px] md:rounded-xl hover:bg-secondary/90 transition-all shadow-md active:scale-[0.98] flex justify-center items-center gap-2 mt-2 min-h-[56px] md:min-h-[48px]">
                  {isSubmittingExpense ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                      Save Expense
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Trip History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-10">
          <div className="bg-white rounded-t-[24px] md:rounded-[20px] shadow-2xl w-full max-w-[700px] flex flex-col animate-slide-up md:animate-fade-in max-h-[90vh]">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0 rounded-t-[24px] md:rounded-t-[20px]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">history</span>
                <h3 className="text-[18px] font-bold text-on-surface">My Trip History</h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-on-surface-variant hover:text-on-surface bg-surface-container-low p-2 rounded-full transition-colors touch-manipulation">
                <span className="material-symbols-outlined text-[20px] block">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background pb-12 md:pb-6 space-y-4">
              {isHistoryLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-secondary border-t-transparent"></div>
                </div>
              ) : tripHistory.length > 0 ? (
                tripHistory.map(trip => (
                  <div key={trip._id} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${trip.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : trip.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {trip.status}
                      </span>
                      <span className="text-[12px] text-on-surface-variant font-medium">
                        {new Date(trip.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[15px]">{trip.source}</span>
                      <span className="material-symbols-outlined text-[16px] text-outline-variant">arrow_right_alt</span>
                      <span className="font-bold text-[15px]">{trip.destination}</span>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-[13px]">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">inventory_2</span> {trip.material}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-on-surface-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-[40px] mb-2 opacity-50">history_toggle_off</span>
                  <p>No past trips found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
