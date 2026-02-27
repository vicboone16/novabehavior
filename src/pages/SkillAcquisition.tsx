import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function SkillAcquisition() {
  const navigate = useNavigate();
  
  useEffect(() => {
    toast.info('Select a client to view Programming', { duration: 3000 });
    navigate('/students', { replace: true });
  }, [navigate]);

  return null;
}
