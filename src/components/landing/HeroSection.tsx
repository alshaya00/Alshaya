'use client';

import Link from 'next/link';
import { TreePine, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { familyInfo } from '@/config/constants';

export function HeroSection() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-bl from-primary via-primary/90 to-accent">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-[0.07]">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="hero-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          </pattern>
          <rect width="100" height="100" fill="url(#hero-dots)" />
        </svg>
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Glowing family icon */}
          <div className="animate-fade-in inline-flex items-center justify-center w-28 h-28 md:w-36 md:h-36 glass rounded-3xl mb-8 shadow-xl ring-2 ring-white/20">
            <span className="text-6xl md:text-7xl drop-shadow-lg">🌳</span>
          </div>

          {/* Title with staggered animation */}
          <h1
            className="text-5xl md:text-7xl font-bold text-white mb-4 animate-slide-up"
            style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
          >
            {familyInfo.fullNameAr}
          </h1>

          <p
            className="text-xl md:text-2xl text-white/80 font-medium mb-2 animate-slide-up"
            style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
          >
            {familyInfo.fullNameEn}
          </p>

          <p
            className="text-lg md:text-xl text-white/70 mb-2 animate-slide-up"
            style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
          >
            {familyInfo.taglineAr}
          </p>

          <div
            className="inline-flex items-center gap-2 glass px-5 py-2 rounded-full text-white/80 text-sm md:text-base mb-10 animate-slide-up"
            style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
          >
            <Sparkles size={16} className="text-accent" />
            الشارخية والعودة والروضة والجنيفي من قرى سدير
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
            style={{ animationDelay: '0.5s', animationFillMode: 'both' }}
          >
            <Link href="/register">
              <Button
                size="lg"
                leftIcon={<UserPlus size={22} />}
                className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl px-8 py-6 text-lg rounded-2xl font-bold"
              >
                انضم للعائلة
              </Button>
            </Link>
            <Link href="/tree">
              <Button
                size="lg"
                variant="outline"
                leftIcon={<TreePine size={22} />}
                className="border-2 border-white/40 text-white hover:bg-white/10 hover:text-white px-8 py-6 text-lg rounded-2xl font-bold backdrop-blur-sm"
              >
                استكشف الشجرة
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 100L48 90C96 80 192 60 288 50C384 40 480 40 576 45C672 50 768 60 864 65C960 70 1056 70 1152 65C1248 60 1344 50 1392 45L1440 40V100H0Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
}
