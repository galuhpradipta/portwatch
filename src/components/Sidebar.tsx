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
        `sidebar-nav-item relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
          isActive
            ? "sidebar-link-active text-app-accent"
            : ""
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
      <div className="flex items-center gap-3 px-5 py-5 flex-shrink-0">
        <div className="sidebar-brand-mark flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0">
          <Binoculars size={18} weight="fill" className="text-app-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="sidebar-brand-name truncate">{APP_NAME}</div>
          <div className="dashboard-kicker mt-1 text-[9px]">Portfolio desk</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="sidebar-close-button lg:hidden rounded-lg p-1.5"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3 pt-2">
        <NavItem to="/" label="Dashboard" Icon={ChartLineUp} onClick={onClose} />
        <NavItem to="/companies" label="Companies" Icon={Buildings} onClick={onClose} />
      </nav>

      <div className="px-3 pb-3">
        <NavItem to="/settings" label="Settings" Icon={GearSix} onClick={onClose} />
      </div>

      <div className="mx-4 border-t border-app-border-subtle" />

      <div className="flex items-center gap-3 px-4 py-4">
        <div className="sidebar-user-badge flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0">
          <span className="text-xs font-semibold text-app-accent">{initial}</span>
        </div>
        <span className="sidebar-user-name truncate text-sm flex-1">
          {user?.displayName}
        </span>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger
              onClick={() => setShowSignOut(true)}
              className="sidebar-action-button flex-shrink-0 rounded-lg p-1.5"
            >
              <SignOut size={16} />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner side="right" sideOffset={4}>
                <Tooltip.Popup className="sidebar-tooltip rounded-md px-2 py-1 text-xs">
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
