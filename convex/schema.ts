import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  scamReports: defineTable({
    message: v.string(),
    classification: v.string(), // "safe", "warning", "high_risk"
    riskScore: v.number(),
    detectedPatterns: v.array(v.string()),
    userId: v.optional(v.id("users")),
    reportedAt: v.number(),
  }).index("by_user", ["userId"]),
  
  scamPatterns: defineTable({
    pattern: v.string(),
    category: v.string(),
    riskLevel: v.string(),
    description: v.string(),
  }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
