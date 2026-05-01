import { Toaster } from 'sonner';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { PropertiesProvider } from './contexts/PropertiesContext';

function App() {
  return (
    <AuthProvider>
      <PropertiesProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </PropertiesProvider>
    </AuthProvider>
  );
}

export default App;
