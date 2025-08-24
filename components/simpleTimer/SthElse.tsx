"use client";

import React, { useState, useMemo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "next/link";
import { NewLeaderboard } from "../dashboard/group/leaderboard/NewLeaderboard";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import Image from "next/image";
import { useSwipeable } from "react-swipeable";
import { groupsWithUserNameAndRole } from "@/lib/api";

interface Props {
  groups: groupsWithUserNameAndRole[];
  userId: string;
  userName: string;
}

export function SthElse({ groups, userId, userName }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 1;
  const pageCount = Math.ceil(groups.length / itemsPerPage);

  const currentGroup = useMemo(() => {
    const idx = (currentPage - 1) * itemsPerPage;
    return groups[idx];
  }, [currentPage, groups]);

  const goTo = (page: number) => {
    if (page < 1 || page > pageCount) return;
    setCurrentPage(page);
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => goTo(currentPage + 1),
    onSwipedRight: () => goTo(currentPage - 1),
    trackTouch: true,
    trackMouse: false,
    // touchEventOptions: { passive: false }, // 👈 replaces preventDefaultTouchmoveEvent
  });

  return (
    <div
      {...handlers}
      className="touch-none sm:touch-auto relative max-w-3xl mx-auto mt-6 sm:mt-10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl px-3 py-4 sm:p-6"
    >
      {currentGroup ? (
        <div className="mb-6 sm:mb-8">
          {/* 👇 Animated Group Name */}
          <AnimatePresence mode="wait">
            <motion.h2
              key={currentGroup.id + "-title"}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="text-base sm:text-2xl font-bold text-white mb-2 sm:mb-4 leading-snug"
            >
              <div className="flex items-center gap-x-2">
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0">
                  {currentGroup.image ? (
                    <Image
                      src={currentGroup.image}
                      alt={`${currentGroup.name ?? "Group"} avatar`}
                      width={40}
                      height={40}
                      className="rounded-full ring-2 ring-white/40 size-full hover:ring-white/70 object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-xs sm:text-sm font-bold text-white ring-2 ring-white/40 hover:ring-white/70">
                      {currentGroup.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <span className="bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 text-transparent bg-clip-text break-words">
                  <Link href={`groups/${currentGroup.id}`}>
                    {currentGroup.name}
                  </Link>
                </span>
              </div>
            </motion.h2>
          </AnimatePresence>

          {/* 👇 Animated Leaderboard */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentGroup.id + "-board"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              layout="position" // Optional smoother effect
            >
              <NewLeaderboard
                uuserId={userId}
                groupId={currentGroup.id}
                groupName={currentGroup.name}
                uuserName={userName}
                sessionUserRole={currentGroup.userRole}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <p className="text-white/70 text-sm sm:text-base">
          No group on this page.
        </p>
      )}

      {/* Pagination UI (unchanged) */}
      <Pagination className="mt-5 sm:mt-6">
        <PaginationContent
          className="flex gap-1 sm:gap-2 justify-start sm:justify-center overflow-x-auto no-scrollbar px-1"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Hide on mobile */}
          <PaginationItem className="hidden sm:block">
            <PaginationPrevious
              href="#"
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-sm rounded-lg transition"
              onClick={(e) => {
                e.preventDefault();
                goTo(currentPage - 1);
              }}
            />
          </PaginationItem>

          {groups.map((group, idx) => (
            <PaginationItem
              key={group.id}
              style={{ scrollSnapAlign: "start" }}
              className="flex-shrink-0"
            >
              <PaginationLink
                title={group.name}
                href="#"
                isActive={currentPage === idx + 1}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  currentPage === idx + 1
                    ? "bg-indigo-500 text-white font-semibold"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(idx + 1);
                }}
              >
                {group.name
                  .split(" ")
                  .map((word) => word[0]?.toUpperCase())
                  .join("")
                  .slice(0, 3)}
              </PaginationLink>
            </PaginationItem>
          ))}

          {/* Dialog trigger remains visible */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <PaginationItem className="flex-shrink-0">
                <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition">
                  ...
                </button>
              </PaginationItem>
            </DialogTrigger>

            <DialogContent
              className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 
             backdrop-blur-xl border border-white/20 text-white shadow-2xl 
             rounded-2xl p-4 sm:p-6 w-[90vw] max-w-sm"
            >
              <DialogHeader>
                <DialogTitle className="text-white text-lg">
                  Jump to Group
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                {groups.map((group, idx) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      goTo(idx + 1);
                      setDialogOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition"
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Hide on mobile */}
          <PaginationItem className="hidden sm:block">
            <PaginationNext
              href="#"
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-sm rounded-lg transition"
              onClick={(e) => {
                e.preventDefault();
                goTo(currentPage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
