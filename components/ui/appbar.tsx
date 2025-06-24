// components/AppBar.tsx
import Link from "next/link";
import { FaUsers, FaClock, FaBell, FaUserCircle } from "react-icons/fa";

export default function MenuAppBar() {
  return (
    <nav className="fixed top-0 left-0 w-full backdrop-blur-lg bg-white/20 border-b border-white/30 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500"
          href="/dashboard"
        >
          Sync Sphere
        </Link>

        {/* Menu Items */}
        <div className="flex items-center space-x-6">
          <Link
            className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors"
            href="/dashboard/groups"
          >
            <FaUsers className="w-5 h-5" />
            <span>Groups</span>
          </Link>
          <Link
            className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors"
            href="/dashboard/timer"
          >
            <FaClock className="w-5 h-5" />
            <span>Timer</span>
          </Link>
          <Link
            className="relative text-white hover:text-indigo-200 transition-colors"
            href="/notifications"
          >
            <FaBell className="w-5 h-5" />
            <span className="absolute -top-1 -right-2 bg-red-500 text-xs w-4 h-4 rounded-full flex items-center justify-center">
              3
            </span>
          </Link>
        </div>

        {/* Profile */}
        <Link
          className='className="text-white hover:text-indigo-200 transition-colors'
          href="/profile"
        >
          <FaUserCircle className="w-6 h-6" />
        </Link>
      </div>
    </nav>
  );
}
