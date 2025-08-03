"use client"
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AllGroups } from "@/lib/api";
import Image from "next/image";

interface Props {
  group: AllGroups;
}

export function ShowGroups({ group }: Props) {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <div
            //   href={`/groups/${group.id}`}
            key={group.id}
            className="bg-white dark:bg-zinc-800 rounded-xl shadow p-4 hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-700">
                {group.image ? (
                  <Image
                    src={group.image}
                    alt={group.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white font-bold text-xl">
                    {group.name?.[0] || "G"}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  {group.name}
                </h2>
                <p className="text-sm text-zinc-500">
                  {/* {group.description?.slice(0, 60) || "No description"} */}
                  No description
                </p>
                <p className="text-xs mt-1 text-zinc-400">
                  {group.subscribersCount || 0} members
                </p>
              </div>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-700">
                {group.image ? (
                  <Image
                    src={group.image}
                    alt={group.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white font-bold text-xl">
                    {group.name?.[0] || "G"}
                  </div>
                )}
              </div>
              <DialogTitle>{group.name}</DialogTitle>
            </div>
            <DialogDescription>
              {/* {group.description?.slice(0, 60) || "No description"} */}
              No description
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Join Group</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
