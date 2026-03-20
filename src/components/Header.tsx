import { NavLink } from "react-router";
import { Binoculars, SignOut } from "@phosphor-icons/react";
import { useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { APP_NAME } from "../shared/config.ts";
import { useAuth } from "../shared/hooks/useAuth.ts";
import ConfirmDialog from "./ConfirmDialog.tsx";

export default function Header() {
  const { user, logout } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);

  return (
    <header className="header-panel sticky top-0 z-40 border-b border-app-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Binoculars size={22} weight="fill" className="text-[var(--color-app-accent)]" />
          <span className="font-semibold text-sm text-app-text">{APP_NAME}</span>
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
                    ? "bg-app-accent/10 text-app-accent"
                    : "text-app-text-muted hover:text-app-text hover:bg-app-surface-hover"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-app-text-muted">{user?.displayName}</span>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                onClick={() => setShowSignOut(true)}
                className="p-1.5 rounded-md text-app-text-muted hover:text-app-text hover:bg-app-surface-hover transition-colors"
              >
                <SignOut size={18} />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner side="bottom" sideOffset={4}>
                  <Tooltip.Popup className="px-2 py-1 rounded-md bg-app-text text-white text-xs shadow-md">
                    Sign out
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
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
