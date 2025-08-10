"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaUsers,
  FaClock,
  FaUserCircle,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { NotificationDropdown } from "../notifications/NotificationDropdown";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function MenuAppBar() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const overlayVariants = {
    hidden: { opacity: 0, pointerEvents: "none" as const },
    visible: { opacity: 0.4, pointerEvents: "auto" as const },
  };

  const sheetTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 300, damping: 30 };

  const sheetVariants = {
    hidden: { x: "-100%" }, // slide from left
    visible: { x: 0 },
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full backdrop-blur-lg bg-white/20 border-b border-white/30 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center">
          {/* Desktop layout (logo left, menu center/right) */}
          <div className="hidden md:flex items-center justify-between w-full">
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500"
              >
                Sync Sphere
              </Link>
            </div>

            <div className="flex items-center space-x-6">
              <Link
                className="flex items-center gap-2 text-blue-900 hover:text-indigo-600 transition-colors"
                href="/dashboard/groups"
              >
                <FaUsers className="w-5 h-5" />
                <span>Groups</span>
              </Link>
              <Link
                className="flex items-center gap-2 text-blue-900 hover:text-indigo-600 transition-colors"
                href="/dashboard/timer"
              >
                <FaClock className="w-5 h-5" />
                <span>Timer</span>
              </Link>
              <Link
                className="flex gap-2 text-blue-900 hover:text-indigo-600 transition-colors"
                href="/profile"
              >
                <FaUserCircle className="w-6 h-6" />
                <span>Profile</span>
              </Link>
              <NotificationDropdown />
              <button
                onClick={() => signOut()}
                className="ml-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-200 to-blue-400 text-blue-900 font-semibold hover:from-indigo-300 hover:to-blue-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile layout: put spacer left, logo + toggle on the right */}
          <div className="flex items-center md:hidden w-full">
            <div className="flex-1" />

            {/* Mobile layout: toggle left, logo right */}
            <div className="flex items-center md:hidden w-full justify-between">
              {/* Menu toggle on left */}
              <button
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                onClick={() => setMobileMenuOpen(true)}
                className="text-blue-900 hover:text-indigo-600 focus:outline-none p-2 rounded-md"
              >
                <FaBars className="w-6 h-6" />
              </button>

              {/* Logo on right */}
              <Link
                href="/dashboard"
                className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 whitespace-nowrap"
              >
                Sync Sphere
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* AnimatePresence handles mounting/unmounting animations */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black z-40"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={overlayVariants}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden
            />

            {/* Sheet */}
            <motion.aside
              className="fixed top-0 left-0 z-50 h-full w-64 sm:w-72 bg-white/95 backdrop-blur-xl shadow-lg border-r border-white/20 overflow-y-auto"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={sheetVariants}
              transition={sheetTransition}
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/30">
                <span className="text-lg font-semibold text-blue-900">
                  Menu
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-blue-900 hover:text-red-500 p-2 rounded-md"
                  aria-label="Close menu"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col space-y-4 px-4 py-6">
                <Link
                  className="flex items-center gap-2 text-blue-900 hover:text-indigo-600 transition-colors"
                  href="/dashboard/groups"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FaUsers className="w-5 h-5" />
                  <span>Groups</span>
                </Link>

                <Link
                  className="flex items-center gap-2 text-blue-900 hover:text-indigo-600 transition-colors"
                  href="/dashboard/timer"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FaClock className="w-5 h-5" />
                  <span>Timer</span>
                </Link>

                <Link
                  className="flex items-center gap-2 text-blue-900 hover:text-indigo-600 transition-colors"
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FaUserCircle className="w-5 h-5" />
                  <span>Profile</span>
                </Link>

                {/* If NotificationDropdown is heavy, consider replacing with a simple link here for mobile (see comment below) */}
                <div>
                  <NotificationDropdown />
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-200 to-blue-400 text-blue-900 font-semibold hover:from-indigo-300 hover:to-blue-500 transition-colors"
                >
                  Logout
                </button>

                {/* small spacer so sheet content isn't flush to very bottom on mobile */}
                <div className="h-6" />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Add a placeholder element to keep page content from jumping under the fixed header */}
      <div aria-hidden className="h-16 md:h-20" />
    </>
  );
}
