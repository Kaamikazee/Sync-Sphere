"use client";

import * as React from "react";
import { Star, StarHalf } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Todo, TodoWorkDone } from "@prisma/client";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  todo: Todo;
}

export function UpdateTodo({ todo }: Props) {
  const { title, id, content, completed, date } = todo;
  const [todoName, setTodoName] = React.useState(title);
  const [todoContent, setTodoContent] = React.useState(content);
  const [open, setOpen] = React.useState(false);
  const [todoDone, setTodoDone] = React.useState<TodoWorkDone>(completed);
  const [isEditingContent, setIsEditingContent] = React.useState(false); //
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  );

  function normalizeToStartOfDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
  }

  const router = useRouter();
  const queryClient = useQueryClient();

  // Unified mutation accepting fields
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Todo>) => {
      await axios.post(`/api/todos/update?todoId=${id}`, data);
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "Something went wrong.";
      toast.error(error);
    },
    onSuccess: () => {
      toast.success("Todo updated successfully");
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      router.refresh();
    },
    mutationKey: ["updateTodo", id],
  });

  const { mutate, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/todos/delete?todoId=${id}`);
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "Something went wrong.";
      toast.error(error);
    },
    onSuccess: () => {
      toast.success("Todo deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      router.refresh();
    },
    mutationKey: ["deleteTodo", id],
  });

  const handleStatusClick = (value: TodoWorkDone) => {
    setTodoDone(value);
    updateMutation.mutate({ completed: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoName.trim() || !todoContent!.trim()) {
      toast.error("Please fill out both fields.");
      return;
    }
    updateMutation.mutate({
      title: todoName,
      content: todoContent,
      completed: todoDone,
      date: selectedDate ? normalizeToStartOfDay(selectedDate) : undefined,
    });
  };

  const options: {
    value: TodoWorkDone;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "DONE",
      label: "Done",
      icon: <Star className="fill-emerald-400 w-6 h-6 animate-pulse" />,
    },
    {
      value: "HALF_DONE",
      label: "Half Done",
      icon: <StarHalf className="fill-yellow-300 w-6 h-6" />,
    },
    {
      value: "NOT_DONE",
      label: "Not Done",
      icon: <Star className="fill-red-400 w-6 h-6" />,
    },
  ];

  const fillColors: Record<string, string> = {
    DONE: "fill-green-300",
    NOT_DONE: "fill-red-500",
    HALF_DONE: "fill-yellow-300",
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <motion.span
          initial={{ scale: 1 }}
          whileHover={{
            scale: 1.1,
            textShadow: "0px 0px 8px rgba(79, 70, 229, 0.8)",
          }}
          className={`flex items-center gap-1 cursor-pointer transition-colors duration-200 
            ${
              todoDone === "DONE"
                ? "text-emerald-400 line-through"
                : "text-purple-200 hover:text-purple-400"
            }`}
        >
          <Star className={fillColors[todoDone]} /> {todoName}
        </motion.span>
      </DrawerTrigger>

      <DrawerContent
        className="bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900
             backdrop-blur-xl shadow-2xl border-l-4 border-purple-500
             rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 w-full max-w-sm mx-auto px-6 py-5 overflow-hidden"
        >
          {/* Header + status selector */}
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center text-2xl font-extrabold text-white gap-2 mb-3">
              <Star className="fill-yellow-300 w-5 h-5 animate-spin-slow" />
              {todoName}
              <Star className="fill-yellow-300 w-5 h-5 animate-spin-slow" />
            </DrawerTitle>

            {/* Status selector */}
            <div className="space-y-2">
              <Label className="text-gray-100 font-semibold">
                Status (click to update)
              </Label>
              <div className="flex gap-3">
                {options.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleStatusClick(value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-transform duration-200 ${
                      todoDone === value
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white transform scale-105"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </DrawerHeader>

          <Button
            type="button"
            onClick={() => {
              if (!date) {
                return toast.error("This todo does not have a date assigned.");
              }
              const currentDate = new Date(date);
              const nextDate = new Date(currentDate);
              nextDate.setDate(currentDate.getDate() + 1);
              const midnightUTC = normalizeToStartOfDay(nextDate);
              updateMutation.mutate({ date: midnightUTC });
              toast.success("Todo migrated to the next day!");
            }}
            className="bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:scale-105 transition-transform"
          >
            ⏭️ Migrate to Next Date
          </Button>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 mt-2 no-scrollbar">
            <div className="space-y-2">
              <Label className="text-gray-100 font-semibold">
                Migrate Todo to Date
              </Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal bg-gray-800 text-white border border-gray-600 hover:bg-gray-700"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setOpen(false); // ✅ close popover
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                onClick={() => {
                  if (!selectedDate)
                    return toast.error("Please select a date first");
                  const midnightUTC = normalizeToStartOfDay(selectedDate);
                  updateMutation.mutate({ date: midnightUTC });
                }}
                type="button"
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:scale-105 transition-transform"
              >
                📆 Migrate to Selected Date
              </Button>
            </div>

            {/* Todo Title */}
            <div className="space-y-2">
              <Label
                htmlFor="todo-name"
                className="text-gray-100 font-semibold"
              >
                Todo Title
              </Label>
              <Input
                id="todo-name"
                name="title"
                value={todoName}
                onChange={(e) => setTodoName(e.target.value)}
                className="w-full bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Todo Content */}
            <div className="space-y-2">
              <Label
                htmlFor="todo-content"
                className="text-gray-100 font-semibold"
              >
                Todo Content
              </Label>
              {isEditingContent ? (
                <textarea
                  id="todo-content"
                  name="content"
                  value={todoContent!}
                  onChange={(e) => setTodoContent(e.target.value)}
                  onBlur={() => setIsEditingContent(false)}
                  autoFocus
                  rows={4}
                  className="w-full resize-none bg-gray-800 text-white placeholder-gray-400 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              ) : (
                <div
                  onClick={() => setIsEditingContent(true)}
                  className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg p-3 cursor-text hover:bg-gray-700 transition"
                >
                  {todoContent?.trim() ? (
                    <p className="whitespace-pre-line">{todoContent}</p>
                  ) : (
                    <p className="text-gray-400 italic">
                      Click to add content...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 mt-4 border-t border-gray-700 flex justify-end items-center gap-3 shrink-0">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold px-6 py-2 rounded-full shadow-xl hover:scale-105 transition-transform"
            >
              {updateMutation.isPending ? "Updating..." : "🔄 Update All"}
            </Button>
            <Button
              disabled={isDeleting}
              type="button"
              onClick={() => mutate()}
              variant="destructive"
              className="text-gray-200 hover:bg-gray-700"
            >
              Delete
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
