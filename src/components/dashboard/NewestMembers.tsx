'use client';

import { Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { Avatar, AvatarFallback } from '@/components/ui';
import GenderAvatar from '@/components/GenderAvatar';
import type { NewestMember } from '@/hooks/useStatistics';

interface NewestMembersProps {
  members: NewestMember[];
}

export default function NewestMembers({ members }: NewestMembersProps) {
  if (!members || members.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="text-info" size={22} />
          <span>أحدث الأعضاء المضافين</span>
          <span className="text-sm font-normal text-muted-foreground">Newest Members</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {members.map((member) => (
            <Card
              key={member.id}
              className="border-info/20 bg-info/5 dark:bg-info/5"
            >
              <CardContent className="p-3 flex items-center gap-3">
                <GenderAvatar
                  gender={member.gender === 'Male' ? 'Male' : 'Female'}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {member.firstName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الجيل {member.generation}
                    {member.branch && ` - ${member.branch}`}
                  </p>
                  {member.createdAt && (
                    <Badge variant="info" size="sm" className="mt-1">
                      {new Date(member.createdAt).toLocaleDateString('ar-SA')}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
