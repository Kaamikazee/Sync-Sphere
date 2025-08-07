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
    {/* GROUP CARD */}
    <div
      key={group.id}
      onClick={handleGroupClick}
      className="cursor-pointer rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 p-4 sm:p-5 shadow-lg hover:scale-[1.02] hover:shadow-2xl transition"
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/30 bg-white/10">
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

        {/* Text Info */}
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {group.name}
            {group.isPrivate && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-white/10 border border-white/20 text-white/80 rounded-full flex items-center gap-1">
                <Lock size={12} />
                Private
              </span>
            )}
          </h2>
          <p className="text-sm text-white/80">
            {group.description?.slice(0, 60) || "No description"}
          </p>
          <p className="text-xs mt-1 text-white/60">
            {group.subscribersCount || 0} members
          </p>
        </div>
      </div>
    </div>

    {/* PASSWORD DIALOG */}
    <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
      <DialogContent className="sm:max-w-[400px] backdrop-blur-lg bg-white/10 border border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Enter Group Password</DialogTitle>
          <DialogDescription className="text-white/80">
            This group is private. Enter the password to proceed.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          placeholder="Group password"
          className="bg-white/10 border border-white/30 text-white placeholder-white/50"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowPasswordDialog(false)}
            className="border-white/40 text-gray-900 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button onClick={handlePasswordSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* MAIN GROUP JOIN DIALOG */}
    <Dialog open={showMainDialog} onOpenChange={setShowMainDialog}>
      <DialogContent className="sm:max-w-[425px] backdrop-blur-lg bg-white/10 border border-white/20 text-white">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/30 bg-white/10">
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
            <DialogTitle className="flex items-center gap-2 text-white">
              {group.name}
              {group.isPrivate && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-white/10 border border-white/20 text-white/80 rounded-full flex items-center gap-1">
                  <Lock size={12} />
                  Private
                </span>
              )}
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/80">
            {group.description || "No description"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-white/40 text-gray-900 hover:bg-white/10">
              Cancel
            </Button>
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
