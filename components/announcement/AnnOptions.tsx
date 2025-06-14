import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mic, MoreVerticalIcon } from "lucide-react";
import { Separator } from "../ui/separator";
import { EditAnnouncement } from "./CreateAnnouncement";

export const AnnOptions = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
          <MoreVerticalIcon className="w-6 h-6 text-white" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-[12rem] bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg py-2"
      >
        <DropdownMenuItem className="flex items-center gap-2 px-4 py-2 hover:bg-white/20 rounded-lg transition">
          <EditAnnouncement />
        </DropdownMenuItem>

        <DropdownMenuItem className="px-4 py-2 hover:bg-white/20 rounded-lg transition">
          Delete
        </DropdownMenuItem>

        <Separator className="my-1 border-white/30" />

        <DropdownMenuItem className="flex items-center gap-2 px-4 pt-2 pb-3 hover:bg-white/20 rounded-lg transition">
          <Mic className="w-5 h-5 text-white" />
          Notice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
