import { Navigate, useLocation } from 'react-router-dom';

const PaymentSucess = () => {
  const location = useLocation();
  return <Navigate to={{ pathname: '/post-payment-redirect', search: location.search }} replace />;
};

export default PaymentSucess;
