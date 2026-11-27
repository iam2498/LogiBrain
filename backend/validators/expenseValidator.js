const { z } = require("zod");

const expenseCategories = [
  "Fuel",
  "Toll",
  "Food",
  "Parking",
  "Repair",
  "Loading/Unloading",
  "Insurance/Permit",
  "Other",
];

const createExpenseSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  truckId: z.string().optional(),
  category: z.enum(expenseCategories),
  amount: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Amount must be a positive number"),
  date: z.string(),
  description: z.string().optional(),
});

const updateExpenseSchema = z.object({
  category: z.enum(expenseCategories).optional(),
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, "Amount must be a positive number")
    .optional(),
  date: z
    .string()
    .refine((val) => !isNaN(new Date(val).getTime()), "Invalid date")
    .optional(),
  description: z.string().optional(),
});

module.exports = { createExpenseSchema, updateExpenseSchema };
