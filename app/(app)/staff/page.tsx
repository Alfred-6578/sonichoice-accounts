"use client";

import Staff from "@/components/Staff";
import { NoAccess, PageTitle } from "@/components/shared";
import { can, useCurrentUser } from "@/lib/directory";

export default function StaffPage() {
  const user = useCurrentUser();
  if (can(user, "manage-staff")) return <Staff />;
  return (
    <>
      <PageTitle title="Staff" />
      <NoAccess what="staff accounts" />
    </>
  );
}
