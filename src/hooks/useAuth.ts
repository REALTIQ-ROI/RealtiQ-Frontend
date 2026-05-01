import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useAuth as useAuthContext } from '../contexts/AuthContext';

export const useAuth = () => {
  const auth = useAuthContext();
  const navigate = useNavigate();

  const confirmLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      text: 'You will need to log in again.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Logout',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      auth.logout();
      toast.success('Logged out successfully');
      navigate('/login');
    }
  };

  return { ...auth, confirmLogout };
};
