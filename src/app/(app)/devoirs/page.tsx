import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { todayStr } from "@/lib/dates";
import TasksView from "@/components/TasksView";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const rows = await db.select().from(tasks).orderBy(asc(tasks.dueDate), desc(tasks.id));
  return (
    <TasksView
      today={todayStr()}
      tasks={rows.map((t) => ({
        id: t.id,
        title: t.title,
        kind: t.kind,
        subject: t.subject,
        dueDate: t.dueDate,
        done: t.done,
        notes: t.notes,
      }))}
    />
  );
}
