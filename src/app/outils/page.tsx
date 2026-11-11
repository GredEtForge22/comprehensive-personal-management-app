"use client";

import Drone from "@/components/tools/Drone";
import Metronome from "@/components/tools/Metronome";
import Timers from "@/components/tools/Timers";
import Tuner from "@/components/tools/Tuner";
import { PageHeader } from "@/components/ui";

export default function ToolsPage() {
  return (
    <div>
      <PageHeader title="Outils" sub="Métronome, accordeur sax, bourdon et minuteurs" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Metronome />
        <Tuner />
        <Drone />
        <Timers />
      </div>
    </div>
  );
}
