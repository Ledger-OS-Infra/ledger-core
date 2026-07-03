import { MdError } from 'react-icons/md'

interface FormErrorProps {
  message?: string
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-destructive/10 border border-destructive/30">
      <MdError className="w-4 h-4 text-destructive flex-shrink-0" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}
