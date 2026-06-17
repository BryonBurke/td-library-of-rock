/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PracticeTracker from './pages/PracticeTracker';
import ModeratorPanel from './pages/ModeratorPanel';
import BeatMaster from './pages/BeatMaster';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/practice" 
                element={
                  <ProtectedRoute requiredRole="student">
                    <PracticeTracker />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/mod" 
                element={
                  <ProtectedRoute requiredRole="moderator">
                    <ModeratorPanel />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

