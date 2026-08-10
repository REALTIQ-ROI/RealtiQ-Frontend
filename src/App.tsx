import { Toaster } from 'sonner';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { PropertiesProvider } from './contexts/PropertiesContext';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <PropertiesProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </PropertiesProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
