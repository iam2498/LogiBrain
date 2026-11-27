import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import OwnerProfileCard from "../../components/layout/OwnerProfileCard";

export default function Expenses() {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Expense Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    tripId: "",
    truckId: "",
    category: "Fuel",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Edit Expense Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editExpenseForm, setEditExpenseForm] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState("");

  const categories = ["Fuel", "Toll", "Food", "Parking", "Repair", "Loading/Unloading", "Insurance/Permit", "Other"];

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "tripId") {
      const trip = activeTrips.find((t) => t._id === value);
      const firstTruckId =
        trip?.truckIds?.[0]?._id || trip?.truckIds?.[0] || trip?.truckId?._id || trip?.truckId || "";
      setNewExpenseForm({ ...newExpenseForm, tripId: value, truckId: firstTruckId });
      return;
    }
    setNewExpenseForm({ ...newExpenseForm, [name]: value });
  };

  const fetchExpensesAndTrips = async () => {
    try {
      const [expensesRes, tripsRes] = await Promise.all([
        axiosClient.get("/expenses"),
        axiosClient.get("/trips?status=ON_TRIP")
      ]);
      setExpenses(expensesRes.data.data);
      setActiveTrips(tripsRes.data.data.filter(t => t.status === "ON_TRIP"));
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesAndTrips();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    try {
      // Backend expects amount as string for its zod schema transformation
      const payload = {
        ...newExpenseForm,
        ...(newExpenseForm.truckId ? { truckId: newExpenseForm.truckId } : {}),
        amount: String(newExpenseForm.amount)
      };
      const res = await axiosClient.post("/expenses", payload);
      setExpenses([res.data.data, ...expenses]);
      setIsAddModalOpen(false);
      setNewExpenseForm({
        tripId: "", truckId: "", category: "Fuel", amount: "", date: new Date().toISOString().split('T')[0], description: ""
      });
      showSuccess("Expense added successfully!");
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (expense) => {
    const tripIdStr = typeof expense.tripId === "object" && expense.tripId !== null ? expense.tripId._id : expense.tripId;
    const tripLabel = expense.trip?.source && expense.trip?.destination
      ? `${expense.trip.source} → ${expense.trip.destination}`
      : `Trip #${tripIdStr?.substring(tripIdStr.length - 6) || "Unknown"}`;

    setEditExpenseForm({
      id: expense._id,
      tripLabel,
      category: expense.category || "Fuel",
      amount: String(expense.amount ?? ""),
      date: expense.date ? new Date(expense.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      description: expense.description || "",
    });
    setEditSubmitError("");
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e) => {
    setEditExpenseForm({ ...editExpenseForm, [e.target.name]: e.target.value });
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editExpenseForm) return;
    if (Number(editExpenseForm.amount) <= 0 || isNaN(Number(editExpenseForm.amount))) {
      setEditSubmitError("Amount must be a positive number");
      return;
    }

    setIsEditSubmitting(true);
    setEditSubmitError("");
    try {
      const payload = {
        category: editExpenseForm.category,
        amount: String(editExpenseForm.amount),
        date: editExpenseForm.date,
        description: editExpenseForm.description,
      };
      const res = await axiosClient.put(`/expenses/${editExpenseForm.id}`, payload);
      setExpenses((prev) => prev.map((item) => (item._id === editExpenseForm.id ? res.data.data : item)));
      setIsEditModalOpen(false);
      setEditExpenseForm(null);
      showSuccess("Expense updated successfully!");
    } catch (error) {
      setEditSubmitError(error.response?.data?.message || "Failed to update expense");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await axiosClient.delete(`/expenses/${expenseId}`);
      setExpenses(expenses.filter(e => e._id !== expenseId));
      showSuccess("Expense deleted successfully!");
    } catch (error) {
      showError("Failed to delete expense: " + (error.response?.data?.message || "Unknown error"));
    }
  };

  // KPI Calculations
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const fuelExpenses = expenses.filter(e => e.category === 'Fuel').reduce((acc, curr) => acc + curr.amount, 0);
  const tollExpenses = expenses.filter(e => e.category === 'Toll').reduce((acc, curr) => acc + curr.amount, 0);
  const repairExpenses = expenses.filter(e => e.category === 'Repair').reduce((acc, curr) => acc + curr.amount, 0);

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
          <Link to="/owner/expenses" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-secondary bg-surface-container-highest/10 rounded-lg hover:bg-surface-container-highest/20 transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px] fill-icon">payments</span> Expenses
          </Link>
          <Link to="/owner/reports" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">assessment</span> Reports
          </Link>
        </nav>

        <div className="px-6 pt-6 border-t border-on-primary-container/20 mt-auto">
          <OwnerProfileCard onNavigate={() => setIsSidebarOpen(false)} />
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
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm py-1 px-2 w-48 text-on-surface placeholder:text-on-surface-variant outline-none" placeholder="Search expenses..." type="text"/>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-all relative">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
            </div>
            <div className="h-6 w-px bg-outline-variant/50 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsAddModalOpen(true)} className="bg-[#0a0a0a] text-white px-3 sm:px-4 py-2 rounded-lg font-label-md text-[13px] font-medium hover:bg-black transition-transform duration-200 active:scale-95 flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Add Expense</span>
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
                  <h2 className="font-headline-lg text-[32px] font-bold text-on-surface tracking-tight mb-1">Expense Management</h2>
                  <p className="font-body-md text-[14px] text-on-surface-variant mt-1 max-w-2xl">Track and manage every cost across your fleet in a centralized financial ledger.</p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-secondary">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Total Expenses</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface font-mono">₹{totalExpenses.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-orange-600">local_gas_station</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Fuel Costs</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface font-mono">₹{fuelExpenses.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-purple-600">toll</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tolls</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface font-mono">₹{tollExpenses.toLocaleString()}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-red-600">build</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Repairs</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface font-mono">₹{repairExpenses.toLocaleString()}</div>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="bg-white rounded-xl border border-outline-variant/50 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
                  <h3 className="text-[16px] font-bold text-on-surface">Recent Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-lowest text-on-surface-variant text-[11px] uppercase tracking-wider border-b border-outline-variant/50">
                        <th className="px-6 py-3 font-bold">Date</th>
                        <th className="px-6 py-3 font-bold">Category</th>
                        <th className="px-6 py-3 font-bold">Amount</th>
                        <th className="px-6 py-3 font-bold">Trip / Route</th>
                        <th className="px-6 py-3 font-bold hidden md:table-cell">Description</th>
                        <th className="px-6 py-3 font-bold hidden lg:table-cell">Added By</th>
                        <th className="px-6 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 text-[13px]">
                      {expenses.filter(e => {
                        const sq = searchQuery.toLowerCase();
                        const routeText = e.trip ? `${e.trip.source} ${e.trip.destination}`.toLowerCase() : "";
                        return (
                          e.category?.toLowerCase().includes(sq) ||
                          String(e.tripId || "").toLowerCase().includes(sq) ||
                          routeText.includes(sq) ||
                          e.description?.toLowerCase().includes(sq) ||
                          e.addedBy?.toLowerCase().includes(sq) ||
                          e.addedByName?.toLowerCase().includes(sq) ||
                          String(e.amount).includes(searchQuery)
                        );
                      }).map((expense) => {
                        const tripIdStr = typeof expense.tripId === "object" && expense.tripId !== null ? expense.tripId._id : expense.tripId;
                        const routeLabel = expense.trip?.source && expense.trip?.destination
                          ? `${expense.trip.source} → ${expense.trip.destination}`
                          : `Trip #${tripIdStr?.substring(tripIdStr.length - 6) || "Unknown"}`;
                        return (
                        <tr key={expense._id} className="hover:bg-surface-container-lowest/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant font-medium">
                            {new Date(expense.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[11px] bg-surface-container-high text-on-surface">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-on-surface text-[14px]">
                            ₹{expense.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-on-surface font-medium truncate max-w-[220px]" title={routeLabel}>
                              {routeLabel}
                            </div>
                            {expense.truck?.registrationNumber && (
                              <div className="text-[11px] font-mono text-on-surface-variant mt-0.5">
                                {expense.truck.registrationNumber}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant truncate max-w-[200px] hidden md:table-cell" title={expense.description}>
                            {expense.description || '-'}
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-on-surface">
                                {expense.addedByName || expense.addedBy}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                expense.addedBy === "OWNER"
                                  ? "bg-secondary/10 text-secondary"
                                  : "bg-surface-container-high text-on-surface-variant"
                              }`}>
                                {expense.addedBy === "OWNER" ? "Owner" : "Driver"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1">
                              <button onClick={() => handleOpenEditModal(expense)} className="text-secondary hover:text-secondary/80 p-1.5 rounded-full hover:bg-secondary/10 transition-colors" title="Edit Expense">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button onClick={() => handleDeleteExpense(expense._id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors" title="Delete Expense">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-12 text-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-[48px] opacity-20 mb-3 block">receipt_long</span>
                            <p className="font-medium text-[14px]">No expenses recorded yet.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">receipt_long</span>
                <h3 className="text-[18px] font-bold text-on-surface">Record Expense</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background">
              <form onSubmit={handleCreateExpense} className="space-y-6">
                {submitError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] border border-red-100 flex items-center gap-2">
                     <span className="material-symbols-outlined text-[16px]">error</span>
                     {submitError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-on-surface-variant">Select Trip In Progress <span className="text-red-500">*</span></label>
                    <select required name="tripId" value={newExpenseForm.tripId} onChange={handleFormChange} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]">
                      <option value="">-- Choose Trip --</option>
                      {activeTrips.map(t => (
                        <option key={t._id} value={t._id}>Trip #{t._id.substring(t._id.length - 6)} ({t.source} to {t.destination})</option>
                      ))}
                    </select>
                    {activeTrips.length === 0 && <p className="text-[11px] text-orange-600 mt-1">No trips currently in progress available to assign expenses.</p>}
                  </div>

                  {(() => {
                    const selectedTrip = activeTrips.find((t) => t._id === newExpenseForm.tripId);
                    const tripTrucks = selectedTrip?.truckIds?.length > 1 ? selectedTrip.truckIds : [];
                    if (tripTrucks.length <= 1) return null;
                    return (
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Select Truck &amp; Driver <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          name="truckId"
                          value={newExpenseForm.truckId}
                          onChange={handleFormChange}
                          className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]"
                        >
                          {tripTrucks.map((tr, idx) => {
                            const dr = selectedTrip.driverIds?.[idx];
                            const drName = dr?.userId?.name || dr?.licenseNumber || "Driver";
                            return (
                              <option key={tr._id || idx} value={tr._id || tr}>
                                {tr.registrationNumber} — {drName}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Category <span className="text-red-500">*</span></label>
                      <select required name="category" value={newExpenseForm.category} onChange={handleFormChange} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Amount (₹) <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" name="amount" value={newExpenseForm.amount} onChange={handleFormChange} placeholder="e.g. 500" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px] font-mono" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-on-surface-variant">Date <span className="text-red-500">*</span></label>
                    <input required type="date" name="date" value={newExpenseForm.date} onChange={handleFormChange} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-on-surface-variant">Description / Notes</label>
                    <textarea name="description" value={newExpenseForm.description} onChange={handleFormChange} placeholder="Any details..." className="w-full h-20 p-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px] resize-none"></textarea>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-outline-variant/50 rounded-lg font-medium text-[13px] text-on-surface hover:bg-surface-container-low transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting || activeTrips.length === 0} className={`flex-1 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-lg font-medium text-[13px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm ${isSubmitting || activeTrips.length === 0 ? 'opacity-80 cursor-not-allowed' : ''}`}>
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Save Expense
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {isEditModalOpen && editExpenseForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">edit</span>
                <h3 className="text-[18px] font-bold text-on-surface">Edit Expense</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background">
              <form onSubmit={handleUpdateExpense} className="space-y-6">
                {editSubmitError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-[13px] border border-red-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {editSubmitError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-on-surface-variant">Trip / Route</label>
                    <div className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant/40 rounded-lg flex items-center text-[13px] font-medium text-on-surface">
                      {editExpenseForm.tripLabel}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Category <span className="text-red-500">*</span></label>
                      <select required name="category" value={editExpenseForm.category} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-semibold text-on-surface-variant">Amount (₹) <span className="text-red-500">*</span></label>
                      <input required type="number" step="0.01" name="amount" value={editExpenseForm.amount} onChange={handleEditFormChange} placeholder="e.g. 500" className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px] font-mono" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-on-surface-variant">Date <span className="text-red-500">*</span></label>
                    <input required type="date" name="date" value={editExpenseForm.date} onChange={handleEditFormChange} className="w-full h-10 px-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px]" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-on-surface-variant">Description / Notes</label>
                    <textarea name="description" value={editExpenseForm.description} onChange={handleEditFormChange} placeholder="Any details..." className="w-full h-20 p-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:border-secondary outline-none transition-all text-[13px] resize-none"></textarea>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-outline-variant/50 rounded-lg font-medium text-[13px] text-on-surface hover:bg-surface-container-low transition-colors">Cancel</button>
                  <button type="submit" disabled={isEditSubmitting} className={`flex-1 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-lg font-medium text-[13px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm ${isEditSubmitting ? 'opacity-80 cursor-not-allowed' : ''}`}>
                    {isEditSubmitting ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Update Expense
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
