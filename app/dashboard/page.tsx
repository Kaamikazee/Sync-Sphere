import Link from "next/link";
import { Clock, Users } from "lucide-react";
import MenuAppBar from "@/components/ui/appbar";

export default function DashboardPage() {
  return (
    <>
    <MenuAppBar />
      <div className="min-h-screen bg-gradient-to-r from-indigo-950 via-purple-900 to-sky-900 flex items-center justify-center p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* ── Timer Card */}
          <Link href="/dashboard/timer" className="group">
            <div
              className="relative p-8 bg-gradient-to-br from-cyan-700/30 via-blue-600/30 to-indigo-700/30 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg
                              hover:shadow-2xl hover:-translate-y-1 transition-transform duration-300"
            >
              {/* Decorative spotlight */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(255,255,255,0.15), transparent 60%)",
                }}
              />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="p-4 bg-white/10 rounded-full mb-4">
                  <Clock className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Live Timer
                </h3>
                <p className="text-white/80">
                  Track your focus sessions in real time.
                </p>
              </div>
            </div>
          </Link>

          {/* ── Groups Card */}
          <Link href="/dashboard/groups" className="group">
            <div
              className="relative p-8 bg-gradient-to-br from-purple-700/30 via-pink-600/30 to-red-700/30 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg
                              hover:shadow-2xl hover:-translate-y-1 transition-transform duration-300"
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(255,255,255,0.15), transparent 60%)",
                }}
              />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="p-4 bg-white/10 rounded-full mb-4">
                  <Users className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Groups</h3>
                <p className="text-white/80">
                  Manage and join your focus groups.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
