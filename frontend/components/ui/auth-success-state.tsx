
import { FadeIn } from '@/components/ui/fade-in'

interface AuthSuccessStateProps {
  message: string
  children?: React.ReactNode
}


export function AuthSuccessState({ message, children }: AuthSuccessStateProps) {
  return (
    <FadeIn>
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
          <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        {children}
      </div>
    </FadeIn>
  )
}