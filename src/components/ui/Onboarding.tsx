'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TreePine, BookOpen, Calendar, User, X, ChevronLeft, ChevronRight,
  Check, Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

interface OnboardingStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  action?: {
    label: string;
    labelAr: string;
    href: string;
  };
}

interface OnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

// ============================================
// ONBOARDING STEPS
// ============================================

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'tree',
    icon: <TreePine size={32} />,
    title: 'Family Tree',
    titleAr: 'شجرة العائلة',
    description: 'Explore your family tree. See where you fit among 99 members across 8 generations.',
    descriptionAr: 'استكشف شجرة عائلتك. اكتشف مكانك بين 99 فرداً عبر 8 أجيال.',
    action: {
      label: 'View Tree',
      labelAr: 'استعرض الشجرة',
      href: '/tree',
    },
  },
  {
    id: 'stories',
    icon: <BookOpen size={32} />,
    title: 'Stories & Memories',
    titleAr: 'القصص والذكريات',
    description: 'Read family stories, oral histories, and memories. Preserve your legacy for future generations.',
    descriptionAr: 'اقرأ قصص العائلة، الروايات الشفهية، والذكريات. احفظ إرثك للأجيال القادمة.',
    action: {
      label: 'Read Stories',
      labelAr: 'اقرأ القصص',
      href: '/journals',
    },
  },
  {
    id: 'gatherings',
    icon: <Calendar size={32} />,
    title: 'Family Gatherings',
    titleAr: 'اللقاءات العائلية',
    description: 'Never miss a family event. RSVP to gatherings and stay connected with your relatives.',
    descriptionAr: 'لا تفوت أي لقاء عائلي. سجل حضورك وابق على تواصل مع أقاربك.',
    action: {
      label: 'See Events',
      labelAr: 'عرض الفعاليات',
      href: '/gatherings',
    },
  },
  {
    id: 'profile',
    icon: <User size={32} />,
    title: 'Your Profile',
    titleAr: 'ملفك الشخصي',
    description: 'Add your photo so family members can recognize you at gatherings!',
    descriptionAr: 'أضف صورتك حتى يتعرف عليك أفراد العائلة في اللقاءات!',
    action: {
      label: 'Complete Profile',
      labelAr: 'أكمل ملفك',
      href: '/profile',
    },
  },
];

// ============================================
// STORAGE KEY
// ============================================

const ONBOARDING_KEY = 'alshaye_onboarding_completed';
const ONBOARDING_DISMISSED_KEY = 'alshaye_onboarding_dismissed';

// ============================================
// HOOKS
// ============================================

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    const completed = localStorage.getItem(ONBOARDING_KEY) === 'true';
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true';

    setHasCompleted(completed);

    // Show onboarding if not completed and not dismissed
    if (!completed && !dismissed) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading]);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setHasCompleted(true);
    setShowOnboarding(false);
  }, []);

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    setShowOnboarding(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setHasCompleted(false);
  }, []);

  return {
    showOnboarding,
    hasCompleted,
    completeOnboarding,
    dismissOnboarding,
    resetOnboarding,
    setShowOnboarding,
  };
}

// ============================================
// WELCOME MODAL
// ============================================

interface WelcomeModalProps {
  userName?: string;
  onContinue: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ userName, onContinue, onSkip }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-bl from-green-500 to-green-600 text-white p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-4xl">🌳</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            مرحباً بك في العائلة!
          </h1>
          <p className="text-green-100">
            Welcome to the family, {userName || 'عزيزي'}!
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 leading-relaxed">
              أنت الآن جزء من عائلة مكونة من <span className="font-bold text-green-600">99 فرداً</span> عبر{' '}
              <span className="font-bold text-green-600">8 أجيال</span>.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              دعنا نأخذك في جولة سريعة!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onContinue}
              className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={20} />
              ابدأ الجولة
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              تخطي الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ONBOARDING TOUR
// ============================================

interface OnboardingTourProps extends OnboardingProps {
  startStep?: number;
}

export function OnboardingTour({ onComplete, onSkip, startStep = 0 }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(startStep);
  const router = useRouter();

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleAction = () => {
    if (step.action?.href) {
      onComplete?.();
      router.push(step.action.href);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Close button */}
        <div className="absolute top-4 left-4">
          <button
            onClick={onSkip}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 p-4 justify-center">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-green-500'
                  : index < currentStep
                    ? 'w-4 bg-green-300'
                    : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="px-8 pb-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
            {step.icon}
          </div>

          {/* Step indicator */}
          <p className="text-sm text-gray-400 mb-2">
            {currentStep + 1} / {ONBOARDING_STEPS.length}
          </p>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {step.titleAr}
          </h2>
          <p className="text-sm text-gray-400 mb-4">{step.title}</p>

          {/* Description */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            {step.descriptionAr}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {step.action && (
              <button
                onClick={handleAction}
                className="w-full py-3 px-6 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
              >
                {step.action.labelAr}
              </button>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handlePrev}
                disabled={isFirstStep}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  isFirstStep
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronRight size={16} />
                السابق
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {isLastStep ? (
                  <>
                    <Check size={16} />
                    إنهاء
                  </>
                ) : (
                  <>
                    التالي
                    <ChevronLeft size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ONBOARDING CHECKLIST (Mini version for home)
// ============================================

interface ChecklistItem {
  id: string;
  label: string;
  labelAr: string;
  completed: boolean;
  href?: string;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
  onDismiss?: () => void;
}

export function OnboardingChecklist({ items, onDismiss }: OnboardingChecklistProps) {
  const completedCount = items.filter((i) => i.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  if (completedCount === items.length) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-800">البدء مع العائلة</h3>
          <p className="text-sm text-gray-500">Getting Started</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{completedCount} من {items.length} مكتملة</span>
          <span className="font-bold text-green-600">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            {item.href && !item.completed ? (
              <a
                href={item.href}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    item.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {item.completed && <Check size={12} />}
                </div>
                <span className={item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}>
                  {item.labelAr}
                </span>
              </a>
            ) : (
              <div className="flex items-center gap-3 p-2">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    item.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {item.completed && <Check size={12} />}
                </div>
                <span className={item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}>
                  {item.labelAr}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// MAIN ONBOARDING COMPONENT
// ============================================

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [showWelcome, setShowWelcome] = useState(true);
  const { user } = useAuth();

  const handleStartTour = () => {
    setShowWelcome(false);
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const handleComplete = () => {
    onComplete?.();
  };

  if (showWelcome) {
    return (
      <WelcomeModal
        userName={user?.nameArabic}
        onContinue={handleStartTour}
        onSkip={handleSkip}
      />
    );
  }

  return (
    <OnboardingTour
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}

export default Onboarding;
