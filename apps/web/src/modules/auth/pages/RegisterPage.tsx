import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerSchema, type RegisterInput } from '@wanderlog/shared';
import { authApi } from '@/services/api/auth.ts';
import { useAuthStore } from '@/store/authStore.ts';
import { Button } from '@/shared/components/ui/Button.tsx';
import { Input } from '@/shared/components/ui/Input.tsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      const { data: tokens } = await authApi.register(data);
      setTokens(tokens.accessToken, tokens.refreshToken);
      toast.success('Account created! Welcome to Wanderlog.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">Wanderlog</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create your account</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          Start planning your perfect journeys
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            type="text"
            placeholder="Your full name"
            error={errors.name?.message}
            autoComplete="name"
            {...register('name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            autoComplete="email"
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
            hint="Must include uppercase letter and number"
            autoComplete="new-password"
            {...register('password')}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            size="lg"
            loading={isSubmitting}
          >
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
