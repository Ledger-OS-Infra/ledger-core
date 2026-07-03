// frontend/app/auth/signup/page.tsx
'use client'

import { useState } from 'react'
import { AuthLayout } from '@/components/auth-layout'
import { FormInput } from '@/components/ui/form-input'
import { PasswordInput } from '@/components/ui/password-input'
import { PasswordStrengthMeter } from '@/components/ui/password-strength-meter'
import { FormError } from '@/components/ui/form-error'
import { ButtonCustom } from '@/components/ui/button-custom'
import { AuthFooterLink } from '@/components/ui/auth-footer-link'
import { AuthSuccessState } from '@/components/ui/auth-success-state'
import { useFormValidation, FormErrors } from '@/hooks/use-form-validation'
import { useRouter } from 'next/navigation'

interface SignupFormValues {
  name: string
  email: string
  password: string
  confirmPassword: string
}

function validateSignupForm(values: SignupFormValues): FormErrors<SignupFormValues> {
  const newErrors: FormErrors<SignupFormValues> = {}

  if (!values.name.trim()) {
    newErrors.name = 'Business name is required'
  }

  if (!values.email.trim()) {
    newErrors.email = 'Email is required'
    return newErrors
  }
  if (!values.email.includes('@')) {
    newErrors.email = 'Please enter a valid email'
  }

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

export default function SignupPage() {
  const router = useRouter()
  const {
    values: formData,
    errors,
    isLoading,
    setIsLoading,
    handleChange,
    validateForm,
    hasErrors,
  } = useFormValidation<SignupFormValues>(
    { name: '', email: '', password: '', confirmPassword: '' },
    validateSignupForm
  )
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (hasErrors(newErrors)) return

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsSuccess(true)
      setIsLoading(false)

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    }, 1500)
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Account Created"
        description="Welcome to Ledger-Core. Redirecting to dashboard..."
      >
        <AuthSuccessState message="Your account has been created successfully." />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create Account"
      description="Set up your Ledger-Core workspace"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <FormError message={errors.general} />}

        <FormInput
          label="Business Name"
          name="name"
          type="text"
          placeholder="Your company name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          disabled={isLoading}
        />

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

        <div className="space-y-2">
          <PasswordInput
            label="Password"
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
          {isLoading ? 'Creating account...' : 'Create Account'}
        </ButtonCustom>
      </form>

      <AuthFooterLink variant="signup" />
    </AuthLayout>
  )
}