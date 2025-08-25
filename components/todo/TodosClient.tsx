/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
// import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format as fformat, parseISO } from "date-fns";
import { CreateTodo } from "./CreateTodo";
import { UpdateTodo } from "./UpdateTodo";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH";
type TodoWorkDone = "DONE" | "NOT_DONE" | "HALF_DONE";

type TodoSerialized = {
  id: string;
  userId: string;
  focusAreaId: string;
  title: string;
  content?: string | null;
  completed: TodoWorkDone;
  date: string | null;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  focusArea: { id: string; name: string } | null;
};

export function TodosClient({
  initialTodos,
  focusAreaNamesAndIds,
}: {
  initialTodos: TodoSerialized[];
  focusAreaNamesAndIds: { id: string; name: string }[];
}) {
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | TodoWorkDone>(
    "ALL"
  );
  const [priorityFilter, setPriorityFilter] = React.useState<
    "ALL" | Priority
  >("ALL");
  const [groupBy, setGroupBy] = React.useState<"date" | "focusArea">("date");
  const [query, setQuery] = React.useState("");

  const reduceMotion = useReducedMotion();

  // -------------------------
  // React Query: todos list
  // -------------------------
  const fetchTodos = async (): Promise<TodoSerialized[]> => {
    const { data } = await axios.get("/api/todos/list");
    return data;
  };

  const todosQuery = useQuery<TodoSerialized[]>({
    queryKey: ["todos"],
    queryFn: fetchTodos,
    initialData: initialTodos,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const todos = React.useMemo(() => todosQuery.data ?? [], [todosQuery.data]);
  // -------------------------
  // Helper: filter todos locally based on current filters/search
  // -------------------------
  const filtered = React.useMemo(() => {
    return todos.filter((t: any) => {
      if (statusFilter !== "ALL" && t.completed !== statusFilter) return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter)
        return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !t.title.toLowerCase().includes(q) &&
          !(t.content || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [todos, statusFilter, priorityFilter, query]);

  // -------------------------
  // Grouping helpers
  // -------------------------
  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, TodoSerialized[]>();
    for (const t of filtered) {
      const dateKey = t.date ? fformat(parseISO(t.date), "yyyy-MM-dd") : "No date";
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(t);
    }
    // sort map keys (descending date)
    return new Map([...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)));
  }, [filtered]);

  const groupedByFocus = React.useMemo(() => {
    const map = new Map<string, TodoSerialized[]>();
    for (const t of filtered) {
      const key = t.focusArea ? `${t.focusArea.id}||${t.focusArea.name}` : "unassigned||Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    // keep insertion order
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white px-4 sm:px-6 lg:px-8 py-6">
      {/* Top frosty container */}
      <div className="rounded-2xl p-4 bg-white/6 border border-white/8 backdrop-blur-md shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-clip-padding bg-gradient-to-br from-indigo-400/80 to-pink-400/60 flex items-center justify-center border border-white/10 shadow-sm">
            <svg
              className="w-6 h-6 text-white/95"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-semibold bg-clip-text text-transparent bg-animated-gradient">
              Todos
            </h2>
            <p className="text-xs text-white/70 mt-0.5 max-w-xs">
              Keep track of your tasks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 text-sm text-white/70">
            <div>
              Showing{" "}
              <span className="font-semibold text-white">{filtered.length}</span>
            </div>
            <div>
              Done{" "}
              <span className="font-semibold text-white">
                {todos.filter((t) => t.completed === "DONE").length}
              </span>
            </div>
            <div>
              Half Done{" "}
              <span className="font-semibold text-white">
                {todos.filter((t) => t.completed === "HALF_DONE").length}
              </span>
            </div>
            <div>
              Not Done{" "}
              <span className="font-semibold text-white">
                {todos.filter((t) => t.completed === "NOT_DONE").length}
              </span>
            </div>
          </div>

          {/* Quick create */}
          <div>
            {/* make the create CTA more touch-friendly on mobile via padding */}
            <div className="py-0.5">
              <CreateTodo focusAreaId={undefined as any} focusAreaNamesAndIds={focusAreaNamesAndIds} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mt-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Label className="text-white/80">Show</Label>
          <Select onValueChange={(v) => setStatusFilter((v as any) || "ALL")}>
            <SelectTrigger className="w-full sm:w-44 bg-white/6 text-white p-2 rounded-lg border border-white/6">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
              <SelectItem value="HALF_DONE">Half Done</SelectItem>
              <SelectItem value="NOT_DONE">Not Done</SelectItem>
            </SelectContent>
          </Select>

          <Label className="text-white/80">Priority</Label>
          <Select onValueChange={(v) => setPriorityFilter((v as any) || "ALL")}>
            <SelectTrigger className="w-full sm:w-36 bg-white/6 text-white p-2 rounded-lg border border-white/6">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>

          <Label className="text-white/80">Group by</Label>
          <Select onValueChange={(v) => setGroupBy(v as any)}>
            <SelectTrigger className="w-full sm:w-40 bg-white/6 text-white p-2 rounded-lg border border-white/6">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="focusArea">Focus Area</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          <Input
            placeholder="Search todos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-64 p-2 rounded-lg bg-white/6 border border-white/6 text-white placeholder:text-white/60"
          />
          {/* Provide quick create (will open your existing CreateTodo component) */}
          <div className="sm:hidden">
            <CreateTodo focusAreaId={undefined as any} focusAreaNamesAndIds={focusAreaNamesAndIds} />
          </div>
        </div>
      </div>

      {/* Summary counts for mobile (shows beneath controls) */}
      <div className="flex sm:hidden gap-4 items-center text-sm text-white/70 mt-3">
        <div>Showing: {filtered.length}</div>
        <div>Done: {todos.filter((t) => t.completed === "DONE").length}</div>
        <div>
          Not Done: {todos.filter((t) => t.completed === "NOT_DONE").length}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6 mt-4">
        <AnimatePresence>
          {groupBy === "date" && (
            <>
              {Array.from(groupedByDate.entries()).map(([dateKey, items]) => (
                <motion.div
                  key={dateKey}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: reduceMotion ? 0 : 0.25 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/8 backdrop-blur-md"
                >
                  <h3 className="font-bold mb-3 text-white text-sm sm:text-base">
                    {dateKey === "No date"
                      ? "No date"
                      : fformat(parseISO(dateKey), "PPP")}
                  </h3>

                  <div className="grid gap-3">
                    {items.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: reduceMotion ? 0 : 0.22 }}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg ${
                          t.completed === "DONE" ? "bg-white/4" : "bg-black/30"
                        } border border-white/6`}
                        role="listitem"
                        aria-label={t.title}
                      >
                        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                          <div className="min-w-0 flex-1 sm:flex-none sm:min-w-[220px]">
                            <div
                              className={`font-semibold truncate ${
                                t.completed === "DONE"
                                  ? "line-through text-gray-300"
                                  : "text-white"
                              } text-sm sm:text-base`}
                            >
                              {/* UpdateTodo trigger: we reuse your existing component which shows a drawer */}
                          <div className="ml-1">
                            <UpdateTodo
                              todo={
                                {
                                  id: t.id,
                                  userId: t.userId,
                                  focusAreaId: t.focusAreaId,
                                  title: t.title,
                                  content: t.content ?? undefined,
                                  completed: t.completed as any,
                                  date: t.date ? new Date(t.date) : undefined,
                                  priority: t.priority as any,
                                  createdAt: new Date(t.createdAt),
                                  updatedAt: new Date(t.updatedAt),
                                } as any
                              }
                            />
                          </div>
                            </div>
                            <div className="text-xs text-white/60 truncate">
                              {t.focusArea?.name ?? "Unassigned"}
                            </div>
                          </div>
                          <div className="text-sm text-white/60 hidden sm:block ml-2">
                            {t.date
                              ? fformat(parseISO(t.date), "PPP")
                              : "No date"}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {groupBy === "focusArea" && (
            <>
              {Array.from(groupedByFocus.entries()).map(([key, items]) => {
                const [, name] = key.split("||");
                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: reduceMotion ? 0 : 0.25 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/8 backdrop-blur-md"
                  >
                    <h3 className="font-bold mb-3 text-white text-sm sm:text-base">
                      {name}
                    </h3>
                    <div className="grid gap-3">
                      {items.map((t) => (
                        <motion.div
                          key={t.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: reduceMotion ? 0 : 0.22 }}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg ${
                            t.completed === "DONE"
                              ? "bg-white/4"
                              : "bg-black/30"
                          } border border-white/6`}
                        >
                          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                            <div
                              className={`font-semibold truncate ${
                                t.completed === "DONE"
                                  ? "line-through text-gray-300"
                                  : "text-white"
                              } text-sm sm:text-base`}
                            >
                              <UpdateTodo
                              todo={
                                {
                                  id: t.id,
                                  userId: t.userId,
                                  focusAreaId: t.focusAreaId,
                                  title: t.title,
                                  content: t.content ?? undefined,
                                  completed: t.completed as any,
                                  date: t.date ? new Date(t.date) : undefined,
                                  priority: t.priority as any,
                                  createdAt: new Date(t.createdAt),
                                  updatedAt: new Date(t.updatedAt),
                                } as any
                              }
                            />
                            </div>
                            <div className="text-sm text-white/60 truncate">
                              {t.date
                                ? fformat(parseISO(t.date), "PPP")
                                : "No date"}
                            </div>
                          </div>

                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* small bottom spacer so content isn't flush to the screen edge on mobile */}
      <div className="h-8" />

      {/* Styles for frosty gradients & subtle animations */}
      <style jsx global>{`
        /* animated gradient for headings */
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .bg-animated-gradient {
          background: linear-gradient(
            90deg,
            rgba(99, 102, 241, 1),
            rgba(139, 92, 246, 1),
            rgba(236, 72, 153, 1)
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradientShift 6s ease infinite;
        }

        /* make sure inputs look frosty on dark backgrounds */
        input::placeholder {
          color: rgba(255, 255, 255, 0.55);
        }

        /* prefer-reduced-motion respects user settings */
        @media (prefers-reduced-motion: reduce) {
          .bg-animated-gradient {
            animation: none;
          }
          * {
            transition: none !important;
            animation: none !important;
          }
        }

        /* small touch helper to avoid accidental double-taps in small chip areas */
        .touch-manipulation {
          -webkit-tap-highlight-color: rgba(255, 255, 255, 0.06);
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
}
