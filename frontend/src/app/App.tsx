import { RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { HMSRoomProvider } from '@100mslive/react-sdk';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <HMSRoomProvider>
        <RouterProvider router={router} />
        <Toaster />
      </HMSRoomProvider>
    </AuthProvider>
  );
}