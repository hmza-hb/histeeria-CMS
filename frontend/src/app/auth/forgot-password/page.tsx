'use client';
import { useEffect } from 'react';

// Forgot password is replaced by the OTP flow — just go to login
export default function ForgotPassword() {
  useEffect(() => {
    window.location.href = '/auth/login';
  }, []);
  return null;
}
