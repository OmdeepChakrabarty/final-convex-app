import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Scam detection patterns for Indian UPI scams
const SCAM_PATTERNS = {
  HIGH_RISK: [
    { pattern: /scan.*to.*receive.*cashback/i, description: "Fake cashback scan trap" },
    { pattern: /refund.*credited.*verify/i, description: "Fake refund verification scam" },
    { pattern: /congratulations.*won.*scan/i, description: "Fake lottery/prize scam" },
    { pattern: /urgent.*verify.*account/i, description: "Account verification phishing" },
    { pattern: /click.*link.*claim.*reward/i, description: "Reward claim phishing" },
    { pattern: /pay.*₹1.*get.*₹\d+/i, description: "Pay small amount scam" },
    { pattern: /kbc.*winner.*scan/i, description: "KBC lottery scam" },
    { pattern: /government.*subsidy.*verify/i, description: "Fake government scheme" },
  ],
  WARNING: [
    { pattern: /cashback.*pay/i, description: "Suspicious cashback offer" },
    { pattern: /reward.*upi/i, description: "UPI reward scheme" },
    { pattern: /verify.*payment/i, description: "Payment verification request" },
    { pattern: /update.*kyc/i, description: "KYC update request" },
    { pattern: /limited.*time.*offer/i, description: "Urgency-based offer" },
    { pattern: /scan.*qr.*code/i, description: "QR code scan request" },
  ],
  SAFE_INDICATORS: [
    { pattern: /received.*₹\d+.*from/i, description: "Payment received confirmation" },
    { pattern: /paid.*₹\d+.*to/i, description: "Payment sent confirmation" },
    { pattern: /transaction.*successful/i, description: "Transaction success message" },
    { pattern: /balance.*₹\d+/i, description: "Balance inquiry response" },
  ]
};

// Keywords that increase suspicion when combined
const SUSPICIOUS_KEYWORDS = [
  'scan', 'verify', 'claim', 'reward', 'cashback', 'refund', 'winner', 
  'congratulations', 'urgent', 'limited time', 'expire', 'activate'
];

const PAYMENT_KEYWORDS = ['pay', 'upi', 'paytm', 'gpay', 'phonepe', '₹', 'rupees'];

export const analyzeMessage = action({
  args: { 
    message: v.string() 
  },
  handler: async (ctx, args) => {
    const message = args.message.toLowerCase();
    let riskScore = 0;
    let detectedPatterns: string[] = [];
    let classification = "safe";

    // Check for high-risk patterns
    for (const { pattern, description } of SCAM_PATTERNS.HIGH_RISK) {
      if (pattern.test(args.message)) {
        riskScore += 80;
        detectedPatterns.push(description);
        classification = "high_risk";
      }
    }

    // Check for warning patterns
    for (const { pattern, description } of SCAM_PATTERNS.WARNING) {
      if (pattern.test(args.message)) {
        riskScore += 40;
        detectedPatterns.push(description);
        if (classification === "safe") classification = "warning";
      }
    }

    // Check for safe indicators
    let safeIndicators = 0;
    for (const { pattern } of SCAM_PATTERNS.SAFE_INDICATORS) {
      if (pattern.test(args.message)) {
        safeIndicators++;
        riskScore -= 20;
      }
    }

    // Keyword combination analysis
    const suspiciousCount = SUSPICIOUS_KEYWORDS.filter(keyword => 
      message.includes(keyword)
    ).length;
    
    const paymentCount = PAYMENT_KEYWORDS.filter(keyword => 
      message.includes(keyword)
    ).length;

    // If suspicious keywords appear with payment keywords, increase risk
    if (suspiciousCount >= 2 && paymentCount >= 1) {
      riskScore += 30;
      detectedPatterns.push("Multiple suspicious keywords with payment context");
      if (classification === "safe") classification = "warning";
    }

    // URL/Link detection
    if (/https?:\/\/|bit\.ly|tinyurl/i.test(args.message)) {
      riskScore += 25;
      detectedPatterns.push("Contains external links");
      if (classification === "safe") classification = "warning";
    }

    // Phone number detection in suspicious context
    if (/\b\d{10}\b/.test(args.message) && suspiciousCount > 0) {
      riskScore += 15;
      detectedPatterns.push("Phone number in suspicious context");
    }

    // Final classification based on risk score
    if (riskScore >= 70) {
      classification = "high_risk";
    } else if (riskScore >= 30) {
      classification = "warning";
    } else if (safeIndicators > 0 || riskScore < 0) {
      classification = "safe";
      riskScore = Math.max(0, riskScore);
    }

    // Cap risk score at 100
    riskScore = Math.min(100, Math.max(0, riskScore));

    return {
      classification,
      riskScore,
      detectedPatterns,
      analysis: {
        suspiciousKeywords: suspiciousCount,
        paymentKeywords: paymentCount,
        safeIndicators,
        hasLinks: /https?:\/\/|bit\.ly|tinyurl/i.test(args.message),
        hasPhoneNumber: /\b\d{10}\b/.test(args.message)
      }
    };
  },
});

export const saveScamReport = mutation({
  args: {
    message: v.string(),
    classification: v.string(),
    riskScore: v.number(),
    detectedPatterns: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    return await ctx.db.insert("scamReports", {
      message: args.message,
      classification: args.classification,
      riskScore: args.riskScore,
      detectedPatterns: args.detectedPatterns,
      userId: userId || undefined,
      reportedAt: Date.now(),
    });
  },
});

export const getUserReports = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    return await ctx.db
      .query("scamReports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
  },
});

export const getRecentScamStats = query({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db.query("scamReports").order("desc").take(100);
    
    const stats = {
      total: reports.length,
      highRisk: reports.filter(r => r.classification === "high_risk").length,
      warning: reports.filter(r => r.classification === "warning").length,
      safe: reports.filter(r => r.classification === "safe").length,
    };
    
    return stats;
  },
});
