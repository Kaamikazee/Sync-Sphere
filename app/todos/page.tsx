import React from "react";

// Server-side imports
import db from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TodosClient } from "@/components/todo/TodosClient";
import { getFocusAreas } from "@/lib/api";

// --------------------------------------------------
// Server component: loads all todos for the current user
// --------------------------------------------------
export default async function Page() {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/api/auth/sign-in");
  }

  const userId = session.user.id;

  // Fetch todos + their focus area relation so we can show focus area names
  const todos = await db.todo.findMany({
    where: { userId },
    include: { focusArea: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const focusAreas = await getFocusAreas(session.user.id);
        const focusAreaNamesAndIds = focusAreas!.map((item) => ({
          name: item.name,
          id: item.id
        })).filter(Boolean);

  // Serialize dates to ISO strings so they are safe to pass to client
  const serialized = todos.map((t) => ({
    ...t,
    date: t.date ? t.date.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    focusArea: t.focusArea
      ? { id: t.focusArea.id, name: t.focusArea.name }
      : null,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 py-8">
      <div className="p-4 max-w-6xl mx-auto px-4">
        {/* Frosty header card — matches TodosClient styling */}
        <div className="rounded-2xl p-6 bg-white/6 border border-white/8 backdrop-blur-md shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-animated-gradient">
                Todos — All
              </h1>
              <p className="mt-1 text-sm text-white/70">
                All tasks for <span className="font-medium text-white/90">{session.user.name ?? "your account"}</span>. Filter, group and manage your todos here.
              </p>
            </div>

            {/* Optional quick actions space (keeps layout balanced on wide screens) */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Intentionally left simple so it doesn't add new behavior — can add quick-create button here later */}
              <div className="text-sm text-white/60">Last synced: {new Date().toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Main client interactive list (keeps same API) */}
        <div className="mt-6">
          <TodosClient initialTodos={serialized} focusAreaNamesAndIds={focusAreaNamesAndIds} />
        </div>
      </div>
    </div>
  );
}
