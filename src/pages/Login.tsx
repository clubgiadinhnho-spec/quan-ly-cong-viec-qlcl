import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { ClipboardCheck, LogIn } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 font-sans">
      {/* Left side: Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand-primary text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">QLCL HUB</span>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-5xl font-display font-bold leading-tight">
            Centralized Quality Control <br /> 
            <span className="text-accent underline decoration-accent/30">Management.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            The next generation of quality assurance monitoring for teams that care about excellence.
          </p>
        </div>

        <div className="text-slate-500 text-sm">
          &copy; 2026 QLCL HUB. All rights reserved.
        </div>
      </div>

      {/* Right side: Login form */}
      <div className="flex flex-col items-center justify-center p-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <ClipboardCheck className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-display font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500">Please sign in to your account to continue.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              )}
              Continue with Google
            </button>
            
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-slate-50 px-2 text-slate-400">Restricted access</span>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            Authorized personnel only. For access requests, please contact your system administrator.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
