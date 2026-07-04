'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormInput } from '@/components/ui/form-input'
import { FormError } from '@/components/ui/form-error'
import { ButtonCustom } from '@/components/ui/button-custom'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFormValidation, FormErrors } from '@/hooks/use-form-validation'
import { ApiError } from '@/lib/api/client'
import { formatCurrency } from '@/lib/currency'
import { OBLIGATION_TYPES } from '@/lib/obligations'
import { useCreateObligationMutation, useCustomersQuery } from '@/lib/queries'
import type { Obligation, ObligationType } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/date'
import {
  MdAdd,
  MdCheckCircle,
  MdContentCopy,
  MdDescription,
  MdPerson,
} from 'react-icons/md'

interface CreateObligationFormValues {
  customerId: string
  type: ObligationType
  amount: string
  dueDate: string
  referenceCode: string
}

const TYPE_LABELS: Record<ObligationType, string> = {
  INVOICE: 'Invoice',
  SUBSCRIPTION: 'Subscription',
  FEE: 'Fee',
  LEVY: 'Levy',
  CUSTOM: 'Custom',
}

function defaultDueDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 10)
}

function initialFormValues(): CreateObligationFormValues {
  return {
    customerId: '',
    type: 'INVOICE',
    amount: '',
    dueDate: defaultDueDate(),
    referenceCode: suggestReferenceCode('INVOICE'),
  }
}

function suggestReferenceCode(type: ObligationType): string {
  const year = new Date().getFullYear()
  const prefix =
    type === 'INVOICE'
      ? 'INV'
      : type === 'SUBSCRIPTION'
        ? 'SUB'
        : type.slice(0, 3)
  const suffix = String(Math.floor(Math.random() * 900) + 100)
  return `${prefix}-${year}-${suffix}`
}

function validateForm(
  values: CreateObligationFormValues,
): FormErrors<CreateObligationFormValues> {
  const errors: FormErrors<CreateObligationFormValues> = {}

  if (!values.customerId) {
    errors.customerId = 'Select a customer'
  }

  const amount = Number(values.amount)
  if (!values.amount.trim() || Number.isNaN(amount) || amount <= 0) {
    errors.amount = 'Enter a valid amount greater than zero'
  }

  if (!values.dueDate) {
    errors.dueDate = 'Due date is required'
  }

  return errors
}

function TypePill({
  type,
  selected,
  disabled,
  onSelect,
}: {
  type: ObligationType
  selected: boolean
  disabled?: boolean
  onSelect: (type: ObligationType) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(type)}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {TYPE_LABELS[type]}
    </button>
  )
}

export function AddObligationModal({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<Obligation | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: customers = [] } = useCustomersQuery(businessId)
  const createObligation = useCreateObligationMutation(businessId)

  const {
    values: formData,
    errors,
    isLoading,
    setIsLoading,
    handleChange,
    validateForm: runValidation,
    hasErrors,
    setGeneralError,
    reset,
    setValues,
    setErrors,
  } = useFormValidation<CreateObligationFormValues>(
    initialFormValues(),
    validateForm,
  )

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === formData.customerId),
    [customers, formData.customerId],
  )

  const parsedAmount = Number(formData.amount)
  const showAmountPreview =
    formData.amount.trim() !== '' &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) return err.message
    return 'Something went wrong. Please try again.'
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setValues(initialFormValues())
      setErrors({})
      setIsLoading(false)
      return
    }

    reset()
    setValues(initialFormValues())
    setCreated(null)
    setCopied(false)
    createObligation.reset()
  }

  const handleTypeChange = (type: ObligationType) => {
    setValues((prev) => ({
      ...prev,
      type,
      referenceCode: suggestReferenceCode(type),
    }))
  }

  const handleCopyAccount = async () => {
    if (!selectedCustomer) return
    try {
      await navigator.clipboard.writeText(
        selectedCustomer.virtual_account.account_number,
      )
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard denied.
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = runValidation()
    if (hasErrors(newErrors)) return

    setIsLoading(true)
    try {
      const obligation = await createObligation.mutateAsync({
        customerId: formData.customerId,
        type: formData.type,
        amount: Number(formData.amount),
        dueDate: formData.dueDate,
        referenceCode: formData.referenceCode.trim() || undefined,
      })
      setCreated(obligation)
    } catch (err) {
      setGeneralError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const noCustomers = customers.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ButtonCustom variant="primary" size="sm" disabled={noCustomers}>
          <MdAdd className="h-4 w-4" />
          Create Obligation
        </ButtonCustom>
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {created ? (
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <MdCheckCircle className="h-5 w-5 text-green-500" />
                Obligation created
              </DialogTitle>
              <DialogDescription>
                Outstanding and ready to match when the customer pays into their
                virtual account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium capitalize">
                    {created.type.toLowerCase()}
                  </p>
                  {created.referenceCode && (
                    <p className="text-xs text-muted-foreground">
                      {created.referenceCode}
                    </p>
                  )}
                </div>
                <p className="font-mono font-semibold">
                  {formatCurrency(created.amount)}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Due {formatDate(created.dueDate)}</span>
                <span className="capitalize">{created.status.toLowerCase()}</span>
              </div>
            </div>

            <ButtonCustom
              variant="primary"
              className="mt-6 w-full"
              onClick={() => handleOpenChange(false)}
            >
              Done
            </ButtonCustom>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="border-b border-border/60 px-6 py-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <MdDescription className="h-5 w-5 text-primary" />
                  Create Obligation
                </DialogTitle>
                <DialogDescription>
                  {noCustomers
                    ? 'Add a customer first before creating an obligation.'
                    : 'Record an expected payment — it will auto-match when funds arrive.'}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-5">
              {errors.general && <FormError message={errors.general} />}

              <div className="space-y-2">
                <Label htmlFor="customerId" className="flex items-center gap-1.5">
                  <MdPerson className="h-3.5 w-3.5 text-muted-foreground" />
                  Customer
                </Label>
                <Select
                  value={formData.customerId || undefined}
                  onValueChange={(value) =>
                    setValues((prev) => ({ ...prev, customerId: value }))
                  }
                  disabled={isLoading || noCustomers}
                >
                  <SelectTrigger id="customerId" className="h-10 w-full">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && (
                  <p className="text-xs text-destructive">{errors.customerId}</p>
                )}

                {selectedCustomer && (
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Virtual account
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm">
                          {selectedCustomer.virtual_account.account_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedCustomer.virtual_account.bank_name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        title={copied ? 'Copied!' : 'Copy account number'}
                        className={cn(
                          'shrink-0 rounded-md p-1.5 transition-colors',
                          copied
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {copied ? (
                          <MdCheckCircle className="h-4 w-4" />
                        ) : (
                          <MdContentCopy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {OBLIGATION_TYPES.map((type) => (
                    <TypePill
                      key={type}
                      type={type}
                      selected={formData.type === type}
                      disabled={isLoading}
                      onSelect={handleTypeChange}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <FormInput
                    label="Amount (₦)"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="150000"
                    value={formData.amount}
                    onChange={handleChange}
                    error={errors.amount}
                    disabled={isLoading}
                  />
                  {showAmountPreview && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(parsedAmount)}
                    </p>
                  )}
                </div>

                <FormInput
                  label="Due date"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  error={errors.dueDate}
                  disabled={isLoading}
                />
              </div>

              <FormInput
                label="Reference code"
                name="referenceCode"
                type="text"
                placeholder="INV-2026-001"
                value={formData.referenceCode}
                onChange={handleChange}
                disabled={isLoading}
              />
              <p className="-mt-3 text-xs text-muted-foreground">
                Optional — helps match payments that include a reference in the
                transfer.
              </p>
            </div>

            <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4">
              <ButtonCustom
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={isLoading}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </ButtonCustom>
              <ButtonCustom
                type="submit"
                variant="primary"
                className="w-full sm:w-auto"
                disabled={isLoading || noCustomers}
              >
                {isLoading ? 'Creating…' : 'Create Obligation'}
              </ButtonCustom>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
