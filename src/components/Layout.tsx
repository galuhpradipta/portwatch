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
          aria-hidden="true"
        />
      )}

      <main id="main-content" className="flex-1 min-w-0 overflow-x-hidden">
        {/* Sticky mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-2 px-4 py-3 border-b border-app-border-subtle bg-app-bg/95 backdrop-blur-sm">
          <button
            className="p-2 rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-surface-hover transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <List size={20} />
          </button>
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
