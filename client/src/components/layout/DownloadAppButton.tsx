import { Smartphone, Download } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const APK_PATH = '/downloads/gestorpro.apk';

export function DownloadAppButton() {
  const toast = useToast();

  const handleClick = async () => {
    try {
      const res = await fetch(APK_PATH, { method: 'HEAD' });
      // The SPA's own fallback route serves index.html (200, text/html) for
      // any unknown path, so a real 404 never happens here — the content
      // type is what actually tells the APK apart from "not uploaded yet".
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
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center gap-3 rounded-[12px] bg-tea-green/15 px-4 py-3 text-left text-body-strong text-tea-green transition-colors duration-200 hover:bg-tea-green/25"
    >
      <Smartphone size={20} aria-hidden="true" />
      <span className="flex flex-col leading-tight">
        <span>Baixar App</span>
        <span className="text-micro font-normal text-white/50">Android</span>
      </span>
      <Download size={16} className="ml-auto shrink-0" aria-hidden="true" />
    </button>
  );
}
