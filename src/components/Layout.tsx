import { Outlet } from "react-router";
import Sidebar from "./Sidebar.tsx";

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main id="main-content" className="flex-1 min-w-0 px-8 py-6 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
