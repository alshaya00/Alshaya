'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FamilyMember, MilkFamily } from '@/lib/types';
import MemberMiniGraph from './MemberMiniGraph';
import { ChevronLeft, Baby, Heart, Users, Plus, Loader2 } from 'lucide-react';

interface MemberBreastfeedingSectionProps {
  member: FamilyMember;
  father: FamilyMember | null;
  siblings: FamilyMember[];
  children: FamilyMember[];
  grandchildren: FamilyMember[];
}

interface BreastfeedingData {
  milkFamilies: MilkFamily[];
  nursedChildren: Array<{
    relationshipId: string;
    child: {
      id: string;
      firstName: string;
      fullNameAr: string | null;
      gender: string;
    } | null;
  }>;
}

export default function MemberBreastfeedingSection({
  member,
  father,
  siblings,
  children,
  grandchildren,
}: MemberBreastfeedingSectionProps) {
  const [breastfeedingData, setBreastfeedingData] = useState<BreastfeedingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBreastfeedingData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/members/${member.id}/breastfeeding`);
        const data = await response.json();

        if (data.success) {
          setBreastfeedingData(data.data);
        } else {
          // No breastfeeding data - that's fine, just set empty
          setBreastfeedingData({ milkFamilies: [], nursedChildren: [] });
        }
      } catch (err) {
        console.error('Failed to fetch breastfeeding data:', err);
        // Don't show error, just set empty data
        setBreastfeedingData({ milkFamilies: [], nursedChildren: [] });
      } finally {
        setLoading(false);
      }
    }

    fetchBreastfeedingData();
  }, [member.id]);

  const handleSelectMember = (selectedMember: FamilyMember) => {
    window.location.href = `/member/${selectedMember.id}`;
  };

  const hasMilkFamilies = breastfeedingData && breastfeedingData.milkFamilies.length > 0;
  const hasNursedChildren = breastfeedingData && breastfeedingData.nursedChildren.length > 0;

  return (
    <div className="space-y-6">
      {/* Mini Family Graph */}
      <MemberMiniGraph
        person={member}
        father={father}
        siblings={siblings}
        children={children}
        grandchildren={grandchildren}
        milkFamilies={breastfeedingData?.milkFamilies || []}
        onSelectMember={handleSelectMember}
      />

      {/* Breastfeeding Relationships Section */}
      {(hasMilkFamilies || hasNursedChildren) && (
        <div className="bg-teal-50 rounded-xl p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-teal-800">
            <Baby className="text-teal-600" size={20} />
            علاقات الرضاعة
          </h2>

          {/* Who breastfed this person */}
          {hasMilkFamilies && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-teal-700 mb-3 flex items-center gap-2">
                <Heart size={16} />
                من أرضع{member.gender === 'Male' ? 'ه' : 'ها'}:
              </h3>
              <div className="space-y-3">
                {breastfeedingData?.milkFamilies.map((milkFamily, index) => (
                  <div
                    key={milkFamily.relationship.id}
                    className="bg-white rounded-lg p-4 border border-teal-200"
                  >
                    {/* Milk Mother */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-xl">
                        🤱
                      </span>
                      <div className="flex-1">
                        <p className="text-xs text-teal-600 mb-0.5">أم الرضاعة</p>
                        {milkFamily.milkMother && 'isExternal' in milkFamily.milkMother ? (
                          <p className="font-bold text-gray-800">
                            {milkFamily.milkMother.name}
                            <span className="text-xs text-gray-400 mr-1">(خارج العائلة)</span>
                          </p>
                        ) : milkFamily.milkMother ? (
                          <Link
                            href={`/member/${milkFamily.milkMother.id}`}
                            className="font-bold text-teal-700 hover:text-teal-900"
                          >
                            {milkFamily.milkMother.firstName}
                            {milkFamily.milkMother.fullNameAr && (
                              <span className="text-xs text-gray-500 mr-1">
                                ({milkFamily.milkMother.fullNameAr})
                              </span>
                            )}
                          </Link>
                        ) : null}
                      </div>
                      {milkFamily.milkMother && !('isExternal' in milkFamily.milkMother) && (
                        <ChevronLeft size={16} className="text-gray-400" />
                      )}
                    </div>

                    {/* Milk Father */}
                    {milkFamily.milkFather && (
                      <div className="flex items-center gap-3 mb-3 pr-4 border-r-2 border-teal-100">
                        <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                          👨
                        </span>
                        <div className="flex-1">
                          <p className="text-xs text-blue-600 mb-0.5">أب الرضاعة</p>
                          {'isExternal' in milkFamily.milkFather ? (
                            <p className="font-medium text-gray-700">
                              {milkFamily.milkFather.name}
                              <span className="text-xs text-gray-400 mr-1">(خارج العائلة)</span>
                            </p>
                          ) : (
                            <Link
                              href={`/member/${milkFamily.milkFather.id}`}
                              className="font-medium text-blue-700 hover:text-blue-900"
                            >
                              {milkFamily.milkFather.firstName}
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Milk Siblings */}
                    {milkFamily.milkSiblings.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-teal-100">
                        <p className="text-xs text-teal-600 mb-2 flex items-center gap-1">
                          <Users size={14} />
                          إخوة الرضاعة ({milkFamily.milkSiblings.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {milkFamily.milkSiblings.map((sibling) => (
                            <Link
                              key={sibling.id}
                              href={`/member/${sibling.id}`}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                sibling.gender === 'Male'
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                              }`}
                            >
                              {sibling.gender === 'Male' ? '👨' : '👩'} {sibling.firstName}
                              <span className="text-xs opacity-75 mr-1">
                                ({sibling.gender === 'Male' ? 'أخ رضاعة' : 'أخت رضاعة'})
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {milkFamily.relationship.notes && (
                      <div className="mt-3 pt-3 border-t border-teal-100">
                        <p className="text-xs text-gray-500">
                          ملاحظات: {milkFamily.relationship.notes}
                        </p>
                      </div>
                    )}

                    {/* Year */}
                    {milkFamily.relationship.breastfeedingYear && (
                      <p className="text-xs text-gray-400 mt-2">
                        سنة الرضاعة: {milkFamily.relationship.breastfeedingYear}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Who this person breastfed (if female) */}
          {hasNursedChildren && (
            <div className="mt-4 pt-4 border-t border-teal-200">
              <h3 className="text-sm font-medium text-teal-700 mb-3 flex items-center gap-2">
                <Baby size={16} />
                من أرضعت:
              </h3>
              <div className="flex flex-wrap gap-2">
                {breastfeedingData?.nursedChildren.map((record) => (
                  record.child && (
                    <Link
                      key={record.relationshipId}
                      href={`/member/${record.child.id}`}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        record.child.gender === 'Male'
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-pink-100 text-pink-700 hover:bg-pink-200'
                      }`}
                    >
                      {record.child.gender === 'Male' ? '👨' : '👩'} {record.child.firstName}
                      <span className="text-xs opacity-75 mr-1">
                        ({record.child.gender === 'Male' ? 'ابن رضاعة' : 'بنت رضاعة'})
                      </span>
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-4 text-gray-500">
          <Loader2 className="animate-spin ml-2" size={20} />
          جاري تحميل علاقات الرضاعة...
        </div>
      )}
    </div>
  );
}
