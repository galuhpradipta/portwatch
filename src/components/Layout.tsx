import { Outlet } from "react-router";
import { useState } from "react";
import { List } from "@phosphor-icons/react";
import Sidebar from "./Sidebar.tsx";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main id="main-content" className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
        {/* Hamburger — mobile only */}
        <button
          className="lg:hidden mb-5 p-2 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-surface-hover transition-colors"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <List size={20} />
        </button>

        <Outlet />
      </main>
    </div>
  );
}
