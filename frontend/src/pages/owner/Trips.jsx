import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

function getDriverInitials(name) {
  if (!name) return "DR";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function FleetAssignmentSection({
  truckIds,
  driverIds,
  allTrucks,
  allDrivers,
  selectableTrucks,
  getSelectableDriversForRow,
  totalCapacity,
  onAddTruck,
  onRemoveTruck,
  onRemoveAll,
  onAssignDriver,
  errors = {},
}) {
  const hasAvailableTrucks = selectableTrucks.length > 0;

  return (
    <div className="space-y-4 col-span-full bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-outline-variant/20 pb-2.5">
        <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider">
          Fleet &amp; Crew Assignment <span className="text-red-500">*</span>
        </h4>
        <div className="flex items-center gap-2">
          {totalCapacity > 0 && (
            <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full">
              Combined Capacity: {totalCapacity} Tons
            </span>
          )}
        </div>
      </div>

      {/* Add Truck Bar + Remove All */}
      <div className="flex items-center gap-3">
        <div
          className={`relative flex-1 flex items-center h-11 px-3.5 rounded-xl border border-dashed transition-colors ${
            errors.truckIds
              ? "border-red-400 bg-red-50/30"
              : hasAvailableTrucks
              ? "border-outline-variant/70 bg-surface-container-lowest hover:border-secondary/60"
              : "border-outline-variant/40 bg-surface-container-low/60"
          }`}
        >
          <span
            className={`material-symbols-outlined text-[18px] mr-2 shrink-0 ${
              hasAvailableTrucks ? "text-secondary" : "text-on-surface-variant/50"
            }`}
          >
            add
          </span>
          <span
            className={`text-[13px] font-semibold shrink-0 ${
              hasAvailableTrucks ? "text-secondary" : "text-on-surface-variant/70"
            }`}
          >
            Add a truck
          </span>
          <span className="ml-auto text-[12px] text-on-surface-variant/80 pl-3 truncate">
            {hasAvailableTrucks
              ? `${selectableTrucks.length} available`
              : "No more available trucks"}
          </span>
          <select
            aria-label="Add a truck"
            value=""
            disabled={!hasAvailableTrucks}
            onChange={(e) => onAddTruck(e.target.value)}
            className={`absolute inset-0 w-full h-full opacity-0 ${
              hasAvailableTrucks ? "cursor-pointer" : "cursor-not-allowed"
            }`}
          >
            <option value="">
              {hasAvailableTrucks ? "Choose a truck to add..." : "No more available trucks"}
            </option>
            {selectableTrucks.map((t) => {
              const dObj = (allDrivers || []).find((d) => {
                const dId = t.currentDriverId?._id || t.currentDriverId;
                return dId && dId.toString() === d._id.toString();
              });
              return (
                <option key={t._id} value={t._id}>
                  {t.registrationNumber}
                  {t.capacity ? ` (${t.capacity}` : ""}
                  {t.truckType ? `${t.capacity ? ", " : " ("}${t.truckType})` : t.capacity ? ")" : ""}
                  {dObj ? ` • Default: ${dObj.userId?.name || dObj.licenseNumber}` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {truckIds.length > 0 && (
          <button
            type="button"
            onClick={onRemoveAll}
            className="text-[12px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-2 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Remove all
          </button>
        )}
      </div>

      {errors.truckIds && (
        <p className="text-red-500 text-[11px] font-medium -mt-2">{errors.truckIds}</p>
      )}

      {/* Trucks & Drivers List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
            Trucks &amp; Drivers ({truckIds.length})
          </span>
        </div>

        {truckIds.length === 0 ? (
          <div className="border border-dashed border-outline-variant/50 rounded-xl p-5 text-center bg-surface-container-lowest">
            <p className="text-[12px] text-on-surface-variant">
              No trucks assigned yet. Click <span className="font-semibold text-secondary">+ Add a truck</span> above and pick a driver for each truck.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {truckIds.map((truckId, idx) => {
              const truck = (allTrucks || []).find((t) => t._id === truckId);
              const assignedDriverId = driverIds[idx] || "";
              const selectableDrivers = getSelectableDriversForRow(idx);
              const assignedDriver = (allDrivers || []).find((d) => d._id === assignedDriverId);
              const isReady = Boolean(assignedDriverId && assignedDriver);
              const driverName = assignedDriver?.userId?.name || assignedDriver?.licenseNumber || "";

              return (
                <div
                  key={truckId}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-3 rounded-xl border transition-all ${
                    isReady
                      ? "bg-white border-outline-variant/50 shadow-2xs"
                      : "bg-amber-50/50 border-amber-300"
                  }`}
                >
                  {/* Left: Index + Truck info */}
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <span className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface font-bold text-[12px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-[13px] text-on-surface truncate">
                        {truck?.registrationNumber || "Truck"}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {truck?.capacity && (
                          <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-[11px] font-semibold">
                            {truck.capacity}
                          </span>
                        )}
                        {truck?.truckType && (
                          <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded text-[11px] font-medium">
                            {truck.truckType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Individual Driver Selector */}
                  <div className="flex-1 min-w-[190px]">
                    <div
                      className={`h-10 px-2.5 rounded-lg border flex items-center gap-2 bg-white transition-colors ${
                        isReady
                          ? "border-outline-variant/60 focus-within:border-secondary"
                          : "border-amber-300 focus-within:border-amber-500"
                      }`}
                    >
                      {isReady ? (
                        <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary text-[10px] font-bold flex items-center justify-center shrink-0">
                          {getDriverInitials(driverName)}
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0">
                          person_outline
                        </span>
                      )}
                      <select
                        aria-label={`Select driver for ${truck?.registrationNumber || "truck"}`}
                        value={assignedDriverId}
                        onChange={(e) => onAssignDriver(idx, e.target.value)}
                        className={`flex-1 bg-transparent text-[13px] font-medium outline-none cursor-pointer truncate ${
                          isReady ? "text-on-surface" : "text-amber-900"
                        }`}
                      >
                        <option value="">Choose a driver</option>
                        {selectableDrivers.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.userId?.name || "Driver"} (Lic: {d.licenseNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right: Status Pill + Remove */}
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    {isReady ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Needs driver
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveTruck(idx)}
                      className="text-on-surface-variant hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Remove truck"
                    >
                      <span className="material-symbols-outlined text-[18px] block">close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(errors.driverIds || errors.pairing) && (
        <p className="text-red-500 text-[11px] font-medium">
          {errors.pairing || errors.driverIds}
        </p>
      )}
    </div>
  );
}

export default function Trips() {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const [trips, setTrips] = useState([]);
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
    truckIds: [],
    driverIds: [],
    source: "",
    destination: "",
    material: "",
    quantity: "",
    expectedRevenue: "",
    startDate: new Date().toISOString().split("T")[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Edit Trip Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTripForm, setEditTripForm] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState("");

  // Derive busy trucks & drivers from all active trips (excluding legs already completed)
  const { busyTruckIdSet, busyDriverIdSet } = useMemo(() => {
    const truckSet = new Set();
    const driverSet = new Set();
    (trips || []).forEach((trip) => {
      if (["ON_TRIP", "ACTIVE", "DRIVER_ENDED"].includes(trip.status)) {
        if (Array.isArray(trip.assignments) && trip.assignments.length > 0) {
          trip.assignments.forEach((a) => {
            if (a.status === "COMPLETED") return;
            const tId = typeof a.truckId === "object" && a.truckId !== null ? a.truckId._id : a.truckId;
            const dId = typeof a.driverId === "object" && a.driverId !== null ? a.driverId._id : a.driverId;
            if (tId) truckSet.add(tId.toString());
            if (dId) driverSet.add(dId.toString());
          });
          return;
        }
        if (Array.isArray(trip.truckIds)) {
          trip.truckIds.forEach((t) => {
            const id = typeof t === "object" && t !== null ? t._id : t;
            if (id) truckSet.add(id.toString());
          });
        }
        if (trip.truckId) {
          const id =
            typeof trip.truckId === "object" && trip.truckId !== null
              ? trip.truckId._id
              : trip.truckId;
          if (id) truckSet.add(id.toString());
        }
        if (Array.isArray(trip.driverIds)) {
          trip.driverIds.forEach((d) => {
            const id = typeof d === "object" && d !== null ? d._id : d;
            if (id) driverSet.add(id.toString());
          });
        }
        if (trip.driverId) {
          const id =
            typeof trip.driverId === "object" && trip.driverId !== null
              ? trip.driverId._id
              : trip.driverId;
          if (id) driverSet.add(id.toString());
        }
      }
    });
    return { busyTruckIdSet: truckSet, busyDriverIdSet: driverSet };
  }, [trips]);

  // Available resources strictly excluding those currently on an active trip
  const availableTrucks = useMemo(() => {
    return (allTrucks || []).filter(
      (t) =>
        !busyTruckIdSet.has(t._id.toString()) &&
        (t.status === "AVAILABLE" || t.status === "ACTIVE")
    );
  }, [allTrucks, busyTruckIdSet]);

  const availableDrivers = useMemo(() => {
    return (allDrivers || []).filter(
      (d) =>
        !busyDriverIdSet.has(d._id.toString()) &&
        (d.status === "AVAILABLE" || d.status === "ACTIVE")
    );
  }, [allDrivers, busyDriverIdSet]);

  // Selected Resources & Capacities for New Trip Form (preserving exact array order)
  const selectedNewTrucks = newTripForm.truckIds
    .map((id) => (allTrucks || []).find((t) => t._id === id))
    .filter(Boolean);
  const selectedNewDrivers = newTripForm.driverIds
    .map((id) => (allDrivers || []).find((d) => d._id === id))
    .filter(Boolean);

  const newTripTotalCapacity = selectedNewTrucks.reduce((sum, t) => {
    const cap = parseFloat(t.capacity);
    return !isNaN(cap) ? sum + cap : sum;
  }, 0);

  const newTripQuantityNum = Number(newTripForm.quantity);
  const newTripCapacityError =
    !isNaN(newTripQuantityNum) &&
    selectedNewTrucks.length > 0 &&
    newTripTotalCapacity > 0 &&
    newTripQuantityNum > newTripTotalCapacity
      ? `Quantity cannot exceed the combined truck capacity of ${newTripTotalCapacity} Tons.`
      : null;

  // Selected Resources & Capacities for Edit Trip Form (preserving exact array order)
  const selectedEditTrucks = (editTripForm?.truckIds || [])
    .map((id) => (allTrucks || []).find((t) => t._id === id))
    .filter(Boolean);
  const selectedEditDrivers = (editTripForm?.driverIds || [])
    .map((id) => (allDrivers || []).find((d) => d._id === id))
    .filter(Boolean);

  const editTripTotalCapacity = selectedEditTrucks.reduce((sum, t) => {
    const cap = parseFloat(t.capacity);
    return !isNaN(cap) ? sum + cap : sum;
  }, 0);

  const editTripQuantityNum = Number(editTripForm?.quantity);
  const editTripCapacityError =
    !isNaN(editTripQuantityNum) &&
    selectedEditTrucks.length > 0 &&
    editTripTotalCapacity > 0 &&
    editTripQuantityNum > editTripTotalCapacity
      ? `Quantity cannot exceed the combined truck capacity of ${editTripTotalCapacity} Tons.`
      : null;

  const handleOpenEditModal = (trip) => {
    const tripTruckIds =
      trip.truckIds && trip.truckIds.length > 0
        ? trip.truckIds.map((t) => t._id || t)
        : trip.truckId
        ? [trip.truckId._id || trip.truckId]
        : [];
    const tripDriverIds =
      trip.driverIds && trip.driverIds.length > 0
        ? trip.driverIds.map((d) => d._id || d)
        : trip.driverId
        ? [trip.driverId._id || trip.driverId]
        : [];

    setEditTripForm({
      id: trip._id,
      truckIds: tripTruckIds,
      driverIds: tripDriverIds,
      source: trip.source,
      destination: trip.destination,
      material: trip.material,
      quantity: trip.quantity,
      expectedRevenue: trip.expectedRevenue,
      startDate: trip.startDate
        ? new Date(trip.startDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    });
    setEditSubmitError("");
    setIsEditModalOpen(true);
  };

  const handleAddTruck = (truckId) => {
    if (!truckId) return;
    if (newTripForm.truckIds.includes(truckId)) return;

    // Check if this truck has a default driver who is available and not already used
    const truck = (allTrucks || []).find((t) => t._id === truckId);
    let defaultDriverId = "";
    if (truck && truck.currentDriverId) {
      const dId =
        typeof truck.currentDriverId === "object"
          ? truck.currentDriverId._id
          : truck.currentDriverId;
      const isAvailable = (availableDrivers || []).some((d) => d._id === dId);
      if (isAvailable && !newTripForm.driverIds.includes(dId)) {
        defaultDriverId = dId;
      }
    }

    setNewTripForm((prev) => {
      const updatedTruckIds = [...prev.truckIds, truckId];
      const updatedDriverIds = [...prev.driverIds];

      if (defaultDriverId) {
        updatedDriverIds.push(defaultDriverId);
      } else {
        // If there is an existing trailing driver without a truck, pair it; otherwise push empty slot
        if (updatedDriverIds.length >= updatedTruckIds.length) {
          // already has a driver slot
        } else {
          updatedDriverIds.push("");
        }
      }

      return {
        ...prev,
        truckIds: updatedTruckIds,
        driverIds: updatedDriverIds,
      };
    });

    if (formErrors.truckIds) setFormErrors((prev) => ({ ...prev, truckIds: "" }));
    if (formErrors.driverIds && defaultDriverId) setFormErrors((prev) => ({ ...prev, driverIds: "" }));
    if (formErrors.pairing) setFormErrors((prev) => ({ ...prev, pairing: "" }));
  };

  const handleRemoveTruck = (indexToRemove) => {
    setNewTripForm((prev) => ({
      ...prev,
      truckIds: prev.truckIds.filter((_, idx) => idx !== indexToRemove),
      driverIds: prev.driverIds.filter((_, idx) => idx !== indexToRemove),
    }));
    if (formErrors.pairing) setFormErrors((prev) => ({ ...prev, pairing: "" }));
  };

  const handleAssignDriverToTruck = (index, driverId) => {
    setNewTripForm((prev) => {
      const updatedDrivers = [...prev.driverIds];
      updatedDrivers[index] = driverId;
      return {
        ...prev,
        driverIds: updatedDrivers,
      };
    });
    if (formErrors.driverIds) setFormErrors((prev) => ({ ...prev, driverIds: "" }));
    if (formErrors.pairing) setFormErrors((prev) => ({ ...prev, pairing: "" }));
  };

  const handleAddDriver = (driverId) => {
    if (!driverId) return;
    if (newTripForm.driverIds.includes(driverId)) return;

    // Check if this driver has an assigned truck in fleet
    const assignedTruck = (allTrucks || []).find((t) => {
      const dId = t.currentDriverId?._id || t.currentDriverId;
      return dId && dId.toString() === driverId.toString();
    });

    const isAssignedTruckAvailable =
      assignedTruck &&
      (availableTrucks || []).some((t) => t._id.toString() === assignedTruck._id.toString());

    setNewTripForm((prev) => {
      let updatedTruckIds = [...prev.truckIds];
      let updatedDriverIds = [...prev.driverIds];

      // If assigned truck is available and not already added to trip, auto-select the truck!
      if (isAssignedTruckAvailable && !updatedTruckIds.includes(assignedTruck._id)) {
        updatedTruckIds.push(assignedTruck._id);
        updatedDriverIds.push(driverId);
      } else if (assignedTruck && updatedTruckIds.includes(assignedTruck._id)) {
        // If assigned truck is already in trip, pair this driver with it
        const truckIndex = updatedTruckIds.indexOf(assignedTruck._id);
        updatedDriverIds[truckIndex] = driverId;
      } else {
        // If driver has no assigned truck, fill first empty truck slot
        const emptyIdx = updatedDriverIds.findIndex((id) => !id);
        if (emptyIdx !== -1 && emptyIdx < updatedTruckIds.length) {
          updatedDriverIds[emptyIdx] = driverId;
        } else {
          updatedDriverIds.push(driverId);
        }
      }

      return {
        ...prev,
        truckIds: updatedTruckIds,
        driverIds: updatedDriverIds,
      };
    });

    if (formErrors.driverIds) setFormErrors((prev) => ({ ...prev, driverIds: "" }));
    if (formErrors.truckIds) setFormErrors((prev) => ({ ...prev, truckIds: "" }));
    if (formErrors.pairing) setFormErrors((prev) => ({ ...prev, pairing: "" }));
  };

  const handleRemoveDriver = (indexToRemove) => {
    setNewTripForm((prev) => {
      const updatedDrivers = [...prev.driverIds];
      updatedDrivers[indexToRemove] = "";
      return { ...prev, driverIds: updatedDrivers };
    });
  };

  const handleAddEditTruck = (truckId) => {
    if (!truckId || !editTripForm) return;
    if (editTripForm.truckIds.includes(truckId)) return;

    const truck = (allTrucks || []).find((t) => t._id === truckId);
    let defaultDriverId = "";
    if (truck && truck.currentDriverId) {
      const dId =
        typeof truck.currentDriverId === "object"
          ? truck.currentDriverId._id
          : truck.currentDriverId;
      const isAvailable =
        (availableDrivers || []).some((d) => d._id === dId) ||
        editTripForm.driverIds.includes(dId);
      if (isAvailable && !editTripForm.driverIds.includes(dId)) {
        defaultDriverId = dId;
      }
    }

    setEditTripForm((prev) => {
      const updatedTruckIds = [...prev.truckIds, truckId];
      const updatedDriverIds = [...prev.driverIds];

      if (defaultDriverId) {
        updatedDriverIds.push(defaultDriverId);
      } else {
        if (updatedDriverIds.length >= updatedTruckIds.length) {
          // already has a driver slot
        } else {
          updatedDriverIds.push("");
        }
      }

      return {
        ...prev,
        truckIds: updatedTruckIds,
        driverIds: updatedDriverIds,
      };
    });
  };

  const handleRemoveEditTruck = (indexToRemove) => {
    if (!editTripForm) return;
    setEditTripForm((prev) => ({
      ...prev,
      truckIds: prev.truckIds.filter((_, idx) => idx !== indexToRemove),
      driverIds: prev.driverIds.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleAssignEditDriverToTruck = (index, driverId) => {
    if (!editTripForm) return;
    setEditTripForm((prev) => {
      const updatedDrivers = [...prev.driverIds];
      updatedDrivers[index] = driverId;
      return {
        ...prev,
        driverIds: updatedDrivers,
      };
    });
  };

  const handleAddEditDriver = (driverId) => {
    if (!driverId || !editTripForm) return;
    if (editTripForm.driverIds.includes(driverId)) return;

    // Check if this driver has an assigned truck in fleet
    const assignedTruck = (allTrucks || []).find((t) => {
      const dId = t.currentDriverId?._id || t.currentDriverId;
      return dId && dId.toString() === driverId.toString();
    });

    const isAssignedTruckAvailable =
      assignedTruck &&
      ((availableTrucks || []).some((t) => t._id.toString() === assignedTruck._id.toString()) ||
        editTripForm.truckIds.includes(assignedTruck._id));

    setEditTripForm((prev) => {
      let updatedTruckIds = [...prev.truckIds];
      let updatedDriverIds = [...prev.driverIds];

      if (isAssignedTruckAvailable && !updatedTruckIds.includes(assignedTruck._id)) {
        updatedTruckIds.push(assignedTruck._id);
        updatedDriverIds.push(driverId);
      } else if (assignedTruck && updatedTruckIds.includes(assignedTruck._id)) {
        const truckIndex = updatedTruckIds.indexOf(assignedTruck._id);
        updatedDriverIds[truckIndex] = driverId;
      } else {
        const emptyIdx = updatedDriverIds.findIndex((id) => !id);
        if (emptyIdx !== -1 && emptyIdx < updatedTruckIds.length) {
          updatedDriverIds[emptyIdx] = driverId;
        } else {
          updatedDriverIds.push(driverId);
        }
      }

      return {
        ...prev,
        truckIds: updatedTruckIds,
        driverIds: updatedDriverIds,
      };
    });
  };

  const handleRemoveEditDriver = (indexToRemove) => {
    if (!editTripForm) return;
    setEditTripForm((prev) => {
      const updatedDrivers = [...prev.driverIds];
      updatedDrivers[indexToRemove] = "";
      return { ...prev, driverIds: updatedDrivers };
    });
  };

  const validateForm = () => {
    const errors = {};
    const {
      source,
      destination,
      truckIds,
      driverIds,
      material,
      quantity,
      expectedRevenue,
      startDate,
    } = newTripForm;

    if (!source?.trim() || source.trim().length < 3) {
      errors.source = "Source must be at least 3 characters.";
    }
    if (!destination?.trim() || destination.trim().length < 3) {
      errors.destination = "Destination must be at least 3 characters.";
    }
    if (!truckIds || truckIds.length === 0) {
      errors.truckIds = "Please select at least one truck.";
    }

    const validDriverIds = (driverIds || []).filter(Boolean);
    if (!validDriverIds || validDriverIds.length === 0) {
      errors.driverIds = "Please assign a driver for each truck.";
    } else if (truckIds && validDriverIds.length < truckIds.length) {
      errors.pairing = `Each truck requires an assigned driver (${truckIds.length} trucks, ${validDriverIds.length} assigned).`;
    }

    // Check unique drivers within trip (a driver cannot drive two trucks in the same trip)
    if (truckIds && validDriverIds.length === truckIds.length) {
      const uniqueDrivers = new Set(validDriverIds);
      if (uniqueDrivers.size !== validDriverIds.length) {
        errors.pairing = "Each truck must have a distinct driver. A driver cannot drive multiple trucks simultaneously.";
      }
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
    setNewTripForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditTripForm((prev) => ({ ...prev, [name]: value }));
  };

  const fetchTripsAndResources = async () => {
    try {
      const [tripsRes, trucksRes, driversRes] = await Promise.all([
        axiosClient.get("/trips"),
        axiosClient.get("/trucks"),
        axiosClient.get("/drivers"),
      ]);
      setTrips(tripsRes.data.data || []);
      setAllTrucks(trucksRes.data.data || []);
      setAllDrivers(driversRes.data.data || []);

      setSelectedTrip((prev) => {
        if (prev) {
          const updated = (tripsRes.data.data || []).find((t) => t._id === prev._id);
          return updated || prev;
        }
        return tripsRes.data.data && tripsRes.data.data.length > 0 ? tripsRes.data.data[0] : null;
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
        truckIds: newTripForm.truckIds,
        driverIds: newTripForm.driverIds.filter(Boolean),
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
        truckIds: [],
        driverIds: [],
        source: "",
        destination: "",
        material: "",
        quantity: "",
        expectedRevenue: "",
        startDate: new Date().toISOString().split("T")[0],
      });
      setSelectedTrip(res.data.data);
      fetchTripsAndResources();
      showSuccess("Trip created successfully!");
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Failed to create trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTrip = async (e) => {
    e.preventDefault();
    if (!editTripForm.truckIds?.length) {
      setEditSubmitError("At least one truck must be assigned.");
      return;
    }
    const validEditDrivers = (editTripForm.driverIds || []).filter(Boolean);
    if (!validEditDrivers.length) {
      setEditSubmitError("At least one driver must be assigned.");
      return;
    }
    if (editTripForm.truckIds.length !== validEditDrivers.length) {
      setEditSubmitError(
        `Each truck requires an assigned driver (${editTripForm.truckIds.length} trucks, ${validEditDrivers.length} drivers).`
      );
      return;
    }

    setIsEditSubmitting(true);
    setEditSubmitError("");
    try {
      const payload = {
        ...editTripForm,
        truckIds: editTripForm.truckIds,
        driverIds: editTripForm.driverIds.filter(Boolean),
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
      showSuccess("Trip updated successfully!");
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
        showSuccess("Trip marked as completed!");
      } else if (newStatus === "CANCELLED") {
        await axiosClient.patch(`/trips/${tripId}/cancel`);
        showSuccess("Trip cancelled successfully!");
      }
      fetchTripsAndResources();
    } catch (error) {
      showError("Failed to update trip status: " + (error.response?.data?.message || "Unknown error"));
    }
  };

  const handleConfirmTruckEnd = async (tripId, truckId) => {
    try {
      const res = await axiosClient.patch(`/trips/${tripId}/confirm-end`, { truckId });
      const updatedTrip = res.data.data;
      if (updatedTrip?.status === "COMPLETED") {
        showSuccess("Final truck confirmed — trip completed & report generated!");
      } else {
        showSuccess("Truck end request accepted. Trip continues for remaining truck(s).");
      }
      fetchTripsAndResources();
    } catch (error) {
      showError("Failed to accept truck end: " + (error.response?.data?.message || "Unknown error"));
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this trip? This action cannot be undone."
      )
    )
      return;
    try {
      await axiosClient.delete(`/trips/${tripId}`);
      setSelectedTrip(null);
      fetchTripsAndResources();
      showSuccess("Trip deleted successfully!");
    } catch (error) {
      showError("Failed to delete trip: " + (error.response?.data?.message || "Unknown error"));
    }
  };

  // Collect unique trucks and drivers for filter dropdowns
  const uniqueFilterTrucks = [];
  const seenTruckIds = new Set();
  trips.forEach((t) => {
    const trList =
      t.truckIds && t.truckIds.length > 0 ? t.truckIds : t.truckId ? [t.truckId] : [];
    trList.forEach((tr) => {
      if (tr && tr._id && !seenTruckIds.has(tr._id)) {
        seenTruckIds.add(tr._id);
        uniqueFilterTrucks.push(tr);
      }
    });
  });

  const uniqueFilterDrivers = [];
  const seenDriverIds = new Set();
  trips.forEach((t) => {
    const drList =
      t.driverIds && t.driverIds.length > 0 ? t.driverIds : t.driverId ? [t.driverId] : [];
    drList.forEach((dr) => {
      if (dr && dr._id && !seenDriverIds.has(dr._id)) {
        seenDriverIds.add(dr._id);
        uniqueFilterDrivers.push(dr);
      }
    });
  });

  // Resources for the currently selected trip details view
  const selectedTripTrucks = selectedTrip
    ? selectedTrip.truckIds && selectedTrip.truckIds.length > 0
      ? selectedTrip.truckIds
      : selectedTrip.truckId
      ? [selectedTrip.truckId]
      : []
    : [];

  const selectedTripDrivers = selectedTrip
    ? selectedTrip.driverIds && selectedTrip.driverIds.length > 0
      ? selectedTrip.driverIds
      : selectedTrip.driverId
      ? [selectedTrip.driverId]
      : []
    : [];

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased overflow-hidden flex h-screen">
      {/* SideNavBar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[90] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside
        className={`bg-primary-container h-screen w-[240px] fixed left-0 top-0 shadow-lg flex flex-col py-6 z-[100] transition-transform duration-300 md:translate-x-0 shrink-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[24px]">local_shipping</span>
          </div>
          <div>
            <h1 className="font-headline-md text-[20px] font-bold text-white tracking-wide">
              LogiBrain
            </h1>
            <p className="font-label-sm text-[12px] text-on-primary-container">Owner Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
          <Link
            to="/owner/dashboard"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
          </Link>
          <Link
            to="/owner/trips"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-secondary bg-surface-container-highest/10 rounded-lg hover:bg-surface-container-highest/20 transition-all font-medium text-[14px]"
          >
            <span className="material-symbols-outlined text-[20px]">route</span> Trips
          </Link>
          <Link
            to="/owner/trucks"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]"
          >
            <span className="material-symbols-outlined text-[20px]">local_shipping</span> Trucks
          </Link>
          <Link
            to="/owner/drivers"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px]"
          >
            <span className="material-symbols-outlined text-[20px]">person</span> Drivers
          </Link>
          <Link
            to="/owner/expenses"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] fill-icon">payments</span>{" "}
            Expenses
          </Link>
          <Link
            to="/owner/reports"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-on-primary-container hover:text-white hover:bg-surface-container-highest/5 rounded-lg transition-all font-medium text-[14px] cursor-pointer"
          >
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
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all font-medium text-[14px]"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:ml-[240px] h-screen overflow-hidden bg-background">
        {/* TopNavBar */}
        <header className="bg-surface/80 backdrop-blur-md h-16 sticky top-0 z-40 border-b border-outline-variant flex justify-between items-center w-full px-6 md:px-10 shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden text-on-surface-variant p-2 -ml-2 rounded-lg hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden lg:flex items-center bg-surface-container-low rounded-full px-3 py-1.5 border border-outline-variant/30 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm py-1 px-2 w-48 text-on-surface placeholder:text-on-surface-variant outline-none"
                placeholder="Search trips..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-all relative">
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
            </div>
            <div className="h-6 w-px bg-outline-variant/50 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#0a0a0a] text-white px-3 sm:px-4 py-2 rounded-lg font-label-md text-[13px] font-medium hover:bg-black transition-transform duration-200 active:scale-95 flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Create Trip</span>
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
                  <h2 className="font-headline-lg text-[32px] font-bold text-on-surface tracking-tight mb-1">
                    Trip Management
                  </h2>
                  <p className="font-body-md text-[14px] text-on-surface-variant mt-1 max-w-2xl">
                    Dispatch multi-truck fleets, monitor active journeys, and verify completed
                    deliveries.
                  </p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">map</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Total Trips
                    </span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">{trips.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">
                      route
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">On Trip</span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">
                    {trips.filter((t) => ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"].includes(t.status)).length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">
                      verified
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Completed
                    </span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">
                    {trips.filter((t) => t.status === "COMPLETED").length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-red-500">
                  <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-red-600">cancel</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Cancelled
                    </span>
                  </div>
                  <div className="text-[24px] font-bold text-on-surface">
                    {trips.filter((t) => t.status === "CANCELLED").length}
                  </div>
                </div>
              </div>

              {/* Filters Section */}
              <div className="bg-white p-4 rounded-xl border border-outline-variant/50 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex flex-col min-w-[150px]">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-9 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-[13px] outline-none focus:border-secondary transition-colors"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ON_TRIP">On Trip</option>
                    <option value="DRIVER_ENDED">End Requested</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="flex flex-col min-w-[150px]">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Truck
                  </label>
                  <select
                    value={truckFilter}
                    onChange={(e) => setTruckFilter(e.target.value)}
                    className="h-9 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-[13px] outline-none focus:border-secondary transition-colors"
                  >
                    <option value="ALL">All Trucks</option>
                    {uniqueFilterTrucks.map((truck) => (
                      <option key={truck._id} value={truck._id}>
                        {truck.registrationNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col min-w-[150px]">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Driver
                  </label>
                  <select
                    value={driverFilter}
                    onChange={(e) => setDriverFilter(e.target.value)}
                    className="h-9 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-[13px] outline-none focus:border-secondary transition-colors"
                  >
                    <option value="ALL">All Drivers</option>
                    {uniqueFilterDrivers.map((driver) => (
                      <option key={driver._id} value={driver._id}>
                        {driver.userId?.name || driver.licenseNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col min-w-[150px]">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-9 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/50 text-[13px] outline-none focus:border-secondary transition-colors"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={() => {
                      setStatusFilter("ALL");
                      setTruckFilter("ALL");
                      setDriverFilter("ALL");
                      setDateFilter("");
                      setSearchQuery("");
                    }}
                    className="h-9 px-4 bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-lg text-[13px] font-medium transition-colors border border-outline-variant/50 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                    Clear
                  </button>
                </div>
              </div>

              {/* Dual Pane Layout */}
              <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-320px)] min-h-[500px]">
                {/* Left Pane: Grid (65%) */}
                <div className="w-full lg:w-[65%] h-full flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-8 custom-scrollbar h-full content-start">
                    {trips
                      .filter((t) => {
                        if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
                        if (truckFilter !== "ALL") {
                          const hasTruck =
                            (t.truckIds &&
                              t.truckIds.some((tr) => (tr._id || tr) === truckFilter)) ||
                            (t.truckId && (t.truckId._id || t.truckId) === truckFilter);
                          if (!hasTruck) return false;
                        }
                        if (driverFilter !== "ALL") {
                          const hasDriver =
                            (t.driverIds &&
                              t.driverIds.some((dr) => (dr._id || dr) === driverFilter)) ||
                            (t.driverId && (t.driverId._id || t.driverId) === driverFilter);
                          if (!hasDriver) return false;
                        }
                        if (
                          dateFilter &&
                          new Date(t.startDate).toISOString().split("T")[0] !== dateFilter
                        )
                          return false;

                        if (searchQuery) {
                          const sq = searchQuery.toLowerCase();
                          const truckMatch =
                            (t.truckIds &&
                              t.truckIds.some((tr) =>
                                tr.registrationNumber?.toLowerCase().includes(sq)
                              )) ||
                            t.truckId?.registrationNumber?.toLowerCase().includes(sq);
                          const driverMatch =
                            (t.driverIds &&
                              t.driverIds.some(
                                (dr) =>
                                  dr.userId?.name?.toLowerCase().includes(sq) ||
                                  dr.licenseNumber?.toLowerCase().includes(sq)
                              )) ||
                            t.driverId?.userId?.name?.toLowerCase().includes(sq) ||
                            t.driverId?.licenseNumber?.toLowerCase().includes(sq);

                          if (
                            !t.source?.toLowerCase().includes(sq) &&
                            !t.destination?.toLowerCase().includes(sq) &&
                            !truckMatch &&
                            !driverMatch &&
                            !t.status?.toLowerCase().includes(sq)
                          ) {
                            return false;
                          }
                        }
                        return true;
                      })
                      .map((trip) => {
                        const tripTrucks =
                          trip.truckIds && trip.truckIds.length > 0
                            ? trip.truckIds
                            : trip.truckId
                            ? [trip.truckId]
                            : [];
                        const tripDrivers =
                          trip.driverIds && trip.driverIds.length > 0
                            ? trip.driverIds
                            : trip.driverId
                            ? [trip.driverId]
                            : [];

                        return (
                          <div
                            key={trip._id}
                            onClick={() => setSelectedTrip(trip)}
                            className={`bg-white rounded-xl border ${
                              selectedTrip?._id === trip._id
                                ? "border-2 border-secondary shadow-md"
                                : "border-outline-variant/50 shadow-sm"
                            } p-4 relative cursor-pointer hover:shadow-md transition-all`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                  trip.status === "ON_TRIP"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : trip.status === "DRIVER_ENDED"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : trip.status === "COMPLETED"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-surface-container-high text-on-surface border-outline-variant"
                                }`}
                              >
                                {trip.status === "ON_TRIP"
                                  ? "On Trip"
                                  : trip.status === "DRIVER_ENDED"
                                  ? "End Requested"
                                  : trip.status}
                              </span>
                              <span className="text-[11px] font-medium text-on-surface-variant">
                                {new Date(trip.startDate).toLocaleDateString("en-GB")}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                              <div className="flex-1">
                                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                                  Source
                                </p>
                                <p
                                  className="text-[14px] font-bold text-on-surface truncate"
                                  title={trip.source}
                                >
                                  {trip.source}
                                </p>
                              </div>
                              <span className="material-symbols-outlined text-outline-variant">
                                arrow_right_alt
                              </span>
                              <div className="flex-1 text-right">
                                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                                  Destination
                                </p>
                                <p
                                  className="text-[14px] font-bold text-on-surface truncate"
                                  title={trip.destination}
                                >
                                  {trip.destination}
                                </p>
                              </div>
                            </div>

                            <div className="bg-surface-container-low rounded-lg p-3 grid grid-cols-2 gap-2 text-[12px]">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
                                  local_shipping
                                </span>
                                <span className="font-mono font-bold truncate">
                                  {tripTrucks.length > 1
                                    ? `${tripTrucks.length} Trucks (${
                                        tripTrucks[0]?.registrationNumber || "..."
                                      } +${tripTrucks.length - 1})`
                                    : tripTrucks[0]?.registrationNumber || "N/A"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
                                  person
                                </span>
                                <span className="font-medium truncate">
                                  {tripDrivers.length > 1
                                    ? `${tripDrivers.length} Drivers (${
                                        tripDrivers[0]?.userId?.name || "Unknown"
                                      } +${tripDrivers.length - 1})`
                                    : tripDrivers[0]?.userId?.name || "Unknown Driver"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {trips.length === 0 && (
                      <div className="col-span-full py-20 text-center flex flex-col items-center justify-center text-on-surface-variant bg-white rounded-xl border border-outline-variant/50">
                        <span className="material-symbols-outlined text-[48px] opacity-20 mb-3">
                          route
                        </span>
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
                          <span className="material-symbols-outlined text-[18px]">
                            receipt_long
                          </span>{" "}
                          Trip Manifesto
                        </h3>
                      </div>

                      <div className="p-6 relative z-10 flex-1 flex flex-col mt-16">
                        <div className="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4">
                          <div>
                            <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-1">
                              Trip ID
                            </p>
                            <p className="font-mono text-[14px] text-on-surface font-bold">
                              {selectedTrip._id}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${
                              selectedTrip.status === "ON_TRIP"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : selectedTrip.status === "DRIVER_ENDED"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : selectedTrip.status === "COMPLETED"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-surface-container-high text-on-surface border-outline-variant"
                            }`}
                          >
                            {selectedTrip.status === "ON_TRIP"
                              ? "On Trip"
                              : selectedTrip.status === "DRIVER_ENDED"
                              ? "End Requested"
                              : selectedTrip.status}
                          </span>
                        </div>

                        <div className="space-y-6 flex-1">
                          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-4 shadow-sm relative overflow-hidden">
                            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-outline-variant/30 z-0"></div>

                            <div className="relative z-10 flex gap-4 mb-4">
                              <div className="w-3 h-3 rounded-full bg-secondary ring-4 ring-white mt-1 shrink-0"></div>
                              <div>
                                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                                  Source
                                </p>
                                <p className="font-bold text-[14px] text-on-surface">
                                  {selectedTrip.source}
                                </p>
                              </div>
                            </div>

                            <div className="relative z-10 flex gap-4">
                              <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-white mt-1 shrink-0"></div>
                              <div>
                                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                                  Destination
                                </p>
                                <p className="font-bold text-[14px] text-on-surface">
                                  {selectedTrip.destination}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Assigned Resources (Multi-truck & Multi-driver) */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-[11px] uppercase text-on-surface-variant tracking-wider">
                                Assigned Trucks & Drivers ({selectedTripTrucks.length})
                              </h4>
                            </div>
                            <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
                              {selectedTripTrucks.map((truck, idx) => {
                                const driver = selectedTripDrivers[idx];
                                const assignment = (selectedTrip.assignments || []).find(
                                  (a) =>
                                    (a.truckId?._id || a.truckId)?.toString() ===
                                    (truck?._id || truck)?.toString()
                                );
                                const legStatus =
                                  assignment?.status ||
                                  (selectedTrip.status === "COMPLETED"
                                    ? "COMPLETED"
                                    : selectedTrip.status === "DRIVER_ENDED"
                                    ? "END_REQUESTED"
                                    : "ON_TRIP");
                                const canAcceptLeg =
                                  legStatus === "END_REQUESTED" &&
                                  !["COMPLETED", "CANCELLED"].includes(selectedTrip.status);

                                return (
                                  <div
                                    key={truck?._id || idx}
                                    className={`p-3 rounded-lg border flex flex-col gap-2 text-[13px] ${
                                      legStatus === "END_REQUESTED"
                                        ? "bg-amber-50/60 border-amber-200"
                                        : legStatus === "COMPLETED"
                                        ? "bg-emerald-50/50 border-emerald-200"
                                        : "bg-surface-container-low border-outline-variant/30"
                                    }`}
                                  >
                                    <div className="flex justify-between items-center gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-on-surface shadow-xs font-mono font-bold text-[11px] shrink-0">
                                          #{idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-mono font-bold text-on-surface truncate">
                                            {truck?.registrationNumber || "N/A"}
                                          </p>
                                          <p className="text-[11px] text-on-surface-variant">
                                            {truck?.capacity ? `Capacity: ${truck.capacity}` : ""}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right min-w-0">
                                        <p className="font-bold text-on-surface truncate">
                                          {driver?.userId?.name ||
                                            driver?.licenseNumber ||
                                            "No Driver"}
                                        </p>
                                        {driver?.licenseNumber && (
                                          <p className="text-[11px] text-on-surface-variant">
                                            Lic: {driver.licenseNumber}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {selectedTripTrucks.length > 1 && (
                                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            legStatus === "END_REQUESTED"
                                              ? "bg-amber-100 text-amber-800 border-amber-200"
                                              : legStatus === "COMPLETED"
                                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                              : "bg-blue-50 text-blue-700 border-blue-200"
                                          }`}
                                        >
                                          {legStatus === "END_REQUESTED"
                                            ? "End Requested"
                                            : legStatus === "COMPLETED"
                                            ? "Completed"
                                            : "On Trip"}
                                        </span>

                                        {canAcceptLeg && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleConfirmTruckEnd(selectedTrip._id, truck._id)
                                            }
                                            className="px-2.5 py-1 rounded-md bg-secondary text-white text-[11px] font-semibold hover:bg-secondary/90 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">
                                              check
                                            </span>
                                            Accept End
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Cargo Details */}
                          <div>
                            <h4 className="font-bold text-[11px] uppercase text-on-surface-variant mb-3 tracking-wider">
                              Cargo Details
                            </h4>
                            <ul className="space-y-3 bg-white p-4 rounded-lg border border-outline-variant/30 shadow-sm">
                              <li className="flex justify-between items-center text-[13px]">
                                <span className="text-on-surface-variant font-medium">Material</span>
                                <span className="text-on-surface font-bold">
                                  {selectedTrip.material}
                                </span>
                              </li>
                              <li className="flex justify-between items-center text-[13px] border-t border-outline-variant/20 pt-3">
                                <span className="text-on-surface-variant font-medium">Quantity</span>
                                <span className="text-on-surface font-bold">
                                  {selectedTrip.quantity}
                                </span>
                              </li>
                              <li className="flex justify-between items-center text-[13px] border-t border-outline-variant/20 pt-3">
                                <span className="text-on-surface-variant font-medium">Start Date</span>
                                <span className="text-on-surface font-bold">
                                  {new Date(selectedTrip.startDate).toLocaleDateString()}
                                </span>
                              </li>
                              <li className="flex justify-between items-center text-[13px] border-t border-outline-variant/20 pt-3">
                                <span className="text-on-surface-variant font-medium">Trip Rate</span>
                                <span className="text-emerald-600 font-bold font-mono">
                                  ₹{selectedTrip.expectedRevenue?.toLocaleString()}
                                </span>
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-outline-variant/30 flex flex-col gap-3">
                          {selectedTrip.status === "DRIVER_ENDED" && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-[12px] font-medium flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px] text-amber-600">
                                notifications_active
                              </span>
                              All drivers requested trip completion. Confirm to finalize and generate report.
                            </div>
                          )}
                          {selectedTrip.status === "ON_TRIP" &&
                            (selectedTrip.assignments || []).some((a) => a.status === "END_REQUESTED") && (
                              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-[12px] font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px] text-amber-600">
                                  pending_actions
                                </span>
                                {(selectedTrip.assignments || []).filter((a) => a.status !== "ON_TRIP").length} of{" "}
                                {selectedTrip.assignments.length} trucks requested/completed end. Trip continues until remaining truck(s) finish.
                              </div>
                            )}
                          <div className="flex gap-3 w-full">
                            {["ON_TRIP", "ACTIVE", "DRIVER_ENDED"].includes(selectedTrip.status) && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(selectedTrip._id, "COMPLETED")}
                                  className="flex-1 bg-secondary text-white font-medium text-[13px] py-2.5 rounded-lg shadow-sm hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    done_all
                                  </span>{" "}
                                  {selectedTrip.status === "DRIVER_ENDED"
                                    ? "Confirm & Complete"
                                    : "Complete Trip"}
                                </button>
                                <button
                                  onClick={() => handleStatusChange(selectedTrip._id, "CANCELLED")}
                                  className="flex-1 bg-surface-container-low text-red-600 font-medium text-[13px] py-2.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    cancel
                                  </span>{" "}
                                  Cancel Trip
                                </button>
                              </>
                            )}
                            {selectedTrip.status === "COMPLETED" && (
                              <div className="flex-1 bg-emerald-50 text-emerald-700 font-bold text-[13px] py-2.5 rounded-lg border border-emerald-200 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">
                                  check_circle
                                </span>{" "}
                                Trip Completed
                              </div>
                            )}
                          </div>

                          {/* Delete Trip & Edit Trip Buttons */}
                          <div className="flex gap-3 mt-2 w-full">
                            <button
                              onClick={() => handleDeleteTrip(selectedTrip._id)}
                              className="flex-1 bg-red-50 text-red-600 font-medium text-[13px] py-2 rounded-lg border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>{" "}
                              Delete Trip
                            </button>
                            {!["COMPLETED", "CANCELLED"].includes(selectedTrip.status) && (
                              <button
                                onClick={() => handleOpenEditModal(selectedTrip)}
                                className="flex-1 bg-surface-container-low text-on-surface font-medium text-[13px] py-2 rounded-lg border border-outline-variant/50 hover:bg-surface-variant transition-colors flex items-center justify-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>{" "}
                                Edit Trip
                              </button>
                            )}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">route</span>
                <h3 className="text-[18px] font-bold text-on-surface">Dispatch New Trip</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors"
              >
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
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">
                      Route Details
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Source <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          name="source"
                          value={newTripForm.source}
                          onChange={handleFormChange}
                          placeholder="e.g. Mumbai Port"
                          className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${
                            formErrors.source
                              ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                              : "border-outline-variant/50 focus:border-secondary"
                          }`}
                        />
                        {formErrors.source && (
                          <p className="text-red-500 text-[11px] mt-1 font-medium">
                            {formErrors.source}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Destination <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          name="destination"
                          value={newTripForm.destination}
                          onChange={handleFormChange}
                          placeholder="e.g. Pune Warehouse"
                          className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${
                            formErrors.destination
                              ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                              : "border-outline-variant/50 focus:border-secondary"
                          }`}
                        />
                        {formErrors.destination && (
                          <p className="text-red-500 text-[11px] mt-1 font-medium">
                            {formErrors.destination}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Truck & Multi-Driver Assignment Section */}
                  <FleetAssignmentSection
                    truckIds={newTripForm.truckIds}
                    driverIds={newTripForm.driverIds}
                    allTrucks={allTrucks}
                    allDrivers={allDrivers}
                    selectableTrucks={availableTrucks.filter(
                      (t) => !newTripForm.truckIds.includes(t._id)
                    )}
                    getSelectableDriversForRow={(idx) => {
                      const otherChosenDriverIds = newTripForm.driverIds.filter(
                        (dId, dIdx) => dIdx !== idx && Boolean(dId)
                      );
                      return (availableDrivers || []).filter(
                        (d) => !otherChosenDriverIds.includes(d._id)
                      );
                    }}
                    totalCapacity={newTripTotalCapacity}
                    onAddTruck={handleAddTruck}
                    onRemoveTruck={handleRemoveTruck}
                    onRemoveAll={() => {
                      setNewTripForm((prev) => ({ ...prev, truckIds: [], driverIds: [] }));
                      setFormErrors((prev) => ({
                        ...prev,
                        truckIds: "",
                        driverIds: "",
                        pairing: "",
                      }));
                    }}
                    onAssignDriver={handleAssignDriverToTruck}
                    errors={formErrors}
                  />

                  {/* Cargo Section */}
                  <div className="space-y-4 col-span-full bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">
                      Cargo & Financials
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Material <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          name="material"
                          value={newTripForm.material}
                          onChange={handleFormChange}
                          placeholder="e.g. Steel Coils"
                          className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${
                            formErrors.material
                              ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                              : "border-outline-variant/50 focus:border-secondary"
                          }`}
                        />
                        {formErrors.material && (
                          <p className="text-red-500 text-[11px] mt-1 font-medium">
                            {formErrors.material}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant flex justify-between items-center">
                          <span>
                            Quantity <span className="text-red-500">*</span>
                          </span>
                          {newTripTotalCapacity > 0 && (
                            <span className="text-secondary font-medium">
                              Max capacity: {newTripTotalCapacity} Tons
                            </span>
                          )}
                        </label>
                        <input
                          required
                          type="text"
                          name="quantity"
                          value={newTripForm.quantity}
                          onChange={handleFormChange}
                          placeholder="e.g. 20"
                          className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${
                            formErrors.quantity || newTripCapacityError
                              ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                              : "border-outline-variant/50 focus:border-secondary"
                          }`}
                        />
                        {formErrors.quantity && (
                          <p className="text-red-500 text-[11px] mt-1 font-medium">
                            {formErrors.quantity}
                          </p>
                        )}
                        {newTripCapacityError && !formErrors.quantity && (
                          <p className="text-red-500 text-[11px] mt-1 font-medium">
                            {newTripCapacityError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Trip Rate (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="number"
                          name="expectedRevenue"
                          value={newTripForm.expectedRevenue}
                          onChange={handleFormChange}
                          placeholder="e.g. 15000"
                          className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] font-mono border ${
                            formErrors.expectedRevenue
                              ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                              : "border-outline-variant/50 focus:border-secondary"
                          }`}
                        />
                        {formErrors.expectedRevenue && (
                          <p className="text-red-500 text-[11px] mt-1 font-medium">
                            {formErrors.expectedRevenue}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="date"
                          name="startDate"
                          value={newTripForm.startDate}
                          onChange={handleFormChange}
                          className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${
                            formErrors.startDate
                              ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                              : "border-outline-variant/50 focus:border-secondary"
                          }`}
                        />
                        {formErrors.startDate && (
                          <p className="text-red-500 text-[11px] mt-1 font-medium">
                            {formErrors.startDate}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3 pb-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-white border border-outline-variant/50 rounded-lg font-medium text-[14px] text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !!newTripCapacityError ||
                      newTripForm.truckIds.length === 0 ||
                      newTripForm.driverIds.filter(Boolean).length !== newTripForm.truckIds.length
                    }
                    className={`flex-1 px-4 py-3 bg-[#0a0a0a] text-white rounded-lg font-medium text-[14px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm ${
                      isSubmitting ||
                      newTripCapacityError ||
                      newTripForm.truckIds.length === 0 ||
                      newTripForm.driverIds.filter(Boolean).length !== newTripForm.truckIds.length
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="material-symbols-outlined animate-spin text-[20px]">
                        progress_activity
                      </span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">route</span>
                        Dispatch Trip ({newTripForm.truckIds.length} {newTripForm.truckIds.length === 1 ? "Truck" : "Trucks"})
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">edit</span>
                <h3 className="text-[18px] font-bold text-on-surface">Edit Trip</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low p-1.5 rounded-full transition-colors"
              >
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
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">
                      Route Details
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Source <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          name="source"
                          value={editTripForm.source}
                          onChange={handleEditFormChange}
                          className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Destination <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          name="destination"
                          value={editTripForm.destination}
                          onChange={handleEditFormChange}
                          className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Multi-Truck & Multi-Driver Assignment in Edit */}
                  <FleetAssignmentSection
                    truckIds={editTripForm.truckIds}
                    driverIds={editTripForm.driverIds}
                    allTrucks={allTrucks}
                    allDrivers={allDrivers}
                    selectableTrucks={allTrucks.filter(
                      (t) =>
                        (!busyTruckIdSet.has(t._id.toString()) ||
                          editTripForm.truckIds.includes(t._id)) &&
                        (t.status === "AVAILABLE" ||
                          t.status === "ACTIVE" ||
                          editTripForm.truckIds.includes(t._id)) &&
                        !editTripForm.truckIds.includes(t._id)
                    )}
                    getSelectableDriversForRow={(idx) => {
                      const otherChosenDriverIds = editTripForm.driverIds.filter(
                        (dId, dIdx) => dIdx !== idx && Boolean(dId)
                      );
                      return (allDrivers || []).filter(
                        (d) =>
                          (!busyDriverIdSet.has(d._id.toString()) ||
                            editTripForm.driverIds.includes(d._id)) &&
                          (d.status === "AVAILABLE" ||
                            d.status === "ACTIVE" ||
                            editTripForm.driverIds.includes(d._id)) &&
                          !otherChosenDriverIds.includes(d._id)
                      );
                    }}
                    totalCapacity={editTripTotalCapacity}
                    onAddTruck={handleAddEditTruck}
                    onRemoveTruck={handleRemoveEditTruck}
                    onRemoveAll={() =>
                      setEditTripForm((prev) => ({ ...prev, truckIds: [], driverIds: [] }))
                    }
                    onAssignDriver={handleAssignEditDriverToTruck}
                  />

                  <div className="space-y-4 col-span-full bg-white p-4 rounded-xl border border-outline-variant/40 shadow-sm">
                    <h4 className="text-[13px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 border-b border-outline-variant/20 pb-2">
                      Cargo & Timeline
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Material <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          name="material"
                          value={editTripForm.material}
                          onChange={handleEditFormChange}
                          className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant flex justify-between items-center">
                          <span>
                            Quantity <span className="text-red-500">*</span>
                          </span>
                          {editTripTotalCapacity > 0 && (
                            <span className="text-secondary font-medium">
                              Max capacity: {editTripTotalCapacity} Tons
                            </span>
                          )}
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          name="quantity"
                          value={editTripForm.quantity}
                          onChange={handleEditFormChange}
                          className={`w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border ${
                            editTripCapacityError
                              ? "border-red-500 focus:border-red-500 ring-1 ring-red-500/20"
                              : "border-outline-variant/50 focus:border-secondary"
                          }`}
                        />
                        {editTripCapacityError && (
                          <p className="text-red-500 text-[11px] mt-1 font-medium">
                            {editTripCapacityError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Trip Rate (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="number"
                          name="expectedRevenue"
                          value={editTripForm.expectedRevenue}
                          onChange={handleEditFormChange}
                          className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-on-surface-variant">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="date"
                          name="startDate"
                          value={editTripForm.startDate}
                          onChange={handleEditFormChange}
                          className="w-full h-10 px-3 bg-surface-container-lowest rounded-lg outline-none transition-all text-[13px] border border-outline-variant/50 focus:border-secondary"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-white border border-outline-variant/50 rounded-lg font-medium text-[13px] text-on-surface hover:bg-surface-container-low transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isEditSubmitting ||
                      !!editTripCapacityError ||
                      editTripForm.truckIds.length === 0 ||
                      editTripForm.driverIds.filter(Boolean).length !== editTripForm.truckIds.length
                    }
                    className={`flex-1 px-4 py-2 bg-[#0a0a0a] text-white rounded-lg font-medium text-[13px] hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm ${
                      isEditSubmitting ||
                      editTripCapacityError ||
                      editTripForm.truckIds.length === 0 ||
                      editTripForm.driverIds.filter(Boolean).length !== editTripForm.truckIds.length
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isEditSubmitting ? (
                      <span className="material-symbols-outlined animate-spin text-[18px]">
                        progress_activity
                      </span>
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
