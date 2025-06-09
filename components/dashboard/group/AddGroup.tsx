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
    <Dialog open={open} onOpenChange={setOpen}>
      <HoverCard openDelay={250} closeDelay={250}>
        <HoverCardTrigger>
          <div className="flex justify-center items-center">
            <div className="flex flex-col justify-center items-center">
              <DialogTrigger className="text-2xl mt-2 cursor-pointer flex flex-col justify-center items-center">
                <CirclePlusIcon size={55} />
                Create Group
              </DialogTrigger>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent>
            New Group
        </HoverCardContent>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new Group</DialogTitle>
            <DialogDescription>
              This will create a new group. You can edit the group later on as well.
            </DialogDescription>
          </DialogHeader>
          <AddGroupForm onSetOpen={setOpen} />
        </DialogContent>
      </HoverCard>
    </Dialog>
  );
};
