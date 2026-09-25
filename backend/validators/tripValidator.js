const { z } = require("zod");

const createTripSchema = z.object({
  truckId: z.string().min(1, "Truck ID is required"),
  driverId: z.string().min(1, "Driver ID is required"),
  source: z.string().trim().min(3, "Source must be at least 3 characters"),
  destination: z.string().trim().min(3, "Destination must be at least 3 characters"),
  customer: z.string().optional(),
  material: z.string().trim().min(2, "Material must be at least 2 characters"),
  quantity: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, "Quantity must be greater than 0"),
  expectedRevenue: z.number().positive("Expected revenue must be greater than ₹0"),
  advanceAmount: z.number().min(0).optional(),
  startDate: z.string().refine((date) => !isNaN(new Date(date).getTime()), "Invalid start date"),
  expectedEndDate: z.string().optional(),
});

module.exports = { createTripSchema };
