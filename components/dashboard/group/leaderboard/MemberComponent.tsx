import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation } from "@tanstack/react-query"
import axios from "axios"
import Image from "next/image"
import { toast } from "sonner"

interface Props {
    image: string | null,
    index: number;
    name: string | null;
    base: string | null;
    id: string;
    uusername: string | null;
}

export function MemberComponent({name, image, index, base, id, uusername}: Props) {

  const {mutate, isPaused} = useMutation({
    mutationFn: async () => {
      // Simulate a wake-up action
      await axios.post("/api/notifications/wake", { 
        targetUserId: id,
        message: `You've been woken up by ${uusername || "an anonymous user"}!`,
       })
      return new Promise((resolve) => setTimeout(resolve, 1000))
    },
    onSuccess: () => {
      // Handle success, e.g., show a toast or update state
      toast.success(`${name} has been woken up!`, {
        duration: 3000,
      })
    },
    onError: (error) => {
      // Handle error, e.g., show an error message
      toast.error(`Failed to wake up ${name}: ${error.message}`, {
        duration: 3000,
      })
      console.error("Error waking up:", error)
    },
  })

  const handleWakeUp = () => {
    mutate();
  }
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
            <div className="flex items-center justify-between py-4 px-6 hover:scale-105 transition-all duration-300 text-white/90
             hover:bg-white/10 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:ring-2 hover:ring-white/30
             rounded-xl">
        <div className="flex items-center space-x-4">
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
              <span className="text-xl font-mono">
                {base}
              </span>
    </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="flex items-center space-x-4">
            <Image src={image ?? "/default-avatar.png"} alt={`${name ?? "User"} avatar`} width={40} height={40} className="rounded-full ring-2 ring-white/50 size-10 hover:ring-white/80" />
            <DialogTitle>{name}</DialogTitle>
            <DialogTitle className="inline-flex items-center justify-center text-lg font-semibold">
             {base}
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleWakeUp}>Wake up</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
