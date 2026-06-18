import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ShieldCheck, Mail, Lock, User, Phone } from 'lucide-react';
import { BRAND } from '../../config/branding';

export function Signup() {
  const { signup, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '' as UserRole,
    company: '',
  });

  const [otp, setOtp] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const roleOptions = [
    { value: 'attendee', label: 'Attendee', description: 'Full event access and networking' },
    { value: 'organizer', label: 'Organizer', description: 'Manage events, sessions, and booths' },
    { value: 'speaker', label: 'Speaker', description: 'Present at main stage' },
    { value: 'exhibitor', label: 'Exhibitor', description: 'Showcase products and services' },
    { value: 'startup_participant', label: 'Startup Participant', description: 'Pitch and display your startup' },
    { value: 'sponsor', label: 'Sponsor', description: 'Premium booth and visibility' },
    { value: 'admin', label: 'Admin', description: 'Full platform administrative control' },
  ];



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.role) {
      setError('Please select a role');
      setLoading(false);
      return;
    }

    if (formData.phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      setLoading(false);
      return;
    }

    try {
      const res = await signup(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
        formData.company,
        formData.phone
      );

      if (res?.requiresOTP) {
        setShowOtpScreen(true);
        setSuccess(res.message || 'OTP sent to your email. Please verify.');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOTP(formData.email, otp);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
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
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            {showOtpScreen ? 'Verify Account' : 'Create Your Account'}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium tracking-wide uppercase">
            {showOtpScreen ? `OTP sent to ${formData.email}` : 'Join the summit'}
          </p>
        </div>

        {/* Signup Form */}
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

          {showOtpScreen ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signupOtp" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 animate-pulse" />
                  Enter 6-Digit OTP
                </Label>
                <Input
                  id="signupOtp"
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
                onClick={() => setShowOtpScreen(false)}
              >
                Back to Registration
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <SelectTrigger id="role" className="bg-muted/30 border-border text-foreground rounded-xl focus:ring-emerald-500/20 focus:border-emerald-500 h-10">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-xl">
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="focus:bg-muted focus:text-foreground cursor-pointer">
                        <div className="py-1">
                          <div className="font-bold text-sm">{option.label}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company (Optional)</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Your company name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10"
                />
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-11 transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer border-none" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          )}

          {!showOtpScreen && (
            <div className="mt-6 text-center border-t border-border/80 pt-4">
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {formData.role && formData.role !== 'attendee' && !showOtpScreen && (
            <div className="mt-4 p-3.5 bg-sky-500/10 rounded-xl border border-sky-500/25">
              <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold leading-relaxed">
                Your account will be pending approval by an organizer before you can access premium features.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
