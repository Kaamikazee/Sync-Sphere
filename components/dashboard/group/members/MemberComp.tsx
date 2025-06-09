"use client";

import * as React from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import { UserPermission } from "@prisma/client";
import Link from "next/link";
import { SubscriptionUser } from "@/types/extended";
import { Check, MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError, AxiosResponse } from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  member: SubscriptionUser;
  role: UserPermission;
  group_id: string;
}
export default function MemberComp({
  member: { user },
  role,
  group_id,
}: Props) {
  const { id, name, surname, username, image } = user;
  const router = useRouter();

  const { mutate: editUserRole, isPending } = useMutation({
    mutationFn: async (userRole: UserPermission) => {
      const { data } = (await axios.post("/api/group/users/edit_role", {
        userId: id,
        groupId: group_id,
        userRole,
      })) as AxiosResponse<UserPermission>;
      return data;
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "Oh no...Something went wrong. Please try again";

      toast.error(error);
    },

    onSuccess: () => {
      router.refresh();
    },
    mutationKey: ["editUserRole"],
  });

  const { mutate: removeUser, isPending: isRemoving } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/group/users/remove", {
        userId: id,
        groupId: group_id,
      });
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "Oh no...Something went wrong. Please try again";

      toast.error(error);
    },

    onSuccess: () => {
      router.refresh();
    },
    mutationKey: ["removeUserFromGroup"],
  });

  return (
    <div>
      <div className="flex justify-center items-center w-full">
        <List
          sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}
        >
          <ListItem alignItems="flex-start">
            <ListItemAvatar>
              <Avatar alt="Remy Sharp" src={image} />
            </ListItemAvatar>
            <ListItemText
              primary={name}
              secondary={
                <React.Fragment>
                  <div className="flex justify-between">
                    <div>
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ color: "text.primary", display: "inline" }}
                        className="mr-9"
                      >
                        Ali Connors{" "}
                      </Typography>
                    </div>
                    <div className="">
                      {role != "OWNER" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <MoreVertical size={18} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="flex items-center">
                                Role
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      editUserRole("CAN_EDIT");
                                    }}
                                  >
                                    Can Edit{" "}
                                    {role === "CAN_EDIT" && <Check size={18} />}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      editUserRole("READ_ONLY");
                                    }}
                                  >
                                    Read only{" "}
                                    {role === "READ_ONLY" && (
                                      <Check size={18} />
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      editUserRole("ADMIN");
                                    }}
                                  >
                                    Admin{" "}
                                    {role === "ADMIN" && <Check size={18} />}
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                            onClick={() => {removeUser()}}
                            >Kick</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              }
            />
          </ListItem>
          <Divider variant="inset" component="li" />
        </List>
      </div>
    </div>
  );
}
