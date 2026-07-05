'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthLayout } from '@/components/auth-layout'
import { PasswordInput } from '@/components/ui/password-input'
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter'
import { FormError } from '@/components/ui/form-error'
import { ButtonCustom } from '@/components/ui/button-custom'
import { AuthSuccessState } from '@/components/ui/auth-success-state'
import { useFormValidation, FormErrors } from '@/hooks/use-form-validation'
import { authClient } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import Link from 'next/link'

interface ResetFormValues {
  password: string
  confirmPassword: string
}

function validateResetForm(values: ResetFormValues): FormErrors<ResetFormValues> {
  const newErrors: FormErrors<ResetFormValues> = {}

  if (!values.password) {
    newErrors.password = 'Password is required'
    return newErrors
  }
  if (values.password.length < 8) {
    newErrors.password = 'Password must be at least 8 characters'
  }

  if (values.password !== values.confirmPassword) {
    newErrors.confirmPassword = 'Passwords do not match'
  }

  return newErrors
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    values: formData,
    errors,
    isLoading,
    setIsLoading,
    handleChange,
    validateForm,
    hasErrors,
    setGeneralError,
  } = useFormValidation<ResetFormValues>(
    { password: '', confirmPassword: '' },
    validateResetForm,
  )

  if (!token) {
    return (
      <AuthLayout title="Invalid Link" description="No reset token found">
        <FormError message="This link is invalid. Please request a new password reset." />
        <div className="pt-4 text-center">
          <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline font-medium">
            Request new reset link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (hasErrors(newErrors)) return

    setIsLoading(true)

    try {
      await authClient.resetPassword(token, formData.password)
      setIsSuccess(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setGeneralError(err.message)
      } else {
        setGeneralError('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout title="Password Reset" description="Your password has been updated">
        <AuthSuccessState message="Your password has been reset successfully.">
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

  return (
    <AuthLayout
      title="Set New Password"
      description="Choose a strong password for your account"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <FormError message={errors.general} />}

        <div className="space-y-2">
          <PasswordInput
            label="New Password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isLoading}
            disableClipboard
          />
          <PasswordStrengthMeter password={formData.password} />
        </div>

        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          disabled={isLoading}
          disableClipboard
        />

        <ButtonCustom
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
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
