import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileSearch, LinkedinIcon, FileEdit, BarChart3, LogOut, Sparkles, Menu, X, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Lazy load dashboard components
const ResumeAnalyzer = lazy(() => import('./ResumeAnalyzer').then(module => ({ default: module.ResumeAnalyzer })));
const LinkedInAnalyzer = lazy(() => import('./LinkedInAnalyzer').then(module => ({ default: module.LinkedInAnalyzer })));
const ResumeTailor = lazy(() => import('./ResumeTailor').then(module => ({ default: module.ResumeTailor })));
const JobAnalytics = lazy(() => import('./JobAnalytics').then(module => ({ default: module.JobAnalytics })));
const SettingsPage = lazy(() => import('./Settings').then(module => ({ default: module.Settings })));

const navigation = [
  { name: 'Resume Analyzer', href: '/dashboard/resume', icon: FileSearch },
  { name: 'LinkedIn Analyzer', href: '/dashboard/linkedin', icon: LinkedinIcon },
  { name: 'Resume Tailor', href: '/dashboard/tailor', icon: FileEdit },
  { name: 'Job Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// Loading component for dashboard features
const FeatureLoader = () => (
  <div className="h-full w-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
  </div>
);

export function Dashboard() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-800">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary-500 animate-pulse-slow" />
            <h2 className="text-xl font-semibold gradient-text">SkillBridge AI</h2>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay - Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-dark-950/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Mobile */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-dark-900 to-dark-800 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-6 border-b border-dark-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-primary-500 animate-pulse-slow" />
                <h2 className="text-xl font-semibold gradient-text">SkillBridge AI</h2>
              </div>
            </div>
            <nav className="px-2 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={toggleSidebar}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                      transition-all duration-200
                      ${isActive ? 'nav-item-active' : 'nav-item'}
                    `}
                  >
                    <item.icon
                      className={`
                        mr-3 h-5 w-5
                        ${isActive ? 'text-primary-500' : 'text-dark-400 group-hover:text-white'}
                      `}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="p-4 border-t border-dark-800">
            <button
              onClick={() => {
                signOut();
                toggleSidebar();
              }}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-dark-300 rounded-lg hover:bg-dark-800 hover:text-white transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-gradient-to-b from-dark-900 to-dark-800 border-r border-dark-800">
          <div className="flex-1">
            <div className="px-4 py-6 border-b border-dark-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-primary-500 animate-pulse-slow" />
                <h2 className="text-xl font-semibold gradient-text">SkillBridge AI</h2>
              </div>
            </div>
            <nav className="px-2 mt-6 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                      transition-all duration-200
                      ${isActive ? 'nav-item-active' : 'nav-item'}
                    `}
                  >
                    <item.icon
                      className={`
                        mr-3 h-5 w-5
                        ${isActive ? 'text-primary-500' : 'text-dark-400 group-hover:text-white'}
                      `}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="p-4 border-t border-dark-800">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-dark-300 rounded-lg hover:bg-dark-800 hover:text-white transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        <main className="pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<FeatureLoader />}>
            <Routes>
              <Route path="/resume" element={<ResumeAnalyzer />} />
              <Route path="/linkedin" element={<LinkedInAnalyzer />} />
              <Route path="/tailor" element={<ResumeTailor />} />
              <Route path="/analytics" element={<JobAnalytics />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/" element={<ResumeAnalyzer />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}