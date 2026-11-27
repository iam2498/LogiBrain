const { z } = require("zod");
const { validateLicenseNumber } = require("../utils/licenseValidator");

const licenseField = z.string().min(1, "License number is required").superRefine((val, ctx) => {
  const result = validateLicenseNumber(val);
  if (!result.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.message,
    });
  }
});

const optionalLicenseField = z.string().optional().superRefine((val, ctx) => {
  if (val) {
    const result = validateLicenseNumber(val);
    if (!result.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.message,
      });
    }
  }
});

const createDriverSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  licenseNumber: licenseField,
  licenseExpiry: z.string().optional(), // Or Date
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  imageUrl: z.string().optional(),
  truckId: z.string().nullable().optional(),
});

const updateDriverSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  licenseNumber: optionalLicenseField,
  licenseExpiry: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  imageUrl: z.string().optional(),
  truckId: z.string().nullable().optional(),
});

const updateDriverStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "ON_TRIP", "ON_LEAVE"]),
});

module.exports = { createDriverSchema, updateDriverSchema, updateDriverStatusSchema };
