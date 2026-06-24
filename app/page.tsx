import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Restaurant Management System
        </h1>
        <p className="text-gray-600 mb-6">
          Manage orders, inventory, staff, and customers.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg"
          >
            Login
          </Link>

          <Link
            href="/auth/register"
            className="px-6 py-3 bg-green-600 text-white rounded-lg"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}