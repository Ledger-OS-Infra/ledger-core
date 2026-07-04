'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/auth-layout'
import { AuthSuccessState } from '@/components/ui/auth-success-state'
import { FormError } from '@/components/ui/form-error'
import { authClient } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import Link from 'next/link'

type VerifyState = 'loading' | 'success' | 'error' | 'no-token'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<VerifyState>(token ? 'loading' : 'no-token')
  const [errorMsg, setErrorMsg] = useState('')
  // Tokens are single-use — guard against React StrictMode's double-invoked
  // effect (and browser prefetch) so we call the endpoint exactly once.
  const verifyStarted = useRef(false)

  useEffect(() => {
    if (!token || verifyStarted.current) return
    verifyStarted.current = true

    authClient
      .verifyEmail(token)
      .then(() => {
        setState('success')
      })
      .catch((err) => {
        setState('error')
        setErrorMsg(
          err instanceof ApiError
            ? err.message
            : 'Verification failed. The link may have expired.',
        )
      })
  }, [token])

  if (state === 'no-token') {
    return (
      <AuthLayout title="Invalid Link" description="No verification token found">
        <FormError message="This link is invalid. Please check your email for the correct verification link." />
        <div className="pt-4 text-center">
          <Link href="/auth/login" className="text-sm text-primary hover:underline font-medium">
            Go to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  if (state === 'loading') {
    return (
      <AuthLayout title="Verifying Email" description="Please wait...">
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AuthLayout>
    )
  }

  if (state === 'error') {
    return (
      <AuthLayout title="Verification Failed" description="We couldn't verify your email">
        <FormError message={errorMsg} />
        <div className="pt-4 text-center">
          <Link href="/auth/login" className="text-sm text-primary hover:underline font-medium">
            Go to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Email Verified" description="Your email has been confirmed">
      <AuthSuccessState message="Your email has been verified successfully.">
        <Link
          href="/auth/login"
          className="inline-block mt-4 text-sm text-primary hover:underline font-medium"
        >
          Sign in to your account
        </Link>
      </AuthSuccessState>
    </AuthLayout>
  )
}
