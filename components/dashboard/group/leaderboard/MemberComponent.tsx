import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import Image from "next/image";
import Link from "next/link";
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
  isOnline?: boolean;
  isMe?: boolean;
  role?: string; // Added role prop
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
  isOnline = false,
  isMe = false,
  role = "Member", // Default to "Member" if not provided
}: Props) {
  const queryClient = useQueryClient();
  
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
      toast.error(
        `Failed to issue warning for ${name}: ${error.response?.statusText}`,
        {
          duration: 5000,
        }
      );
      console.error("Error issuing warning:", error);
    },
  });
  const { mutate: cancelWarning, isPending: isCancelWarningPending } =
    useMutation({
      mutationFn: async () => {
        // Simulate a wake-up action
        await axios.post("/api/warning/cancel", {
          warningId: warningId,
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
        toast.error(
          `Failed to cancel the warning for ${name}: ${error.response?.statusText}`,
          {
            duration: 5000,
          }
        );
        console.error("Error canceling warning:", error);
      },
    });

  const HandleCancelWarning = () => {
    if (isCancelWarningPending) return; // Prevent multiple clicks
    cancelWarning();
  };

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
            className={`flex items-center justify-between px-3 py-2 sm:px-6 sm:py-4 
            rounded-xl relative text-white/90 transition-transform duration-200 
            hover:scale-100 sm:hover:scale-105 
            hover:bg-white/10 sm:hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] 
            hover:ring-0 sm:hover:ring-2 sm:hover:ring-white/30 
            ${isMe ? "ring-2 ring-indigo-500/80 bg-indigo-500/10" : ""}
          `}
          >
            {/* Warning Overlay */}
            {warningId && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-400/80 rounded-xl border border-red-500 shadow-md sm:shadow-2xl animate-pulse px-2 text-center">
                <span className="text-white font-bold text-xs sm:text-base flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 animate-bounce"
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

            {/* Left section: Rank, Avatar, Name */}
            <div
              className={`flex items-center gap-2 sm:gap-4 ${
                warningId ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <span className="text-sm sm:text-lg font-bold text-[#2c2c2c]">
                #{index + 1}
              </span>

              <div className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0">
                {image ? (
                  <Image
                    src={image}
                    alt={`${name ?? "User"} avatar`}
                    width={40}
                    height={40}
                    className="rounded-full ring-2 ring-white/40 size-full hover:ring-white/70 object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-xs sm:text-sm font-bold text-white ring-2 ring-white/40 hover:ring-white/70">
                    {name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>

              <span className="text-xs sm:text-base font-medium text-[#2c2c2c] flex items-center gap-1 flex-wrap max-w-[120px] sm:max-w-none">
                {name ?? "Anonymous"}
                {isMe && (
                  <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 font-semibold">
                    You
                  </span>
                )}
              </span>
            </div>

            {/* Right section: Timer */}
            <span
              className={`text-xs sm:text-xl font-mono text-[#2c2c2c] ${
                warningId ? "opacity-40" : ""
              }`}
            >
              {base}
            </span>
          </div>
        </DialogTrigger>

        {/* Dialog Content */}
        <DialogContent className="max-w-full sm:max-w-[425px] p-4 sm:p-6 overflow-y-auto">
          <DialogHeader className="flex items-center justify-between gap-2">
            <div className="relative w-10 h-10">
              {image ? (
                <Image
                  src={image}
                  alt={`${name ?? "User"} avatar`}
                  width={40}
                  height={40}
                  className="rounded-full ring-2 ring-white/40 size-full hover:ring-white/70 object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/40 hover:ring-white/70">
                  {name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>

            <DialogTitle className="text-sm sm:text-lg font-semibold font-mono">
              {base}
            </DialogTitle>
          </DialogHeader>

          {/* Footer buttons (wrap on small screens) */}
          <DialogFooter className="mt-4 sm:mt-6 flex flex-wrap justify-end gap-2">
            <Link href={`/profile/${id}/reports`} className="w-full sm:w-auto">
              <Button size="sm" className="w-full sm:min-w-[100px]">
                Reports
              </Button>
            </Link>
            <Button
              size="sm"
              type="submit"
              disabled={isPending}
              onClick={handleWakeUp}
              className="w-full sm:w-auto"
            >
              Wake Up
            </Button>
            {(role === "ADMIN" || role === "OWNER") &&
              (!warningId ? (
                <Button
                  size="sm"
                  type="submit"
                  variant="destructive"
                  disabled={isWarningPending}
                  onClick={handleWarning}
                  className="w-full sm:w-auto"
                >
                  Issue Warning
                </Button>
              ) : (
                <Button
                  size="sm"
                  type="submit"
                  variant="outline"
                  disabled={isCancelWarningPending}
                  onClick={HandleCancelWarning}
                  className="w-full sm:w-auto"
                >
                  Cancel Warning
                </Button>
              ))}
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
