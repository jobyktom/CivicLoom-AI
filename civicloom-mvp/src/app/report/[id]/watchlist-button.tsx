"use client";

import { useState } from "react";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Report } from "@/lib/types";

export function WatchlistButton({ report }: { report: Report }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessType: report.businessType,
          locationName: report.locationName,
          geographyType: report.geographyType,
          stateCode: report.stateCode,
          countyCode: report.countyCode,
          placeCode: report.placeCode,
          lastScore: report.opportunityScore,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save watchlist location.");
      setMessage("Saved to watchlist");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save watchlist location.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={save} disabled={loading} className="border-[#bdb5a7] bg-white text-[#18324a] hover:bg-[#f1eee8]">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookmarkPlus className="mr-2 h-4 w-4" />}
        Watch this market
      </Button>
      {message && <p className="mt-2 text-xs text-slate-500">{message}</p>}
    </div>
  );
}
