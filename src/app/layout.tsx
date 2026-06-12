import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BasicLLM — Free AI Gateway for Developers",
  description:
    "Drop-in OpenAI-compatible gateway with 20+ free LLM providers, smart routing, auto-failover, and session stickiness. Built for coding.",
  keywords: ["AI", "Gateway", "OpenAI", "API", "LLM", "Routing", "Failover", "Free", "Coding"],
  authors: [{ name: "BasicLLM" }],
  openGraph: {
    title: "BasicLLM — Free AI Gateway for Developers",
    description:
      "Drop-in OpenAI-compatible gateway with 20+ free LLM providers, smart routing, auto-failover, and session stickiness. Built for coding.",
    type: "website",
    siteName: "BasicLLM",
  },
  twitter: {
    card: "summary_large_image",
    title: "BasicLLM — Free AI Gateway for Developers",
    description:
      "Drop-in OpenAI-compatible gateway with 20+ free LLM providers, smart routing, auto-failover, and session stickiness. Built for coding.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-[#0a0a0f] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
