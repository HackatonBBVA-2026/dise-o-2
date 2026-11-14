import '@/styles/app.css';
import { LoginForm } from '@/components/LoginForm';

export const metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <main className="login">
      <LoginForm />
    </main>
  );
}
