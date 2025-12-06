'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getMaleMembers, getNextId, FamilyMember } from '@/lib/data';
import { PlusCircle, Check, User, Calendar, MapPin, Briefcase } from 'lucide-react';

interface QuickAddFormData {
  firstName: string;
  fatherId: string;
  gender: 'Male' | 'Female';
  birthYear: number;
  city?: string;
  occupation?: string;
}

interface AutoFillData {
  fatherName: string | null;
  grandfatherName: string | null;
  greatGrandfatherName: string | null;
  generation: number;
  branch: string | null;
  fullNamePreview: string;
}

export default function QuickAddPage() {
  const [fathers, setFathers] = useState<FamilyMember[]>([]);
  const [autoFillData, setAutoFillData] = useState<AutoFillData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuickAddFormData>({
    defaultValues: {
      gender: 'Male',
      birthYear: new Date().getFullYear() - 25,
    },
  });

  const selectedFatherId = watch('fatherId');
  const firstName = watch('firstName');
  const gender = watch('gender');

  useEffect(() => {
    setFathers(getMaleMembers());
    setNewMemberId(getNextId());
  }, []);

  useEffect(() => {
    if (selectedFatherId && firstName) {
      const father = fathers.find((f) => f.id === selectedFatherId);
      if (father) {
        const connector = gender === 'Male' ? 'بن' : 'بنت';
        setAutoFillData({
          fatherName: father.firstName,
          grandfatherName: father.fatherName,
          greatGrandfatherName: father.grandfatherName,
          generation: father.generation + 1,
          branch: father.branch,
          fullNamePreview: `${firstName} ${connector} ${father.firstName} ${
            father.fatherName ? `${connector} ${father.fatherName}` : ''
          } آل شايع`,
        });
      }
    } else if (firstName) {
      setAutoFillData({
        fatherName: null,
        grandfatherName: null,
        greatGrandfatherName: null,
        generation: 1,
        branch: 'الأصل',
        fullNamePreview: `${firstName} آل شايع`,
      });
    } else {
      setAutoFillData(null);
    }
  }, [selectedFatherId, firstName, gender, fathers]);

  const onSubmit = async (data: QuickAddFormData) => {
    // In a real app, this would save to the database
    console.log('New member data:', {
      id: newMemberId,
      ...data,
      ...autoFillData,
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      reset();
      setNewMemberId(getNextId());
    }, 3000);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
            <PlusCircle className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">إضافة سريعة</h1>
          <p className="text-gray-600 mt-2">Quick Smart Entry</p>
          <p className="text-sm text-gray-500 mt-1">
            أدخل الاسم واختر الأب فقط - البيانات تُملأ تلقائياً!
          </p>
        </div>

        {/* Success Message */}
        {submitted && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <Check className="text-green-600" size={24} />
            <div>
              <p className="font-bold">تمت الإضافة بنجاح!</p>
              <p className="text-sm">تم إضافة العضو الجديد إلى السجل</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* New ID Display */}
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">رقم التعريف الجديد</p>
              <p className="text-2xl font-bold text-green-600">{newMemberId}</p>
            </div>

            {/* Name Input */}
            <div>
              <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                <User size={18} />
                الاسم فقط / Name Only
              </label>
              <input
                {...register('firstName', { required: 'الاسم مطلوب' })}
                className="quick-add-input bg-yellow-50 focus:bg-yellow-100"
                placeholder="أدخل الاسم الأول فقط..."
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>

            {/* Father Selection */}
            <div>
              <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                <User size={18} />
                اختر الأب / Select Father
              </label>
              <select
                {...register('fatherId')}
                className="quick-add-input bg-green-50 focus:bg-green-100"
              >
                <option value="">-- الجذر (بدون أب) / Root --</option>
                {fathers.map((father) => (
                  <option key={father.id} value={father.id}>
                    {father.id} - {father.fullNameAr} (الجيل {father.generation})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-filled Data Preview */}
            {autoFillData && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">🔄</span>
                  البيانات المُحسوبة تلقائياً
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">اسم الأب:</span>
                    <p className="font-semibold">{autoFillData.fatherName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">اسم الجد:</span>
                    <p className="font-semibold">{autoFillData.grandfatherName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">الجيل:</span>
                    <p className="font-semibold">الجيل {autoFillData.generation}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">الفرع:</span>
                    <p className="font-semibold">{autoFillData.branch}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <span className="text-gray-500 text-sm">الاسم الكامل:</span>
                  <p className="font-bold text-blue-900">{autoFillData.fullNamePreview}</p>
                </div>
              </div>
            )}

            {/* Gender Selection */}
            <div>
              <label className="font-bold text-gray-700 mb-2 block">الجنس / Gender</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="Male"
                    {...register('gender')}
                    className="w-5 h-5 text-blue-600"
                  />
                  <span className="px-4 py-2 bg-blue-100 rounded-lg">👨 ذكر / Male</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="Female"
                    {...register('gender')}
                    className="w-5 h-5 text-pink-600"
                  />
                  <span className="px-4 py-2 bg-pink-100 rounded-lg">👩 أنثى / Female</span>
                </label>
              </div>
            </div>

            {/* Birth Year */}
            <div>
              <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                <Calendar size={18} />
                سنة الميلاد / Birth Year
              </label>
              <input
                type="number"
                {...register('birthYear', {
                  min: { value: 1900, message: 'السنة غير صحيحة' },
                  max: { value: new Date().getFullYear(), message: 'السنة غير صحيحة' },
                })}
                className="quick-add-input"
                placeholder="مثال: 1990"
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                  <MapPin size={18} />
                  المدينة (اختياري)
                </label>
                <input
                  {...register('city')}
                  className="quick-add-input"
                  placeholder="الرياض، جدة..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2 font-bold text-gray-700 mb-2">
                  <Briefcase size={18} />
                  المهنة (اختياري)
                </label>
                <input
                  {...register('occupation')}
                  className="quick-add-input"
                  placeholder="مهندس، طبيب..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-l from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              <PlusCircle size={24} />
              إضافة إلى السجل
              <span className="text-sm opacity-80">ADD TO REGISTRY</span>
            </button>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <h3 className="font-bold text-yellow-800 mb-3">💡 نصائح للإضافة السريعة</h3>
          <ul className="space-y-2 text-sm text-yellow-700">
            <li>• اختر الأب من القائمة لملء البيانات تلقائياً</li>
            <li>• الحقول الاختيارية يمكن تعبئتها لاحقاً</li>
            <li>• رقم التعريف يُحسب تلقائياً</li>
            <li>• الجيل والفرع يُحددان حسب الأب المختار</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
