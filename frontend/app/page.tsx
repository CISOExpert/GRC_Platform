import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            GRC Unified Platform
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Governance, Risk, and Compliance Management System
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="block w-full py-3 px-4 bg-white text-indigo-600 font-medium rounded-md border-2 border-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Create Account
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          Multi-tenant compliance framework management with policy mapping and regulatory intelligence
        </p>
      </div>
    </div>
  )
}
