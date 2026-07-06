// @ts-nocheck
// @ts-nocheck
import { prisma } from "@/lib/db/prisma";

const metricsCache = new Map<string, { count: number; lastReset: number }>();
const METRICS_CACHE_TTL = 60_000;

export function incrementRequestCount(providerId: string): void {
  const entry = metricsCache.get(providerId) || { count: 0, lastReset: Date.now() };
  if (Date.now() - entry.lastReset > METRICS_CACHE_TTL) {
    metricsCache.set(providerId, { count: 1, lastReset: Date.now() });
  } else {
    entry.count++;
    metricsCache.set(providerId, entry);
  }
}

export function getRequestCount(providerId: string): number {
  return metricsCache.get(providerId)?.count || 0;
}

export async function getDashboardStats() {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalRequests,
    totalTokens,
    activeConversations,
    avgLatency,
    recentRequests,
  ] = await Promise.all([
    prisma.requestLog.count({
      where: { createdAt: { gte: last24h } },
    }),
    prisma.requestLog.aggregate({
      where: { createdAt: { gte: last24h } },
      _sum: {
        tokensIn: true,
        tokensOut: true,
      },
    }),
    prisma.conversation.count({
      where: { isActive: true, updatedAt: { gte: last24h } },
    }),
    prisma.requestLog.aggregate({
      where: { 
        createdAt: { gte: last24h },
        status: "success",
      },
      _avg: {
        latencyMs: true,
      },
    }),
    prisma.requestLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        providerId: true,
        modelAlias: true,
        modelUsed: true,
        status: true,
        tokensIn: true,
        tokensOut: true,
        latencyMs: true,
        createdAt: true,
        streaming: true,
        provider: {
          select: {
            displayName: true,
          },
        },
      },
    }),
  ]);

  return {
    totalRequests,
    totalTokens: (totalTokens._sum.tokensIn || 0) + (totalTokens._sum.tokensOut || 0),
    activeConversations,
    avgLatency: Math.round(avgLatency._avg.latencyMs || 0),
    recentRequests: recentRequests.map((r: typeof recentRequests[number]) => ({
      id: r.id,
      providerName: r.provider?.displayName || r.providerId,
      modelAlias: r.modelAlias,
      modelUsed: r.modelUsed,
      status: r.status,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt,
      streaming: r.streaming,
    })),
  };
}

export function exportToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => String(row[h] ?? "")).join(","));
  return [headers.join(","), ...rows].join("\n");
}
