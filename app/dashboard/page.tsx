// pages/dashboard.tsx
import Link from "next/link";
// import { useEffect, useState } from 'react'
import { FaUsers, FaClock } from "react-icons/fa";

export default function Dashboard() {
  // const [username, setUsername] = useState<string>('')

  // useEffect(() => {
  //   // TODO: Fetch actual user from auth/session
  //   const user = { name: '' } // placeholder
  //   setUsername(user.name)
  // }, [])

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      {/* Hero Dashboard Section */}
      <section className="max-w-2xl text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Welcome back, Marsh!
        </h1>
        <p className="text-lg text-gray-300 mb-8">
          Choose from where you want to start today.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            className='className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 transition-colors px-8 py-4 rounded-2xl text-xl font-semibold'
            href="dashboard/groups"
          >
            <FaUsers className="w-5 h-5" />
            Groups
          </Link>
          <Link
            className='className="flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 transition-colors px-8 py-4 rounded-2xl text-xl font-semibold'
            href="dashboard/timer"
          >
            <FaClock className="w-5 h-5" />
            Timer
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-4 text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Sync Sphere. All rights reserved.
      </footer>
    </main>
  );
}
