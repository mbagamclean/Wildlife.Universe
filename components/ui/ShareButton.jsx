'use client';

import { useState, useRef, useEffect } from 'react';
import { Share2, Twitter, Facebook, Link as LinkIcon, Check } from 'lucide-react';

export function ShareButton({ title, slug, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  const url = typeof window !== 'undefined' ? `${window.location.origin}/posts/${slug}` : `https://wildlifeuniverse.com/posts/${slug}`;

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const copyLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => { setCopied(false); setIsOpen(false); }, 2000);
  };

  const shareSocial = (e, platform) => {
    e.preventDefault();
    e.stopPropagation();
    let shareUrl = '';
    if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    if (platform === 'whatsapp') shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`;
    if (platform === 'telegram') shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    if (platform === 'threads') shareUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(title + ' ' + url)}`;
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button 
        onClick={handleShare}
        className={`flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${className}`}
        aria-label="Share post"
        title="Share"
      >
        <Share2 className="h-[1em] w-[1em]" />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 bottom-full z-50 mb-2 w-44 rounded-xl shadow-xl backdrop-blur-md"
          style={{ 
            background: 'var(--color-bg-deep)', 
            border: '1px solid var(--glass-border)',
            animation: 'wu-fadeUp 0.2s cubic-bezier(0.22,1,0.36,1) both' 
          }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="flex flex-col p-1.5 align-stretch gap-1">
            <button 
              onClick={(e) => shareSocial(e, 'twitter')}
              className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[0.82rem] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-fg)] hover:text-[var(--color-primary)]"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path className="fill-current transition-colors duration-200" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg> 
              <span className="transition-colors duration-200">𝕏 (Twitter)</span>
            </button>
            
            <button 
              onClick={(e) => shareSocial(e, 'facebook')}
              className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[0.82rem] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-fg)] hover:text-[#1877F2]"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path className="fill-current transition-colors duration-200" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                <path className="fill-[var(--color-bg-deep)] group-hover:fill-white transition-colors duration-200" d="M16.671 15.542l.532-3.469h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.514V5.006s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.63H7.078v3.469h3.048v8.385a12.09 12.09 0 003.749 0v-8.385h2.796z"/>
              </svg> 
              <span className="transition-colors duration-200">Facebook</span>
            </button>
            
            <button 
              onClick={(e) => shareSocial(e, 'whatsapp')}
              className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[0.82rem] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-fg)] hover:text-[#25D366]"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path className="fill-current transition-colors duration-200" d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.12.553 4.186 1.6 6L.078 24l6.096-1.597C7.922 23.373 9.911 23.882 12.031 23.882 18.677 23.882 24 18.497 24 11.851 24 5.204 18.677 0 12.031 0zm3.896 17.15c-.173.486-.998.927-1.46.967-.442.038-1.026.136-3.2-.767-2.613-1.087-4.286-3.756-4.417-3.93-.131-.173-1.055-1.406-1.055-2.684 0-1.278.665-1.908.898-2.16.223-.24.484-.301.644-.301.16 0 .32.001.46.008.15.008.349-.06.536.398.196.48.666 1.626.726 1.747.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.253.294-.36.393-.12.106-.246.223-.113.453.132.23.585.968 1.254 1.564.862.77 1.59 1.002 1.82 1.121.23.12.366.1.506-.06.14-.16.606-.706.766-.946.16-.24.32-.2.533-.12.213.08 1.346.634 1.576.749.23.115.383.172.438.267.054.095.054.551-.119 1.038z"/>
              </svg>
              <span className="transition-colors duration-200">WhatsApp</span>
            </button>
            
            <button 
              onClick={(e) => shareSocial(e, 'threads')}
              className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[0.82rem] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-fg)] hover:text-[var(--color-primary)]"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path className="fill-current transition-colors duration-200" d="M18.826 12.02l-.004-.37c-.015-1.024-.265-2.025-.724-2.926a6.837 6.837 0 00-2.31-2.482 7.07 7.07 0 00-7.399 0 6.83 6.83 0 00-2.522 3.197 7.756 7.756 0 000 6.068 6.84 6.84 0 002.522 3.197c1.173.714 2.534 1.09 3.921 1.09 1.17 0 2.321-.247 3.385-.724a6.438 6.438 0 002.518-2.052l-1.401-1.083a4.805 4.805 0 01-1.892 1.517 5.176 5.176 0 01-4.707.039 5.163 5.163 0 01-1.93-2.307 5.922 5.922 0 010-4.636 5.158 5.158 0 011.93-2.306 4.909 4.909 0 014.869-.214 4.838 4.838 0 012.091 2.457c.226.593.336 1.218.324 1.849v.217a1.696 1.696 0 01-.482 1.056 1.518 1.518 0 01-1.058.44 c-.438 0-.853-.178-1.155-.494a1.761 1.761 0 01-.439-1.214v-2.001c-.198-.444-.516-.826-.913-1.095a2.537 2.537 0 00-1.458-.454c-1.396 0-2.53 1.159-2.53 2.586s1.134 2.585 2.53 2.585c.677 0 1.32-.265 1.787-.735.419.64.921.942 1.62.942 1.054 0 2.012-.44 2.709-1.242.695-.802 1.077-1.868 1.077-2.998zm-9.333-.505c0-1.02.822-1.846 1.835-1.846s1.835.826 1.835 1.846v1.393c-.454.437-1.123 1.066-2.115 1.066-1.171-.247-1.555-1.31-1.555-2.459z"/>
              </svg>
              <span className="transition-colors duration-200">Threads</span>
            </button>
            
            <button 
              onClick={(e) => shareSocial(e, 'telegram')}
              className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[0.82rem] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-fg)] hover:text-[#229ED9]"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                <path className="fill-current transition-colors duration-200" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.227-.535.227l.213-3.105 5.651-5.111c.246-.22-.055-.34-.383-.12l-6.985 4.398-3.013-.94c-.655-.205-.668-.655.137-.965l11.758-4.526c.54-.2 1.026.113.658 1.07z"/>
              </svg>
              <span className="transition-colors duration-200">Telegram</span>
            </button>

            <div className="my-0.5 h-px w-full bg-[var(--glass-border)]" />
            
            <button 
              onClick={copyLink}
              className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[0.82rem] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-fg)] hover:text-[var(--color-primary)]"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <LinkIcon className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
