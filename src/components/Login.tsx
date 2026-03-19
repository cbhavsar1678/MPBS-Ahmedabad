import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, Shield, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [loginMode, setLoginMode] = useState<'admin' | 'member'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    // Hardcoded credentials as requested
    if (username === 'Admin' && password === 'Admin@1234') {
      try {
        // Map to a real Firebase user for session management
        // We use a specific email format that we'll recognize in FirebaseContext
        const email = 'admin@mpbs.com';
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                throw err;
              }
              throw createErr;
            }
          } else {
            throw err;
          }
        }
      } catch (err: any) {
        console.error('Admin login failed:', err);
        if (err.code === 'auth/operation-not-allowed') {
          setError('Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console (Authentication > Sign-in method).');
        } else {
          setError('Login failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    setError('Invalid admin credentials.');
    setLoading(false);
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    // Hardcoded credentials as requested
    if (username === 'MemberLogin' && password === 'mbps@2026') {
      try {
        const email = 'member@mpbs.com';
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, email, password);
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                throw err;
              }
              throw createErr;
            }
          } else {
            throw err;
          }
        }
      } catch (err: any) {
        console.error('Member login failed:', err);
        if (err.code === 'auth/operation-not-allowed') {
          setError('Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console (Authentication > Sign-in method).');
        } else {
          setError('Login failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    setError('Invalid member credentials.');
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google login failed:', err);
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 text-center border-b border-gray-50">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <LogIn className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MPBS Ahmedabad</h1>
          <p className="text-gray-500 mt-1">Community Portal Access</p>
        </div>

        <div className="p-8">
          <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
            <button
              onClick={() => { setLoginMode('admin'); setError(null); }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${
                loginMode === 'admin' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Shield size={18} />
              <span className="font-medium">Admin</span>
            </button>
            <button
              onClick={() => { setLoginMode('member'); setError(null); }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${
                loginMode === 'member' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LogIn size={18} />
              <span className="font-medium">Member</span>
            </button>
          </div>

          <form onSubmit={loginMode === 'admin' ? handleAdminLogin : handleMemberLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 mb-4">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                'Login'
              )}
            </button>

            {loginMode === 'admin' && (
              <div className="pt-4">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <span className="relative px-4 bg-white text-xs text-gray-400 uppercase">Or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  <span className="font-bold text-gray-700">Continue with Google</span>
                </button>
              </div>
            )}
          </form>
        </div>

        <div className="p-6 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">
            Authorized access only. By signing in, you agree to our Community Guidelines.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
