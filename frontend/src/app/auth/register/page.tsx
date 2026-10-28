'use client';
import { useEffect } from 'react';

// Registration is now part of the unified login/OTP flow.
// Email OTP automatically creates the account on first sign-in.
export default function Register() {
  useEffect(() => {
    window.location.href = '/auth/login';
  }, []);
  return null;
}
