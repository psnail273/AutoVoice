import { useState } from 'react';
import NavMenu from '@/components/navMenu.tsx/navMenu';
import { SignIn, SignUp } from '@/components/auth';
import { AudioProvider } from '@/hooks/use-audio';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

/**
 * Main content component that handles auth state.
 */
function AppContent() {
  const { isLoading, isLoggedIn, user, logout } = useAuth();
  const [authView, setAuthView] = useState<'signin' | 'signup'>('signin');

  // Show loading state while checking initial auth status
  if (isLoading.initial) {
    return (
      <div className="flex items-center justify-center w-full py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth screens if not logged in
  if (!isLoggedIn) {
    if (authView === 'signin') {
      return <SignIn onSwitchToSignUp={ () => setAuthView('signup') } />;
    }
    return <SignUp onSwitchToSignIn={ () => setAuthView('signin') } />;
  }

  // Show main app when logged in
  return (
    <div className="w-full flex flex-col ">
      { /* User header bar */ }
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>{ user?.username }</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={ logout }
          className="h-8 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Sign out
        </Button>
      </div>

      { /* Main content */ }
      <div className="flex-1 ">
        <AudioProvider>
          <NavMenu />
        </AudioProvider>
      </div>
    </div>
  );
}

/**
 * Root App component with providers.
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
