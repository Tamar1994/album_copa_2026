import { useEffect, useRef } from 'react';

interface Props {
  /** Ad Manager slot path, e.g. '/12345678/album_copa_banner' */
  slotId: string;
  /** DOM element ID (must be unique per page) */
  elementId: string;
  /** Ad size(s), e.g. [320, 50] or [[320,50],[320,100]] */
  sizes: [number, number] | [number, number][];
  className?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    googletag: any;
  }
}

/**
 * Google Ad Manager banner slot.
 * Requires GPT script loaded in index.html.
 */
export function AdBanner({ slotId, elementId, sizes, className = '' }: Props) {
  const defined = useRef(false);

  useEffect(() => {
    if (defined.current) return;
    defined.current = true;

    const gt = window.googletag;
    if (!gt) return;

    gt.cmd.push(() => {
      gt.defineSlot(slotId, sizes, elementId)?.addService(gt.pubads());
      gt.pubads().enableSingleRequest();
      gt.enableServices();
      gt.display(elementId);
    });

    return () => {
      // Clean up slot on unmount so remounts don't double-define
      gt.cmd.push(() => {
        const slots = gt.pubads().getSlots();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slot = slots.find((s: any) => s.getSlotElementId() === elementId);
        if (slot) gt.destroySlots([slot]);
      });
    };
  }, [slotId, elementId, sizes]);

  return (
    <div
      className={`flex items-center justify-center bg-zinc-900 border-t border-zinc-800 overflow-hidden ${className}`}
    >
      <div id={elementId} />
    </div>
  );
}
