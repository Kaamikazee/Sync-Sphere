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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  focusAreaId?: string | null;
  focusAreaNamesAndIds?: { id: string; name: string }[];
}

export function CreateTodo({ focusAreaId, focusAreaNamesAndIds }: Props) {
  const router = useRouter();
  const [todoName, setTodoName] = useState("");
  const [todoContent, setTodoContent] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);

  const isMobile = useMediaQuery("(max-width: 640px)");
  const queryClient = useQueryClient();

  // show dropdown only when focusAreaNamesAndIds is provided and focusAreaId is undefined
  const shouldShowDropdown =
    typeof focusAreaId === "undefined" && Array.isArray(focusAreaNamesAndIds);

  // local selection (used only when dropdown is shown)
  const [selectedFocusAreaId, setSelectedFocusAreaId] = useState<string | "">(
    "" // empty string = Unassigned
  );

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: async () => {
      // pick focus area: prefer prop (locked), otherwise dropdown selection, otherwise none
      const fa = focusAreaId ?? (selectedFocusAreaId || undefined);
      const url = fa ? `/api/todos/new?focusAreaId=${fa}` : `/api/todos/new`;
      await axios.post(url, {
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
      setTodoName("");
      setTodoContent("");
      setIsEditingContent(false);
      setIsOpen(false);
      // keep dropdown selection for fast subsequent creation (if using dropdown)
      queryClient.invalidateQueries({ queryKey: ["todos"] });
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
      data-ripple
      className="bg-gradient-to-r from-green-400 via-lime-400 to-emerald-500 text-white font-semibold shadow-lg hover:scale-105 transition-transform px-4 py-2 text-sm sm:text-base"
      variant="outline"
    >
      ➕ Create a new todo
    </Button>
  );

  const Content = (
    <>
      <form onSubmit={handleSubmit} className="grid gap-5 pt-4">
        {/* Focus area dropdown shown only when caller provided focusAreaNamesAndIds and didn't lock the focusAreaId */}
        {shouldShowDropdown && (
          <div className="space-y-2">
            <Label className="text-white text-sm">Focus area</Label>

            {focusAreaNamesAndIds && focusAreaNamesAndIds.length > 0 ? (
              <Select
                value={selectedFocusAreaId ?? "unassigned"}
                onValueChange={(val) =>
                  // @ts-expect-error ts-no-error
                  setSelectedFocusAreaId(val === "unassigned" ? null : val)
                }
              >
                <SelectTrigger
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm rounded-lg p-2 flex justify-between data-[placeholder]:text-white/70 [&>svg]:text-white/80"
                >
                  <SelectValue placeholder="Select focus area" />
                </SelectTrigger>
                <SelectContent className="bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-lg shadow-xl">
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {focusAreaNamesAndIds.map((fa) => (
                    <SelectItem key={fa.id} value={fa.id}>
                      {fa.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="w-full bg-white/10 rounded-lg p-2 text-white/60 text-sm">
                No focus areas available
              </div>
            )}
          </div>
        )}

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
                data-ripple
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
                data-ripple
                type="button"
                variant="outline"
                className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 text-white hover:scale-105 transition-transform text-sm sm:text-base"
              >
                Cancel
              </Button>
            </DialogClose>
          )}

          <Button
            data-ripple
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
        <DrawerTrigger data-ripple data-ripple-color="rgba(0,0,0,0.15)" asChild>
          {Trigger}
        </DrawerTrigger>
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
      <DialogTrigger data-ripple data-ripple-color="rgba(0,0,0,0.15)" asChild>
        {Trigger}
      </DialogTrigger>
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
