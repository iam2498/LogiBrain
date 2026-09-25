const { z } = require("zod");

const createDriverSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  licenseNumber: z.string().min(1, "License number is required"),
  licenseExpiry: z.string().optional(), // Or Date
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  imageUrl: z.string().optional(),
});

const updateDriverSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  imageUrl: z.string().optional(),
});

const updateDriverStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

module.exports = { createDriverSchema, updateDriverSchema, updateDriverStatusSchema };
