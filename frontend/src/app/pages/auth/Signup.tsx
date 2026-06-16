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
          <h1 className="text-2xl font-bold">
            {showOtpScreen ? 'Verify Account' : 'Create Your Account'}
          </h1>
          <p className="text-sm text-[--color-text-secondary] mt-1">
            {showOtpScreen ? `OTP sent to ${formData.email}` : 'Join the summit'}
          </p>
        </div>

        {/* Signup Form */}
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

          {showOtpScreen ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signupOtp" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[--color-primary]" />
                  Enter 6-Digit OTP
                </Label>
                <Input
                  id="signupOtp"
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
                onClick={() => setShowOtpScreen(false)}
              >
                Back to Registration
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[--color-text-secondary]" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[--color-text-secondary]" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[--color-text-secondary]" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[--color-text-secondary]" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-[--color-text-secondary]">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company (Optional)</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Your company name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          )}

          {!showOtpScreen && (
            <div className="mt-4 text-center">
              <p className="text-sm text-[--color-text-secondary]">
                Already have an account?{' '}
                <Link to="/auth/login" className="text-[--color-primary] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {formData.role && formData.role !== 'attendee' && !showOtpScreen && (
            <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-blue-600">
                Your account will be pending approval by an organizer before you can access premium features.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
