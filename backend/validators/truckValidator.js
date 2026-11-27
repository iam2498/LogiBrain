const { z } = require("zod");
const { validateTruckRegistrationNumber } = require("../utils/vehicleValidator");

const registrationField = z.string().min(1, "Registration number is required").superRefine((val, ctx) => {
  const result = validateTruckRegistrationNumber(val);
  if (!result.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.message,
    });
  }
});

const optionalRegistrationField = z.string().optional().superRefine((val, ctx) => {
  if (val) {
    const result = validateTruckRegistrationNumber(val);
    if (!result.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.message,
      });
    }
  }
});

const createTruckSchema = z.object({
  registrationNumber: registrationField,
  truckType: z.string().optional(),
  model: z.string().optional(),
  capacity: z.string().optional(),
  purchaseDate: z.string().optional(), // Or Date
  status: z.enum(["AVAILABLE", "ON_TRIP", "MAINTENANCE"]).optional(),
  currentDriverId: z.string().nullable().optional(),
  imageUrl: z.string().optional(),
});

const updateTruckSchema = z.object({
  registrationNumber: optionalRegistrationField,
  truckType: z.string().optional(),
  model: z.string().optional(),
  capacity: z.string().optional(),
  purchaseDate: z.string().optional(),
  status: z.enum(["AVAILABLE", "ON_TRIP", "MAINTENANCE"]).optional(),
  currentDriverId: z.string().nullable().optional(),
  imageUrl: z.string().optional(),
});

const updateTruckStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "ON_TRIP", "MAINTENANCE"]),
});

module.exports = { createTruckSchema, updateTruckSchema, updateTruckStatusSchema };
