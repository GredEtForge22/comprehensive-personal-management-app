"use client";

import { useState } from "react";
import Muscu from "@/components/sport/Muscu";
import Running from "@/components/sport/Running";
import { PageHeader, Tabs } from "@/components/ui";

export default function SportPage() {
  const [tab, setTab] = useState<"muscu" | "course">("muscu");
  return (
    <div>
      <PageHeader title="Sport" sub="Street workout au poids du corps & course à pied" />
      <Tabs
        tabs={[
          { id: "muscu", label: "💪 Street workout" },
          { id: "course", label: "🏃 Course" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "muscu" ? <Muscu /> : <Running />}
    </div>
  );
}
