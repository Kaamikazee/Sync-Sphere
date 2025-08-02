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

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

import { CirclePlusIcon } from "lucide-react";
import { AddGroupForm } from "./AddGroupForm";

export const AddGroup = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <HoverCard openDelay={250} closeDelay={250}>
          <HoverCardTrigger>
            <div className="flex justify-center items-center">
              <div className="flex flex-col justify-center items-center p-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg transition hover:scale-[1.03] hover:shadow-2xl">
                <DialogTrigger className="flex flex-col justify-center items-center cursor-pointer">
                  <CirclePlusIcon size={55} className="text-white mb-2" />
                  <span className="text-white text-xl font-semibold">
                    Create Group
                  </span>
                </DialogTrigger>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="bg-white/20 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-md">
            <p className="text-white font-medium">New Group</p>
          </HoverCardContent>

          <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                Create a new Group
              </DialogTitle>
              <DialogDescription className="text-white/80 mb-6">
                This will create a new group. You can edit the group later on as
                well.
              </DialogDescription>
            </DialogHeader>
            <AddGroupForm onSetOpen={setOpen} />
          </DialogContent>
        </HoverCard>
      </Dialog>
    </div>
  );
};
