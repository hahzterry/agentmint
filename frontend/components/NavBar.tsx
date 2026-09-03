"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function NavBar() {
  return (
    <nav className="border-b border-white/10 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-xl font-bold gradient-text">
          <img src="/agentmint-icon.svg" alt="" className="h-8 w-8 rounded-lg" />
          <span>AIfy</span>
        </a>
        <div className="flex items-center gap-6">
          <a
            href="/agents"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Agents
          </a>
          <a
            href="/create"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Create
          </a>
          <a
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Dashboard
          </a>
          <WalletMultiButton className="!bg-brand-600 hover:!bg-brand-500 !rounded-lg !h-9 !text-sm !font-medium" />
        </div>
      </div>
    </nav>
  );
}
