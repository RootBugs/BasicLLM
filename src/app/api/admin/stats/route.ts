// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyAuth } from "@/lib/auth/session";
import logger from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
  if (!fullUser || (fullUser.role !== "admin" && fullUser.role !== "owner")) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  try {
    // Get user's API keys
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { requestLogs: true } },
      },
    });

    const totalKeys = keys.length;
    const activeKeys = keys.filter((k: { isActive: boolean }) => k.isActive).length;

    // Get request stats for this user's keys (last 30 days)
    const keyIds = keys.map((k: { id: string }) => k.id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const whereClause = {
      apiKeyId: { in: keyIds },
      createdAt: { gte: thirtyDaysAgo },
    };

    // Aggregate stats across ALL matching rows (not limited to 100)
    const [aggregated, successCount, recentLogs] = await Promise.all([
      prisma.requestLog.aggregate({
        where: whereClause,
        _count: { _all: true },
        _sum: { tokensIn: true, tokensOut: true, latencyMs: true },
        _avg: { latencyMs: true },
      }),
      prisma.requestLog.count({
        where: { ...whereClause, status: "success" },
      }),
      prisma.requestLog.findMany({
        where: whereClause,
        select: {
          status: true,
          tokensIn: true,
          tokensOut: true,
          latencyMs: true,
          createdAt: true,
          provider: true,
          model: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const totalRequests = aggregated._count._all;
    const successfulRequests = successCount;
    const totalTokens = (aggregated._sum.tokensIn ?? 0) + (aggregated._sum.tokensOut ?? 0);
    const avgLatency = Math.round(aggregated._avg.latencyMs ?? 0);

    // Provider health
    const providerHealth = await prisma.providerHealth.findMany({
      include: {
        provider: { select: { displayName: true, tier: true } },
      },
    });

    return NextResponse.json({
      stats: {
        totalRequests,
        successfulRequests,
        failedRequests: totalRequests - successfulRequests,
        totalTokens,
        avgLatency,
        totalKeys,
        activeKeys,
        successRate: totalRequests > 0
          ? Math.round((successfulRequests / totalRequests) * 100)
          : 0,
      },
      recentRequests: recentLogs.slice(0, 20).map((r: { status: string; tokensIn: number; tokensOut: number; latencyMs: number; createdAt: Date; provider: string; model: string }) => ({
        status: r.status,
        tokens: r.tokensIn + r.tokensOut,
        latencyMs: r.latencyMs,
        provider: r.provider,
        model: r.model,
        createdAt: r.createdAt,
      })),
      providerHealth: providerHealth.map((h: { providerId: string; provider: { displayName: string; tier: number }; status: string; latencyMs: number; circuitState: string; consecutiveFailures: number }) => ({
        id: h.providerId,
        name: h.provider.displayName,
        tier: h.provider.tier,
        status: h.status,
        latencyMs: h.latencyMs,
        circuitState: h.circuitState,
        consecutiveFailures: h.consecutiveFailures,
      })),
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, "Failed to fetch stats");
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
