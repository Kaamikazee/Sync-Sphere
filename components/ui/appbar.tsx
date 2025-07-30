"use client";

import Link from "next/link";
import { useState } from "react";
import { FaUsers, FaClock, FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import { NotificationDropdown } from "../notifications/NotificationDropdown";

export default function MenuAppBar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6">
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
          <NotificationDropdown />
          <Link
            className="text-white hover:text-indigo-200 transition-colors"
            href="/profile"
          >
            <FaUserCircle className="w-6 h-6" />
          </Link>
        </div>

        {/* Mobile menu toggle button */}
        <button
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-white focus:outline-none"
        >
          {isMobileMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col space-y-4">
          <Link
            className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors"
            href="/dashboard/groups"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FaUsers className="w-5 h-5" />
            <span>Groups</span>
          </Link>
          <Link
            className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors"
            href="/dashboard/timer"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FaClock className="w-5 h-5" />
            <span>Timer</span>
          </Link>
          <div onClick={() => setMobileMenuOpen(false)}>
            <NotificationDropdown />
          </div>
          <Link
            className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors"
            href="/profile"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FaUserCircle className="w-6 h-6" />
            <span>Profile</span>
          </Link>
        </div>
      )}
    </nav>
  );
}
