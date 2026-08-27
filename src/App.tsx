import { Toaster } from 'sonner';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { PropertiesProvider } from './contexts/PropertiesContext';
import { RealtimeProvider } from './contexts/RealtimeContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <PropertiesProvider>
          <RealtimeProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
          </RealtimeProvider>
        </PropertiesProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
