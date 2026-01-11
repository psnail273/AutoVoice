import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Mic2 } from 'lucide-react';

interface SignInProps {
  onSwitchToSignUp: () => void;
}

/**
 * Sign in form component.
 */
export function SignIn({ onSwitchToSignUp }: SignInProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full w-full p-8 bg-gradient-to-br from-background via-background to-muted/30">
      { /* Decorative elements */ }
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-secondary/10 blur-2xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-2 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
            <Mic2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
            <CardDescription className="mt-2">
              Sign in to your AutoVoice account
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={ handleSubmit }>
          <CardContent className="space-y-4">
            { error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                { error }
              </div>
            ) }

            <div className="space-y-2">
              <Label htmlFor="username">Username or Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username or email"
                value={ username }
                onChange={ (e) => setUsername(e.target.value) }
                required
                disabled={ isLoading }
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={ password }
                onChange={ (e) => setPassword(e.target.value) }
                required
                disabled={ isLoading }
                autoComplete="current-password"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold"
              disabled={ isLoading }
            >
              { isLoading ? 'Signing in...' : 'Sign In' }
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{ ' ' }
              <button
                type="button"
                onClick={ onSwitchToSignUp }
                className="text-primary font-medium hover:underline focus:outline-none focus:underline"
              >
                Create one
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
