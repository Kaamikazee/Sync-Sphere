import * as React from "react";
import { format } from "date-fns";
import Link from "next/link";
import { GroupsWithUserName } from "@/lib/api";
import { Lock, MessageCircle } from "lucide-react";
import Image from "next/image";

interface Props {
  group: GroupsWithUserName;
  href: string;
}

export default function GroupComp({
  group: { id, image, name, createdAt, creatorName, isPrivate },
  href,
}: Props) {
  return (
    <Link href={`${href}/${id}`}>
      <div
        className="cursor-pointer rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 
                   p-4 sm:p-5 shadow-lg hover:scale-[1.02] hover:shadow-2xl transition"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Avatar + Name + Info */}
          <div className="flex items-start gap-4 min-w-0">
            {/* Avatar */}
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-white/30 bg-white/10 shrink-0">
              {image ? (
                <Image src={image} alt={name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white font-bold text-xl">
                  {name?.[0] || "G"}
                </div>
              )}
            </div>

            {/* Text Info */}
            <div className="flex flex-col min-w-0">
              <span className="text-white text-base sm:text-lg font-semibold flex items-center gap-1 whitespace-nowrap truncate">
                {name}
                {isPrivate && (
                  <Lock size={14} className="text-white/70" />
                )}
              </span>
              <div className="flex gap-4 text-xs sm:text-sm mt-1 whitespace-nowrap">
                <span className="text-white/90 truncate max-w-[120px] sm:max-w-[160px]">
                  {creatorName}
                </span>
                <span className="text-white/80 font-mono truncate">{format(createdAt, "dd-MM-yy")}</span>
              </div>
            </div>
          </div>

          {/* Right: Chat Icon */}
          <Link href={`/dashboard/groups/${id}/chat`}>
            <button
              className="p-2 rounded-full hover:bg-white/20 transition"
              title="Go to Chat"
            >
              <MessageCircle className="text-white" size={20} />
            </button>
          </Link>
        </div>
      </div>
    </Link>
  );
}
