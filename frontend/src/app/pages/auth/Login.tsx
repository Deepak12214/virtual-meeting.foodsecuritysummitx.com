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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background atmospheric glowing blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-350">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="h-20 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium tracking-wide uppercase">
            {mode === 'login' && (showOtpScreen ? 'Verify email address' : 'Sign in to access the summit')}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Enter OTP and set new password'}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl border border-border p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 text-red-500 text-xs rounded-xl p-3.5 mb-5 flex items-center gap-2">
              <span className="font-semibold">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3.5 mb-5 flex items-center gap-2">
              <span className="font-semibold">{success}</span>
            </div>
          )}

          {/* OTP SCREEN */}
          {showOtpScreen && mode === 'login' ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginOtp" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 animate-pulse" />
                  Enter 6-Digit OTP
                </Label>
                <Input
                  id="loginOtp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center tracking-widest font-bold text-lg h-12 bg-muted/30 border-border rounded-xl text-foreground focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-11 transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer border-none" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline mt-2 transition-colors cursor-pointer bg-transparent border-none"
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
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer bg-transparent border-none"
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
                        className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 pr-10 h-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none p-0 flex items-center"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-11 transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer border-none" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              )}

              {/* FORGOT PASSWORD MODE */}
              {mode === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Registered Email Address
                    </Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-11 transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer border-none" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send Reset Code'}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline mt-2 transition-colors cursor-pointer bg-transparent border-none"
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
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="resetOtp" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Enter Reset OTP
                    </Label>
                    <Input
                      id="resetOtp"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="text-center tracking-widest font-bold text-lg h-12 bg-muted/30 border-border rounded-xl text-foreground focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      New Password
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-11 transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer border-none" disabled={loading}>
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline mt-2 transition-colors cursor-pointer bg-transparent border-none"
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
            <div className="mt-6 text-center border-t border-border/80 pt-4">
              <p className="text-xs text-muted-foreground">
                Don't have an account?
                <Link to="/auth/signup" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
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
