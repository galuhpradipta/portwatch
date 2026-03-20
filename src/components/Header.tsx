import { NavLink } from "react-router";
import { Binoculars, SignOut } from "@phosphor-icons/react";
import { useState } from "react";
import { APP_NAME } from "../shared/config.ts";
import { useAuth } from "../shared/hooks/useAuth.ts";
import ConfirmDialog from "./ConfirmDialog.tsx";

export default function Header() {
  const { user, logout } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);

  return (
    <header className="header-glass sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Binoculars size={22} weight="fill" className="text-[var(--color-app-accent)]" />
          <span className="font-semibold text-sm text-white">{APP_NAME}</span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1">
          {[
            { to: "/", label: "Dashboard" },
            { to: "/companies", label: "Companies" },
            { to: "/settings", label: "Settings" },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60">{user?.displayName}</span>
          <button
            onClick={() => setShowSignOut(true)}
            className="p-1.5 rounded-md text-white/50 hover:text-white/90 hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            <SignOut size={18} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showSignOut}
        onOpenChange={setShowSignOut}
        title="Sign out"
        description="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        onConfirm={logout}
      />
    </header>
  );
}
