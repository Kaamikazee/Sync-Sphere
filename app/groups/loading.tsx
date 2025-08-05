// components/skeletons/GroupsPageSkeleton.tsx
export default function GroupsPageSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-6 animate-pulse">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-center text-zinc-300 dark:text-zinc-600">
        Loading Groups...
      </h1>

      {/* Skeleton cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {[...Array(6)].map((_, idx) => (
          <div
            key={idx}
            className="h-32 rounded-xl bg-zinc-200 dark:bg-zinc-800/50"
          />
        ))}
      </div>

      {/* Floating AddGroup Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-zinc-300 dark:bg-zinc-700/60 rounded-full shadow-lg" />
      </div>
    </main>
  );
}
