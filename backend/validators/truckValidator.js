const { z } = require("zod");

const createTruckSchema = z.object({
  registrationNumber: z.string().min(1, "Registration number is required"),
  truckType: z.string().optional(),
  model: z.string().optional(),
  capacity: z.string().optional(),
  purchaseDate: z.string().optional(), // Or Date
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
  currentDriverId: z.string().nullable().optional(),
  imageUrl: z.string().optional(),
});

const updateTruckSchema = createTruckSchema.partial();

const updateTruckStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
});

module.exports = { createTruckSchema, updateTruckSchema, updateTruckStatusSchema };
