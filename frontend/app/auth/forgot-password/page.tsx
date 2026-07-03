'use client'

import { useState } from 'react'
import { AuthLayout } from '@/components/auth-layout'
import { FormInput } from '@/components/ui/form-input'
import { ButtonCustom } from '@/components/ui/button-custom'
import Link from 'next/link'

interface FormErrors {
  email?: string
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const validateForm = () => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!email.includes('@')) {
      newErrors.email = 'Please enter a valid email'
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors = validateForm()
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitted(true)
      setIsLoading(false)
    }, 1500)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    // Clear error when user starts typing
    if (errors.email) {
      setErrors({})
    }
  }

  if (isSubmitted) {
    return (
      <AuthLayout
        title="Check Your Email"
        description="We've sent password reset instructions"
      >
        <div className="space-y-6">
          <div className="bg-secondary/30 border border-border rounded-sm p-4 text-center">
            <p className="text-sm text-foreground">
              We&apos;ve sent a password reset link to:
            </p>
            <p className="font-mono text-sm text-primary font-medium mt-2">
              {email}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              The link will expire in 24 hours.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <button
                onClick={() => {
                  setIsSubmitted(false)
                  setEmail('')
                }}
                className="text-primary hover:underline font-medium"
              >
                try again
              </button>
              .
            </p>
          </div>
        </div>

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
          type="email"
          placeholder="you@company.com"
          value={email}
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
