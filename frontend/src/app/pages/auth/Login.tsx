import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Mail, Lock, ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { BRAND } from '../../config/branding';

type Mode = 'login' | 'forgot' | 'reset';

export function Login() {
  const { login, verifyOTP, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res?.requiresOTP) {
        setShowOtpScreen(true);
        setSuccess(res.message || 'Verification OTP sent to your email.');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOTP(email, otp);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setSuccess(res.message || 'Password reset OTP sent to your email.');
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await resetPassword(email, otp, newPassword);
      setSuccess(res.message || 'Password reset successful. Please sign in.');
      setMode('login');
      setPassword('');
      setOtp('');
    } catch (err: any) {
      setError(err.message || 'Reset failed. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-[--color-surface] to-[--color-surface-elevated] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="h-20 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-[--color-text-secondary] mt-1">
            {mode === 'login' && (showOtpScreen ? 'Verify email address' : 'Sign in to access the summit')}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Enter OTP and set new password'}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[--color-surface-elevated] rounded-lg border border-[--color-border] p-6 shadow-lg">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm rounded-lg p-3 mb-4">
              {success}
            </div>
          )}

          {/* OTP SCREEN */}
          {showOtpScreen && mode === 'login' ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginOtp" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[--color-primary]" />
                  Enter 6-Digit OTP
                </Label>
                <Input
                  id="loginOtp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center tracking-widest font-bold text-lg"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-[--color-text-secondary] hover:underline mt-2"
                onClick={() => {
                  setShowOtpScreen(false);
                  setSuccess('');
                }}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <>
              {/* LOGIN MODE */}
              {mode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[--color-text-secondary]" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-[--color-text-secondary]" />
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-[--color-primary] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-text-secondary] hover:text-[--color-text-primary]"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              )}

              {/* FORGOT PASSWORD MODE */}
              {mode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[--color-text-secondary]" />
                      Registered Email Address
                    </Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send Reset Code'}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-[--color-text-secondary] hover:underline mt-2"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    Back to Sign In
                  </button>
                </form>
              )}

              {/* RESET PASSWORD MODE */}
              {mode === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetOtp" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[--color-primary]" />
                      Enter Reset OTP
                    </Label>
                    <Input
                      id="resetOtp"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="text-center tracking-widest font-bold text-lg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[--color-text-secondary]" />
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-[--color-text-secondary] hover:underline mt-2"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccess('');
                    }}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </>
          )}

          {/* SIGNUP LINK */}
          {mode === 'login' && !showOtpScreen && (
            <div className="mt-4 text-center">
              <p className="text-sm text-[--color-text-secondary]">
                Don't have an account?{' '}
                <Link to="/auth/signup" className="text-[--color-primary] hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
