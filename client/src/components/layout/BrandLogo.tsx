/** The app icon (three rising bars on deep green), inline so it renders
 * crisply at any size and needs no extra request. Same art as favicon.svg. */
export function BrandLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1176 1168"
      role="img"
      aria-label="GestorFinance"
      className={`shrink-0 ${className}`}
    >
      <rect width="1176" height="1168" rx="210" fill="#003D1F" />
      <rect x="352" y="846" width="114" height="162" rx="57" fill="#6FA88A" />
      <rect x="531" y="716" width="114" height="292" rx="57" fill="#A8CFB8" />
      <rect x="710" y="540" width="114" height="468" rx="57" fill="#D2F5DC" />
    </svg>
  );
}

export const APP_NAME = 'GestorFinance';
