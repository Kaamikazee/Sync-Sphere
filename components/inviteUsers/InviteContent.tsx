"use client";

import { Group } from "@prisma/client";
import { Check, Copy, Link, RefreshCcw, UserPlus2 } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { useMemo, useState } from "react";
import { domain } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError, AxiosResponse } from "axios";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoadingState } from "../ui/loadingState";

interface Props {
  group: Group;
}

export const InviteContent = ({
  group: { id, adminCode, canEditCode, inviteCode, readOnlyCode },
}: Props) => {
  const [selectedRole, setSelectedRole] = useState<
    "viewer" | "admin" | "editor"
  >("editor");
  const [codes, setCodes] = useState({
    adminCode,
    canEditCode,
    inviteCode,
    readOnlyCode,
  });
  const inviteURL = useMemo(() => {
    const shareCode = () => {
      switch (selectedRole) {
        case "viewer":
          return codes.readOnlyCode;
        case "admin":
          return codes.adminCode;
        case "editor":
          return codes.canEditCode;
      }
    };

    return `${domain}/dashboard/invite/${
      codes.inviteCode
    }?role=${selectedRole}&shareCode=${shareCode()}`;
  }, [codes, selectedRole]);

  const router = useRouter();

  const { mutate: regenerateLink, isPending } = useMutation({
    mutationFn: async () => {
      const { data } = (await axios.post(
        "/api/group/invite/regenerate_link",
        { id }
      )) as AxiosResponse<Group>;

      setCodes({
        adminCode: data.adminCode,
        canEditCode: data.canEditCode,
        inviteCode: data.inviteCode,
        readOnlyCode: data.readOnlyCode,
      });

      return data;
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data ? JSON.stringify(err.response.data) : "ERRORS.DEFAULT";

      toast.error(error)
    },
    onSuccess: async () => {
      toast.success("Link regenerated successfully")
      router.refresh();
    },
    mutationKey: ["regenerateLink"],
  });

  const copyHandler = () => {
    navigator.clipboard.writeText(inviteURL);

    toast("Link Copied")
  };

  return (
    <div className="space-y-4 my-6">
      <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center gap-4 mr-2">
          <Link className="w-5 h-5" size={18} />
          <HoverCard openDelay={250} closeDelay={250}>
            <HoverCardTrigger asChild>
              <p className="overflow-hidden break-all h-5 w-full inline-block">
                {inviteURL}
              </p>
            </HoverCardTrigger>
            <HoverCardContent className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-4xl">
              <p className="break-words">{inviteURL}</p>
            </HoverCardContent>
          </HoverCard>
        </div>
        <Button
          disabled={isPending}
          onClick={() => regenerateLink()}
          className={`w-5 px-0 hover:bg-background hover:text-muted-foreground`}
          size={"icon"}
          variant={"ghost"}
        >
          {isPending ? <LoadingState /> : <RefreshCcw size={18} />}
        </Button>
      </div>
      <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <UserPlus2 className="w-5 h-5" size={18} />
          <span>PERMISSIONS</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={"ghost"}
              size={"sm"}
              className="flex gap-1 items-center px-0 h-fit hover:bg-background hover:text-muted-foreground"
            >
              {selectedRole === "admin" && (
                <p className="flex gap-1 items-center">
                  <span>😎</span>Admin<span></span>
                </p>
              )}
              {selectedRole === "editor" && (
                <p className="flex gap-1 items-center">
                  <span>🫡</span> <span>Editor</span>
                </p>
              )}
              {selectedRole === "viewer" && (
                <p className="flex gap-1 items-center">
                  <span>✌️</span> <span>Viewer</span>
                </p>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="center"
            sideOffset={15}
            className="max-w-xs"
          >
            <DropdownMenuItem
              onClick={() => {
                setSelectedRole("admin");
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span>😎</span>
                    <h3>Admin</h3>
                  </div>
                  {selectedRole === "admin" && <Check size={18} />}
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                It has all possible rights, including to change the settings of the group and to manage other users.
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedRole("editor");
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span>🫡</span>
                    <h3>Editor</h3>
                  </div>
                  {selectedRole === "editor" && <Check size={18} />}
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                He has all full access to the group and has rights to edit and delete content in the group. However, he does hot have access to the settings of the area.
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedRole("viewer");
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span>✌️</span>
                    <h3>Viewer</h3>
                  </div>
                  {selectedRole === "viewer" && <Check size={18} />}
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                He has full access to the group, but cannot edit or delete anything. He also does not have access to the area settings.
                </p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button
        disabled={isPending}
        onClick={copyHandler}
        className="w-full text-white font-bold flex items-center gap-2"
      >
        <Copy size={18} />
        </Button>
    </div>
  );
};
