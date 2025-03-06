import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const profileSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]*$/, 'Name can only contain letters and spaces'),
  location: z.string().optional(),
  title: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function Settings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        reset({
          email: data.email,
          fullName: data.full_name,
          location: data.location || '',
          title: data.title || '',
          bio: data.bio || '',
        });
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Update auth email if changed
      if (data.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email,
        });
        if (emailError) throw emailError;
      }

      // Update profile data
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: data.fullName,
          location: data.location,
          title: data.title,
          bio: data.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <User className="h-6 w-6 text-primary-500" />
        <h1 className="text-xl sm:text-2xl font-bold text-white">Profile Settings</h1>
      </div>

      <div className="bg-dark-800 rounded-lg p-6 shadow-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                className="input"
                placeholder="your@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">
                Full Name
              </label>
              <input
                type="text"
                {...register('fullName')}
                className="input"
                placeholder="John Doe"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-400">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">
                Professional Title
              </label>
              <input
                type="text"
                {...register('title')}
                className="input"
                placeholder="Software Engineer"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">
                Location
              </label>
              <input
                type="text"
                {...register('location')}
                className="input"
                placeholder="City, Country"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-400">{errors.location.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">
                Bio
              </label>
              <textarea
                {...register('bio')}
                className="input min-h-[100px]"
                placeholder="Tell us about yourself..."
              />
              {errors.bio && (
                <p className="mt-1 text-sm text-red-400">{errors.bio.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
              Profile updated successfully!
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}