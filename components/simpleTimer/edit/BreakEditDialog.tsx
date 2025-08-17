"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TimerSegment } from "@prisma/client";
import { Input } from "@mui/material";

interface Props {
  breakLabel: string;
  segId: string;
  startTime: Date | string;
  endTime?: Date | string;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function BreakEditDialog({
  breakLabel,
  segId,
  startTime,
  endTime,
}: Props) {
  const router = useRouter();

  const start = new Date(startTime);
  const initialEnd = new Date(endTime ?? startTime);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string>(
    breakLabel ?? ""
  );

  const [endHour, setEndHour] = useState(() => {
    const h = initialEnd.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  });
  const [endMinute, setEndMinute] = useState(() => initialEnd.getMinutes());
  const [endAmPm, setEndAmPm] = useState<"AM" | "PM">(
    initialEnd.getHours() >= 12 ? "PM" : "AM"
  );

  const updateMutation = useMutation({
    mutationFn: async (payload: { segment: Partial<TimerSegment> }) => {
      console.log("PAYLOAD", payload);
      await axios.post(`/api/segments/break/edit?segmentId=${segId}`, payload);
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err.message ?? "Something went wrong.";
      toast.error(error);
    },
    onSuccess: () => {
      toast.success("Segment updated successfully");
      setOpen(false);
      router.refresh();
    },
  });

  const handleSubmit = () => {
    if (!label?.trim()) {
      toast.error("Please pick a focus area.");
      return;
    }

    const end = new Date(start);
    let hr = endHour % 12;
    if (endAmPm === "PM") hr += 12;
    end.setHours(hr, endMinute, 0, 0);

    updateMutation.mutate({
      segment: {
        end: end,
        label: label,
      }
    });
  };

  const startH = start.getHours();
  const startHour12 = startH % 12 === 0 ? 12 : startH % 12;
  const startAmPm = startH >= 12 ? "PM" : "AM";

  const incHour = () => setEndHour((h) => (h % 12) + 1 || 1);
  const decHour = () => setEndHour((h) => (h - 1 <= 0 ? 12 : (h - 1) % 13));
  const incMinute = () => setEndMinute((m) => (m + 1 >= 60 ? 0 : m + 1));
  const decMinute = () => setEndMinute((m) => (m - 1 < 0 ? 59 : m - 1));
  const toggleAmPm = () => setEndAmPm((s) => (s === "AM" ? "PM" : "AM"));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
          initial={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          className="inline-flex items-center gap-2"
        >
          <Edit size={20} />
        </motion.button>
      </DialogTrigger>

      <DialogContent className="p-0">
        <DialogHeader className="flex items-center justify-between px-5 pt-4 pb-2 border-b">
          <h3 className="text-lg font-semibold">Edit Logs</h3>
        </DialogHeader>

        <div className="px-4 pt-4 pb-2 flex gap-3 overflow-x-auto">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Break Label"
            className="flex-1"
          />
        </div>

        <div className="px-6 pt-4 pb-6 space-y-5">
          <div>
            <div className="text-sm text-gray-500">Starts</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="text-xs text-blue-600 font-semibold">
                {startAmPm}
              </div>
              <div className="bg-gray-100 px-3 py-2 rounded-lg text-xl font-bold">
                {pad(startHour12)} : {pad(start.getMinutes())}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Ends</div>
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={toggleAmPm}
                type="button"
                className="text-xs font-semibold"
              >
                {endAmPm}
              </button>

              <div className="flex flex-col bg-white px-3 py-2 rounded-lg shadow">
                <button onClick={incHour} type="button">
                  ▲
                </button>
                <div className="text-xl font-bold">{pad(endHour)}</div>
                <button onClick={decHour} type="button">
                  ▼
                </button>
              </div>

              <div className="text-xl font-bold">:</div>

              <div className="flex flex-col bg-white px-3 py-2 rounded-lg shadow">
                <button onClick={incMinute} type="button">
                  ▲
                </button>
                <div className="text-xl font-bold">{pad(endMinute)}</div>
                <button onClick={decMinute} type="button">
                  ▼
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <Button onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="flex-1 rounded-full py-3 font-semibold text-white"
            style={{
              background: "linear-gradient(90deg,#2ecc71,#32b768)",
              boxShadow: "0 6px 18px rgba(50, 183, 104, 0.25)",
            }}
          >
            {updateMutation.isPending ? "Updating..." : "Edit"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
