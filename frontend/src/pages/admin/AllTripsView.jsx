import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import axiosClient from "../../api/axiosClient";
import { useToast } from "../../context/ToastContext";

export default function AllTripsView() {
  const { showError } = useToast();
  const [trips, setTrips] = useState([]);
  const [ownersList, setOwnersList] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Trip details modal
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch owners list for dropdown filter
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const res = await axiosClient.get("/admin/owners?limit=100");
        setOwnersList(res.data.data.owners || []);
      } catch (err) {
        console.error("Failed to fetch owners list for filter", err);
      }
    };
    fetchOwners();
  }, []);

  const fetchTrips = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        ownerId: selectedOwner !== "ALL" ? selectedOwner : undefined,
        status: status !== "ALL" ? status : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const res = await axiosClient.get("/admin/trips", { params });
      setTrips(res.data.data.trips);
      setPagination(res.data.data.pagination);
      if (isManual) showSuccess("Trips log refreshed successfully");
    } catch (err) {
      console.error("Failed to load trips", err);
      showError(err.response?.data?.message || "Failed to load platform trips");
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [selectedOwner, status, startDate, endDate, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTrips();
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedOwner("ALL");
    setStatus("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const formatCurrency = (amt) => {
    return `₹${(amt || 0).toLocaleString("en-IN")}`;
  };

  return (
    <AdminLayout
      title="All Trips View"
      subtitle="Universal trip monitoring registry tracking routes, carriers, trucks, and cargo across all fleets"
      actions={
        <button
          onClick={() => fetchTrips(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-[13px] font-medium transition-colors border border-outline-variant/30 disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
          title="Refresh trips log"
        >
          <span className={`material-symbols-outlined text-[18px] ${isRefreshing ? "animate-spin text-secondary" : ""}`}>
            refresh
          </span>
          <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      }
    >
      {/* Filters & Search Toolbar */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search by origin, destination, customer, or cargo material..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 transition-all placeholder:text-on-surface-variant/60"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              {/* Fleet Owner Filter */}
              <select
                value={selectedOwner}
                onChange={(e) => {
                  setSelectedOwner(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 font-medium max-w-[200px] truncate"
              >
                <option value="ALL">All Fleet Owners</option>
                {ownersList.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.businessName || o.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="ON_TRIP">On Trip (Active)</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-[13px] font-semibold hover:bg-primary/90 transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
                Filter
              </button>
            </div>
          </div>

          {/* Date range row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-outline-variant/20 text-[12px] text-on-surface-variant">
            <span className="font-semibold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              Date Range:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[11px]">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface text-[12px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px]">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface text-[12px]"
              />
            </div>

            {(search || selectedOwner !== "ALL" || status !== "ALL" || startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="ml-auto text-secondary hover:underline flex items-center gap-1 text-[12px] font-medium"
              >
                <span className="material-symbols-outlined text-[15px]">filter_alt_off</span>
                Clear All Filters
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Trips Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[16px] text-on-surface">Platform Trips Register</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[12px] bg-secondary/10 text-secondary font-semibold">
              {pagination.total} Total Trips Found
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-container-low/50 text-on-surface-variant text-[11px] uppercase tracking-wider font-semibold border-b border-outline-variant/30">
              <tr>
                <th className="py-3.5 px-5">Trip Route</th>
                <th className="py-3.5 px-4">Fleet Owner</th>
                <th className="py-3.5 px-4">Truck & Driver</th>
                <th className="py-3.5 px-4">Departure</th>
                <th className="py-3.5 px-4">Financials</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-on-surface-variant">
                    <div className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[20px] text-secondary">
                        progress_activity
                      </span>
                      <span>Loading trips log...</span>
                    </div>
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40 mb-2 block">
                      route
                    </span>
                    No trips found matching the selected filters.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => {
                  const truck = trip.truckId || (trip.truckIds && trip.truckIds[0]);
                  const driver = trip.driverId || (trip.driverIds && trip.driverIds[0]);
                  const effectiveRev = trip.actualRevenue != null ? trip.actualRevenue : trip.expectedRevenue;

                  return (
                    <tr key={trip._id} className="hover:bg-surface-container-low/40 transition-colors">
                      {/* Route & Cargo */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-on-surface text-[14px]">
                          {trip.source} → {trip.destination}
                        </div>
                        <div className="text-[12px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                          <span className="material-symbols-outlined text-[13px] text-secondary">inventory_2</span>
                          <span>{trip.material || "Freight Cargo"}</span>
                          {trip.customer && <span>• {trip.customer}</span>}
                        </div>
                      </td>

                      {/* Fleet Owner */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-on-surface">
                          {trip.ownerId?.businessName || trip.ownerId?.name || "Fleet Owner"}
                        </div>
                        <div className="text-[11px] text-on-surface-variant">
                          {trip.ownerId?.phone}
                        </div>
                      </td>

                      {/* Truck & Driver */}
                      <td className="py-4 px-4 text-[12px]">
                        <div className="font-mono font-bold text-on-surface">
                          {truck?.registrationNumber || "Unassigned Truck"}
                        </div>
                        <div className="text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[13px]">person</span>
                          <span>{driver?.userId?.name || "Unassigned Driver"}</span>
                        </div>
                      </td>

                      {/* Departure Date */}
                      <td className="py-4 px-4 text-on-surface-variant text-[12px]">
                        {new Date(trip.startDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Financials (Rev / Exp / Profit) */}
                      <td className="py-4 px-4 text-[12px]">
                        <div className="font-bold text-on-surface">
                          {formatCurrency(effectiveRev)}
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span className="text-red-500 font-medium">-{formatCurrency(trip.totalExpense)}</span>
                          <span>•</span>
                          <span className={trip.netProfit >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                            Net {formatCurrency(trip.netProfit)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                            trip.status === "ON_TRIP"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : trip.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}
                        >
                          {trip.status === "ON_TRIP" ? "In Transit" : trip.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => {
                            setSelectedTrip(trip);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container-high transition-colors"
                          title="View Trip Breakdown"
                        >
                          <span className="material-symbols-outlined text-[19px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-outline-variant/20 flex items-center justify-between text-[13px] text-on-surface-variant">
            <span>
              Page {pagination.page} of {pagination.pages} ({pagination.total} trips)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed text-on-surface"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed text-on-surface"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trip Details Modal */}
      {isModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest w-full max-w-[620px] rounded-3xl shadow-2xl border border-outline-variant/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Trip Master Dossier
                </span>
                <h3 className="font-bold text-[18px] text-on-surface mt-0.5">
                  {selectedTrip.source} → {selectedTrip.destination}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-[13px] overflow-y-auto max-h-[75vh]">
              {/* Fleet & Status Badge */}
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-on-surface-variant uppercase font-semibold">Carrier Fleet</p>
                  <p className="font-bold text-[15px] text-on-surface">
                    {selectedTrip.ownerId?.businessName || selectedTrip.ownerId?.name || "Independent"}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">{selectedTrip.ownerId?.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[12px] font-bold ${
                    selectedTrip.status === "ON_TRIP"
                      ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                      : selectedTrip.status === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 border border-red-500/20"
                  }`}
                >
                  {selectedTrip.status}
                </span>
              </div>

              {/* Vehicle & Operator */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <p className="text-[11px] text-on-surface-variant uppercase font-bold">Assigned Truck</p>
                  <p className="font-mono font-bold text-on-surface text-[14px] mt-0.5">
                    {selectedTrip.truckId?.registrationNumber ||
                      selectedTrip.truckIds?.[0]?.registrationNumber ||
                      "N/A"}
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {selectedTrip.truckId?.truckType || selectedTrip.truckIds?.[0]?.truckType || "Truck"}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  <p className="text-[11px] text-on-surface-variant uppercase font-bold">Designated Driver</p>
                  <p className="font-bold text-on-surface text-[14px] mt-0.5">
                    {selectedTrip.driverId?.userId?.name ||
                      selectedTrip.driverIds?.[0]?.userId?.name ||
                      "N/A"}
                  </p>
                  <p className="text-[11px] text-on-surface-variant font-mono">
                    Lic: {selectedTrip.driverId?.licenseNumber || selectedTrip.driverIds?.[0]?.licenseNumber || "N/A"}
                  </p>
                </div>
              </div>

              {/* Cargo & Customer */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Customer / Consignee:</span>
                  <span className="font-semibold text-on-surface">{selectedTrip.customer || "Not Specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Cargo Material:</span>
                  <span className="font-semibold text-on-surface">{selectedTrip.material || "General Freight"}</span>
                </div>
                {selectedTrip.quantity && (
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Cargo Quantity:</span>
                    <span className="font-semibold text-on-surface">{selectedTrip.quantity}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Dispatch Date:</span>
                  <span className="font-medium text-on-surface">
                    {new Date(selectedTrip.startDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Financial Balance Sheet */}
              <div>
                <h4 className="font-bold text-on-surface text-[14px] mb-2">Trip Balance Sheet</h4>
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-2.5">
                  <div className="flex justify-between text-on-surface">
                    <span>Expected Revenue:</span>
                    <span className="font-semibold">{formatCurrency(selectedTrip.expectedRevenue)}</span>
                  </div>
                  {selectedTrip.actualRevenue != null && (
                    <div className="flex justify-between text-on-surface">
                      <span>Final Settled Revenue:</span>
                      <span className="font-bold text-secondary">{formatCurrency(selectedTrip.actualRevenue)}</span>
                    </div>
                  )}
                  {selectedTrip.advanceAmount > 0 && (
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Advance Received:</span>
                      <span className="font-medium text-blue-600">{formatCurrency(selectedTrip.advanceAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Total Operational Expenses:</span>
                    <span className="font-medium text-red-500">
                      -{formatCurrency(selectedTrip.totalExpense)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-outline-variant/30 flex justify-between text-[15px] font-bold">
                    <span className="text-on-surface">Trip Net Profit:</span>
                    <span className={selectedTrip.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {formatCurrency(selectedTrip.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 bg-surface-container-low border-t border-outline-variant/30 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl bg-surface-container-high text-on-surface font-medium hover:bg-surface-container-highest transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
