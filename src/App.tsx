import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { PropertiesProvider } from './contexts/PropertiesContext';

function App() {
  return (
    <AuthProvider>
      <PropertiesProvider>
        <AppRoutes />
      </PropertiesProvider>
    </AuthProvider>
  );
}

export default App;