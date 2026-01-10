import NavMenu from '@/components/navMenu.tsx/navMenu';
import { AudioProvider } from '@/hooks/use-audio';

function App() {
  return (
    <AudioProvider>
      <div className="h-full w-full">
        <NavMenu />
      </div>
    </AudioProvider>
  );
}

export default App;
