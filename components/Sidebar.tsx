"use client";

/**
 * Navigation for the accounts app.
 *
 * Accounts is a separate service from the inventory system it sits beside, so
 * it carries its own nav and a dark rail — nobody switching between the two
 * should have to look twice to know which one they are in. The only tie back
 * is the link at the foot, which is a plain cross-domain link.
 *
 * Links a role cannot use are left out rather than shown and refused.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Avatar, syne } from "@/components/shared";
import { Permission, User, can, roleLabel, signOut } from "@/lib/directory";

/** The inventory system next door; set per environment. */
const INVENTORY_URL =
  process.env.NEXT_PUBLIC_INVENTORY_URL || "https://inventory.sonichoicelogistics.com";

/** A link with `needs` only shows for roles that have that permission. */
const SECTIONS: {
  title: string;
  items: {
    name: string;
    href: string;
    Icon: React.ComponentType<{ className?: string }>;
    needs?: Permission;
  }[];
}[] = [
  {
    title: "Daily",
    items: [
      { name: "Overview", href: "/", Icon: LayoutDashboard },
      { name: "Enter day", href: "/entry", Icon: ClipboardList, needs: "edit-book" },
    ],
  },
  {
    title: "Books",
    items: [
      { name: "Day book", href: "/daybook", Icon: CalendarDays },
      { name: "Monthly sheet", href: "/monthly", Icon: BarChart3 },
      { name: "Reports", href: "/reports", Icon: FileSpreadsheet },
    ],
  },
  {
    title: "Setup",
    items: [
      { name: "Staff", href: "/staff", Icon: Users, needs: "manage-staff" },
      { name: "Branches", href: "/branches", Icon: Building2 },
      { name: "Categories", href: "/settings", Icon: Settings },
    ],
  },
];

export default function AccountingSidebar({
  isOpen,
  setIsOpen,
  user,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: User;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed z-40 w-[250px] h-dvh bg-ink border-r border-black/20 flex flex-col transition-transform ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
    >
      {/* MARK */}
      <div className="flex h-[64px] px-4 items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber flex items-center justify-center font-bold text-ink shrink-0">
            S
          </div>
          <div className="min-w-0">
            <div className={`${syne.className} text-white text-sm font-bold leading-tight truncate`}>
              SONICHOICE
            </div>
            <div className="text-[10px] uppercase tracking-widest text-amber leading-tight">
              Accounts
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden w-11 h-11 -mr-2 flex items-center justify-center"
          aria-label="Close menu"
        >
          <X className="text-white/50 w-4.5" />
        </button>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {SECTIONS.map((section) => {
          const items = section.items.filter((i) => !i.needs || can(user, i.needs));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-3">
              <div className="text-[10px] text-white/35 uppercase tracking-widest px-3 mb-1">
                {section.title}
              </div>
              {items.map(({ name, href, Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg text-sm transition ${
                      active
                        ? "bg-white/10 text-white font-medium"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? "text-amber" : ""}`} />
                    <span className="truncate">{name}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* BACK TO THE OTHER PRODUCT */}
      <div className="px-2 pt-2 border-t border-white/10">
        <a
          href={INVENTORY_URL}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:bg-white/5 hover:text-white transition"
        >
          <ArrowLeftRight className="w-4.5 h-4.5 shrink-0" />
          <span className="truncate">Inventory app</span>
        </a>
      </div>

      {/* WHO IS SIGNED IN */}
      <div className="p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div
          className={`flex items-center gap-2 rounded-lg p-1.5 transition ${
            pathname === "/profile" ? "bg-white/10" : "hover:bg-white/5"
          }`}
        >
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 min-w-0 flex-1 p-0.5"
          >
            <Avatar name={user.name} size="sm" />
            <span className="min-w-0">
              <span className="block text-sm text-white truncate">{user.name}</span>
              <span className="block text-[11px] text-white/45 truncate">
                {roleLabel(user.role)}
              </span>
            </span>
          </Link>
          <button
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
