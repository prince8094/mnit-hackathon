import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NewProjectPage } from '../pages/NewProjectPage';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';
import { PublicReportPage } from '../pages/PublicReportPage';
import { store } from '../lib/store';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = store.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/app" replace />
      },
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'app',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'app/projects/new',
        element: (
          <ProtectedRoute>
            <NewProjectPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'app/projects/:id',
        element: (
          <ProtectedRoute>
            <ProjectDetailPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'r/:slug',
        element: <PublicReportPage />
      },
      {
        path: '*',
        element: <Navigate to="/app" replace />
      }
    ]
  }
]);

