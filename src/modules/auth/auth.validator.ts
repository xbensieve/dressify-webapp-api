import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(8, 'Username must be at least 8 characters').trim(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().regex(/^\d{10,15}$/, 'Phone number must be 10-15 digits'),
  email: z.string().email('Invalid email format').trim().toLowerCase(),
  dob: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
    .refine((val) => {
      const dobDate = new Date(val);
      const today = new Date();
      if (dobDate > today) return false;
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() <= dobDate.getDate())) age--;
      return age > 18;
    }, 'You must be over 18 years old'),
  role: z.enum(['customer', 'admin', 'seller']).default('customer'),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const googleLoginSchema = z.object({
  token: z.string().min(1, 'Google token is required'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export const activateAccountSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});
