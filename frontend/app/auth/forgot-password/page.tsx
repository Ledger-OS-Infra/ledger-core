'use client'

import { useState } from 'react'
import { AuthLayout } from '@/components/auth-layout'
import { FormInput } from '@/components/ui/form-input'
import { ButtonCustom } from '@/components/ui/button-custom'
import { FadeIn } from '@/components/ui/fade-in'
import { useFormValidation, FormErrors } from '@/hooks/use-form-validation'
import { authClient } from '@/lib/api/auth'
import Link from 'next/link'

interface ForgotPasswordFormValues {
  email: string
}

function validateForgotPasswordForm(
  values: ForgotPasswordFormValues
): FormErrors<ForgotPasswordFormValues> {
  const newErrors: FormErrors<ForgotPasswordFormValues> = {}

  if (!values.email.trim()) {
    newErrors.email = 'Email is required'
    return newErrors
  }
  if (!values.email.includes('@')) {
    newErrors.email = 'Please enter a valid email'
  }

  return newErrors
}

export default function ForgotPasswordPage() {
  const {
    values: formData,
    errors,
    isLoading,
    setIsLoading,
    handleChange,
    validateForm,
    hasErrors,
    reset,
  } = useFormValidation<ForgotPasswordFormValues>({ email: '' }, validateForgotPasswordForm)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (hasErrors(newErrors)) return

    setIsLoading(true)

    try {
      await authClient.forgotPassword(formData.email)
      setIsSubmitted(true)
    } catch {
      // Always show success to prevent email enumeration
      setIsSubmitted(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <AuthLayout
        title="Check Your Email"
        description="We've sent password reset instructions"
      >
        <FadeIn className="space-y-6">
          <div className="bg-secondary/30 border border-border rounded-sm p-4 text-center">
            <p className="text-sm text-foreground">
              We&apos;ve sent a password reset link to:
            </p>
            <p className="font-mono text-sm text-primary font-medium mt-2">
              {formData.email}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              The link will expire in 10 minutes.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <button
                onClick={() => {
                  setIsSubmitted(false)
                  reset()
                }}
                className="text-primary hover:underline font-medium"
              >
                try again
              </button>
              .
            </p>
          </div>
        </FadeIn>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset Password"
      description="Enter your email to receive reset instructions"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Email Address"
          name="email"
          type="email"
          placeholder="you@company.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
        />

        <ButtonCustom
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </ButtonCustom>
      </form>

      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          <Link href="/auth/login" className="text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}