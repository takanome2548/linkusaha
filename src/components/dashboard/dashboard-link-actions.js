
'use client';

import { useState } from 'react';

export function DashboardLinkActions({ url }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Website usaha saya',
          text: 'Kunjungi website usaha saya:',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setCopied(false);
      }
    }
  }

  return (
    <div className="dashboard-link-actions">
      <button
        type="button"
        className="btn dashboard-copy-button"
        onClick={handleCopy}
      >
        {copied ? '✓ Link tersalin' : '▢ Salin link'}
      </button>

      <button
        type="button"
        className="btn secondary dashboard-share-button"
        onClick={handleShare}
      >
        ↗ Bagikan website
      </button>
    </div>
  );
}
