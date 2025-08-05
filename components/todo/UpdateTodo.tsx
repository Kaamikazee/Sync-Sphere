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
import { Todo, TodoWorkDone } from "@prisma/client";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  todo: Todo;
}

export function UpdateTodo({ todo }: Props) {
  const { title, id, content, completed } = todo;
  const [todoName, setTodoName] = React.useState(title);
  const [todoContent, setTodoContent] = React.useState(content);
  const [todoDone, setTodoDone] = React.useState<TodoWorkDone>(completed);
  const [isEditingContent, setIsEditingContent] = React.useState(false); // 
  const router = useRouter();

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
      router.refresh();
    },
    mutationKey: ["updateTodo", id],
  });

  const {mutate, isPending: isDeleting} = useMutation({
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
      router.refresh();
    },
    mutationKey: ["deleteTodo", id],
  })

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
    updateMutation.mutate({ title: todoName, content: todoContent, completed: todoDone });
  };

  const options: { value: TodoWorkDone; label: string; icon: React.ReactNode }[] = [
    { value: "DONE", label: "Done", icon: <Star className="fill-emerald-400 w-6 h-6 animate-pulse" /> },
    { value: "HALF_DONE", label: "Half Done", icon: <StarHalf className="fill-yellow-300 w-6 h-6" /> },
    { value: "NOT_DONE", label: "Not Done", icon: <Star className="fill-red-400 w-6 h-6" /> },
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
          whileHover={{ scale: 1.1, textShadow: '0px 0px 8px rgba(79, 70, 229, 0.8)' }}
          className={`flex items-center gap-1 cursor-pointer transition-colors duration-200 
            ${todoDone === "DONE" ? 'text-emerald-400 line-through' : 'text-purple-200 hover:text-purple-400'}`
          }
        >
          <Star className={fillColors[todoDone]} /> {todoName}
        </motion.span>
      </DrawerTrigger>

      <DrawerContent className="bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 backdrop-blur-xl shadow-2xl border-l-4 border-purple-500 rounded-t-3xl">
        <div className="mx-auto w-full max-w-sm px-6 py-5">
          <DrawerHeader>
            <DrawerTitle className="flex items-center justify-center text-2xl font-extrabold text-white gap-2">
              <Star className="fill-yellow-300 w-5 h-5 animate-spin-slow" />
              {todoName}
              <Star className="fill-yellow-300 w-5 h-5 animate-spin-slow" />
            </DrawerTitle>
          </DrawerHeader>

          <div className="space-y-6 mt-2">
            <div className="space-y-2">
              <Label className="text-gray-100 font-semibold">Status (click to update)</Label>
              <div className="flex gap-3">
                {options.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleStatusClick(value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer shadow-lg transition-transform duration-200
                      ${todoDone === value
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white transform scale-105'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}
                    `}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="todo-name" className="text-gray-100 font-semibold">Todo Title</Label>
                <Input
                  id="todo-name"
                  name="title"
                  value={todoName}
                  onChange={(e) => setTodoName(e.target.value)}
                  className="w-full bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="todo-content" className="text-gray-100 font-semibold">Todo Content</Label>
               <div className="space-y-2">

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
        <p className="text-gray-400 italic">Click to add content...</p>
      )}
    </div>
  )}
</div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-700">
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
                  variant="destructive" className="text-gray-200 hover:bg-gray-700">
                    Delete
                  </Button>
              </div>
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
