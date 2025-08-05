"use client";

import { motion } from "framer-motion";

export default function GroupsSkeleton() {
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Top app bar placeholder */}
      <div className="h-16 sm:h-20 w-full bg-white/10 backdrop-blur-md border-b border-white/20 animate-pulse" />

      {/* Main content */}
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-lg p-4 sm:p-6 animate-pulse space-y-4"
            >
              <div className="h-6 w-3/4 bg-white/20 rounded-md" />
              <div className="h-4 w-2/3 bg-white/10 rounded" />
              <div className="h-3 w-1/2 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </main>

      {/* Floating “Show Groups” button skeleton */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
        <div className="h-12 sm:h-14 w-32 sm:w-40 bg-white/10 border border-white/20 rounded-full backdrop-blur-md animate-pulse" />
      </div>
    </motion.div>
  );
}
