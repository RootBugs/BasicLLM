"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DashboardStats {
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTokens: number;
    avgLatency: number;
    totalKeys: number;
    activeKeys: number;
    successRate: number;
  };
  providerHealth: Array<{
    id: string;
    name: string;
    tier: string;
    status: string;
    latencyMs: number;
    circuitState: string;
    consecutiveFailures: number;
  }>;
  recentRequests: Array<{
    status: string;
    tokens: number;
    latencyMs: number;
    provider: string;
    model: string;
    createdAt: string;
  }>;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  totalRequests: number;
  totalTokens: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "keys" | "providers">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, statsRes, keysRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/admin/stats"),
          fetch("/api/admin/keys"),
        ]);

        if (!meRes.ok) {
          router.push("/login");
          return;
        }

        const meData = await meRes.json();
        setUser(meData.user);

        if (statsRes.ok) setStats(await statsRes.json());
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          setKeys(keysData.keys || []);
        }

        // Check if we just registered and have a new API key to show
        const savedKey = sessionStorage.getItem("newApiKey");
        if (savedKey) {
          setNewApiKey(savedKey);
          sessionStorage.removeItem("newApiKey");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function createKey() {
    if (!newKeyName.trim()) return;
    const res = await fetch("/api/admin/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewApiKey(data.key);
      setNewKeyName("");
      // Refresh keys
      const keysRes = await fetch("/api/admin/keys");
      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setKeys(keysData.keys || []);
      }
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    await fetch(`/api/admin/keys?id=${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-sm text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold">
                Kw
              </div>
              <span className="font-semibold">Kwen Gateway</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user?.email}</span>
            <button
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-1">
          {(["overview", "keys", "providers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab === "overview" ? "Overview" : tab === "keys" ? "API Keys" : "Providers"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Requests", value: stats.stats.totalRequests.toLocaleString() },
                { label: "Success Rate", value: `${stats.stats.successRate}%` },
                { label: "Total Tokens", value: stats.stats.totalTokens.toLocaleString() },
                { label: "Avg Latency", value: `${stats.stats.avgLatency}ms` },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-5"
                >
                  <div className="text-sm text-zinc-500">{s.label}</div>
                  <div className="mt-1 text-2xl font-bold">{s.value}</div>
                </div>
              ))}
            </div>

            {/* API Keys Summary */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="mb-4 font-semibold">Your API Keys</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {keys.slice(0, 6).map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium">{key.name}</div>
                      <div className="text-xs text-zinc-500">
                        {key.prefix}... • {key.totalRequests} requests
                      </div>
                    </div>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        key.isActive ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Requests */}
            {stats.recentRequests.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
                <h3 className="mb-4 font-semibold">Recent Requests</h3>
                <div className="space-y-2">
                  {stats.recentRequests.slice(0, 10).map((req, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            req.status === "success" ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        />
                        <span className="text-zinc-300">{req.model}</span>
                        <span className="text-zinc-500">via {req.provider}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>{req.tokens} tokens</span>
                        <span>{req.latencyMs}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === "keys" && (
          <div className="space-y-6">
            {/* New API Key Alert */}
            {newApiKey && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                <h3 className="mb-2 font-semibold text-emerald-400">
                  Your API Key (copy it now — it won&apos;t be shown again)
                </h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-black/30 px-4 py-2 text-sm break-all">
                    {newApiKey}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(newApiKey)}
                    className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition hover:bg-emerald-500"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Create Key */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="mb-4 font-semibold">Create New API Key</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g., Production)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-indigo-500"
                />
                <button
                  onClick={createKey}
                  disabled={!newKeyName.trim()}
                  className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>

            {/* Keys List */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="mb-4 font-semibold">All API Keys</h3>
              <div className="space-y-3">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          key.isActive ? "bg-emerald-400" : "bg-red-400"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium">{key.name}</div>
                        <div className="text-xs text-zinc-500">
                          {key.prefix}... • {key.totalRequests} requests •{" "}
                          {key.totalTokens.toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                    {key.isActive && (
                      <button
                        onClick={() => revokeKey(key.id)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-red-400 transition hover:border-red-500/30 hover:bg-red-500/10"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
                {keys.length === 0 && (
                  <p className="text-sm text-zinc-500">No API keys yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Providers Tab */}
        {activeTab === "providers" && stats && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="mb-4 font-semibold">Provider Health</h3>
              <div className="space-y-3">
                {stats.providerHealth.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          p.status === "healthy"
                            ? "bg-emerald-400"
                            : p.status === "degraded"
                            ? "bg-yellow-400"
                            : "bg-red-400"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-zinc-500">
                          {p.tier} • {p.circuitState} circuit
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <div>{p.latencyMs}ms</div>
                      {p.consecutiveFailures > 0 && (
                        <div className="text-red-400">
                          {p.consecutiveFailures} failures
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {stats.providerHealth.length === 0 && (
                  <p className="text-sm text-zinc-500">No provider health data yet.</p>
                )}
              </div>
            </div>

            {/* Quick Start */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="mb-4 font-semibold">Quick Start</h3>
              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111118]">
                <pre className="overflow-x-auto p-4 text-sm text-zinc-300">
                  <code>{`curl http://localhost:3000/api/v1/chat/completions \\
  -H "Authorization: Bearer ${keys[0]?.prefix || "sk-team-xxxxx"}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "coder-fast",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
