import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import Image from "next/image";
import { toast } from "sonner";

interface Props {
  image: string | null;
  index: number;
  name: string | null;
  base: string | null;
  id: string;
  uusername: string | null;
  groupName: string | null;
  warningMessage?: string | null;
  warningId?: string | null;
  groupId: string;
}

export function MemberComponent({
  name,
  image,
  index,
  base,
  id,
  uusername,
  groupName,
  warningMessage,
  warningId,
  groupId,
}: Props) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      // Simulate a wake-up action
      await axios.post("/api/notifications/wake", {
        targetUserId: id,
        message: `You've been woken up by ${
          uusername || "an anonymous user"
        } from ${groupName || "a group"}!`,
      });
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      // Handle success, e.g., show a toast or update state
      
      toast.success(`${name} has been woken up!`, {
        duration: 3000,
      });
    },
    onError: (error: AxiosError) => {
      // Handle error, e.g., show an error message
      toast.error(`Failed to wake up ${name}: ${error.response?.statusText}`, {
        duration: 5000,
      });
      console.error("Error waking up:", error);
    },
  });
  const { mutate: warningMutate, isPending: isWarningPending } = useMutation({
    mutationFn: async () => {
      // Simulate a warning action
      await axios.post("/api/warning/issue", {
        targetUserId: id,
        message: `You've been issued a warning by ${
          uusername || "an anonymous user"
        } from ${groupName || "a group"}!`,
        groupId,
      });
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      // Handle success, e.g., show a toast or update state
      queryClient.invalidateQueries({ queryKey: ["groupMembers", groupId] });
      toast.success(`${name} has been issued a warning!`, {
        duration: 3000,
      });
    },
    onError: (error: AxiosError) => {
      // Handle error, e.g., show an error message
      toast.error(`Failed to issue warning for ${name}: ${error.response?.statusText}`, {
        duration: 5000,
      });
      console.error("Error issuing warning:", error);
    },
  });
  const { mutate: cancelWarning, isPending: isCancelWarningPending } = useMutation({
    mutationFn: async () => {
      // Simulate a wake-up action
      await axios.post("/api/warning/cancel", {
        warningId: warningId
      });
      return new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      // Handle success, e.g., show a toast or update state
      queryClient.invalidateQueries({ queryKey: ["groupMembers", groupId] });
      toast.success(`Warning card for ${name} has been canceled!`, {
        duration: 3000,
      });
    },
    onError: (error: AxiosError) => {
      // Handle error, e.g., show an error message
      toast.error(`Failed to cancel the warning for ${name}: ${error.response?.statusText}`, {
        duration: 5000,
      });
      console.error("Error canceling warning:", error);
    },
  });

  const HandleCancelWarning = () => {
    if (isCancelWarningPending) return; // Prevent multiple clicks
    cancelWarning();
  }

  // Handle the wake-up action
  const handleWarning = () => {
    warningMutate();
  };

  const handleWakeUp = () => {
    mutate();
  };
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <div
            className="flex items-center justify-between py-4 px-6 hover:scale-105 transition-all duration-300 text-white/90
             hover:bg-white/10 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:ring-2 hover:ring-white/30
             rounded-xl relative"
          >
            {warningId && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-300/80 bg-blur rounded-xl border-2 border-red-400 shadow-2xl animate-pulse">
                <span className="text-white font-bold text-lg flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-yellow-300 animate-bounce"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                    />
                  </svg>
                  {warningMessage}
                </span>
              </div>
            )}
            <div
              className={`flex items-center space-x-4 ${
                warningId ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <span className="text-xl font-bold text-white">#{index + 1}</span>
              <Image
                src={image ?? "/default-avatar.png"}
                alt={`${name ?? "User"} avatar`}
                width={40}
                height={40}
                className="rounded-full ring-2 ring-white/50 size-10 hover:ring-white/80"
              />
              <span className="text-lg">{name ?? "Anonymous"}</span>
            </div>
            <span
              className={`text-xl font-mono ${warningId ? "opacity-40" : ""}`}
            >
              {base}
            </span>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="flex items-center space-x-4">
            <Image
              src={image ?? "/default-avatar.png"}
              alt={`${name ?? "User"} avatar`}
              width={40}
              height={40}
              className="rounded-full ring-2 ring-white/50 size-10 hover:ring-white/80"
            />
            <DialogTitle>{name}</DialogTitle>
            <DialogTitle className="inline-flex items-center justify-center text-lg font-semibold">
              {base}
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} onClick={handleWakeUp}>
              Wake up
            </Button>
            {!warningId ?  <Button
              type="submit"
              variant={"destructive"}
              disabled={isWarningPending}
              onClick={handleWarning}
            >
              Issue Warning
            </Button> : <Button type="submit"
              variant={"outline"}
              disabled={isCancelWarningPending}
              onClick={HandleCancelWarning}
            >
              Cancel Warning
              </Button>}
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
