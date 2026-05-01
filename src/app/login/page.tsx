'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, Mail, Lock, Eye, EyeOff, AlertCircle, User, Send } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [lastSignedUpEmail, setLastSignedUpEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  
  const router = useRouter();
  const { signIn, signUp, sendVerificationEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        router.push('/');
      } else {
        if (!displayName.trim()) throw new Error('Please enter your name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        
        await signUp(email, password, displayName);
        setLastSignedUpEmail(email);
        setShowVerificationMessage(true);
        setEmail('');
        setPassword('');
        setDisplayName('');
      }
    } catch (err: any) {
      let errorMessage = 'An error occurred';
      if (err.code === 'auth/invalid-email') errorMessage = 'Invalid email address';
      else if (err.code === 'auth/user-not-found') errorMessage = 'User not found';
      else if (err.code === 'auth/wrong-password') errorMessage = 'Incorrect password';
      else if (err.code === 'auth/email-already-in-use') errorMessage = 'Email already in use';
      else if (err.code === 'auth/weak-password') errorMessage = 'Password should be at least 6 characters';
      else if (err.message === 'email_not_verified') errorMessage = 'Please verify your email before logging in';
      else errorMessage = err.message || 'Failed to authenticate';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await sendVerificationEmail();
      alert(`Verification email resent to ${lastSignedUpEmail || email}`);
    } catch (err) {
      alert('Failed to resend verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg mb-4">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">KUTrades</h1>
          <p className="text-gray-500 mt-2">Track, Analyze, Improve Your Trading</p>
        </div>

        {showVerificationMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 mb-1">Verify Your Email</h3>
                <p className="text-sm text-green-700 mb-2">
                  We've sent a verification email to <strong>{lastSignedUpEmail}</strong>.
                </p>
                <p className="text-xs text-green-600">
                  Please check your inbox and click the verification link to activate your account.
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => { setIsLogin(true); setShowVerificationMessage(false); setError(''); }}
              className={`flex-1 py-2.5 text-center font-medium rounded-xl transition-all ${
                isLogin ? 'bg-primary-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setShowVerificationMessage(false); setError(''); }}
              className={`flex-1 py-2.5 text-center font-medium rounded-xl transition-all ${
                !isLogin ? 'bg-primary-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="trader@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              {!isLogin && <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">By continuing, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            🔐 <strong>Email Verification Required:</strong> After signing up, you'll receive a verification email. 
            Please verify your email before logging in.
          </p>
        </div>
      </div>
    </div>
  );
}