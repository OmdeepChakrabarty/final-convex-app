import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { VigilantLink } from "./VigilantLink";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">🛡️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Vigilant-Link</h2>
        </div>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          🛡️ UPI Scam Detection System
        </h1>
        <Authenticated>
          <p className="text-lg text-gray-600">
            Welcome back, {loggedInUser?.email ?? "Guardian"}! 
            <br />
            <span className="text-sm">Your digital bodyguard against UPI scams</span>
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-lg text-gray-600 mb-6">
            Protect yourself from UPI scams with AI-powered message analysis
          </p>
        </Unauthenticated>
      </div>

      <Authenticated>
        <VigilantLink />
      </Authenticated>

      <Unauthenticated>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Sign in to start protecting yourself
            </h3>
            <p className="text-gray-600 text-sm">
              Analyze suspicious payment messages instantly
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
