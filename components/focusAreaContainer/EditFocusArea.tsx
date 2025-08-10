"use client";

import { Edit } from "lucide-react";
import { motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";

interface Props {
  id: string;
  FaName: string;
}

export function EditFocusArea({ FaName, id }: Props) {
  const name = FaName;
  const [open, setOpen] = useState(false);
  const [focusAreaName, setFocusAreaName] = useState(name);

  const router = useRouter();

  // Unified mutation accepting fields
  const updateMutation = useMutation({
    mutationFn: async (data: {focusAreaName: string}) => {
      await axios.post(`/api/focus_area/edit?focusAreaId=${id}`, data);
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "Something went wrong.";
      toast.error(error);
    },
    onSuccess: () => {
      toast.success("Focus Area updated successfully");
      setOpen(false);
      router.refresh();
    },
    mutationKey: ["updateFocusArea"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!focusAreaName.trim()) {
      toast.error("Please fill out the field.");
      return;
    }
    updateMutation.mutate({
      focusAreaName: focusAreaName,
    });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <motion.span
          initial={{ scale: 1 }}
          whileHover={{
            scale: 1.1,
            textShadow: "0px 0px 8px rgba(79, 70, 229, 0.8)",
          }}
          className={`flex items-center gap-1 cursor-pointer transition-colors duration-200`}
        >
          <Edit className="cursor-pointer" size={28} />
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
              {FaName}
            </DrawerTitle>
          </DrawerHeader>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 mt-2 no-scrollbar">
            {/* Todo Title */}
            <div className="space-y-2">
              <Label
                htmlFor="todo-name"
                className="text-gray-100 font-semibold"
              >
                Focus Area Name
              </Label>
              <Input
                id="focus-area-name"
                name="name"
                value={focusAreaName}
                onChange={(e) => setFocusAreaName(e.target.value)}
                className="w-full bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-blue-400"
              />
            </div>
             {/* Footer buttons */}
          <div className="pt-4 mt-4 border-t border-gray-700 flex justify-end items-center gap-3 shrink-0">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold px-6 py-2 rounded-full shadow-xl hover:scale-105 transition-transform"
            >
              {updateMutation.isPending ? "Updating..." : "🔄 Update"}
            </Button>
          </div>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
