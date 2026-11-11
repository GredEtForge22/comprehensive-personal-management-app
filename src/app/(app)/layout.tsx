import type { ReactNode } from "react";
import Nav from "@/components/Nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 lg:ml-60 lg:max-w-none lg:px-8 lg:pb-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
