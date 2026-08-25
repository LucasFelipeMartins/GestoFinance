import { Smartphone, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

const APK_PATH = '/downloads/gestorpro.apk';

/**
 * The Android download, on the Configurações page.
 *
 * The sidebar already carries this link, but the sidebar is desktop-only —
 * on a phone this page (reached from "Mais") is the only place it can be
 * found at all, which is exactly where someone would look for it.
 */
export function DownloadAppCard() {
  const toast = useToast();

  const handleDownload = async () => {
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
    <Card className="mx-auto w-full max-w-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tea-green/50 text-sage-green">
          <Smartphone size={20} />
        </span>
        <h3 className="text-h3 text-text-primary">Baixar o app</h3>
      </div>

      <p className="mt-3 text-body text-text-secondary">
        Instale o GestorPro no seu Android para usar o app fora do navegador, inclusive offline.
      </p>

      <Button leftIcon={<Download size={18} />} className="mt-5 w-full" onClick={handleDownload}>
        Baixar para Android
      </Button>

      <p className="mt-2 text-caption text-text-secondary">
        Arquivo .apk · instalação manual, fora da Play Store.
      </p>
    </Card>
  );
}
