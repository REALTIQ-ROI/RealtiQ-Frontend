import { Toaster } from 'sonner';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { PropertiesProvider } from './contexts/PropertiesContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { MapConfigProvider } from './contexts/MapConfigContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <PropertiesProvider>
          <RealtimeProvider>
          <MapConfigProvider>
            <AppRoutes />
            <Toaster position="top-right" richColors closeButton />
          </MapConfigProvider>
          </RealtimeProvider>
        </PropertiesProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
