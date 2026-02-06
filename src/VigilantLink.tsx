import { useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface AnalysisResult {
  classification: "safe" | "warning" | "high_risk";
  riskScore: number;
  detectedPatterns: string[];
  analysis: {
    suspiciousKeywords: number;
    paymentKeywords: number;
    safeIndicators: number;
    hasLinks: boolean;
    hasPhoneNumber: boolean;
  };
}

export function VigilantLink() {
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeMessage = useAction(api.scamDetection.analyzeMessage);
  const saveReport = useMutation(api.scamDetection.saveScamReport);

  const userReports =
    useQuery(api.scamDetection.getUserReports) ?? [];

  const scamStats =
    useQuery(api.scamDetection.getRecentScamStats);

  if (scamStats === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin h-6 w-6 border-b-2 border-blue-500 rounded-full" />
      </div>
    );
  }


  const handleAnalyze = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeMessage({ message: message.trim() });
      setResult(analysis);
      
      // Save the report
      await saveReport({
        message: message.trim(),
        classification: analysis.classification,
        riskScore: analysis.riskScore,
        detectedPatterns: analysis.detectedPatterns,
      });

      // Show appropriate toast
      if (analysis.classification === "high_risk") {
        toast.error("🚨 HIGH RISK DETECTED! This message appears to be a scam.");
      } else if (analysis.classification === "warning") {
        toast.warning("⚠️ Be cautious with this message.");
      } else {
        toast.success("✅ This message appears to be safe.");
      }
    } catch (error) {
      toast.error("Failed to analyze message. Please try again.");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (classification: string) => {
    switch (classification) {
      case "high_risk": return "text-red-600 bg-red-50 border-red-200";
      case "warning": return "text-orange-600 bg-orange-50 border-orange-200";
      case "safe": return "text-green-600 bg-green-50 border-green-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRiskIcon = (classification: string) => {
    switch (classification) {
      case "high_risk": return "🚨";
      case "warning": return "⚠️";
      case "safe": return "✅";
      default: return "❓";
    }
  };

  const sampleMessages = [
    "Congratulations! You have won ₹50,000. Scan this QR code to claim your reward immediately.",
    "Your refund of ₹2,500 has been credited. Please verify your account by clicking this link.",
    "You received ₹500 from John Doe via UPI. Transaction ID: 123456789",
    "Pay ₹1 and get ₹500 cashback instantly! Limited time offer. Scan now!",
  ];

  return (
    <div className="space-y-6">
      {/* Main Analysis Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          🔍 Message Analysis
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your SMS/WhatsApp payment message here:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Example: You have received ₹500 from John via UPI..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !message.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Analyzing...
              </>
            ) : (
              <>
                🛡️ Analyze Message
              </>
            )}
          </button>
        </div>

        {/* Sample Messages */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Try these sample messages:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sampleMessages.map((sample, index) => (
              <button
                key={index}
                onClick={() => setMessage(sample)}
                className="text-left p-3 text-xs bg-gray-50 hover:bg-gray-100 rounded border transition-colors"
              >
                {sample.substring(0, 80)}...
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Result */}
      {result && (
        <div className={`rounded-lg border-2 p-6 ${getRiskColor(result.classification)}`}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{getRiskIcon(result.classification)}</span>
            <div>
              <h3 className="text-xl font-bold capitalize">
                {result.classification.replace('_', ' ')} Message
              </h3>
              <p className="text-sm opacity-80">
                Risk Score: {result.riskScore}/100
              </p>
            </div>
          </div>

          {/* Risk Level Bar */}
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  result.classification === "high_risk" ? "bg-red-500" :
                  result.classification === "warning" ? "bg-orange-500" : "bg-green-500"
                }`}
                style={{ width: `${result.riskScore}%` }}
              ></div>
            </div>
          </div>

          {/* Detected Patterns */}
          {result.detectedPatterns.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">🎯 Detected Scam Patterns:</h4>
              <ul className="space-y-1">
                {result.detectedPatterns.map((pattern, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-current rounded-full"></span>
                    {pattern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Analysis Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Suspicious Keywords:</span>
              <br />
              {result.analysis.suspiciousKeywords}
            </div>
            <div>
              <span className="font-medium">Payment Keywords:</span>
              <br />
              {result.analysis.paymentKeywords}
            </div>
            <div>
              <span className="font-medium">Safe Indicators:</span>
              <br />
              {result.analysis.safeIndicators}
            </div>
            <div>
              <span className="font-medium">Contains Links:</span>
              <br />
              {result.analysis.hasLinks ? "Yes ⚠️" : "No ✅"}
            </div>
            <div>
              <span className="font-medium">Phone Number:</span>
              <br />
              {result.analysis.hasPhoneNumber ? "Yes" : "No"}
            </div>
          </div>

          {/* Safety Advice */}
          <div className="mt-4 p-4 bg-white/50 rounded-lg">
            <h4 className="font-semibold mb-2">💡 Safety Advice:</h4>
            {result.classification === "high_risk" && (
              <p className="text-sm">
                <strong>DO NOT</strong> scan any QR codes, click links, or make payments. This appears to be a scam designed to steal your money. Block the sender and report to cyber crime authorities.
              </p>
            )}
            {result.classification === "warning" && (
              <p className="text-sm">
                Be extremely cautious. Verify the sender's identity through official channels before taking any action. Never share OTPs or banking details.
              </p>
            )}
            {result.classification === "safe" && (
              <p className="text-sm">
                This appears to be a legitimate transaction message. However, always verify large transactions through your banking app.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      {scamStats && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Recent Analysis Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{scamStats.total}</div>
              <div className="text-sm text-gray-600">Total Analyzed</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{scamStats.highRisk}</div>
              <div className="text-sm text-red-600">High Risk</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{scamStats.warning}</div>
              <div className="text-sm text-orange-600">Warnings</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{scamStats.safe}</div>
              <div className="text-sm text-green-600">Safe Messages</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Reports */}
      {userReports.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Your Recent Analysis History</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {userReports.slice(0, 5).map((report) => (
              <div key={report._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">{getRiskIcon(report.classification)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">
                    {report.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(report.reportedAt).toLocaleDateString()} • Risk: {report.riskScore}/100
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
