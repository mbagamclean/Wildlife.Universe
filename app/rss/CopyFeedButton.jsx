'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyFeedButton({ url }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available — silently no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
        copied
          ? 'bg-[#008000] text-white'
          : 'bg-[#008000]/15 text-[#008000] hover:bg-[#008000]/25'
      }`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy feed URL
        </>
      )}
    </button>
  );
}
