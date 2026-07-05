'use client'

import { AuthLayout } from '@/components/auth-layout'
import { FormInput } from '@/components/ui/form-input'
import { FormError } from '@/components/ui/form-error'
import { ButtonCustom } from '@/components/ui/button-custom'
import { useFormValidation, FormErrors } from '@/hooks/use-form-validation'
import { useAuth } from '@/hooks/use-auth'
import { businessClient } from '@/lib/api/businesses'
import { ApiError } from '@/lib/api/client'
import { useRouter } from 'next/navigation'

interface BusinessFormValues {
  name: string
}

function validateBusinessForm(values: BusinessFormValues): FormErrors<BusinessFormValues> {
  const newErrors: FormErrors<BusinessFormValues> = {}
  if (!values.name.trim()) {
    newErrors.name = 'Business name is required'
  }
  return newErrors
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, refreshUser, logout } = useAuth()

  const {
    values: formData,
    errors,
    isLoading,
    setIsLoading,
    handleChange,
    validateForm,
    hasErrors,
    setGeneralError,
  } = useFormValidation<BusinessFormValues>(
    { name: user?.fullName ? `${user.fullName}'s Workspace` : '' },
    validateBusinessForm,
  )

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
      return err.message
    }
    return 'Something went wrong. Please try again.'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (hasErrors(newErrors)) return

    setIsLoading(true)

    try {
      await businessClient.create({ name: formData.name.trim() })
      // Reload the profile so workspaces populate, then head to the dashboard.
      await refreshUser()
      router.replace('/dashboard')
    } catch (err) {
      setGeneralError(getErrorMessage(err))
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create Your Business"
      description="Set up a workspace to start onboarding customers"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <FormError message={errors.general} />}

        <FormInput
          label="Business Name"
          name="name"
          type="text"
          placeholder="e.g. Acme Inc."
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          disabled={isLoading}
        />

        <ButtonCustom type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating workspace...' : 'Create Workspace'}
        </ButtonCustom>
      </form>

      <button
        type="button"
        onClick={logout}
        className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Sign out
      </button>
    </AuthLayout>
  )
}
