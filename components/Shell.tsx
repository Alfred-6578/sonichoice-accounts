"use client";

/**
 * Sidebar, mobile drawer and a slim header for the accounts app — and the
 * gate in front of all of it: nobody sees a page without signing in.
 *
 * The gate is client-side because the accounts live in the browser for now.
 * When there is a backend, this becomes a server check in a proxy or layout
 * and the redirect below goes away.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import AccountingSidebar from "@/components/Sidebar";
import { Avatar, syne } from "@/components/shared";
import { consumeDeliberateSignOut, useCurrentUser } from "@/lib/directory";
import Link from "next/link";

export default function AccountingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const user = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user !== null) return;
    const here = pathname + window.location.search;
    const remember = !consumeDeliberateSignOut() && here !== "/";
    router.replace(remember ? `/login?next=${encodeURIComponent(here)}` : "/login");
  }, [user, pathname, router]);

  /* Still reading the browser copy, or on the way to /login. A blank surface
     rather than a spinner: it is gone in a frame. */
  if (!user) return <div className="min-h-screen bg-surface" />;

  return (
    <div className="min-h-screen bg-surface">
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-ink/50 backdrop-blur-[2px] z-40 lg:hidden"
        />
      )}

      <AccountingSidebar isOpen={isOpen} setIsOpen={setIsOpen} user={user} />

      {/* MOBILE HEADER */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-[60px] z-30 bg-surface-raised border-b border-border flex items-center gap-3 px-4">
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="w-11 h-11 rounded-lg border border-border flex items-center justify-center text-ink-muted"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
        <div className={`${syne.className} flex-1 text-sm font-bold text-ink truncate`}>
          Sonichoice Accounts
        </div>
        <Link href="/profile" aria-label="Your profile" className="shrink-0">
          <Avatar name={user.name} size="sm" />
        </Link>
      </header>

      <main className="lg:ml-[250px] px-4 tny:px-6 pt-[76px] lg:pt-10 pb-14">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
