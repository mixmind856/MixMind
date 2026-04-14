import { Outlet, Link } from "react-router-dom";

export default function Request() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link to="/request" className="text-xl font-semibold">
            DJ Requests
          </Link>

          <nav className="space-x-4">
            <Link
              className="text-sm text-slate-600 hover:underline"
              to="/request"
            >
              Request
            </Link>

            <Link
              className="text-sm text-slate-600 hover:underline"
              to="/request/admin"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <Outlet />
      </main>
    </div>
  );
}
