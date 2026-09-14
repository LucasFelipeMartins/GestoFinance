import { useState } from 'react';
import { Smartphone, Apple, Share, PlusSquare, Check, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/**
 * Getting the app onto a phone, on the Configurações page.
 *
 * There is no APK any more — the app is installed straight from the browser
 * as a PWA on both platforms. That keeps every copy talking to the server
 * (so subscriptions actually mean something) and nothing to sideload.
 */
export function InstallAppCard() {
  const [guide, setGuide] = useState<'android' | 'ios' | null>(null);

  return (
    <>
      <Card className="mx-auto w-full max-w-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-sage-green">
            <Smartphone size={20} />
          </span>
          <h3 className="text-h3 text-text-primary">Instalar no celular</h3>
        </div>

        <p className="mt-3 text-body text-text-secondary">
          Use o GestorFinance fora do navegador, com ícone próprio na tela inicial e funcionando offline.
          A instalação é feita pelo próprio navegador, em poucos toques.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <Button leftIcon={<Smartphone size={18} />} className="w-full" onClick={() => setGuide('android')}>
            Instalar no Android
          </Button>
          <Button variant="secondary" leftIcon={<Apple size={18} />} className="w-full" onClick={() => setGuide('ios')}>
            Instalar no iPhone
          </Button>
        </div>
      </Card>

      <InstallGuideModal platform={guide} onOpenChange={(open) => !open && setGuide(null)} />
    </>
  );
}

const GUIDES = {
  android: {
    title: 'Instalar no Android',
    description: 'No Chrome, o site vira um app em 3 toques.',
    steps: [
      { icon: <Share size={18} />, title: 'Abra este site no Chrome', description: 'Outros navegadores também funcionam, mas o Chrome é o mais simples.' },
      { icon: <MoreVertical size={18} />, title: 'Toque no menu ⋮ (canto superior direito)', description: 'Ou no aviso "Instalar app" que aparece na parte de baixo.' },
      { icon: <PlusSquare size={18} />, title: 'Escolha "Instalar app" ou "Adicionar à tela inicial"', description: 'Confirme em "Instalar".' },
      { icon: <Check size={18} />, title: 'Pronto', description: 'O GestorFinance aparece na tela inicial e abre em tela cheia.' },
    ],
  },
  ios: {
    title: 'Instalar no iPhone',
    description: 'A Apple não permite instalar apps fora da App Store, então no iPhone a instalação é feita pelo Safari — em 4 toques.',
    steps: [
      { icon: <Share size={18} />, title: 'Abra este site no Safari', description: 'Precisa ser o Safari — outros navegadores no iPhone não instalam apps.' },
      { icon: <Share size={18} />, title: 'Toque no botão Compartilhar', description: 'O ícone de quadrado com uma seta para cima, na barra inferior.' },
      { icon: <PlusSquare size={18} />, title: 'Escolha "Adicionar à Tela de Início"', description: 'Role a lista até encontrar a opção.' },
      { icon: <Check size={18} />, title: 'Confirme em "Adicionar"', description: 'O GestorFinance aparece na tela de início e abre em tela cheia, sem o Safari.' },
    ],
  },
};

function InstallGuideModal({
  platform,
  onOpenChange,
}: {
  platform: 'android' | 'ios' | null;
  onOpenChange: (open: boolean) => void;
}) {
  const guide = platform ? GUIDES[platform] : GUIDES.android;

  return (
    <Modal open={platform !== null} onOpenChange={onOpenChange} title={guide.title} description={guide.description}>
      <ol className="flex flex-col gap-4">
        {guide.steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-sage-green">
              {step.icon}
            </span>
            <div className="min-w-0">
              <p className="text-body-strong text-text-primary">
                {index + 1}. {step.title}
              </p>
              <p className="text-caption text-text-secondary">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-5 rounded-input bg-bg-app px-3 py-2.5 text-caption text-text-secondary">
        Instalado assim, o app guarda seus dados no aparelho e continua funcionando sem internet; tudo
        sincroniza quando a conexão volta.
      </p>
    </Modal>
  );
}
