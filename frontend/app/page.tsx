import { redirect } from 'next/navigation';

/** La app siempre empieza en el inicio de sesión: con DNI (persona) o RUC (emprendedor o empresa). */
export default function Raiz() {
  redirect('/login');
}
