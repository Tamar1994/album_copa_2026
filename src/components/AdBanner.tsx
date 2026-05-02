import { useEffect, useRef } from 'react';

interface Props {
  /** AdSense publisher ID, e.g. 'ca-pub-1234567890123456' */
  adClient: string;
  /** AdSense ad slot ID, e.g. '1234567890' */
  adSlot: string;
  className?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adsbygoogle: any[];
  }
}

export function AdBanner({ adClient, adSlot, className = '' }: Props) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div
      className={`flex items-center justify-center bg-zinc-900 border-t border-zinc-800 overflow-hidden ${className}`}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '50px' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
