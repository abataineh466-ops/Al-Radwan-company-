import { useState } from 'react';
import { Lock, Menu, X } from 'lucide-react';
import type { Language } from '../types/legal.js';
import { ASSET_IMAGES, UI_COPY } from '../data/firmContent.js';

interface NavbarProps {
  lang: Language;
  onBookClick: () => void;
  onOpenFounderCv: () => void;
  onLawyerLoginClick: () => void;
  onToggleLanguage: () => void;
}

export function Navbar({
  lang,
  onBookClick,
  onOpenFounderCv,
  onLawyerLoginClick,
  onToggleLanguage,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '#founder', label: UI_COPY.nav.founder[lang], action: onOpenFounderCv },
    { href: '#about', label: UI_COPY.nav.about[lang] },
    { href: '#specialties', label: UI_COPY.nav.specialties[lang] },
    { href: '#team', label: UI_COPY.nav.team[lang] },
    { href: '#media', label: UI_COPY.nav.media[lang] },
    { href: '#contact', label: UI_COPY.nav.contact[lang] },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-b border-[#C5A059]/25">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Original Untouched RB Crown Emblem + New Trade Name */}
        <a
          href="#top"
          className="flex items-center gap-2.5 text-white whitespace-nowrap min-w-0 shrink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] rounded"
        >
          <img
            src={ASSET_IMAGES.logoCrownEmblem}
            alt={UI_COPY.brandShort[lang]}
            className="h-10 sm:h-11 w-auto object-contain rounded shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <span className="block text-xs sm:text-sm lg:text-base font-bold tracking-tight truncate font-display-en text-white">
              {UI_COPY.brandShort[lang]}
            </span>
            <span className="block text-[10px] sm:text-[11px] font-bold tracking-widest text-[#C5A059] font-mono-data">
              {UI_COPY.brandAbbr}
            </span>
          </div>
        </a>

        {/* Zone 2: Navigation links */}
        <nav
          aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Primary navigation'}
          className="hidden lg:flex items-center gap-5 text-xs xl:text-sm font-semibold text-slate-200"
        >
          {navItems.map((item) =>
            item.action ? (
              <button
                key={item.href}
                type="button"
                onClick={item.action}
                className="py-2 hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] rounded"
              >
                {item.label}
              </button>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="py-2 hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] rounded"
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        {/* Zone 3: Attorney Login + Primary CTA + Mobile Menu Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onLawyerLoginClick}
            className="hidden md:inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg border border-[#C5A059]/45 hover:border-[#C5A059] hover:bg-white/10 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
          >
            <Lock className="w-3.5 h-3.5 text-[#C5A059] shrink-0" aria-hidden="true" />
            <span>{lang === 'ar' ? 'بوابة المحامين' : 'Attorney Portal'}</span>
          </button>

          <button
            type="button"
            onClick={onBookClick}
            className="min-h-[40px] px-3 sm:px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className="sm:hidden">{lang === 'ar' ? 'استشارة' : 'Consult'}</span>
            <span className="hidden sm:inline">{UI_COPY.hero.ctaPrimary[lang]}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={lang === 'ar' ? 'فتح القائمة' : 'Toggle navigation menu'}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0B132B] border-t border-white/10 px-4 py-4 space-y-2">
          {navItems.map((item) =>
            item.action ? (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  item.action?.();
                }}
                className="w-full text-start flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-slate-100 hover:bg-white/10 cursor-pointer"
              >
                {item.label}
              </button>
            ) : (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-slate-100 hover:bg-white/10"
              >
                {item.label}
              </a>
            )
          )}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLawyerLoginClick();
              }}
              className="w-full min-h-[44px] px-3 rounded-lg bg-white/10 border border-[#C5A059]/45 text-white text-sm font-semibold hover:bg-white/15 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#C5A059]" aria-hidden="true" />
              <span>{lang === 'ar' ? 'دخول المحامين — RB AI' : 'Attorney Portal Sign In'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onToggleLanguage();
                setMobileMenuOpen(false);
              }}
              className="w-full min-h-[44px] px-3 rounded-lg border border-white/20 text-white text-sm font-semibold hover:bg-white/10 cursor-pointer"
            >
              {lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
