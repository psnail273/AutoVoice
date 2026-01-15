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
  const [usernameEmail, setUsernameEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(usernameEmail, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full p-6 bg-gradient-to-br from-background via-background to-muted/30">
      { /* Decorative elements */ }
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-4 left-4 w-24 h-24 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-4 right-4 w-28 h-28 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <Card className="w-full relative z-10 border-2 shadow-lg">
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
              <Label htmlFor="usernameEmail">Username or Email</Label>
              <Input
                id="usernameEmail"
                type="text"
                placeholder="Enter your username or email"
                value={ usernameEmail }
                onChange={ (e) => setUsernameEmail(e.target.value) }
                required
                disabled={ isLoading }
                autoComplete="usernameEmail"
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
