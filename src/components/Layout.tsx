import { Outlet } from "react-router";
import Header from "./Header.tsx";

export default function Layout() {
  return (
    <div className="app-bg min-h-screen">
      <Header />
      <main id="main-content" className="max-w-6xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
