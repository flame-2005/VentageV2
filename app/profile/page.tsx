"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@/context/userContext";
import { api } from "@/convex/_generated/api";
import { BarChart3, Calendar, Mail, TrendingUp, UserRound } from "lucide-react";

type RangeKey = "7d" | "30d" | "90d" | "all";

const RANGE_TO_MS: Record<Exclude<RangeKey, "all">, number> = {
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [range, setRange] = useState<RangeKey>("30d");
  const [nowTs] = useState(() => Date.now());

  const fromTs = useMemo(() => {
    if (range === "all") return undefined;
    return nowTs - RANGE_TO_MS[range];
  }, [range, nowTs]);

  const analytics = useQuery(
    api.functions.users.getUserTopAuthors,
    user ? { userId: user._id, fromTs, limit: 6 } : "skip"
  ) as
    | {
        totalClicks: number;
        uniqueAuthors: number;
        topAuthor: { authorName: string; clicks: number; percentage: number } | null;
        topAuthors: { authorName: string; clicks: number; percentage: number }[];
      }
    | undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen px-4 sm:px-6 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-700 font-semibold">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const displayName = user.fullName || user.username || "User";
  const topAuthors = analytics?.topAuthors ?? [];
  const maxClicks = topAuthors[0]?.clicks ?? 1;

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center overflow-hidden flex-shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{displayName}</h1>
              <p className="text-sm text-slate-600 flex items-center gap-2 mt-1 truncate">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Clicks</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{analytics?.totalClicks ?? 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Unique Authors</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">{analytics?.uniqueAuthors ?? 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Top Author</p>
            <p className="text-base font-semibold text-slate-900 mt-2 truncate">
              {analytics?.topAuthor?.authorName ?? "No data yet"}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Analytics Dashboard
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Authors you read most, based on article/video clicks.
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
              {(["7d", "30d", "90d", "all"] as RangeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setRange(key)}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                    range === key ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {topAuthors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
              No author analytics yet. Start clicking posts and videos to build your dashboard.
            </div>
          ) : (
            <div className="space-y-3">
              {topAuthors.map((item, idx) => {
                const width = Math.max(8, (item.clicks / maxClicks) * 100);
                return (
                  <div key={`${item.authorName}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.authorName}</p>
                      <p className="text-xs text-slate-600 whitespace-nowrap">
                        {item.clicks} clicks ({item.percentage}%)
                      </p>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Based on click events
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Range: {range.toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1">
              <UserRound className="w-3.5 h-3.5" />
              User: {displayName}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
