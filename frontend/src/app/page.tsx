import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image Host Edge | Serverless Image Hosting",
  description: "A lightning-fast, highly scalable, and completely serverless Image Hosting platform built on Cloudflare Workers, Next.js, and Vercel.",
  keywords: ["image host", "cloudflare r2", "serverless", "nextjs", "edge computing"],
  openGraph: {
    title: "Image Host Edge",
    description: "Upload, manage, and deliver your images globally with sub-millisecond latency.",
    url: "https://image-host-xyz.vercel.app",
    siteName: "Image Host Edge",
    images: [
      {
        url: "https://image-host-xyz.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Image Host Edge",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default async function LandingPage() {
  const { userId } = await auth();
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center mt-20">
        <div className="max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            Production Ready Edge API
          </div>
          
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 drop-shadow-sm pb-2">
            Serverless Image Hosting
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-light">
            Upload, manage, and deliver your images globally with sub-millisecond latency. Built entirely on the edge using Cloudflare and Next.js.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            {!userId ? (
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transform hover:-translate-y-1 text-lg">
                  Get Started for Free
                </button>
              </SignInButton>
            ) : (
              <Link 
                href="/dashboard"
                className="px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transform hover:-translate-y-1 text-lg"
              >
                Enter Dashboard &rarr;
              </Link>
            )}
            <Link 
              href="https://github.com/Dsx7/image-host"
              target="_blank"
              className="px-8 py-4 bg-gray-900/50 border border-gray-700 hover:border-gray-500 text-white rounded-full font-bold transition-all transform hover:-translate-y-1 text-lg flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              View on GitHub
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-24 text-left">
            <div className="p-8 bg-gray-900/40 border border-gray-800 rounded-3xl backdrop-blur-sm transition-all hover:border-gray-600 hover:bg-gray-800/60 hover:-translate-y-1">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-100 mb-3">Global Edge</h3>
              <p className="text-gray-400 leading-relaxed">Delivered directly from Cloudflare's global network. Images are cached locally to your users for instant load times anywhere on Earth.</p>
            </div>
            <div className="p-8 bg-gray-900/40 border border-gray-800 rounded-3xl backdrop-blur-sm transition-all hover:border-gray-600 hover:bg-gray-800/60 hover:-translate-y-1">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30">
                <span className="text-2xl">⏳</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-100 mb-3">Auto-Expiry</h3>
              <p className="text-gray-400 leading-relaxed">Set "burn after reading" timers. Cloudflare Cron Triggers will automatically sweep and securely delete your ephemeral images.</p>
            </div>
            <div className="p-8 bg-gray-900/40 border border-gray-800 rounded-3xl backdrop-blur-sm transition-all hover:border-gray-600 hover:bg-gray-800/60 hover:-translate-y-1">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
                <span className="text-2xl">🛠️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-100 mb-3">Developer API</h3>
              <p className="text-gray-400 leading-relaxed">Generate secure API keys to integrate direct image uploads into your own CLI tools, workflows, or external applications.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 bg-black/50 backdrop-blur-md py-8 mt-24">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Image Host Edge. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span className="text-sm font-medium text-gray-400">Powered by:</span>
            <div className="flex items-center gap-4 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all">
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">Cloudflare D1 & R2</span>
              <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">Clerk Auth</span>
              <span className="text-sm font-bold text-white">Next.js</span>
            </div>
          </div>
          <Link 
            href="https://github.com/Dsx7/image-host"
            target="_blank"
            className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            Source Code
          </Link>
        </div>
      </footer>
    </div>
  );
}
