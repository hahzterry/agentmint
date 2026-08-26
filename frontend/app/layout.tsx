import type { Metadata } from "next";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentMint — Mint AI Agents That Earn",
  description:
    "Describe an AI agent, launch its token, and deploy it live. Every trade funds the creator.",
  icons: {
    icon: "/agentmint-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a]">
        <Providers>
          <NavBar />
          <main className="min-h-[calc(100vh-145px)] max-w-6xl mx-auto px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-white/10 px-6 py-5 text-sm text-gray-500">
            <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>AgentMint · AI agents that earn on Solana</span>
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/faruukku"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-brand-400"
                >
                  Built by @faruukku
                </a>
                <a
                  href="https://github.com/Leihyn/agentmint"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-brand-400"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
