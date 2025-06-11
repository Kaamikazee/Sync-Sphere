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
import Leaderboard from "../group/leaderboard/Leaderboard";
// import Leaderboard from "./Leaderboard"; // ← your leaderboard display

interface Props {
  groups: Group[];
  userId: string
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
    <div>
      {/* — render the group & its leaderboard — */}
      {currentGroup ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Group: {currentGroup.name}
          </h2>
          <Leaderboard groupId={currentGroup.id} userId={userId} />
        </div>
      ) : (
        <p>No group on this page.</p>
      )}

      {/* — pagination UI — */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                goTo(currentPage - 1);
              }}
            />
          </PaginationItem>

          {/* render page numbers, with ellipsis if many */}
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(page);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {/* optional: ellipsis & last page if you want to truncate */}
          {pageCount > 5 && (
            <>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
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
