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
    <div className="group relative flex flex-col items-center cursor-pointer">
      {/* Glassy Circle Button */}
      <div className="flex justify-center items-center w-12 h-12 sm:w-14 sm:h-14 
                      bg-white/10 backdrop-blur-md border border-white/30 
                      rounded-full shadow-lg hover:scale-105 transition-transform">
        <CirclePlusIcon size={24} className="text-white/80" />
      </div>

      {/* Mobile Label */}
      <div className="mt-1 text-[10px] sm:hidden text-white/80">
        {update ? "Update Group" : "Create Group"}
      </div>

      {/* Desktop Tooltip */}
      <div className="absolute bottom-full mb-2 hidden sm:block opacity-0 group-hover:opacity-100 
                      text-xs text-white bg-black/60 px-2 py-1 rounded-md shadow 
                      transition-opacity whitespace-nowrap backdrop-blur-sm border border-white/30">
        {update ? "Update Group" : "Create Group"}
      </div>
    </div>
  );

  const Content = (
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
  );

  return (
    <div>
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
          <DrawerContent
            className="bg-white/10 backdrop-blur-lg border border-white/20 
                       rounded-t-2xl shadow-2xl px-5 sm:px-8 pt-5 pb-28 sm:pt-8 
                       flex flex-col min-h-[60vh] max-h-[90vh] overflow-y-auto no-scrollbar"
            style={{ scrollPaddingBottom: "7rem" }}
          >
            <DrawerHeader className="shrink-0">
              <DrawerTitle className="text-white text-xl">
                {update ? "Update Group" : "Create Group"}
              </DrawerTitle>
              <DrawerDescription className="text-white/80">
                Fill in the form below
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto">{Content}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
          <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 
                                    rounded-2xl shadow-2xl p-5 sm:p-8 
                                    max-w-[90vw] sm:max-w-md w-full mx-auto 
                                    max-h-[90vh] overflow-y-auto no-scrollbar">
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
