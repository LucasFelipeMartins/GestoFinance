import { useState } from 'react';
import { Smartphone, Download, Apple, Share, PlusSquare, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';

const APK_PATH = '/downloads/gestorpro.apk';

/**
 * Getting the app onto a phone, on the Configurações page.
 *
 * The sidebar already carries the Android link, but the sidebar is
 * desktop-only — on a phone this page (reached from "Mais") is the only place
 * it can be found at all, which is exactly where someone would look.
 */
export function DownloadAppCard() {
  const toast = useToast();
  const [iosOpen, setIosOpen] = useState(false);

  const handleAndroid = async () => {
    try {
      const res = await fetch(APK_PATH, { method: 'HEAD' });
      // The SPA's own fallback route serves index.html (200, text/html) for
      // any unknown path, so a real 404 never happens here — the content type
      // is what actually tells the APK apart from "not uploaded yet".
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || contentType.includes('text/html')) {
        throw new Error('not found');
      }

      const link = document.createElement('a');
      link.href = APK_PATH;
      link.download = 'GestorPro.apk';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.info('O app para Android ainda não está disponível para download. Volte em breve.');
    }
  };

  return (
    <>
      <Card className="mx-auto w-full max-w-lg">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tea-green/50 text-sage-green">
            <Smartphone size={20} />
          </span>
          <h3 className="text-h3 text-text-primary">Instalar no celular</h3>
        </div>

        <p className="mt-3 text-body text-text-secondary">
          Use o GestorPro fora do navegador, com ícone próprio e funcionando offline.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <Button leftIcon={<Download size={18} />} className="w-full" onClick={handleAndroid}>
            Baixar para Android
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Apple size={18} />}
            className="w-full"
            onClick={() => setIosOpen(true)}
          >
            Instalar no iPhone
          </Button>
        </div>

        <p className="mt-3 text-caption text-text-secondary">
          Android: arquivo .apk, instalação manual. iPhone: instalação pelo Safari — a Apple não
          permite instalar apps fora da App Store.
        </p>
      </Card>

      <IosInstallModal open={iosOpen} onOpenChange={setIosOpen} />
    </>
  );
}

/**
 * On iOS there is no sideloading and no App Store build, so "Adicionar à Tela
 * de Início" is genuinely how this app gets onto an iPhone. With the
 * manifest and apple-touch-icon in place it installs as a real standalone
 * app, not a bookmark — these are just the three taps to get there.
 */
function IosInstallModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const steps = [
    {
      icon: <Share size={18} />,
      title: 'Abra este site no Safari',
      description: 'Precisa ser o Safari — outros navegadores no iPhone não instalam apps.',
    },
    {
      icon: <Share size={18} />,
      title: 'Toque no botão Compartilhar',
      description: 'O ícone de quadrado com uma seta para cima, na barra inferior.',
    },
    {
      icon: <PlusSquare size={18} />,
      title: 'Escolha "Adicionar à Tela de Início"',
      description: 'Role a lista até encontrar a opção.',
    },
    {
      icon: <Check size={18} />,
      title: 'Confirme em "Adicionar"',
      description: 'O GestorPro aparece na tela de início e abre em tela cheia, sem o Safari.',
    },
  ];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Instalar no iPhone"
      description="A Apple não permite instalar apps fora da App Store, então no iPhone a instalação é feita pelo próprio Safari — em 4 toques."
    >
      <ol className="flex flex-col gap-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tea-green/50 text-sage-green">
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
        Instalado assim, o app guarda seus dados no aparelho e continua funcionando sem internet —
        igual à versão Android.
      </p>
    </Modal>
  );
}
