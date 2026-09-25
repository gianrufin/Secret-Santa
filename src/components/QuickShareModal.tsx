import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, QrCode, MessageSquare, Send, Sparkles, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import { Exchange, getCurrencySymbol } from '../types';
import { getPartyShareUrl, formatPartyInviteMessage } from '../utils/share';
import { playChimeSound, playClickSound } from '../utils/audio';

interface QuickShareModalProps {
  exchange: Exchange;
  isOpen: boolean;
  onClose: () => void;
}

export const QuickShareModal: React.FC<QuickShareModalProps> = ({
  exchange,
  isOpen,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'message'>('link');

  const shareUrl = getPartyShareUrl(exchange.code);
  const inviteMessage = formatPartyInviteMessage(exchange);
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
  const currencySym = getCurrencySymbol(exchange.currency);

  useEffect(() => {
    if (isOpen) {
      // Generate high quality QR code data URL
      QRCode.toDataURL(shareUrl, {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#18181b', // dark zinc
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      playChimeSound();
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      playChimeSound();
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2200);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleNativeShare = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({
          title: `Secret Santa: ${exchange.title}`,
          text: `Join our Secret Santa party "${exchange.title}"! Budget: ${exchange.budget}`,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(inviteMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-700 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Share Party Link
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Direct invite link to <span className="font-semibold text-zinc-800 dark:text-zinc-200">{exchange.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-5 bg-white dark:bg-zinc-900">
          <button
            onClick={() => setActiveTab('link')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-red-700 text-red-700 dark:border-red-500 dark:text-red-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Direct Link</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'qr'
                ? 'border-red-700 text-red-700 dark:border-red-500 dark:text-red-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('message')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'message'
                ? 'border-red-700 text-red-700 dark:border-red-500 dark:text-red-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Full Message</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Party Quick Info Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs">
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{exchange.title}</span>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Budget: <span className="font-medium text-emerald-700 dark:text-emerald-400">{exchange.budget}</span> • {exchange.exchangeDate}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Code:</span>
              <span className="font-mono text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                {exchange.code}
              </span>
            </div>
          </div>

          {/* TAB 1: DIRECT LINK */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Direct Party Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 text-xs font-mono py-2.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 select-all focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                  Anyone with this link opens straight into this exchange. If not signed in, they will automatically join once they sign in with Google.
                </p>
              </div>

              {/* Quick Action Share Buttons */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">
                  Share Directly To
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {canNativeShare && (
                    <button
                      onClick={handleNativeShare}
                      className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Share via Apps...</span>
                    </button>
                  )}

                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('qr')}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Show QR Code</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QR CODE */}
          {activeTab === 'qr' && (
            <div className="text-center py-2 space-y-3">
              <div className="inline-block p-3 bg-white rounded-2xl border border-zinc-200 shadow-xs">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Party QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-zinc-400">
                    Generating QR code...
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Scan to Join Party
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Point any smartphone camera at this screen to open the exchange instantly.
                </p>
              </div>

              <div className="flex justify-center gap-2 pt-1">
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: FULL MESSAGE */}
          {activeTab === 'message' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Ready-to-Send Invitation
                </label>
                <button
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400 hover:underline font-semibold cursor-pointer"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Full Message</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                readOnly
                rows={6}
                value={inviteMessage}
                className="w-full text-xs font-sans py-2.5 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 select-all focus:outline-hidden resize-none leading-relaxed"
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMessage ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="py-1.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
