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


export function CreateActivity() {
  const router = useRouter();
  const [activityName, setActivityName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/activity", {
        activityName,
        timeSpent:0
      });
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "ERRORS.DEFAULT";

      toast.error(error);
    },
    onSuccess: async () => {
      toast.success("Activity created successfully");
      setIsDialogOpen(false)
      router.refresh();
    },
    mutationKey: ["createActivity"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim()) {
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
          className="bg-gradient-to-r from-green-400 via-lime-400 to-emerald-500 text-white font-semibold shadow-lg hover:scale-105 transition-transform"
          variant="outline"
        >
          ➕ Create a Activity
        </Button>
      </DialogTrigger>

      {/* Content with form inside */}
      <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl transition-all">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">📝 New Activity</DialogTitle>
          <DialogDescription className="text-white/80">
            Fill in the details for your activity. Click {`"Save"`} to confirm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="activity-name" className="text-white">
              Activity Title
            </Label>
            <Input
              id="activity-name"
              name="title"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="Enter title"
              className="bg-white/10 text-white placeholder:text-white/40 backdrop-blur-md border border-white/20 focus:ring-lime-400"
            />
          </div>

          <DialogFooter className="gap-2 mt-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 text-white hover:scale-105 transition-transform hover:text-shadow-white"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-lime-400 via-green-400 to-emerald-500 text-white shadow-md hover:scale-105 transition-transform"
            >
              {isPending ? "Saving..." : "✅ Save Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
