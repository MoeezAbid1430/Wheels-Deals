import React, { useState, useEffect } from 'react';
// Import hooks to read and change the URL
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuctions } from '../context/AuctionContext';
import { pakistanCities } from '../data/taxonomy';

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, backendStatus, authUser } = useAuctions();
  const redirectTarget = location.state?.from?.pathname;
  const accessReason = location.state?.reason;
  const accessDescription = location.state?.description;

  // Determine if we are in Login mode based on the URL
  // If the path is NOT '/signup', we default to Login mode.
  const [isLogin, setIsLogin] = useState(location.pathname !== '/signup');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: 'Karachi',
    accountType: 'Buyer',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // This Effect runs whenever the URL changes (e.g. clicking back button)
  useEffect(() => {
    setIsLogin(location.pathname !== '/signup');
  }, [location.pathname]);

  // Function to switch modes and update URL
  const toggleMode = (loginMode) => {
    setIsLogin(loginMode);
    setMessage('');
    navigate(loginMode ? '/login' : '/signup');
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const passwordFailures = (password) => [
    password.length >= 10 ? null : '10+ characters',
    /[A-Z]/.test(password) ? null : 'uppercase letter',
    /[a-z]/.test(password) ? null : 'lowercase letter',
    /[0-9]/.test(password) ? null : 'number',
    /[^A-Za-z0-9]/.test(password) ? null : 'symbol',
  ].filter(Boolean);

  const submitForm = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    const result = isLogin
      ? await login({ email: form.email, password: form.password })
      : !form.acceptTerms
        ? { ok: false, message: 'Accept privacy, security, and marketplace terms before creating an account.' }
        : passwordFailures(form.password).length
          ? { ok: false, message: `Password must include ${passwordFailures(form.password).join(', ')}.` }
          : form.password !== form.confirmPassword
            ? { ok: false, message: 'Passwords do not match.' }
            : await register({ fullName: form.fullName, email: form.email, phone: form.phone, city: form.city, accountType: form.accountType, password: form.password });

    setIsSubmitting(false);
    setMessage(result.message);
    if (result.ok) {
      const nextPath =
        redirectTarget && !['/login', '/signup'].includes(redirectTarget)
          ? redirectTarget
          : resolvePostAuthDestination(result.user);
      navigate(nextPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full animate-fade-in">
        
        {/* Top Toggle Tabs */}
        <div className="flex justify-center gap-6 mb-8">
          <button 
            onClick={() => toggleMode(true)}
            className={`flex items-center gap-2 font-bold text-lg transition-colors ${isLogin ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-400'}`}
          >
            Login
          </button>
          <button 
            onClick={() => toggleMode(false)}
            className={`flex items-center gap-2 font-bold text-lg transition-colors ${!isLogin ? 'text-blue-950 border-b-2 border-blue-950' : 'text-gray-400'}`}
          >
            Sign Up
          </button>
        </div>

        {/* --- FORM CONTAINER --- */}
        <form key={isLogin ? 'login' : 'signup'} className="animate-fade-in" onSubmit={submitForm}>
          <div className={`mb-5 rounded-lg border p-3 text-sm font-bold ${backendStatus.available ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
            {backendStatus.message}
            {authUser && <span className="block text-slate-600 mt-1">Signed in as {authUser.email}</span>}
          </div>

          {accessReason && (
            <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-900">
              {accessReason}
              {accessDescription && <span className="block mt-1 text-blue-700">{accessDescription}</span>}
            </div>
          )}
          
          {isLogin ? (
            /* --- LOGIN FORM --- */
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-2">Email address</label>
                <input value={form.email} onChange={(event) => updateField('email', event.target.value)} type="email" placeholder="Enter your email" className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="mb-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-gray-700 text-sm font-semibold">Password</label>
                  <button type="button" className="text-sm font-bold text-gray-600 hover:text-blue-600">Forgot password?</button>
                </div>
                <input value={form.password} onChange={(event) => updateField('password', event.target.value)} type="password" placeholder="Enter password" className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              
              <button disabled={isSubmitting} className="w-full bg-slate-900 disabled:bg-slate-400 text-white font-bold py-3 rounded-lg mt-6 hover:bg-slate-800 transition active:scale-95">
                {isSubmitting ? 'Connecting...' : 'Log In'}
              </button>
              
              {/* Divider */}
              <div className="relative flex py-6 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                  <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Social Buttons */}
              <div className="space-y-3">
                <SocialButton icon="google" text="Continue with Google" />
              </div>
              
              <p className="text-center text-sm text-gray-500 mt-6">
                Don't have an account yet? <button onClick={() => toggleMode(false)} className="font-bold text-gray-900 underline">Sign up</button>
              </p>
            </>
          ) : (
            /* --- SIGN UP FORM --- */
            <>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-2">Full Name</label>
                <input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} type="text" placeholder="Name" className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-2">Email address</label>
                <input value={form.email} onChange={(event) => updateField('email', event.target.value)} type="email" placeholder="Email" className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Phone number</label>
                  <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} type="tel" placeholder="+92 300 0000000" className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">City</label>
                  <select value={form.city} onChange={(event) => updateField('city', event.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors bg-white">
                    {pakistanCities.map((city) => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-2">Account type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Buyer', 'Seller', 'Dealer'].map((type) => (
                    <button key={type} type="button" onClick={() => updateField('accountType', type)} className={`rounded-lg border p-3 font-black ${form.accountType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-gray-200'}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-2">Create Password</label>
                <input value={form.password} onChange={(event) => updateField('password', event.target.value)} type="password" placeholder="10+ chars, number, symbol" className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors" />
                <p className="text-xs font-bold text-slate-500 mt-2">Use 10+ characters with uppercase, lowercase, number, and symbol. Dealer accounts start as pending verification.</p>
              </div>
              
              {/* --- NEW CONFIRM PASSWORD FIELD --- */}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-2">Confirm Password</label>
                <input value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} type="password" placeholder="Confirm your password" className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              {/* ---------------------------------- */}

              <label className="flex items-start gap-3 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <input type="checkbox" checked={form.acceptTerms} onChange={(event) => updateField('acceptTerms', event.target.checked)} className="mt-1" />
                <span className="text-sm text-slate-600">
                  I agree to privacy, security, anti-fraud, listing moderation, and marketplace safety rules.
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <TrustPill label="OTP ready" />
                <TrustPill label="KYC ready" />
                <TrustPill label="Privacy first" />
              </div>

              <button disabled={isSubmitting} className="w-full bg-slate-900 disabled:bg-slate-400 text-white font-bold py-3 rounded-lg mt-2 hover:bg-slate-800 transition active:scale-95">
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </button>
              
              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account? <button onClick={() => toggleMode(true)} className="font-bold text-gray-900 underline">Login</button>
              </p>
            </>
          )}

          {message && <p className="mt-4 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3">{message}</p>}
        </form>
      </div>
    </div>
  );
};

// Helper Component for Social Buttons
const SocialButton = ({ icon, text }) => {
  return (
    <button type="button" className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg p-3 font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-95">
      {icon === 'google' && <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
      {text}
    </button>
  );
}

const TrustPill = ({ label }) => (
  <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-lg px-2 py-2 text-[11px] font-black">
    {label}
  </div>
);

export default Login;

const resolvePostAuthDestination = (user) => {
  const roles = user?.roles || [];
  if (roles.some((role) => ['admin', 'super_admin'].includes(role))) return '/admin';
  if (roles.some((role) => ['writer', 'verified_writer', 'editor'].includes(role))) return '/writer/dashboard';
  if (roles.some((role) => ['seller', 'dealer'].includes(role))) return '/seller/dashboard';
  return '/buyer/dashboard';
};
