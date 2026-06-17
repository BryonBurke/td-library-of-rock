import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Shield, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export const Navbar = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="border-b brutal-border border-x-0 border-t-0 bg-dark sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4 sm:space-x-8">
          <Link to="/" className="flex items-center space-x-2 text-primary hover:opacity-80 transition-opacity">
            <span className="font-display text-xl sm:text-2xl uppercase tracking-wider">Library of Rock</span>
          </Link>
          
          <div className="flex items-center space-x-4 sm:space-x-6">
            {userData?.role === 'student' && (
              <Link to="/practice" className="text-[10px] sm:text-sm font-bold flex items-center gap-1 sm:gap-2 uppercase tracking-widest text-[#00FF00] hover:opacity-80 transition-colors">
                <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">My Practice Space</span>
                <span className="sm:hidden">Practice</span>
              </Link>
            )}
            {user?.email === 'bryonparis@gmail.com' && (
              <Link to="/mod" className="text-[10px] sm:text-sm font-bold flex items-center gap-1 sm:gap-2 uppercase tracking-widest text-[#FF00FF] hover:opacity-80 transition-colors">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Mod Station</span>
                <span className="sm:hidden">Mod</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold">{userData?.displayName}</div>
            <div className="text-xs text-zinc-500 font-mono uppercase">{userData?.role}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};
