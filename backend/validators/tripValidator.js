const { z } = require("zod");

const createTripSchema = z
  .object({
    truckIds: z.array(z.string().trim().min(1, "Truck ID cannot be empty")).optional(),
    driverIds: z.array(z.string().trim().min(1, "Driver ID cannot be empty")).optional(),
    truckId: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]).optional(),
    driverId: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]).optional(),
    source: z.string().trim().min(3, "Source must be at least 3 characters"),
    destination: z.string().trim().min(3, "Destination must be at least 3 characters"),
    customer: z.string().optional(),
    material: z.string().trim().min(2, "Material must be at least 2 characters"),
    quantity: z.string().refine((val) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    }, "Quantity must be greater than 0"),
    expectedRevenue: z.number().positive("Trip rate must be greater than ₹0"),
    advanceAmount: z.number().min(0).optional(),
    startDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), "Invalid start date"),
    expectedEndDate: z.string().optional(),
  })
  .transform((data) => {
    let finalTruckIds = data.truckIds;
    if ((!finalTruckIds || finalTruckIds.length === 0) && data.truckId) {
      finalTruckIds = Array.isArray(data.truckId) ? data.truckId : [data.truckId];
    }
    let finalDriverIds = data.driverIds;
    if ((!finalDriverIds || finalDriverIds.length === 0) && data.driverId) {
      finalDriverIds = Array.isArray(data.driverId) ? data.driverId : [data.driverId];
    }
    return {
      ...data,
      truckIds: finalTruckIds || [],
      driverIds: finalDriverIds || [],
    };
  })
  .refine((data) => data.truckIds && data.truckIds.length > 0, {
    message: "At least one truck must be assigned",
    path: ["truckIds"],
  })
  .refine((data) => data.driverIds && data.driverIds.length > 0, {
    message: "At least one driver must be assigned",
    path: ["driverIds"],
  });

const updateTripSchema = z
  .object({
    truckIds: z.array(z.string().trim().min(1)).optional(),
    driverIds: z.array(z.string().trim().min(1)).optional(),
    truckId: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]).optional(),
    driverId: z.union([z.string().trim().min(1), z.array(z.string().trim().min(1))]).optional(),
    source: z.string().trim().min(3, "Source must be at least 3 characters").optional(),
    destination: z.string().trim().min(3, "Destination must be at least 3 characters").optional(),
    customer: z.string().optional(),
    material: z.string().trim().min(2, "Material must be at least 2 characters").optional(),
    quantity: z
      .string()
      .refine((val) => {
        const num = Number(val);
        return !isNaN(num) && num > 0;
      }, "Quantity must be greater than 0")
      .optional(),
    expectedRevenue: z.number().positive("Trip rate must be greater than ₹0").optional(),
    actualRevenue: z.number().min(0).optional(),
    advanceAmount: z.number().min(0).optional(),
    startDate: z
      .string()
      .refine((date) => !isNaN(new Date(date).getTime()), "Invalid start date")
      .optional(),
    expectedEndDate: z.string().optional(),
    actualEndDate: z.string().optional(),
    status: z.enum(["ON_TRIP", "COMPLETED", "CANCELLED"]).optional(),
  })
  .transform((data) => {
    let finalTruckIds = data.truckIds;
    if ((!finalTruckIds || finalTruckIds.length === 0) && data.truckId) {
      finalTruckIds = Array.isArray(data.truckId) ? data.truckId : [data.truckId];
    }
    let finalDriverIds = data.driverIds;
    if ((!finalDriverIds || finalDriverIds.length === 0) && data.driverId) {
      finalDriverIds = Array.isArray(data.driverId) ? data.driverId : [data.driverId];
    }
    return {
      ...data,
      ...(finalTruckIds ? { truckIds: finalTruckIds } : {}),
      ...(finalDriverIds ? { driverIds: finalDriverIds } : {}),
    };
  });

module.exports = { createTripSchema, updateTripSchema };
