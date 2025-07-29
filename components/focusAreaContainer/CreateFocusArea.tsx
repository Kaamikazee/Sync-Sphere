"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";


export function CreateFocusArea() {
  const router = useRouter();
  const [focusAreaName, setFocusAreaName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/focus_area/new", {
        focusAreaName,
      });
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "ERRORS.DEFAULT";

      toast.error(error);
    },
    onSuccess: async () => {
      toast.success("FocusArea created successfully");
      setIsDialogOpen(false)
      router.refresh();
    },
    mutationKey: ["createFocusArea"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusAreaName.trim()) {
      toast.error("Please fill out both fields.");
      return;
    }
    mutate();
  };
  

  return (
  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
    {/* Trigger to open the dialog */}
    <DialogTrigger asChild>
      <Button
        className="bg-gradient-to-r from-green-400 via-lime-400 to-emerald-500 text-white font-semibold shadow-lg hover:scale-105 transition-transform px-4 py-2 text-sm sm:text-base"
        variant="outline"
      >
        ➕ Create a FocusArea
      </Button>
    </DialogTrigger>

    {/* Dialog Content */}
    <DialogContent className="w-[90vw] max-w-xs sm:max-w-sm md:max-w-md backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl transition-all p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle className="text-white text-lg sm:text-xl">
          📝 New FocusArea
        </DialogTitle>
        <DialogDescription className="text-white/80 text-sm sm:text-base">
          Fill in the details for your focusArea. Click <strong>Save</strong> to confirm.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="grid gap-5 pt-4">
        <div className="space-y-2">
          <Label htmlFor="focusArea-name" className="text-white text-sm">
            FocusArea Title
          </Label>
          <Input
            id="focusArea-name"
            name="title"
            value={focusAreaName}
            onChange={(e) => setFocusAreaName(e.target.value)}
            placeholder="Enter title"
            className="bg-white/10 text-white placeholder:text-white/40 backdrop-blur-md border border-white/20 focus:ring-lime-400 text-sm"
          />
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2 mt-4">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 text-white hover:scale-105 transition-transform text-sm sm:text-base"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto bg-gradient-to-r from-lime-400 via-green-400 to-emerald-500 text-white shadow-md hover:scale-105 transition-transform text-sm sm:text-base"
          >
            {isPending ? "Saving..." : "✅ Save FocusArea"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

}
