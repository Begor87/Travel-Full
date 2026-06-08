import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Compass, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginSchema, type LoginInput } from '@wanderlog/shared';
import { authApi } from '@/services/api/auth.ts';
import { useAuthStore } from '@/store/authStore.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';
import { Modal } from '@/shared/components/ui/Modal.tsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setTokens } = useAuthStore();
  const [forgotOpen, setForgotOpen] = useState(false);
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const { data: tokens } = await authApi.login(data);
      setTokens(tokens.accessToken, tokens.refreshToken);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900 dark:text-white">Wanderlog</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            Sign in to your travel platform
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Username or email"
              type="text"
              placeholder="your_username"
              error={errors.identifier?.message}
              autoComplete="username"
              autoCapitalize="none"
              {...register('identifier')}
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="mt-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right panel — hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <h2 className="text-3xl font-bold mb-4">Your travel operating system</h2>
          <p className="text-brand-100 text-lg leading-relaxed">
            Plan trips, manage itineraries, track expenses, and collaborate with travel companions — all in one place, even offline.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { title: 'Offline-first', desc: 'Works without internet' },
              { title: 'Collaborative', desc: 'Plan together in real-time' },
              { title: 'AI-powered', desc: 'Intelligent suggestions' },
              { title: 'Document vault', desc: 'All your docs in one place' },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white/10 rounded-2xl p-4">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-brand-200 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Forgot password — admin-initiated reset (no email reset yet) */}
      <Modal open={forgotOpen} onClose={() => setForgotOpen(false)} title="Reset your password">
        <div className="space-y-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 mx-auto">
            <KeyRound className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 text-center">
            Password resets are handled by your administrator.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Contact the person who runs this Wanderlog and ask them to reset your password.
            They can issue you a <strong>temporary password</strong> from the admin panel — sign in
            with it, then set a new one under <strong>Settings → Security</strong>.
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setForgotOpen(false)}>Got it</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
