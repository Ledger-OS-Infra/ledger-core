
import { useState } from 'react'

export type FormErrors<T> = Partial<Record<keyof T, string>> & { general?: string }


export function useFormValidation<T extends object>(
  initialValues: T,
  validate: (values: T) => FormErrors<T>
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormErrors<T>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }) as T)

    const fieldKey = name as keyof FormErrors<T>
    if (!errors[fieldKey]) return

    setErrors((prev) => ({ ...prev, [fieldKey]: undefined }))
  }

  const validateForm = () => {
    const newErrors = validate(values)
    setErrors(newErrors)
    return newErrors
  }

  const hasErrors = (errs: FormErrors<T>) => Object.values(errs).some(Boolean)

  const setGeneralError = (message: string) => {
    setErrors((prev) => ({ ...prev, general: message }))
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setIsLoading(false)
  }

  return {
    values,
    setValues,
    errors,
    setErrors,
    isLoading,
    setIsLoading,
    handleChange,
    validateForm,
    hasErrors,
    setGeneralError,
    reset,
  }
}