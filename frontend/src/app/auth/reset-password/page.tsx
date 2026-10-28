'use client';
import { useEffect } from 'react';

// Reset password is replaced by the OTP flow
export default function ResetPassword() {
  useEffect(() => {
    window.location.href = '/auth/login';
  }, []);
  return null;
}
