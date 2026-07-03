import Link from 'next/link'

interface AuthFooterLinkProps {
  variant: 'login' | 'signup'
}


export function AuthFooterLink({ variant }: AuthFooterLinkProps) {
  const isLogin = variant === 'login'

  return (
    <div className="pt-4 border-t border-border">
      <p className="text-sm text-muted-foreground text-center">
        {isLogin ? (
          <>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  )
}