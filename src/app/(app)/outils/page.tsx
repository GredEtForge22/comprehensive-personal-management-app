import { PageHeader } from "@/components/charts";
import Metronome from "@/components/tools/Metronome";
import Tuner from "@/components/tools/Tuner";
import Drone from "@/components/tools/Drone";
import CountdownTimer from "@/components/tools/CountdownTimer";

export default function ToolsPage() {
  return (
    <div>
      <PageHeader title="Outils de musicien" icon="🎚️" subtitle="Métronome, accordeur (avec transposition sax), bourdon, minuteur" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Metronome />
        <Tuner />
        <Drone />
        <CountdownTimer />
      </div>
    </div>
  );
}
