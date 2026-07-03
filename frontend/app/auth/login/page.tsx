// frontend/app/auth/login/page.tsx
'use client'

import { AuthLayout } from '@/components/auth-layout'
import { FormInput } from '@/components/ui/form-input'
import { PasswordInput } from '@/components/ui/password-input'
import { FormError } from '@/components/ui/form-error'
import { ButtonCustom } from '@/components/ui/button-custom'
import { AuthFooterLink } from '@/components/ui/auth-footer-link'
import { useFormValidation, FormErrors } from '@/hooks/use-form-validation'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface LoginFormValues {
  email: string
  password: string
}

function validateLoginForm(values: LoginFormValues): FormErrors<LoginFormValues> {
  const newErrors: FormErrors<LoginFormValues> = {}

  if (!values.email.trim()) {
    newErrors.email = 'Email is required'
    return newErrors
  }
  if (!values.email.includes('@')) {
    newErrors.email = 'Please enter a valid email'
  }

  if (!values.password) {
    newErrors.password = 'Password is required'
  }

  return newErrors
}

export default function LoginPage() {
  const router = useRouter()
  const {
    values: formData,
    errors,
    isLoading,
    setIsLoading,
    handleChange,
    validateForm,
    hasErrors,
    setGeneralError,
  } = useFormValidation<LoginFormValues>({ email: '', password: '' }, validateLoginForm)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (hasErrors(newErrors)) return

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      // Mock authentication - in real app, validate credentials
      if (formData.email && formData.password) {
        router.push('/dashboard')
        return
      }

      setGeneralError('Invalid credentials')
      setIsLoading(false)
    }, 1500)
  }

  return (
    <AuthLayout
      title="Welcome Back"
      description="Sign in to your Ledger-Core account"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <FormError message={errors.general} />}

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

        <PasswordInput
          label="Password"
          name="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
        />

        <div className="flex items-center justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-primary hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <ButtonCustom
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </ButtonCustom>
      </form>

      <AuthFooterLink variant="login" />
    </AuthLayout>
  )
}