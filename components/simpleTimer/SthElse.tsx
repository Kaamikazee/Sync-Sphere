"use client";

import React, { useState, useMemo } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Group } from "@prisma/client";
import Link from "next/link";
import { NewLeaderboard } from "../dashboard/group/leaderboard/NewLeaderboard";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  groups: Group[];
  userId: string;
}

export function SthElse({ groups, userId }: Props) {
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

  return (
    <div className="relative max-w-3xl mx-auto mt-6 sm:mt-10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl px-3 py-4 sm:p-6">
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
              Group:{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 text-transparent bg-clip-text break-words">
                <Link href={`groups/${currentGroup.id}`}>
                  {currentGroup.name}
                </Link>
              </span>
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
                groupId={currentGroup.id}
                uuserId={userId}
                groupName={currentGroup.name}
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
        <PaginationContent className="flex flex-wrap gap-1 sm:gap-2 justify-center">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-sm rounded-lg transition"
              onClick={(e) => {
                e.preventDefault();
                goTo(currentPage - 1);
              }}
            />
          </PaginationItem>

          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${
                  page === currentPage
                    ? "bg-indigo-500 text-white font-semibold"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(page);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {pageCount > 5 && (
            <>
              <PaginationItem>
                <PaginationEllipsis className="text-white/70" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition"
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(pageCount);
                  }}
                >
                  {pageCount}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
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
