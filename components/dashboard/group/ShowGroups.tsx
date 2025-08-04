"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AllGroups } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { Lock } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  group: AllGroups;
}

export function ShowGroups({ group }: Props) {
  const [showMainDialog, setShowMainDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  const handleGroupClick = () => {
    if (group.isPrivate) {
      setShowPasswordDialog(true);
    } else {
      setShowMainDialog(true);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === group.password) {
      setShowPasswordDialog(false);
      setShowMainDialog(true);
      setPassword("");
      setError("");
    } else {
      setError("Incorrect password");
      toast.error("Incorrect password");
    }
  };

  // http://localhost:3000/dashboard/group/cmbkvkmie0004ys5c79m92dyd

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/group/join`, { groupId: group.id, password });
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data
        ? JSON.stringify(err.response.data)
        : "Something went wrong.";
      toast.error(error);
    },
    onSuccess: () => {
      toast.success("You have joined the group successfully!");
      setShowMainDialog(false);
      setPassword("");
      router.refresh();
      router.push(`/dashboard/groups/${group.id}`);
    },
    mutationKey: ["joinGroup"],
  });

  return (
    <>
      {/* TRIGGER */}
      <div
        key={group.id}
        onClick={handleGroupClick}
        className="bg-white dark:bg-zinc-800 rounded-xl shadow p-4 hover:shadow-md transition cursor-pointer"
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
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
              {group.name}
              {group.isPrivate && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full flex items-center gap-1">
                  <Lock size={12} />
                  Private
                </span>
              )}
            </h2>
            <p className="text-sm text-zinc-500">
              {group.description?.slice(0, 60) || "No description"}
            </p>
            <p className="text-xs mt-1 text-zinc-400">
              {group.subscribersCount || 0} members
            </p>
          </div>
        </div>
      </div>

      {/* PASSWORD DIALOG */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Enter Group Password</DialogTitle>
            <DialogDescription>
              This group is private. Enter the password to proceed.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="Group password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MAIN GROUP JOIN DIALOG */}
      <Dialog open={showMainDialog} onOpenChange={setShowMainDialog}>
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
              <DialogTitle className="flex items-center gap-2">
                {group.name}
                {group.isPrivate && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full flex items-center gap-1">
                    <Lock size={12} />
                    Private
                  </span>
                )}
              </DialogTitle>
            </div>
            <DialogDescription>
              {group.description || "No description"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={isPending}
              onClick={() => {
                mutate();
              }}
              type="submit"
            >
              Join Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
