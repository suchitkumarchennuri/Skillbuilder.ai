import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]*$/, 'Name can only contain letters and spaces'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
  }
>(({ label, error, className, type, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-dark-200">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          type={isPassword && showPassword ? 'text' : type}
          className={clsx(
            "input",
            error ? "border-red-500" : "border-dark-200 dark:border-dark-700",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    reset: resetRegisterForm,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onLogin = async (data: LoginFormData) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn(data.email, data.password);
    } catch (error) {
      setError('Invalid email or password');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await signUp(data.email, data.password, data.fullName);
      
      if (result.success) {
        setSuccess(result.message);
        resetRegisterForm();
        // Switch to login view after successful registration
        setTimeout(() => {
          setIsLogin(true);
          setSuccess(null);
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 flex items-center gap-2 text-dark-300 hover:text-primary-400 transition-colors"
        whileHover={{ x: -4 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Home</span>
      </motion.button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="h-8 w-8 text-primary-500 animate-pulse-slow" />
          <h2 className="text-2xl font-bold gradient-text ml-2">SkillBridge AI</h2>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white">
          {isLogin ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-dark-300">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                  setSuccess(null);
                }}
                className="font-medium text-primary-500 hover:text-primary-400"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                  setSuccess(null);
                }}
                className="font-medium text-primary-500 hover:text-primary-400"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-8">
          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/20 text-green-400 flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}
          
          {isLogin ? (
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-6">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                error={loginErrors.email?.message}
                disabled={isLoading}
                {...loginRegister('email')}
              />

              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                error={loginErrors.password?.message}
                disabled={isLoading}
                {...loginRegister('password')}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-300 rounded"
                    disabled={isLoading}
                    {...loginRegister('rememberMe')}
                  />
                  <label className="ml-2 block text-sm text-dark-300">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-primary-500 hover:text-primary-400"
                  >
                    Forgot your password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-6">
              <Input
                label="Full name"
                type="text"
                autoComplete="name"
                error={registerErrors.fullName?.message}
                disabled={isLoading}
                {...registerRegister('fullName')}
              />

              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                error={registerErrors.email?.message}
                disabled={isLoading}
                {...registerRegister('email')}
              />

              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                error={registerErrors.password?.message}
                disabled={isLoading}
                {...registerRegister('password')}
              />

              <Input
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                error={registerErrors.confirmPassword?.message}
                disabled={isLoading}
                {...registerRegister('confirmPassword')}
              />

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-5 w-5 mx-auto" />
                ) : (
                  'Sign up'
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-xs text-center text-dark-400">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary-500 hover:text-primary-400">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-500 hover:text-primary-400">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}