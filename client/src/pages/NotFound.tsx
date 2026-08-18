import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-app px-4 text-center">
      <p className="text-display text-evergreen">404</p>
      <h1 className="text-h2 text-text-primary">Página não encontrada</h1>
      <p className="text-body text-text-secondary">A página que você procura não existe ou foi movida.</p>
      <Link to="/">
        <Button>Voltar para a Home</Button>
      </Link>
    </div>
  );
}
