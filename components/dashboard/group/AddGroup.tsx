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
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

import { CirclePlusIcon } from "lucide-react";
import { AddGroupForm } from "./AddGroupForm";
import { UpdateGroupForm } from "./UpdateGroupForm";
import { Group } from "@prisma/client";
import { useMediaQuery } from "@/hooks/use-media-query";

interface Props {
  update?: boolean;
  groupId?: string;
  group?: Group;
}

export const AddGroup = ({ update, groupId, group }: Props) => {
  const [open, setOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width: 640px)");

  const TriggerButton = (
    <div className="flex justify-center items-center">
      <div className="flex flex-col justify-center items-center p-4 sm:p-6 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg transition hover:scale-[1.03] hover:shadow-2xl">
        <div className="flex flex-col justify-center items-center cursor-pointer">
          <CirclePlusIcon size={48} className="text-white mb-2 sm:size-[55px]" />
          <span className="text-white text-lg sm:text-xl font-semibold text-center">
            {update ? "Update Group" : "Create Group"}
          </span>
        </div>
      </div>
    </div>
  );

  const Content = (
    <>
      <div className="space-y-4">
        <div className="text-xl sm:text-2xl font-bold text-white mb-2">
          {update ? "Update Group" : "Create a new Group"}
        </div>
        <div className="text-sm sm:text-base text-white/80 mb-6">
          This will {update ? "update the group" : "create a new group"}. You can edit the group later on as well.
        </div>
        {update ? (
          <UpdateGroupForm onSetOpen={setOpen} groupId={groupId} group={group} />
        ) : (
          <AddGroupForm onSetOpen={setOpen} />
        )}
      </div>
    </>
  );

  return (
    <div>
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            {TriggerButton}
          </DrawerTrigger>
          <DrawerContent className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-t-2xl shadow-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
            <DrawerHeader>
              <DrawerTitle className="text-white text-xl">
                {update ? "Update Group" : "Create Group"}
              </DrawerTitle>
              <DrawerDescription className="text-white/80">
                Fill in the form below
              </DrawerDescription>
            </DrawerHeader>
            {Content}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
          <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-5 sm:p-8 max-w-[90vw] sm:max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto no-scrollbar">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white mb-2">
                {update ? "Update Group" : "Create a new Group"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base text-white/80 mb-6">
                This will {update ? "update the group" : "create a new group"}. You can edit the group later on as well.
              </DialogDescription>
            </DialogHeader>
            {Content}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

};
