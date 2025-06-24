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
// import { NewLeaderboard } from "../group/leaderboard/NewLeaderboard";
import Link from "next/link";
import { NewLeaderboard } from "../dashboard/group/leaderboard/NewLeaderboard";
// import Leaderboard from "./Leaderboard"; // ← your leaderboard display

interface Props {
  groups: Group[];
  userId: string;
}

export function SthElse({ groups, userId }: Props) {
  
  // 1) state for which page we’re on (1-based)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 1;

  // 2) compute total pages
  const pageCount = Math.ceil(groups.length / itemsPerPage);

  // 3) pick the single group for this page
  const currentGroup = useMemo(() => {
    const idx = (currentPage - 1) * itemsPerPage;
    return groups[idx];
  }, [currentPage, groups]);

  // 4) helper to jump pages
  const goTo = (page: number) => {
    if (page < 1 || page > pageCount) return;
    setCurrentPage(page);
  };

  

  return (
    <div className="relative max-w-3xl mx-auto mt-10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl p-6">
  {/* — render the group & its leaderboard — */}
  {currentGroup ? (
    
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4">
        Group: <span className="bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 text-transparent bg-clip-text"><Link href={`groups/${currentGroup.id}`}>{currentGroup.name} </Link></span>
      </h2>
      <NewLeaderboard groupId={currentGroup.id} uuserId={userId}/>
    </div>
  ) : (
    <p className="text-white/70">No group on this page.</p>
  )}

  {/* — pagination UI — */}
  <Pagination className="mt-6">
    <PaginationContent className="flex flex-wrap gap-2 justify-center">
      <PaginationItem>
        <PaginationPrevious
          href="#"
          className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
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
            className={`px-3 py-1.5 rounded-lg transition ${
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
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
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
          className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
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
