import { Separator } from "@/components/ui/separator";

export default function GroupDashboardSkeleton() {
  return (
    <>
    <div className="h-16 sm:h-20 w-full bg-white/10 backdrop-blur-md border-b border-white/20 animate-pulse" />
      {/* Navbar Placeholder */}
      <div className="mb-12">
        <div className="h-16 bg-white/10 backdrop-blur-md w-full animate-pulse" />
      </div>

      <main className="min-h-screen bg-gradient-to-br from-purple-500/30 via-blue-400/30 to-indigo-500/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 py-8">

          {/* Page Header */}
          <div className="text-center space-y-2">
            <div className="h-8 w-2/3 mx-auto bg-white/20 rounded animate-pulse" />
            <div className="h-6 w-1/3 mx-auto bg-white/20 rounded animate-pulse" />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-10 w-36 bg-white/20 rounded-full animate-pulse"
              />
            ))}
          </div>

          {/* Floating Edit Button */}
          <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
            <div className="h-12 w-12 rounded-full bg-white/20 animate-pulse" />
          </div>

          <Separator className="border-gray-300" />

          {/* Leaderboard Skeleton */}
          <section className="bg-white/20 rounded-2xl shadow-lg p-4 sm:p-6 animate-pulse space-y-4">
            <div className="h-6 w-1/3 bg-white/30 rounded" />
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-10 bg-white/20 rounded-lg w-full"
              />
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
