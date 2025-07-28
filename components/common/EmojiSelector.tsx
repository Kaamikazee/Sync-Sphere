"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  asChild?: boolean;
  classname?: string;
  children: React.ReactNode;
  setSelectedEmoji: React.Dispatch<React.SetStateAction<string>>;
}

interface OnSelect {
  id: string;
  keywords: string[];
  name: string;
  native: string;
  shortcodes: string;
  unified: string;
}

export const EmojiSelector = ({
  children,
  setSelectedEmoji,
  asChild,
  // classname,
}: Props) => {
  const { theme, /*setTheme,*/ systemTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const emojiTheme = useMemo(() => {
    switch (theme) {
      case "dark":
        return "dark";
      case "light":
        return "light";
      case "system":
        return systemTheme;

      default:
        break;
    }
  }, [theme, systemTheme]);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild={asChild}
        className={cn(
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded-lg"
        )}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="z-50 emoji-picker">
          <Picker
            data={data}
            emojiSize={20}
            emojiButtonSize={32}
            theme={emojiTheme}
            onEmojiSelect={(e: OnSelect) => {
              setSelectedEmoji(e.native);
              setOpen(false);
            }}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
