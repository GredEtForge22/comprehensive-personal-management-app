"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/edt", label: "EDT", icon: "📅" },
  { href: "/cours", label: "Cours", icon: "🎓" },
  { href: "/sport", label: "Sport", icon: "💪" },
  { href: "/sax", label: "Sax", icon: "🎷" },
  { href: "/partitions", label: "Partitions", icon: "🎼" },
  { href: "/nutrition", label: "Nutrition", icon: "🍽️" },
  { href: "/habitudes", label: "Habitudes", icon: "✅" },
  { href: "/outils", label: "Outils", icon: "🎚️" },
  { href: "/reglages", label: "Réglages", icon: "⚙️" },
];

export default function Nav() {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-zinc-800 bg-zinc-950 p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-bold">
          <span className="text-2xl">🎷</span> Ma Vie
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active(l.href) ? "bg-amber-400/15 text-amber-300" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              <span className="w-5 text-center">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-0.5 overflow-x-auto border-t border-zinc-800 bg-zinc-950/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium ${
              active(l.href) ? "text-amber-300" : "text-zinc-500"
            }`}
          >
            <span className="text-lg leading-none">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
