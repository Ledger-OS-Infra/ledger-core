'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormInput } from '@/components/ui/form-input'
import { FormError } from '@/components/ui/form-error'
import { ButtonCustom } from '@/components/ui/button-custom'
import { useFormValidation, FormErrors } from '@/hooks/use-form-validation'
import { customerClient } from '@/lib/api/customers'
import { queryKeys } from '@/lib/queries'
import { ApiError } from '@/lib/api/client'
import type { CustomerWithVirtualAccount } from '@/lib/api/types'
import { MdCheckCircle, MdContentCopy, MdPersonAdd } from 'react-icons/md'

interface AddCustomerFormValues {
  fullName: string
  email: string
  phone: string
  password: string
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

function validateCustomerForm(
  values: AddCustomerFormValues,
): FormErrors<AddCustomerFormValues> {
  const newErrors: FormErrors<AddCustomerFormValues> = {}
  if (!values.fullName.trim()) {
    newErrors.fullName = 'Full name is required'
  }
  if (!values.email.trim() || !values.email.includes('@')) {
    newErrors.email = 'Please enter a valid email'
  }
  if (!values.password || values.password.length < 8) {
    newErrors.password = 'Password must be at least 8 characters'
  }
  return newErrors
}

export function AddCustomerModal({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<CustomerWithVirtualAccount | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const {
    values: formData,
    errors,
    isLoading,
    setIsLoading,
    handleChange,
    setValues,
    validateForm,
    hasErrors,
    setGeneralError,
    reset,
  } = useFormValidation<AddCustomerFormValues>(
    { fullName: '', email: '', phone: '', password: '' },
    validateCustomerForm,
  )

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) return err.message
    return 'Something went wrong. Please try again.'
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      reset()
      setCreated(null)
      setCopied(false)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }

  const handleCopyAccountNumber = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.virtual_account.account_number)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard denied — no-op; user can still select manually.
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (hasErrors(newErrors)) return

    setIsLoading(true)
    try {
      const customer = await customerClient.createCustomer({
        businessId,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        password: formData.password,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers(businessId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(businessId) })
      setCreated(customer)
    } catch (err) {
      setGeneralError(getErrorMessage(err))
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ButtonCustom variant="primary" size="sm">
          <MdPersonAdd className="h-4 w-4" />
          Add Customer
        </ButtonCustom>
      </DialogTrigger>

      <DialogContent>
        {created ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MdCheckCircle className="h-5 w-5 text-green-500" />
                Customer added
              </DialogTitle>
              <DialogDescription>
                A dedicated virtual account was created for{' '}
                <span className="font-medium text-foreground">
                  {created.full_name}
                </span>
                . We&apos;ve emailed them a login link and their temporary
                password. Payments to this account are auto-reconciled.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {created.virtual_account.bank_name}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-lg font-medium">
                  {created.virtual_account.account_number}
                </p>
                <button
                  type="button"
                  onClick={handleCopyAccountNumber}
                  className={`inline-flex items-center gap-1 text-xs transition-colors ${
                    copied
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {copied ? (
                    <>
                      <MdCheckCircle className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <MdContentCopy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <ButtonCustom
              variant="primary"
              className="w-full"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </ButtonCustom>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
              <DialogDescription>
                Create a customer, generate their virtual account, and send
                them a portal invite by email.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && <FormError message={errors.general} />}

              <FormInput
                label="Full Name"
                name="fullName"
                type="text"
                placeholder="e.g. Acme Corporation"
                value={formData.fullName}
                onChange={handleChange}
                error={errors.fullName}
                disabled={isLoading}
              />

              <FormInput
                label="Email"
                name="email"
                type="email"
                placeholder="billing@acme.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                disabled={isLoading}
              />

              <FormInput
                label="Phone (optional)"
                name="phone"
                type="tel"
                placeholder="+234..."
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                disabled={isLoading}
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Temporary password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({ ...prev, password: generateTempPassword() }))
                    }
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    disabled={isLoading}
                  >
                    Generate
                  </button>
                </div>
                <FormInput
                  name="password"
                  type="text"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll email this to the customer along with their
                  login link. They&apos;ll be prompted to set a new password
                  via &quot;Forgot password&quot; on first login.
                </p>
              </div>

              <ButtonCustom
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Customer'}
              </ButtonCustom>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}