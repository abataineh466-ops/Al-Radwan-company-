import { useState } from 'react';
import { Menu, Scale, X } from 'lucide-react';
import type { Language } from '../types/legal';
import { UI_COPY } from '../data/firmContent';

interface NavbarProps {
  lang: Language;
  onBookClick: () => void;
  onToggleLanguage: () => void;
}

export function Navbar({
  lang,
  onBookClick,
  onToggleLanguage,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '#about', label: UI_COPY.nav.about[lang] },
    { href: '#specialties', label: UI_COPY.nav.specialties[lang] },
    { href: '#team', label: UI_COPY.nav.team[lang] },
    { href: '#contact', label: UI_COPY.nav.contact[lang] },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="flex items-center gap-2 text-white whitespace-nowrap min-w-0 shrink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] rounded"
        >
          <span className="w-8 h-8 rounded bg-[#C5A059] text-[#0B132B] flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="text-sm sm:text-lg font-bold tracking-tight truncate font-display-en">
            {UI_COPY.brandShort[lang]}
          </span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Primary navigation'}
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-200"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="py-2 hover:text-[#C5A059] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] rounded"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onBookClick}
            className="min-h-[40px] px-3 sm:px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span className="sm:hidden">{lang === 'ar' ? 'احجز الآن' : 'Book Now'}</span>
            <span className="hidden sm:inline">{UI_COPY.hero.ctaPrimary[lang]}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={lang === 'ar' ? 'فتح القائمة' : 'Toggle navigation menu'}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B132B] border-t border-white/10 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center min-h-[44px] px-3 rounded-lg text-sm font-medium text-slate-100 hover:bg-white/10"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-2 border-t border-white/10">
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
