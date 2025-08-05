"use client";

import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <motion.div
      className="w-full overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-4 bg-gradient-to-br from-sky-800/40 via-purple-800/30 to-indigo-800/40 backdrop-blur-sm">
        <section className="flex flex-col items-center gap-6 w-full">
          {/* Date navigation skeleton */}
          <div className="w-full max-w-xl animate-pulse space-y-4">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-xl" />
              <div className="w-52 h-10 bg-white/20 rounded-xl" />
              <div className="w-10 h-10 bg-white/20 rounded-xl" />
            </div>

            {/* Timer card skeleton */}
            <div className="relative bg-white/10 p-6 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md space-y-6">
              <div className="h-16 w-2/3 mx-auto bg-white/20 rounded-lg" />
              <div className="flex justify-center mt-2">
                <div className="w-24 h-10 bg-white/20 rounded-xl" />
              </div>
              <div className="w-20 h-4 bg-white/20 rounded-md ml-auto" />
              <div className="w-32 h-5 bg-white/20 rounded mx-auto" />
              <div className="w-24 h-4 bg-white/20 rounded mx-auto" />
            </div>

            {/* Focus Area Container Skeleton */}
            <div className="space-y-4 mt-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-white/10 rounded-xl border border-white/20"
                />
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar Skeleton (Leaderboard) */}
        <aside className="w-full animate-pulse">
          <div className="p-4 h-full">
            <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl shadow-lg p-6 h-full space-y-4">
              <div className="h-6 w-1/2 bg-white/20 rounded-lg mx-auto" />
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3 bg-white/10 rounded-xl border border-white/10"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 bg-white/20 rounded" />
                    <div className="h-3 w-1/3 bg-white/10 rounded" />
                  </div>
                  <div className="h-4 w-12 bg-white/20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
