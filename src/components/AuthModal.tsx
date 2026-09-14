import React, { useState } from 'react';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Crown,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useAuth } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const {
    user,
    signInWithPassword,
    signUpWithPassword,
    signInWithOtp,
    signInWithGoogle,
    signOut,
    updateUserLabGroup,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'magic_link'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [signupLabGroup, setSignupLabGroup] = useState<'Group B2-A' | 'Group B2-B'>('Group B2-A');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsGoogleLoading(false);
      setErrorMessage(error.message || 'Failed to initiate Google sign in.');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await signInWithPassword(email.trim(), password);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || 'Failed to sign in. Please verify your email and password.');
    } else {
      setSuccessMessage('Successfully signed in to CaOS!');
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await signUpWithPassword(email.trim(), password, name.trim(), rollNo.trim(), signupLabGroup);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || 'Failed to create student account.');
    } else {
      setSuccessMessage('Account created successfully! Check your email if verification is required.');
      setTimeout(() => {
        onClose();
      }, 900);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await signInWithOtp(email.trim());
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message || 'Failed to send magic link.');
    } else {
      setSuccessMessage('One-time magic link sent to your email inbox!');
    }
  };

  const handleChangeGroup = async (newGroup: 'Group B2-A' | 'Group B2-B') => {
    await updateUserLabGroup(newGroup);
    setSuccessMessage(`Switched active lab schedule to ${newGroup}!`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Student Profile & Settings' : 'Sign in to CaOS'}
      description={
        user
          ? 'Manage your assigned batch, lab group, and university workspace access.'
          : 'Unified academic authentication for USAR AR-1 B2 students and Class Representatives.'
      }
      maxWidth="md"
    >
      {user ? (
        /* Signed-In Profile View */
        <div className="space-y-4 text-xs">
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs">
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{user.name}</h4>
                <span className="text-zinc-400 font-mono text-[11px]">{user.email}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
              {user.role}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-400">Class Batch:</span>
              <span className="text-white font-semibold">{user.classBatch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Roll Number:</span>
              <span className="text-white">{user.rollNo || 'N/A'}</span>
            </div>
          </div>

          {/* Assigned Lab Group Switcher */}
          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-400" />
                Assigned Practical Lab Group:
              </span>
              <span className="font-mono font-bold text-amber-300 text-xs">
                {user.labGroup || 'Group B2-A'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Your timetable automatically highlights and filters practical labs for your selected group.
            </p>

            <div className="flex gap-2 pt-1">
              {(['Group B2-A', 'Group B2-B'] as const).map((grp) => {
                const isActive = (user.labGroup || 'Group B2-A') === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => handleChangeGroup(grp)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {grp}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="text-red-400 border-red-900/40 hover:bg-red-950/20"
            >
              Sign Out
            </Button>
            <Button variant="default" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        /* Signed-Out State */
        <div className="space-y-4 text-xs">
          {/* Continue with Google One-Click Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer hover:border-zinc-600 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{isGoogleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-zinc-950 px-2.5 text-[10px] uppercase font-mono tracking-wider text-zinc-500 shrink-0">
              or continue with email
            </span>
            <div className="border-t border-zinc-800 w-full" />
          </div>

          {/* Tabs */}
          <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800">
            <button
              onClick={() => {
                setAuthMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer ${
                authMode === 'signin' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer ${
                authMode === 'signup' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => {
                setAuthMode('magic_link');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-center font-semibold rounded-md transition-colors cursor-pointer ${
                authMode === 'magic_link' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Magic Link
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs">
              {successMessage}
            </div>
          )}

          {/* Sign In Form */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">College Email / Account</label>
                <Input
                  type="email"
                  placeholder="name@ipu.ac.in or gmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <Button variant="default" size="sm" type="submit" isLoading={isLoading} className="w-full font-bold">
                  Sign In to CaOS
                </Button>
              </div>
            </form>
          )}

          {/* Sign Up Form */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Full Student Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">College Roll Number</label>
                <Input
                  type="text"
                  placeholder="e.g. 04519011926"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  required
                />
              </div>

              {/* Lab Group Selector during signup */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Assigned Lab Group</label>
                <div className="flex gap-2">
                  {(['Group B2-A', 'Group B2-B'] as const).map((grp) => (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setSignupLabGroup(grp)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        signupLabGroup === grp
                          ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {grp}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="student@ipu.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Password</label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <Button variant="default" size="sm" type="submit" isLoading={isLoading} className="w-full font-bold">
                  Create Student Account
                </Button>
              </div>
            </form>
          )}

          {/* Magic Link Form */}
          {authMode === 'magic_link' && (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="student@ipu.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2">
                <Button variant="default" size="sm" type="submit" isLoading={isLoading} className="w-full font-bold">
                  Send One-Time Link
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
