"use client";

import { useState } from "react";
import Cards from "@/components/cours/Cards";
import Grades from "@/components/cours/Grades";
import Lessons from "@/components/cours/Lessons";
import Subjects from "@/components/cours/Subjects";
import Tasks from "@/components/cours/Tasks";
import { PageHeader, Tabs } from "@/components/ui";

type Tab = "todo" | "matieres" | "notes" | "musique" | "fiches";

export default function CoursPage() {
  const [tab, setTab] = useState<Tab>("todo");
  return (
    <div>
      <PageHeader title="Cours" sub="Devoirs, contrôles, auditions, matières, notes et cours de musique" />
      <Tabs
        tabs={[
          { id: "todo", label: "📝 À faire" },
          { id: "matieres", label: "📚 Matières" },
          { id: "notes", label: "📊 Notes" },
          { id: "musique", label: "🎷 Cours de musique" },
          { id: "fiches", label: "🧠 Fiches" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "todo" && <Tasks />}
      {tab === "matieres" && <Subjects />}
      {tab === "notes" && <Grades />}
      {tab === "musique" && <Lessons />}
      {tab === "fiches" && <Cards />}
    </div>
  );
}
