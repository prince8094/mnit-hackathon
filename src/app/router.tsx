import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NewProjectPage } from '../pages/NewProjectPage';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';
import { VerifierDashboardPage } from '../pages/VerifierDashboardPage';
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
  const [user, setUser] = React.useState(store.getCurrentUser());
  const [checkingAuth, setCheckingAuth] = React.useState(
    !user && (window.location.hash.includes('access_token') || window.location.search.includes('code='))
  );

  React.useEffect(() => {
    const unsub = store.subscribe(() => {
      const u = store.getCurrentUser();
      setUser(u);
      if (u) {
        setCheckingAuth(false);
      }
    });

    if (checkingAuth) {
      const timer = setTimeout(() => {
        setCheckingAuth(false);
      }, 2500);
      return () => {
        unsub();
        clearTimeout(timer);
      };
    }

    return unsub;
  }, [checkingAuth]);

  if (checkingAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Verifying authentication session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState(store.getCurrentUser());

  React.useEffect(() => {
    return store.subscribe(() => {
      setUser(store.getCurrentUser());
    });
  }, []);

  if (user) {
    return <Navigate to="/app" replace />;
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
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        )
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
        path: 'app/verifier',
        element: (
          <ProtectedRoute>
            <VerifierDashboardPage />
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

