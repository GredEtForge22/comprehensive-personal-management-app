"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const ITEMS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/edt", label: "Emploi du temps", icon: "🗓️" },
  { href: "/devoirs", label: "À faire", icon: "📝" },
  { href: "/notes", label: "Notes", icon: "🎓" },
  { href: "/habitudes", label: "Habitudes", icon: "✅" },
  { href: "/musique", label: "Saxophone", icon: "🎷" },
  { href: "/partitions", label: "Partitions", icon: "🎼" },
  { href: "/outils", label: "Métronome & Accordeur", icon: "🎚️" },
  { href: "/muscu", label: "Musculation", icon: "🏋️" },
  { href: "/course", label: "Course", icon: "🏃" },
  { href: "/nutrition", label: "Nutrition", icon: "🥗" },
  { href: "/reglages", label: "Réglages", icon: "⚙️" },
];

const BOTTOM = ["/", "/edt", "/habitudes", "/musique", "/nutrition"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const list = (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
            isActive(pathname, it.href)
              ? "bg-amber-400/15 font-medium text-amber-300"
              : "text-zinc-300 hover:bg-zinc-800/70"
          }`}
        >
          <span className="w-5 text-center text-base">{it.icon}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-400 text-base text-zinc-950">🎷</span>
          Mon Planner
        </Link>
        {list}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-400 text-sm text-zinc-950">🎷</span>
          Mon Planner
        </Link>
        <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm" aria-label="Menu">
          ☰ Menu
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="absolute inset-y-0 right-0 w-72 max-w-[85%] overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            {list}
          </div>
        </div>
      )}

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {BOTTOM.map((href) => {
          const it = ITEMS.find((i) => i.href === href)!;
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? "text-amber-300" : "text-zinc-400"
              }`}
            >
              <span className="text-lg leading-none">{it.icon}</span>
              {it.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
