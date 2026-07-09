import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, Zap, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'One number' },
  { test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p), label: 'One special character' },
];

export default function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  // OTP Verification state
  const [verificationStep, setVerificationStep] = useState(null); // 'email' | 'phone' | null
  const [emailOtpHint, setEmailOtpHint] = useState('');
  const [phoneOtpHint, setPhoneOtpHint] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);

  const { login, register, verifyEmail, verifyPhone, resendOTP, loading, isAuthenticated, isEmailVerified, isPhoneVerified, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If fully verified and authenticated, redirect to dashboard
    if (isAuthenticated) {
      if (isEmailVerified && isPhoneVerified) {
        navigate('/dashboard');
      } else if (!isEmailVerified) {
        setVerificationStep('email');
      } else if (!isPhoneVerified) {
        setVerificationStep('phone');
      }
    }
  }, [isAuthenticated, isEmailVerified, isPhoneVerified, navigate]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setForm({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
    setErrors({});
    setServerError('');
    setSuccess('');
    setVerificationStep(null);
    setOtpDigits(['', '', '', '', '', '']);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
    setServerError('');
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccess('');

    // Validations
    const errs = {};
    if (mode === 'register') {
      if (!form.name || form.name.trim().length < 2) errs.name = 'Full name is required.';
      if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone.replace(/[\s\-+]/g, '').slice(-10))) errs.phone = 'Valid 10-digit Indian phone number required.';
      const strength = PASSWORD_RULES.filter(r => r.test(form.password)).length;
      if (strength < 5) errs.password = 'Password does not meet requirements.';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Valid email is required.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    if (mode === 'login') {
      const result = await login(form.email, form.password);
      if (result?.success) {
        if (result.requireVerification) {
          setEmailOtpHint(result.email_otp_hint || '');
          setPhoneOtpHint(result.phone_otp_hint || '');
          if (!result.user.email_verified) {
            setVerificationStep('email');
          } else {
            setVerificationStep('phone');
          }
          setSuccess('Verify your account details to log in.');
        } else {
          setSuccess('Signed in successfully! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1200);
        }
      } else {
        setServerError(result?.message || 'Login failed.');
      }
    } else {
      const result = await register(form.name, form.email, form.password, form.phone);
      if (result?.success) {
        setEmailOtpHint(result.email_otp_hint || '');
        setPhoneOtpHint(result.phone_otp_hint || '');
        setVerificationStep('email');
        setSuccess('Account created! Please verify your email.');
      } else {
        setServerError(result?.message || 'Registration failed.');
      }
    }
  };

  const handleVerifyOTP = async () => {
    setServerError('');
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setServerError('Please enter all 6 digits.');
      return;
    }

    if (verificationStep === 'email') {
      const result = await verifyEmail(otp);
      if (result?.success) {
        setSuccess('Email verified! Now let\'s verify your mobile number.');
        setVerificationStep('phone');
        setOtpDigits(['', '', '', '', '', '']);
      } else {
        setServerError(result?.message || 'Email verification failed.');
      }
    } else if (verificationStep === 'phone') {
      const result = await verifyPhone(otp);
      if (result?.success) {
        setSuccess('Phone number verified! Loading your dashboard...');
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        setServerError(result?.message || 'Phone verification failed.');
      }
    }
  };

  const handleResend = async () => {
    setServerError('');
    const result = await resendOTP(verificationStep);
    if (result?.success) {
      if (verificationStep === 'email') {
        setEmailOtpHint(result.email_otp_hint || '');
      } else {
        setPhoneOtpHint(result.phone_otp_hint || '');
      }
      setSuccess('New code sent!');
      setOtpDigits(['', '', '', '', '', '']);
    } else {
      setServerError(result?.message || 'Failed to resend code.');
    }
  };

  const passwordStrength = form.password ? PASSWORD_RULES.filter(r => r.test(form.password)).length : 0;
  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Excellent'];

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-blue-600/08 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-600/08 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md z-10 animate-scale-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow-blue">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl text-white">
              Drive<span className="gradient-text">Elite</span>
            </span>
          </Link>
          <p className="text-white/30 text-sm mt-2">Premium Car Rental — India 🇮🇳</p>
        </div>

        <div className="glass-card rounded-3xl overflow-hidden">
          {verificationStep ? (
            /* ─── Verification Step Cards ─── */
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={32} className="text-white" />
                </div>
                <h2 className="font-display font-bold text-white text-2xl">
                  {verificationStep === 'email' ? 'Verify Email Address' : 'Verify Phone Number'}
                </h2>
                <p className="text-white/40 text-sm mt-2 font-light">
                  {verificationStep === 'email' ? (
                    <>We sent a 6-digit OTP code to <span className="text-blue-400 font-medium">{form.email || user?.email}</span></>
                  ) : (
                    <>We sent a 6-digit OTP to your phone <span className="text-purple-400 font-medium">{form.phone || user?.phone}</span></>
                  )}
                </p>
              </div>

              {/* Dev hints for verification codes */}
              {verificationStep === 'email' && emailOtpHint && (
                <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300/80 text-center mb-4">
                  <strong>Dev Mode Email OTP:</strong> {emailOtpHint}
                </div>
              )}
              {verificationStep === 'phone' && phoneOtpHint && (
                <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300/80 text-center mb-4">
                  <strong>Dev Mode Phone OTP:</strong> {phoneOtpHint}
                </div>
              )}

              {/* Digits Inputs */}
              <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl input-dark"
                    id={`otp-box-${i}`}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {serverError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                  <AlertCircle size={16} className="shrink-0" />
                  {serverError}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-4">
                  <CheckCircle2 size={16} className="shrink-0" />
                  {success}
                </div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otpDigits.join('').length !== 6}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                id="verify-submit-btn"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                onClick={handleResend}
                disabled={loading}
                className="w-full py-2 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                Didn't receive code? <span className="text-blue-400">Resend OTP</span>
              </button>
            </div>
          ) : (
            /* ─── Sign In / Sign Up Forms ─── */
            <>
              <div className="flex border-b border-white/08">
                <button
                  id="tab-login"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-4 text-sm font-semibold transition-all ${
                    mode === 'login' ? 'text-white border-b-2 border-blue-500 bg-white/03' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  Sign In
                </button>
                <button
                  id="tab-register"
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-4 text-sm font-semibold transition-all ${
                    mode === 'register' ? 'text-white border-b-2 border-purple-500 bg-white/03' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'register' && (
                    <div>
                      <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input type="text" name="name" id="register-name" value={form.name} onChange={handleChange} placeholder="Rahul Sharma" className="input-dark pl-10" />
                      </div>
                      {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type="email" name="email" id="login-email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="input-dark pl-10" />
                    </div>
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Phone Number</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input type="tel" name="phone" id="register-phone" value={form.phone} onChange={handleChange} placeholder="9876543210" className="input-dark pl-10" />
                      </div>
                      {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type={showPassword ? 'text' : 'password'} name="password" id="login-password" value={form.password} onChange={handleChange} placeholder="••••••••" className="input-dark pl-10 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}

                    {mode === 'register' && form.password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i < passwordStrength ? strengthColors[passwordStrength - 1] : 'rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                        <p className="text-[10px]" style={{ color: passwordStrength > 0 ? strengthColors[passwordStrength - 1] : '#666' }}>
                          {strengthLabels[passwordStrength - 1]}
                        </p>
                      </div>
                    )}
                  </div>

                  {mode === 'register' && (
                    <div>
                      <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Confirm Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                        <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" id="register-confirm" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" className="input-dark pl-10" />
                      </div>
                      {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                    </div>
                  )}

                  {serverError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle size={16} className="shrink-0" />
                      {serverError}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                      <CheckCircle2 size={16} className="shrink-0" />
                      {success}
                    </div>
                  )}

                  {/* Forgot Password Link */}
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => alert("Password reset OTP will be sent to your Gmail. To reset, please register a new account or contact support@driveelite.in for verification.")}
                      className="text-blue-400/80 hover:text-blue-300 text-xs transition-all"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${
                      mode === 'login' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-purple-600 hover:bg-purple-500'
                    }`}
                  >
                    {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={16} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
