import { createBrowserRouter, redirect } from "react-router";
import { useAuthStore } from "./shared/store/authStore.ts";
import { apiFetch, loadOr } from "./shared/utils/apiFetch.ts";
import Layout from "./components/Layout.tsx";

function requireAuth() {
  const token = useAuthStore.getState().token;
  if (!token) throw redirect("/login");
  return null;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: async () => {
      const { default: Component } = await import("./features/auth/LoginPage.tsx");
      return { Component };
    },
  },
  {
    path: "/register",
    lazy: async () => {
      const { default: Component } = await import("./features/auth/RegisterPage.tsx");
      return { Component };
    },
  },
  {
    loader: requireAuth,
    Component: Layout,
    children: [
      {
        index: true,
        loader: () => loadOr(() => apiFetch("/portfolio"), []),
        lazy: async () => {
          const { default: Component } = await import("./routes/DashboardPage.tsx");
          return { Component };
        },
      },
      {
        path: "companies",
        loader: async () => {
          const [companies, portfolio] = await Promise.all([
            loadOr(() => apiFetch("/companies"), []),
            loadOr(() => apiFetch("/portfolio"), []),
          ]);
          return { companies, portfolio };
        },
        lazy: async () => {
          const { default: Component } = await import("./features/companies/CompaniesPage.tsx");
          return { Component };
        },
      },
      {
        path: "companies/:id",
        loader: async ({ params }) => {
          const [company, portfolio] = await Promise.all([
            loadOr(() => apiFetch(`/companies/${params.id}`), null),
            loadOr(() => apiFetch("/portfolio"), []),
          ]);
          return { company, portfolio };
        },
        lazy: async () => {
          const { default: Component } = await import("./features/companies/CompanyDetailPage.tsx");
          return { Component };
        },
      },
      {
        path: "settings",
        loader: () => loadOr(() => apiFetch("/auth/me"), null),
        lazy: async () => {
          const { default: Component } = await import("./features/settings/SettingsPage.tsx");
          return { Component };
        },
      },
    ],
  },
  {
    path: "*",
    lazy: async () => {
      const { default: Component } = await import("./routes/NotFoundPage.tsx");
      return { Component };
    },
  },
]);
