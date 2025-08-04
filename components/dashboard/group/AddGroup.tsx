"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CirclePlusIcon } from "lucide-react";
import { AddGroupForm } from "./AddGroupForm";

interface Props {
  update?: boolean;
}

export const AddGroup = ({ update }: Props) => {
  const [open, setOpen] = useState(false);

  return (
  <div>
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex justify-center items-center">
        <div className="flex flex-col justify-center items-center p-4 sm:p-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg transition hover:scale-[1.03] hover:shadow-2xl">
          <DialogTrigger className="flex flex-col justify-center items-center cursor-pointer">
            <CirclePlusIcon size={48} className="text-white mb-2 sm:size-[55px]" />
            <span className="text-white text-lg sm:text-xl font-semibold text-center">
              {update ? "Update Group" : "Create Group"}
            </span>
          </DialogTrigger>
        </div>
      </div>

      <DialogContent
        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-5 sm:p-8 max-w-[90vw] sm:max-w-md w-full mx-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-white mb-2">
            {update ? "Update Group" : "Create a new Group"}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-white/80 mb-6">
            This will {update ? "update the group" : "create a new group"}. You can edit the group later on as well.
          </DialogDescription>
        </DialogHeader>

        <AddGroupForm onSetOpen={setOpen} />
      </DialogContent>
    </Dialog>
  </div>
);

};
