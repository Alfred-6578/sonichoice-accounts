"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DailyEntry from "@/components/DailyEntry";
import { PageTitle } from "@/components/shared";

/** Links from the overview name the branch and day that need filling in. */
function Entry() {
  const params = useSearchParams();
  return (
    <DailyEntry
      initialBranchId={params.get("branch") || undefined}
      initialDate={params.get("date") || undefined}
    />
  );
}

export default function EntryPage() {
  return (
    <>
      <PageTitle
        title="Enter day"
        subtitle="Write up one branch's day from the book"
      />
      <Suspense fallback={<div className="text-sm text-ink-muted">Loading…</div>}>
        <Entry />
      </Suspense>
    </>
  );
}
