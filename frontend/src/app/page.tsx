import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function LandingPage() {
  const { userId } = await auth();
  
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-gray-950 via-gray-900 to-black h-screen">
      <div className="max-w-4xl space-y-8">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 drop-shadow-sm pb-2">
          Serverless Image Hosting
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Upload, manage, and deliver your images globally with sub-millisecond latency. Built entirely on the edge using Cloudflare and Next.js.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {!userId ? (
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-1">
                Continue with Google
              </button>
            </SignInButton>
          ) : (
            <Link 
              href="/dashboard"
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:-translate-y-1"
            >
              Go to Dashboard &rarr;
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm transition-colors hover:border-gray-700">
            <h3 className="text-xl font-bold text-gray-100 mb-2">⚡ Global Edge</h3>
            <p className="text-sm text-gray-400">Delivered directly from Cloudflare's global network for instant load times anywhere.</p>
          </div>
          <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm transition-colors hover:border-gray-700">
            <h3 className="text-xl font-bold text-gray-100 mb-2">⏳ Auto-Expiry</h3>
            <p className="text-sm text-gray-400">Set "burn after reading" timers to automatically sweep and delete images via Cron.</p>
          </div>
          <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-2xl backdrop-blur-sm transition-colors hover:border-gray-700">
            <h3 className="text-xl font-bold text-gray-100 mb-2">🛠️ Developer API</h3>
            <p className="text-sm text-gray-400">Generate secure API keys to integrate uploads directly into your own applications.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
