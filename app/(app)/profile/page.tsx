"use client";

import Profile from "@/components/Profile";
import { useCurrentUser } from "@/lib/directory";

export default function ProfilePage() {
  const user = useCurrentUser();
  // The shell only renders pages once someone is signed in.
  return user ? <Profile user={user} /> : null;
}
