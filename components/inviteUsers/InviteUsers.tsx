import { Group } from "@prisma/client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Button } from "../ui/button"
import { UserPlus2 } from "lucide-react"
import { InviteContent } from "./InviteContent"
  

interface Props {
    group: Group
}

export const InviteUsers = ({group}: Props) => {
    return (
        <Dialog>
  <DialogTrigger asChild>
    <Button size={"icon"} variant={"ghost"} className="sm:bg-primary/10 sm:text-primary sm:hover:bg-primary sm:hover:text-white sm:h-9 sm:rounded-md sm:px-3 sm:w-auto sm:space-x-2">
    <span className="hidden sm:inline">Invite</span>
    <UserPlus2 className="" size={18} />
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Invite users to {group.name}</DialogTitle>
      <DialogDescription>
      Some content related to sharing access to other users
      </DialogDescription>
    </DialogHeader>
    <InviteContent group={group} />
  </DialogContent>
</Dialog>
    )
}