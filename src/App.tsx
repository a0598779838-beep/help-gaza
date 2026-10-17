import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { LoadingState } from './components/States';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const AidsPage = lazy(() => import('./pages/AidsPage').then((module) => ({ default: module.AidsPage })));
const AidDetailPage = lazy(() => import('./pages/AidDetailPage').then((module) => ({ default: module.AidDetailPage })));
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage').then((module) => ({ default: module.OrganizationsPage })));
const AboutPage = lazy(() => import('./pages/InfoPages').then((module) => ({ default: module.AboutPage })));
const PrivacyPage = lazy(() => import('./pages/InfoPages').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/InfoPages').then((module) => ({ default: module.TermsPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((module) => ({ default: module.ContactPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([{
  element: <SiteLayout />,
  children: [
    { path: '/', element: <HomePage /> },
    { path: '/aids', element: <AidsPage /> },
    { path: '/aids/:slug', element: <AidDetailPage /> },
    { path: '/organizations', element: <OrganizationsPage /> },
    { path: '/about', element: <AboutPage /> },
    { path: '/contact', element: <ContactPage /> },
    { path: '/privacy', element: <PrivacyPage /> },
    { path: '/terms', element: <TermsPage /> },
    { path: '/admin/*', element: <AdminPage /> },
    { path: '*', element: <main className="container section page-section"><h1>الصفحة غير موجودة</h1><p>تحقق من الرابط أو انتقل إلى الصفحة الرئيسية.</p><a className="button button-primary" href="/">الرئيسية</a></main> },
  ],
}]);

export function App() {
  return <QueryClientProvider client={queryClient}><Suspense fallback={<main className="container section"><LoadingState /></main>}><RouterProvider router={router} /></Suspense></QueryClientProvider>;
}
