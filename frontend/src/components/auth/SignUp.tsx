import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Mic2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import zxcvbn from 'zxcvbn';

interface SignUpProps {
  onSwitchToSignIn: () => void;
}

/**
 * Sign up form component.
 */
export function SignUp({ onSwitchToSignIn }: SignUpProps) {
  const { signup } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setPassword(pwd);
    if (pwd) {
      const result = zxcvbn(pwd);
      setPasswordStrength(result.score);
    } else {
      setPasswordStrength(0);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signup(username, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full w-full p-8 bg-gradient-to-br from-background via-background to-muted/30">
      { /* Decorative elements */ }
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 rounded-full bg-secondary/10 blur-2xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-2 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-md">
            <Mic2 className="w-8 h-8 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Create account</CardTitle>
            <CardDescription className="mt-2">
              Get started with AutoVoice
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={ username }
                onChange={ (e) => setUsername(e.target.value) }
                required
                disabled={ isLoading }
                autoComplete="username"
                minLength={ 3 }
                maxLength={ 50 }
              />
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={ email }
                onChange={ (e) => setEmail(e.target.value) }
                required
                disabled={ isLoading }
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={ password }
                onChange={ handlePasswordChange }
                required
                disabled={ isLoading }
                autoComplete="new-password"
                minLength={ 8 }
              />
              { password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    { [0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={ level }
                        className={ cn(
                          'h-1 flex-1 rounded transition-colors duration-300',
                          level <= passwordStrength
                            ? passwordStrength < 2
                              ? 'bg-red-500'
                              : passwordStrength < 4
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        ) }
                      />
                    )) }
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground">
                    { passwordStrength === 0 && 'Very weak password' }
                    { passwordStrength === 1 && 'Weak password' }
                    { passwordStrength === 2 && 'Fair password' }
                    { passwordStrength === 3 && 'Good password' }
                    { passwordStrength === 4 && 'Strong password' }
                  </p>
                </div>
              ) }
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={ confirmPassword }
                onChange={ (e) => setConfirmPassword(e.target.value) }
                required
                disabled={ isLoading }
                autoComplete="new-password"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold"
              disabled={ isLoading }
            >
              { isLoading ? 'Creating account...' : 'Create Account' }
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{ ' ' }
              <button
                type="button"
                onClick={ onSwitchToSignIn }
                className="text-primary font-medium hover:underline focus:outline-none focus:underline"
              >
                Sign in
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
