import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';

export const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element, requiredRole?: 'student' | 'moderator' }) => {
  const { user, userData, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#111] text-[#00FF00] font-mono flex items-center justify-center text-xl uppercase tracking-widest">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#111] text-red-500 font-mono flex flex-col items-center justify-center text-center p-8">
        <h2 className="text-xl uppercase tracking-widest mb-4">Error loading user profile</h2>
        <p className="text-sm text-zinc-400 mb-8 max-w-md">There was an issue retrieving your access level. Try refreshing, or check your connection.</p>
        <button 
          onClick={() => {
            auth.signOut();
          }}
          className="border border-red-500 px-6 py-2 uppercase hover:bg-red-500 hover:text-black transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (requiredRole === 'moderator' && user.email !== 'bryonparis@gmail.com') {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userData.role !== requiredRole && requiredRole !== 'moderator') {
    // If they aren't authorized for this role, redirect to their main dashboard
    return <Navigate to="/" replace />;
  }

  return children;
};
