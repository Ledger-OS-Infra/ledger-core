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
import { formatDate } from '@/lib/date'
import { OBLIGATION_TYPES } from '@/lib/obligations'
import {
  useCreateBillingRuleMutation,
  useCustomersQuery,
} from '@/lib/queries'
import type { BillingRule, ObligationType } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import {
  MdAdd,
  MdAutorenew,
  MdCalendarToday,
  MdCheckCircle,
  MdContentCopy,
  MdPerson,
  MdTune,
} from 'react-icons/md'

interface CreateBillingRuleFormValues {
  customerId: string
  obligationType: ObligationType
  amount: string
  dayOfMonth: string
  startDate: string
}

const TYPE_LABELS: Record<ObligationType, string> = {
  INVOICE: 'Invoice',
  SUBSCRIPTION: 'Subscription',
  FEE: 'Fee',
  LEVY: 'Levy',
  CUSTOM: 'Custom',
}

function defaultStartDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1, 1)
  return date.toISOString().slice(0, 10)
}

function initialFormValues(): CreateBillingRuleFormValues {
  return {
    customerId: '',
    obligationType: 'SUBSCRIPTION',
    amount: '',
    dayOfMonth: '1',
    startDate: defaultStartDate(),
  }
}

function validateForm(
  values: CreateBillingRuleFormValues,
): FormErrors<CreateBillingRuleFormValues> {
  const errors: FormErrors<CreateBillingRuleFormValues> = {}

  if (!values.customerId) {
    errors.customerId = 'Select a customer'
  }

  const amount = Number(values.amount)
  if (!values.amount.trim() || Number.isNaN(amount) || amount <= 0) {
    errors.amount = 'Enter a valid amount greater than zero'
  }

  const day = Number(values.dayOfMonth)
  if (
    !values.dayOfMonth.trim() ||
    Number.isNaN(day) ||
    day < 1 ||
    day > 28
  ) {
    errors.dayOfMonth = 'Day must be between 1 and 28'
  }

  if (!values.startDate) {
    errors.startDate = 'Start date is required'
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

function scheduleSummary(values: CreateBillingRuleFormValues): string | null {
  const amount = Number(values.amount)
  if (!values.amount.trim() || Number.isNaN(amount) || amount <= 0) return null
  if (!values.startDate) return null

  const day = values.dayOfMonth || '1'
  return `Monthly ${TYPE_LABELS[values.obligationType].toLowerCase()} of ${formatCurrency(amount)} on day ${day}, starting ${formatDate(values.startDate)}`
}

export function AddBillingRuleModal({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<BillingRule | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: customers = [] } = useCustomersQuery(businessId)
  const createRule = useCreateBillingRuleMutation(businessId)

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
  } = useFormValidation<CreateBillingRuleFormValues>(
    initialFormValues(),
    validateForm,
  )

  const parsedAmount = Number(formData.amount)
  const showAmountPreview =
    formData.amount.trim() !== '' &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === formData.customerId),
    [customers, formData.customerId],
  )

  const previewText = scheduleSummary(formData)

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
    createRule.reset()
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value
    const dayFromDate = Number(startDate.split('-')[2] ?? '')
    setValues((prev) => ({
      ...prev,
      startDate,
      dayOfMonth:
        dayFromDate >= 1 && dayFromDate <= 28
          ? String(dayFromDate)
          : prev.dayOfMonth,
    }))
    if (errors.startDate) {
      setErrors((prev) => ({ ...prev, startDate: undefined }))
    }
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
      const rule = await createRule.mutateAsync({
        customerId: formData.customerId,
        obligationType: formData.obligationType,
        amount: Number(formData.amount),
        dayOfMonth: Number(formData.dayOfMonth),
        startDate: formData.startDate,
      })
      setCreated(rule)
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
          New Rule
        </ButtonCustom>
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {created ? (
          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <MdCheckCircle className="h-5 w-5 text-green-500" />
                Billing rule created
              </DialogTitle>
              <DialogDescription>
                Obligations will auto-generate on the schedule below. Run the
                billing job or wait for the worker to pick it up.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {billingRuleDisplayName(created)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCustomer?.full_name ?? 'Customer'}
                  </p>
                </div>
                <p className="font-mono font-semibold">
                  {formatCurrency(created.amount)}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MdAutorenew className="h-3.5 w-3.5" />
                  Day {created.dayOfMonth} each month
                </span>
                <span className="flex items-center gap-1">
                  <MdCalendarToday className="h-3.5 w-3.5" />
                  Next run {formatDate(created.nextRunDate)}
                </span>
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
                  <MdTune className="h-5 w-5 text-primary" />
                  Create Billing Rule
                </DialogTitle>
                <DialogDescription>
                  {noCustomers
                    ? 'Add a customer first before creating a billing rule.'
                    : 'Auto-generate recurring obligations on a monthly schedule.'}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-5">
              {errors.general && <FormError message={errors.general} />}

              <div className="space-y-2">
                <Label htmlFor="billing-customer" className="flex items-center gap-1.5">
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
                  <SelectTrigger id="billing-customer" className="h-10 w-full">
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
                <Label>Obligation type</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {OBLIGATION_TYPES.map((type) => (
                    <TypePill
                      key={type}
                      type={type}
                      selected={formData.obligationType === type}
                      disabled={isLoading}
                      onSelect={(type) =>
                        setValues((prev) => ({ ...prev, obligationType: type }))
                      }
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
                    placeholder="6000"
                    value={formData.amount}
                    onChange={handleChange}
                    error={errors.amount}
                    disabled={isLoading}
                  />
                  {showAmountPreview && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(parsedAmount)} / month
                    </p>
                  )}
                </div>

                <FormInput
                  label="Day of month"
                  name="dayOfMonth"
                  type="number"
                  min="1"
                  max="28"
                  value={formData.dayOfMonth}
                  onChange={handleChange}
                  error={errors.dayOfMonth}
                  disabled={isLoading}
                />
              </div>

              <FormInput
                label="First due date"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleStartDateChange}
                error={errors.startDate}
                disabled={isLoading}
              />
              <p className="-mt-3 text-xs text-muted-foreground">
                Also seeds the next run date. Day-of-month syncs when you pick
                a date (max 28 for short months).
              </p>

              {previewText && selectedCustomer && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Schedule preview
                  </p>
                  <p className="mt-1 text-sm text-foreground">{previewText}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    for {selectedCustomer.full_name}
                  </p>
                </div>
              )}
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
                {isLoading ? 'Creating…' : 'Create Rule'}
              </ButtonCustom>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function billingRuleDisplayName(rule: {
  obligationType: ObligationType
  metadata: Record<string, unknown>
}): string {
  const customName = rule.metadata.name ?? rule.metadata.label
  if (typeof customName === 'string' && customName.trim()) {
    return customName.trim()
  }

  return `Monthly ${TYPE_LABELS[rule.obligationType]}`
}
