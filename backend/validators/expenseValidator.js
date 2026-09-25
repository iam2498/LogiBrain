const { z } = require("zod");

const createExpenseSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  category: z.enum(["Fuel", "Toll", "Food", "Parking", "Repair", "Loading/Unloading", "Insurance/Permit", "Other"]),
  amount: z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, "Amount must be a positive number"),
  date: z.string(),
  description: z.string().optional(),
});

module.exports = { createExpenseSchema };
