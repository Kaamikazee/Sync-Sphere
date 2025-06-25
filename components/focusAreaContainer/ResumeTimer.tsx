"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBreakStore } from "@/stores/useBreakStore";
import { useBreakTimer } from "@/stores/useBreakTimer";
import { PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function ResumeTimer({ onStart }: { onStart: () => void }) {
  const breakReason = useBreakStore((s) => s.breakReason);
  const setBreakReason = useBreakStore((s) => s.setBreakReason);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [needsReason, setNeedsReason] = useState(false);
  const { startTime } = useBreakTimer();

  useEffect(() => {
    if (startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setNeedsReason(elapsed < 3 * 3600);
    }
  }, [startTime]);

  const handlePlayClick = () => {
    if (needsReason) {
      setDialogOpen(true);
    } else {
      onStart();
    }
  };

  const handleSubmit = () => {
    setDialogOpen(false);
    onStart();
  };

  return (
    <>
      <PlayCircle
        className="cursor-pointer text-white hover:scale-110 transition-transform drop-shadow-lg"
        size={40}
        onClick={handlePlayClick}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl transition-all">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              ⏸️ Break Reason
            </DialogTitle>
            <DialogDescription className="text-white/80">
              Provide a reason for your break. Click {`"Save"`} to resume.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="break-reason" className="text-white">
                Reason
              </Label>
              <Input
                id="break-reason"
                name="reason"
                value={breakReason}
                onChange={(e) => setBreakReason(e.target.value)}
                placeholder="Enter break reason"
                className="bg-white/10 text-white placeholder:text-white/40 backdrop-blur-md border border-white/20 focus:ring-lime-400"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 text-white hover:scale-105 transition-transform"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-gradient-to-r from-lime-400 via-green-400 to-emerald-500 text-white shadow-md hover:scale-105 transition-transform"
            >
              ✅ Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
