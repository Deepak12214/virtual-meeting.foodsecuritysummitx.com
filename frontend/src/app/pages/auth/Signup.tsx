import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ShieldCheck, Mail, Lock, User, Phone } from 'lucide-react';
import { BRAND } from '../../config/branding';
import { COUNTRY_CODES } from '../../data/countries';
import { toast } from 'sonner';

export function Signup() {
  const { signup, googleLogin, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '+91',
    phone: '',
    password: '',
    role: 'attendee' as UserRole,
    company: '',
  });

  const [otp, setOtp] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decoding Google JWT token', e);
      return null;
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    setError('');
    setSuccess('');
    setGoogleLoading(true);
    try {
      const decoded = decodeJwt(response.credential);
      if (!decoded || !decoded.email) {
        throw new Error('Could not retrieve user details from Google credentials.');
      }
      await googleLogin(decoded.email, decoded.name || 'Google User', formData.role, formData.company);
      toast.success('Successfully registered and signed in with Google!');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google Registration/Login failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleMockGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setGoogleLoading(true);
    try {
      const testEmail = prompt("Enter a test Google email (or leave empty to generate random):") || `google-${Math.random().toString(36).slice(2, 7)}@example.com`;
      const testName = `Google User ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      await googleLogin(testEmail, testName, formData.role, formData.company);
      toast.success(`Registered and signed in as: ${testEmail}`);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Mock Google Sign-In failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if ((window as any).google) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1088494793617-mockid.apps.googleusercontent.com';
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById('google-signup-button'),
          { theme: 'outline', size: 'large', width: '380' }
        );
      }
    };

    return () => {
      const btn = document.getElementById('google-signup-button');
      if (btn) btn.innerHTML = ''; // Clear loaded buttons to prevent multiple buttons
      document.body.removeChild(script);
    };
  }, [formData.role, formData.company]);

  const roleOptions = [
    { value: 'attendee', label: 'Attendee', description: 'Full event access and networking' },
    { value: 'organizer', label: 'Organizer', description: 'Manage events, sessions, and booths' },
    { value: 'speaker', label: 'Speaker', description: 'Present at main stage' },
    { value: 'exhibitor', label: 'Exhibitor', description: 'Showcase products and services' },
    { value: 'startup_participant', label: 'Startup Participant', description: 'Pitch and display your startup' },
    { value: 'sponsor', label: 'Sponsor', description: 'Premium booth and visibility' },
    { value: 'investor', label: 'Investor', description: 'Watch pitches and evaluate startups' },
    { value: 'admin', label: 'Admin', description: 'Full platform administrative control' },
    { value: 'sub_exhibitor', label: 'Sub-Exhibitor', description: 'Manage booth meetings and leads' },
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
    const rawPhone = formData.phone.trim();
    if (!formData.countryCode) {
      setError('Please select a country code');
      setLoading(false);
      return;
    }

    if (formData.countryCode === '+91' && rawPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setLoading(false);
      return;
    }

    if (rawPhone.length < 7 || rawPhone.length > 15) {
      setError('Please enter a valid phone number (7 to 15 digits)');
      setLoading(false);
      return;
    }

    try {
      const combinedPhone = `${formData.countryCode} ${rawPhone}`;
      const res = await signup(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
        formData.company,
        combinedPhone
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
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <div className="w-[120px] shrink-0">
                    <Select
                      value={formData.countryCode}
                      onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
                    >
                      <SelectTrigger id="countryCode" className="bg-muted/30 border-border text-foreground rounded-xl focus:ring-emerald-500/20 focus:border-emerald-500 h-10 w-full">
                        <SelectValue placeholder="+91" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground rounded-xl max-h-[200px] overflow-y-auto z-50">
                        {COUNTRY_CODES.map((item) => (
                          <SelectItem key={item.country} value={item.code} className="focus:bg-muted focus:text-foreground cursor-pointer">
                            {item.code} ({item.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, phone: val });
                      }}
                      className="bg-muted/30 border-border rounded-xl text-foreground placeholder-muted-foreground/75 focus:ring-emerald-500/20 focus:border-emerald-500 h-10 w-full"
                      required
                    />
                  </div>
                </div>
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

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl h-11 transition-all duration-300 shadow-lg shadow-emerald-500/10 cursor-pointer border-none" disabled={loading || googleLoading}>
                {loading || googleLoading ? 'Creating account...' : 'Sign Up'}
              </Button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                  <span className="bg-card px-2 text-muted-foreground">Or connect with</span>
                </div>
              </div>

              <div className="space-y-3">
                <div id="google-signup-button" className="w-full min-h-[40px] flex justify-center"></div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleMockGoogleLogin}
                  disabled={googleLoading || loading}
                  className="w-full border-border hover:bg-muted text-foreground font-semibold rounded-xl h-10 cursor-pointer flex items-center justify-center gap-2 text-xs"
                >
                  <img
                    src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png"
                    alt="Google Logo"
                    className="w-4 h-4"
                  />
                  Mock Google Sign-Up (For Testing)
                </Button>
              </div>
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
