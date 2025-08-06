"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TodoWorkDone } from "@prisma/client";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Props {
  activityId?: string;
  focusAreaId?: string;
}

export function CreateTodo({ focusAreaId }: Props) {
  const router = useRouter();
  const [todoName, setTodoName] = useState("");
  const [todoContent, setTodoContent] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);

  const isMobile = useMediaQuery("(max-width: 640px)");
  const queryClient = useQueryClient();

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/todos/new?focusAreaId=${focusAreaId}`, {
        title: todoName,
        content: todoContent,
        completed: TodoWorkDone.NOT_DONE,
      });
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "Something went wrong.";
      toast.error(error);
    },
    onSuccess: () => {
      toast.success("Todo created successfully");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["todos"] }); // ✅
      router.refresh();
    },
    mutationKey: ["createTodo"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoName.trim() || !todoContent.trim()) {
      toast.error("Please fill out both fields.");
      return;
    } else if (todoName.trim().length > 30) {
      toast.error("Title can be max of 30 letters only");
      return;
    }
    mutate();
  };

  const Trigger = (
    <Button
      className="bg-gradient-to-r from-green-400 via-lime-400 to-emerald-500 text-white font-semibold shadow-lg hover:scale-105 transition-transform px-4 py-2 text-sm sm:text-base"
      variant="outline"
    >
      ➕ Create a new todo
    </Button>
  );

  const Content = (
    <>
      <form onSubmit={handleSubmit} className="grid gap-5 pt-4">
        <div className="space-y-2">
          <Label htmlFor="todo-name" className="text-white text-sm">
            Todo Title
          </Label>
          <Input
            id="todo-name"
            name="title"
            value={todoName}
            onChange={(e) => setTodoName(e.target.value)}
            placeholder="Enter title"
            className="bg-white/10 text-white placeholder:text-white/40 backdrop-blur-md border border-white/20 focus:ring-lime-400 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="todo-content" className="text-white text-sm">
            Todo Content
          </Label>

          {isEditingContent ? (
            <textarea
              id="todo-content"
              name="content"
              value={todoContent}
              onChange={(e) => setTodoContent(e.target.value)}
              onBlur={() => setIsEditingContent(false)}
              autoFocus
              rows={4}
              placeholder="Enter content"
              className="w-full resize-none bg-white/10 text-white placeholder:text-white/40 backdrop-blur-md border border-white/20 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          ) : (
            <div
              onClick={() => setIsEditingContent(true)}
              className="w-full bg-white/10 text-white border border-white/20 rounded-lg p-3 cursor-text hover:bg-white/20 backdrop-blur-md transition text-sm"
            >
              {todoContent?.trim() ? (
                <p className="whitespace-pre-line">{todoContent}</p>
              ) : (
                <p className="text-white/40 italic">Click to add content...</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 mt-4">
          {isMobile ? (
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 text-white hover:scale-105 transition-transform text-sm sm:text-base"
              >
                Cancel
              </Button>
            </DrawerClose>
          ) : (
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 text-white hover:scale-105 transition-transform text-sm sm:text-base"
              >
                Cancel
              </Button>
            </DialogClose>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto bg-gradient-to-r from-lime-400 via-green-400 to-emerald-500 text-white shadow-md hover:scale-105 transition-transform text-sm sm:text-base"
          >
            {isLoading ? "Saving..." : "✅ Save Todo"}
          </Button>
        </div>
      </form>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>{Trigger}</DrawerTrigger>
        <DrawerContent className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-t-2xl shadow-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
          <DrawerHeader>
            <DrawerTitle className="text-white text-lg sm:text-xl">
              📝 New Todo
            </DrawerTitle>
            <DrawerDescription className="text-white/80 text-sm sm:text-base">
              Fill in the details for your todo. Click <strong>Save</strong> to
              confirm.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-0">{Content}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{Trigger}</DialogTrigger>
      <DialogContent className="w-[90vw] max-w-xs sm:max-w-sm md:max-w-md backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl transition-all p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-white text-lg sm:text-xl">
            📝 New Todo
          </DialogTitle>
          <DialogDescription className="text-white/80 text-sm sm:text-base">
            Fill in the details for your todo. Click <strong>Save</strong> to
            confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="pt-0">{Content}</div>
      </DialogContent>
    </Dialog>
  );
}
