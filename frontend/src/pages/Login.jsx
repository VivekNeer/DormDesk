import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Map Cognito error names/messages to user-friendly text
function getFriendlyError(err) {
  const name = err.name || '';
  const msg = err.message || '';

  if (name === 'NotAuthorizedException' || msg.includes('Incorrect username or password')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (name === 'UserNotFoundException') {
    return 'No account found with this email. Please register first.';
  }
  if (name === 'UserNotConfirmedException') {
    return 'Your email hasn\'t been verified yet. Please check your inbox for a confirmation code.';
  }
  if (name === 'TooManyRequestsException' || msg.includes('too many')) {
    return 'Too many login attempts. Please wait a few minutes and try again.';
  }
  if (name === 'LimitExceededException' || msg.includes('Attempt limit exceeded')) {
    return 'Too many failed attempts. Your account is temporarily locked. Please try again later.';
  }
  if (name === 'PasswordResetRequiredException') {
    return 'You need to reset your password before logging in.';
  }
  if (name === 'InvalidParameterException') {
    return 'Please enter a valid email address and password.';
  }
  if (name === 'NetworkError' || msg.includes('Network')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);

      if (result.isSignedIn) {
        // Redirect based on Cognito group
        const CATEGORY_ADMIN_GROUPS = ['FoodAdmin', 'WaterAdmin', 'RoomAdmin', 'ElectricalAdmin', 'CleaningAdmin'];

        if (result.groups.includes('SuperAdmin')) {
          navigate('/admin', { replace: true });
        } else if (result.groups.some(g => CATEGORY_ADMIN_GROUPS.includes(g))) {
          navigate('/category-admin', { replace: true });
        } else {
          navigate('/student', { replace: true });
        }
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        // User registered but hasn't confirmed their email yet
        navigate(`/register?confirm=true&email=${encodeURIComponent(email)}`, { replace: true });
      } else {
        // Any other nextStep we don't handle (MFA etc.)
        setError(`Sign-in requires an additional step: ${result.nextStep?.signInStep}. Please contact support.`);
      }
    } catch (err) {
      if (err.name === 'UserAlreadyAuthenticatedException') {
        navigate('/student', { replace: true });
        return;
      }
      setError(getFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">DormDesk</h1>
          <p className="text-sm text-gray-500 mt-1">Hostel Complaint Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Sign In</h2>

          {/* Closable error notification */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <span className="text-red-400 mt-0.5 text-base leading-none">⚠️</span>
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600 text-lg leading-none font-bold cursor-pointer"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoComplete="email"
              />
            </div>

            <div className="mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoComplete="current-password"
              />
            </div>
            <div className="mb-6 flex items-center gap-2">
              <input
                id="showPassword"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="showPassword" className="text-xs text-gray-500 cursor-pointer select-none">
                Show password
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:text-indigo-700">
              Register
            </Link>
          </p>
        </div>

        {/* Demo / Testing Credentials Box */}
        <div className="mt-8 bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-indigo-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">Test Accounts</span>
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            For testing the Phase 2 role-based access, please use the Category Admins below. 
            SuperAdmin (admin@gmail.com) can see all complaints, while Category Admins only see complaints related to their domain.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_140px] gap-2 items-center text-xs">
              <span className="font-medium text-gray-700 border-b border-gray-100 pb-1">Email</span>
              <span className="font-medium text-gray-700 border-b border-gray-100 pb-1">Password</span>
            </div>
            
            {[
              { email: 'admin@gmail.com', role: 'SuperAdmin', pass: 'Admin@123' },
              { email: 'roomadmin@gmail.com', role: 'Room Admin', pass: 'RoomAdmin@123' },
              { email: 'foodadmin@gmail.com', role: 'Food Admin', pass: 'FoodAdmin@123' },
              { email: 'wateradmin@gmail.com', role: 'Water Admin', pass: 'WaterAdmin@123' },
              { email: 'electricaladmin@gmail.com', role: 'Electrical Admin', pass: 'ElectricalAdmin@123' },
              { email: 'cleaningadmin@gmail.com', role: 'Cleaning Admin', pass: 'CleaningAdmin@123' },
            ].map((acc) => (
              <div key={acc.email} className="grid grid-cols-[1fr_140px] gap-2 items-center text-xs">
                <div className="flex flex-col overflow-hidden">
                  <span className="font-mono text-indigo-600 truncate">{acc.email}</span>
                  <span className="text-[10px] text-gray-400 truncate">{acc.role}</span>
                </div>
                <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded w-fit max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{acc.pass}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
