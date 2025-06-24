import Link from 'next/link'
import { ReactNode } from 'react'

// pages/index.tsx
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-500 text-white text-center px-6 py-20">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
          Sync-Sphere
        </h1>
        <p className="text-lg sm:text-xl max-w-2xl mb-8">
          A real-time productivity and accountability platform—track focus, chat, set goals, and get things done together.
        </p>
        <Link className='className="bg-white text-indigo-600 font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-shadow"' href="/dashboard">
           
            Get Started
          
        </Link>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title}>
                <div className="h-12 w-12 flex items-center justify-center bg-indigo-100 rounded-full mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="bg-indigo-50 py-16">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-2xl font-bold mb-4">
            Ready to boost your productivity?
          </h2>
          <Link className='className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"' href="/sign-up">
             
              Create Your Free Account
            
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between">
          <span>&copy; {new Date().getFullYear()} Sync-Sphere. All rights reserved.</span>
          <div className="mt-4 sm:mt-0 space-x-4">
            <Link href="/about">About</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

// Feature Data and Card Component

import { IconType } from 'react-icons'
import { FaClock, FaComments, FaTasks, FaBullhorn } from 'react-icons/fa'

const features: { title: string; description: string; icon: ReactNode }[] = [
  {
    title: 'Focus Timer',
    description: 'Track your study or work sessions and see your total time in real-time with the group.',
    icon: <FaClock className="text-indigo-600 w-6 h-6" />,
  },
  {
    title: 'Group Chat',
    description: 'Discuss, share tips, or just hang out with live messaging and presence indicators.',
    icon: <FaComments className="text-indigo-600 w-6 h-6" />,
  },
  {
    title: 'Tasks & Pomodoro',
    description: 'Organize your to-dos and power through with our integrated Pomodoro timer.',
    icon: <FaTasks className="text-indigo-600 w-6 h-6" />,
  },
  {
    title: 'Announcements',
    description: 'Broadcast important updates to everyone in your group instantly.',
    icon: <FaBullhorn className="text-indigo-600 w-6 h-6" />,
  },
]

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow hover:shadow-lg transition-shadow">
      {children}
    </div>
  )
}
