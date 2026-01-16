'use client';

import { useState, useEffect } from 'react';

interface CountryCode {
  code: string;
  name: string;
  nameAr: string;
  iso: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+966', name: 'Saudi Arabia', nameAr: 'السعودية', iso: 'SA' },
  { code: '+971', name: 'UAE', nameAr: 'الإمارات', iso: 'AE' },
  { code: '+965', name: 'Kuwait', nameAr: 'الكويت', iso: 'KW' },
  { code: '+973', name: 'Bahrain', nameAr: 'البحرين', iso: 'BH' },
  { code: '+974', name: 'Qatar', nameAr: 'قطر', iso: 'QA' },
  { code: '+968', name: 'Oman', nameAr: 'عمان', iso: 'OM' },
  { code: '+962', name: 'Jordan', nameAr: 'الأردن', iso: 'JO' },
  { code: '+20', name: 'Egypt', nameAr: 'مصر', iso: 'EG' },
  { code: '+212', name: 'Morocco', nameAr: 'المغرب', iso: 'MA' },
  { code: '+216', name: 'Tunisia', nameAr: 'تونس', iso: 'TN' },
  { code: '+213', name: 'Algeria', nameAr: 'الجزائر', iso: 'DZ' },
  { code: '+963', name: 'Syria', nameAr: 'سوريا', iso: 'SY' },
  { code: '+961', name: 'Lebanon', nameAr: 'لبنان', iso: 'LB' },
  { code: '+964', name: 'Iraq', nameAr: 'العراق', iso: 'IQ' },
  { code: '+967', name: 'Yemen', nameAr: 'اليمن', iso: 'YE' },
  { code: '+970', name: 'Palestine', nameAr: 'فلسطين', iso: 'PS' },
  { code: '+90', name: 'Turkey', nameAr: 'تركيا', iso: 'TR' },
  { code: '+44', name: 'UK', nameAr: 'بريطانيا', iso: 'GB' },
  { code: '+1', name: 'USA/Canada', nameAr: 'أمريكا/كندا', iso: 'US' },
  { code: '+33', name: 'France', nameAr: 'فرنسا', iso: 'FR' },
  { code: '+49', name: 'Germany', nameAr: 'ألمانيا', iso: 'DE' },
  { code: '+91', name: 'India', nameAr: 'الهند', iso: 'IN' },
  { code: '+92', name: 'Pakistan', nameAr: 'باكستان', iso: 'PK' },
  { code: '+60', name: 'Malaysia', nameAr: 'ماليزيا', iso: 'MY' },
  { code: '+62', name: 'Indonesia', nameAr: 'إندونيسيا', iso: 'ID' },
];

function getFlagUrl(iso: string): string {
  return `https://flagcdn.com/w40/${iso.toLowerCase()}.png`;
}

interface PhoneInputProps {
  value: string;
  onChange: (phone: string, countryCode: string) => void;
  countryCode?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  countryCode: initialCountryCode = '+966',
  placeholder = '5XXXXXXXX',
  disabled = false,
  error,
  label = 'رقم الجوال',
  required = false
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRY_CODES.find(c => c.code === initialCountryCode) || COUNTRY_CODES[0]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState(value);

  useEffect(() => {
    setPhone(value);
  }, [value]);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setIsOpen(false);
    onChange(phone, country.code);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value.replace(/[^\d]/g, '');
    setPhone(newPhone);
    onChange(newPhone, selectedCountry.code);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex">
        <div className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-3 border border-l-0 border-gray-300 bg-gray-50 rounded-r-lg text-sm font-medium ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'
            }`}
          >
            <img 
              src={getFlagUrl(selectedCountry.iso)} 
              alt={selectedCountry.name}
              className="w-6 h-4 object-cover rounded-sm"
            />
            <span className="text-gray-700">{selectedCountry.code}</span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute top-full right-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg z-50">
              {COUNTRY_CODES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-right hover:bg-gray-100 ${
                    selectedCountry.code === country.code ? 'bg-emerald-50' : ''
                  }`}
                >
                  <img 
                    src={getFlagUrl(country.iso)} 
                    alt={country.name}
                    className="w-6 h-4 object-cover rounded-sm"
                  />
                  <span className="flex-1 text-gray-800">{country.nameAr}</span>
                  <span className="text-gray-500 text-sm">{country.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          dir="ltr"
          className={`flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-left ${
            disabled ? 'bg-gray-100 opacity-50 cursor-not-allowed' : ''
          } ${error ? 'border-red-500' : ''}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
