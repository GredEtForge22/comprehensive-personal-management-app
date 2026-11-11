import { isoWeek, todayStr, weekParity } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import SettingsView from "@/components/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const today = todayStr();
  return (
    <SettingsView
      settings={settings}
      currentParity={weekParity(today, settings.weekAOdd)}
      weekNumber={isoWeek(today)}
      hasPassword={Boolean(process.env.APP_PASSWORD)}
    />
  );
}
