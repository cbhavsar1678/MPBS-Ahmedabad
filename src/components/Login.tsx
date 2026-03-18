import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, Shield, Phone } from 'lucide-react';

const Login: React.FC = () => {
  const [loginMode, setLoginMode] = useState<'admin' | 'member'>('admin');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Admin login failed:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Login popup was blocked by your browser. Please allow popups for this site and try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Login request was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login window was closed before completion.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMemberLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOtp) {
      // Mock sending OTP
      setShowOtp(true);
    } else {
      // Mock verifying OTP
      console.log('Member login with mobile:', mobile);
      // In a real app, you'd use Firebase Phone Auth or a custom backend
      alert('Member login is currently in demo mode. Use Admin login for full access.');
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
              onClick={() => setLoginMode('admin')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${
                loginMode === 'admin' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Shield size={18} />
              <span className="font-medium">Admin</span>
            </button>
            <button
              onClick={() => setLoginMode('member')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${
                loginMode === 'member' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Phone size={18} />
              <span className="font-medium">Member</span>
            </button>
          </div>

          {loginMode === 'admin' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 text-center mb-6">
                Authorized community administrators can sign in using their Google account.
              </p>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleAdminLogin}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    <span className="font-bold text-gray-700">Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <form onSubmit={handleMemberLogin} className="space-y-4">
              {!showOtp ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="Enter your registered mobile"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Verification Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                {showOtp ? 'Verify & Login' : 'Send OTP'}
              </button>
              {showOtp && (
                <button
                  type="button"
                  onClick={() => setShowOtp(false)}
                  className="w-full text-sm text-indigo-600 font-medium hover:underline"
                >
                  Change mobile number
                </button>
              )}
            </form>
          )}
        </div>

        <div className="p-6 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">
            By signing in, you agree to our Community Guidelines and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
