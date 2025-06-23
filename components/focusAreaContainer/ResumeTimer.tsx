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
import { useBreakStore } from "@/stores/useBreakStore"
import { PlayCircle } from "lucide-react"

export function ResumeTimer({onStart: OnSubmit}: {onStart: () => void}) {
    const breakReason = useBreakStore((s) => s.breakReason)
    const setBreakReason = useBreakStore((s) => s.setBreakReason)

  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
           <PlayCircle
        //   onClick={onStart}
          className="cursor-pointer text-white"
          size={40}
        />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Break Reason</DialogTitle>
            <DialogDescription>
              Provide a reason for the break
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Break</Label>
              <Input id="name-1" name="name" defaultValue={breakReason} onChange={(e) => {setBreakReason(e.target.value)}}/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={OnSubmit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
