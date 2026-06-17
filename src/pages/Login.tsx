import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { HandMetal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  if (user && userData) {
    return <Navigate to="/" replace />;
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
      setIsForgotPassword(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Incorrect email/password, or account does not exist. (Did you mean to Sign Up?)');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please log in or reset your password.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center -mt-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <HandMetal className="w-20 h-20 mx-auto text-primary mb-6" />
          <h1 className="font-display text-6xl uppercase tracking-tighter text-white mb-2">Library<br />of Rock</h1>
          <p className="font-mono text-zinc-400 text-sm tracking-widest uppercase mt-4">Authorized Personnel Only</p>
        </div>

        <form onSubmit={isForgotPassword ? handleResetPassword : handleSubmit} className="glass-panel p-8 rounded-2xl flex flex-col gap-6">
          {error && (
            <div className="bg-primary/20 text-primary border border-primary/50 text-sm p-4 rounded-md font-mono">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]/50 text-sm p-4 rounded-md font-mono">
              {message}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-zinc-400 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border brutal-border focus:border-primary text-white p-4 font-mono outline-none transition-colors"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-zinc-400 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border brutal-border focus:border-primary text-white p-4 font-mono outline-none transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-display text-2xl uppercase tracking-wider p-4 hover:bg-primary/80 transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Booting Amp...' : isForgotPassword ? 'Reset Password' : (isLogin ? 'Plug In' : 'Sign Up')}
          </button>
          
          <div className="flex flex-col gap-2 mt-2">
            {!isForgotPassword && (
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-mono text-zinc-500 hover:text-white transition-colors"
              >
                {isLogin ? "DON'T HAVE A BACKSTAGE PASS? SIGN UP" : 'ALREADY HAVE A PASS? LOG IN'}
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(!isForgotPassword);
                setError('');
                setMessage('');
              }}
              className="text-sm font-mono text-zinc-500 hover:text-white transition-colors"
            >
              {isForgotPassword ? "BACK TO LOGIN" : 'FORGOT PASSWORD?'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
