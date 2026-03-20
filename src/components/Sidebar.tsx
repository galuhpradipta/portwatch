import { NavLink } from "react-router";
import { Binoculars, Buildings, ChartLineUp, GearSix, SignOut, X } from "@phosphor-icons/react";
import { useState } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { APP_NAME } from "../shared/config.ts";
import { useAuth } from "../shared/hooks/useAuth.ts";
import ConfirmDialog from "./ConfirmDialog.tsx";

function NavItem({
  to,
  label,
  Icon,
  onClick,
}: {
  to: string;
  label: string;
  Icon: React.ElementType;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "sidebar-link-active text-app-accent"
            : "text-app-text-muted hover:text-app-text hover:bg-app-surface-hover"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="sidebar-active-glow absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-app-accent" />
          )}
          <Icon
            size={18}
            weight={isActive ? "fill" : "duotone"}
            className="flex-shrink-0"
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({
  isOpen = false,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const { user, logout } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);

  const initial = user?.displayName?.[0]?.toUpperCase() ?? "?";

  return (
    <aside className={`sidebar-panel w-60 flex flex-col z-30 ${isOpen ? "sidebar-open" : ""}`}>
      {/* Logo row */}
      <div className="flex items-center gap-3 px-5 py-5 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-app-accent/15 flex items-center justify-center flex-shrink-0">
          <Binoculars size={18} weight="fill" className="text-app-accent" />
        </div>
        <span className="font-semibold text-sm text-app-text flex-1">{APP_NAME}</span>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-app-text-muted hover:text-app-text transition-colors"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Primary nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3 pt-2">
        <NavItem to="/" label="Dashboard" Icon={ChartLineUp} onClick={onClose} />
        <NavItem to="/companies" label="Companies" Icon={Buildings} onClick={onClose} />
      </nav>

      {/* Secondary nav */}
      <div className="px-3 pb-3">
        <NavItem to="/settings" label="Settings" Icon={GearSix} onClick={onClose} />
      </div>

      {/* Separator */}
      <div className="mx-4 border-t border-app-border-subtle" />

      {/* User area */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="w-8 h-8 rounded-full bg-app-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-app-accent">{initial}</span>
        </div>
        <span className="text-sm text-app-text-muted truncate flex-1">
          {user?.displayName}
        </span>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger
              onClick={() => setShowSignOut(true)}
              className="p-1.5 rounded-md text-app-text-muted hover:text-app-text hover:bg-app-surface-hover transition-colors flex-shrink-0"
            >
              <SignOut size={16} />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner side="right" sideOffset={4}>
                <Tooltip.Popup className="px-2 py-1 rounded-md bg-app-text text-white text-xs shadow-md">
                  Sign out
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      <ConfirmDialog
        open={showSignOut}
        onOpenChange={setShowSignOut}
        title="Sign out"
        description="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        onConfirm={logout}
      />
    </aside>
  );
}
