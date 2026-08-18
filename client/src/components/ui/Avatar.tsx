import { useState } from 'react';
import { Check } from 'lucide-react';

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-11 w-11 text-body-strong',
  lg: 'h-16 w-16 text-h3',
  xl: 'h-24 w-24 text-h1',
};

interface AvatarProps {
  name: string;
  initials?: string;
  src?: string;
  size?: keyof typeof SIZE_CLASSES;
  showCompletedBadge?: boolean;
}

export function Avatar({ name, initials, src, size = 'md', showCompletedBadge }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src) && !imgError;

  return (
    <span className={`relative inline-flex shrink-0 ${SIZE_CLASSES[size]}`}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-tea-green font-semibold text-evergreen"
          aria-hidden="true"
        >
          {initials || name.charAt(0).toUpperCase()}
        </span>
      )}
      {!showImage && <span className="sr-only">{name}</span>}
      {showCompletedBadge && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sage-green ring-2 ring-white"
          aria-label="Concluído"
        >
          <Check size={10} className="text-white" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}
