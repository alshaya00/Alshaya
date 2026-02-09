import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkVerification, normalizePhoneNumber } from '@/lib/otp-service';
import { findUserByEmail, logActivity, getSiteSettings, checkMemberLinkedToUser } from '@/lib/auth/db-store';
import { validatePassword } from '@/lib/auth/password';
import { checkRateLimit, getClientIp, rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';
import { checkBlocklist } from '@/lib/blocklist';
import { createMember, MemberInput } from '@/lib/member-registry';
import crypto from 'crypto';
import { normalizeMemberId } from '@/lib/utils';

function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(8).toString('hex');
  return `c${timestamp}${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(clientIp, rateLimiters.register);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(createRateLimitResponse(rateLimitResult), { status: 429 });
    }

    const settings = await getSiteSettings();
    if (!settings.allowSelfRegistration) {
      return NextResponse.json(
        {
          success: false,
          message: 'Self-registration is currently disabled',
          messageAr: 'التسجيل الذاتي معطل حالياً',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (body.relatedMemberId) body.relatedMemberId = normalizeMemberId(body.relatedMemberId) || body.relatedMemberId;
    if (body.parentMemberId) body.parentMemberId = normalizeMemberId(body.parentMemberId) || body.parentMemberId;
    const {
      email,
      password,
      nameArabic,
      nameEnglish,
      phone,
      countryCode = '+966',
      otp,
      gender,
      claimedRelation,
      relatedMemberId,
      relationshipType,
      parentMemberId,
      parentPendingId,
      message,
      birthYear,
      birthCalendar,
      occupation,
    } = body;

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!email || !password || !nameArabic || !phone || !otp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
          messageAr: 'الحقول المطلوبة غير مكتملة',
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid email format',
          messageAr: 'صيغة البريد الإلكتروني غير صحيحة',
        },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password, 8);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: passwordValidation.errors.map((e) => e.en).join('. '),
          messageAr: passwordValidation.errors.map((e) => e.ar).join('. '),
          errors: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(phone, countryCode);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid phone number format',
          messageAr: 'صيغة رقم الجوال غير صحيحة',
        },
        { status: 400 }
      );
    }
    
    const otpResult = await checkVerification(normalizedPhone, otp, 'REGISTRATION', countryCode);

    if (!otpResult.valid) {
      return NextResponse.json(
        {
          success: false,
          message: 'OTP verification failed',
          messageAr: otpResult.messageAr,
        },
        { status: 400 }
      );
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this email already exists',
          messageAr: 'يوجد حساب بهذا البريد الإلكتروني',
        },
        { status: 409 }
      );
    }

    const existingPhoneUser = await prisma.user.findFirst({
      where: { phone: normalizedPhone }
    });
    if (existingPhoneUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this phone number already exists',
          messageAr: 'يوجد حساب بهذا الرقم',
        },
        { status: 409 }
      );
    }

    const blocklistCheck = await checkBlocklist(normalizedPhone, email);
    if (blocklistCheck.blocked) {
      return NextResponse.json(
        {
          success: false,
          message: 'Registration is not allowed for this phone/email',
          messageAr: 'لا يمكن التسجيل بهذا الرقم أو البريد الإلكتروني',
        },
        { status: 403 }
      );
    }

    // ===== AUTO-MATCH: Search for existing child under parent =====
    // User requirement: "same fatherId + same firstName = impossible to be different people"
    // Parents don't name two children with the same name in Arab culture
    // STRICT MATCHING: firstName + gender match, exactly ONE unlinked child matches
    let autoMatchedMemberId: string | null = null;
    
    if (parentMemberId && !relatedMemberId) {
      const normalizeArabicName = (text: string): string => {
        return text
          .replace(/[أإآا]/g, 'ا')
          .replace(/[ىي]/g, 'ي')
          .replace(/ة/g, 'ه')
          .replace(/ؤ/g, 'و')
          .replace(/ئ/g, 'ي')
          .replace(/\s+بن\s+/g, ' ')
          .replace(/\s+بنت\s+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      };
      
      // Extract name parts from input: "محمد بن عبدالله" → ["محمد", "عبدالله"]
      const inputNameParts = nameArabic.trim()
        .replace(/\s+بن\s+/g, ' ')
        .replace(/\s+بنت\s+/g, ' ')
        .split(/\s+/)
        .filter(p => p.length > 0);
      
      const normalizedInputFirstName = normalizeArabicName(inputNameParts[0] || '');
      
      // Get parent info to verify fatherName from child's record
      const parentInfo = await prisma.familyMember.findUnique({
        where: { id: parentMemberId },
        select: { firstName: true }
      });
      
      // Find all children of the selected parent
      const parentChildren = await prisma.familyMember.findMany({
        where: {
          fatherId: parentMemberId,
          status: { in: ['Living', 'Deceased'] }
        },
        select: {
          id: true,
          firstName: true,
          fatherName: true,
          gender: true,
        }
      });
      
      // Find matching children with strict criteria
      const matchingChildren: typeof parentChildren = [];
      
      for (const child of parentChildren) {
        const normalizedChildFirstName = normalizeArabicName(child.firstName);
        
        // REQUIRED: firstName must match
        if (normalizedChildFirstName !== normalizedInputFirstName) continue;
        
        // REQUIRED: Gender must match (if provided)
        if (gender) {
          const normalizedGender = gender.toLowerCase();
          const childGender = child.gender?.toLowerCase() || '';
          const isMaleInput = normalizedGender === 'male' || normalizedGender === 'ذكر';
          const isFemaleInput = normalizedGender === 'female' || normalizedGender === 'أنثى';
          const isMaleChild = childGender === 'male' || childGender === 'ذكر';
          const isFemaleChild = childGender === 'female' || childGender === 'أنثى';
          
          if ((isMaleInput && !isMaleChild) || (isFemaleInput && !isFemaleChild)) {
            continue; // Gender mismatch - skip
          }
        }
        
        // VERIFY: Child's fatherName should match parent's firstName (consistency check)
        if (parentInfo && child.fatherName) {
          const normalizedParentFirstName = normalizeArabicName(parentInfo.firstName);
          const normalizedChildFatherName = normalizeArabicName(child.fatherName);
          if (normalizedChildFatherName !== normalizedParentFirstName) {
            console.log(`Skipping child ${child.id}: fatherName mismatch (expected ${parentInfo.firstName})`);
            continue; // Data inconsistency - skip
          }
        }
        
        // Check if this child is already linked to another user
        const existingLink = await checkMemberLinkedToUser(child.id);
        if (!existingLink) {
          matchingChildren.push(child);
        }
      }
      
      // ONLY auto-match if EXACTLY one unlinked child matches all criteria
      if (matchingChildren.length === 1) {
        autoMatchedMemberId = matchingChildren[0].id;
        console.log(`Auto-matched user to existing member ${autoMatchedMemberId} (exact match: firstName + gender under parent ${parentMemberId})`);
      } else if (matchingChildren.length > 1) {
        // This should be rare - same firstName under same parent with same gender
        console.log(`WARNING: Multiple matching children (${matchingChildren.length}) found under parent ${parentMemberId}, skipping auto-match (requires admin review)`);
      } else {
        // No matching child found - CREATE A NEW MEMBER for this user
        console.log(`No matching child found under parent ${parentMemberId} for firstName "${inputNameParts[0]}", creating new member...`);
        
        try {
          const newMemberInput: MemberInput = {
            firstName: inputNameParts[0] || sanitizeString(nameArabic).split(' ')[0],
            fatherName: parentInfo?.firstName || undefined,
            fatherId: parentMemberId,
            gender: (gender === 'Female' ? 'Female' : 'Male') as 'Male' | 'Female',
            phone: normalizedPhone,
            email: email.toLowerCase(),
            status: 'Living',
          };
          
          const createResult = await createMember(newMemberInput, {
            skipDuplicateCheck: false,
            source: 'registration',
            createdBy: 'system-registration',
          });
          
          if (createResult.success && createResult.member) {
            autoMatchedMemberId = createResult.member.id;
            console.log(`Created new member ${autoMatchedMemberId} for registering user under parent ${parentMemberId}`);
          } else {
            console.error('Failed to create new member during registration:', createResult.errors);
            // Continue without linking - user can still register, admin can fix later
          }
        } catch (createError) {
          console.error('Error creating new member during registration:', createError);
          // Continue without linking - user can still register, admin can fix later
        }
      }
    }

    // Handle conditional registration (parent is pending approval)
    let pendingMemberCreated = false;
    let createdPendingMemberId: string | null = null;
    
    if (parentPendingId && !relatedMemberId && !autoMatchedMemberId) {
      // Get parent pending member info
      const parentPending = await prisma.pendingMember.findUnique({
        where: { id: parentPendingId },
        select: { firstName: true, generation: true, branch: true }
      });
      
      if (parentPending) {
        const inputNameParts = nameArabic.trim()
          .replace(/\s+بن\s+/g, ' ')
          .replace(/\s+بنت\s+/g, ' ')
          .split(/\s+/)
          .filter((p: string) => p.length > 0);
        
        // Create a pending member linked to the parent pending member
        const pendingMember = await prisma.pendingMember.create({
          data: {
            firstName: inputNameParts[0] || sanitizeString(nameArabic).split(' ')[0],
            fatherName: parentPending.firstName,
            gender: gender || 'Male',
            generation: (parentPending.generation || 1) + 1,
            branch: parentPending.branch || null,
            phone: normalizedPhone,
            email: email.toLowerCase(),
            status: 'Living',
            parentPendingId: parentPendingId,
            fullNameAr: sanitizeString(nameArabic),
            reviewStatus: 'PENDING',
            submittedVia: 'registration-conditional',
          }
        });
        
        createdPendingMemberId = pendingMember.id;
        pendingMemberCreated = true;
        console.log(`Created conditional pending member ${pendingMember.id} linked to parent pending ${parentPendingId}`);
      }
    }
    
    // Determine final linked member ID
    const finalLinkedMemberId = relatedMemberId || autoMatchedMemberId || null;
    
    // Check if the linked member is already linked to another user
    if (finalLinkedMemberId) {
      const existingLink = await checkMemberLinkedToUser(finalLinkedMemberId);
      if (existingLink) {
        return NextResponse.json(
          {
            success: false,
            message: 'This member is already linked to another account',
            messageAr: 'هذا العضو مرتبط بحساب آخر',
          },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Step 1: Create the user
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          nameArabic: sanitizeString(nameArabic),
          nameEnglish: sanitizeString(nameEnglish) || null,
          phone: normalizedPhone,
          role: 'MEMBER',
          status: 'ACTIVE',
          phoneVerified: true,
          linkedMemberId: finalLinkedMemberId,
        }
      });
      console.log(`User created successfully: ${user.id}`);
    } catch (userError: any) {
      console.error('Failed to create user:', userError);
      
      // Check for unique constraint violations
      if (userError?.code === 'P2002') {
        const field = userError?.meta?.target?.[0] || 'unknown';
        if (field === 'email') {
          return NextResponse.json(
            {
              success: false,
              message: 'An account with this email already exists',
              messageAr: 'يوجد حساب بهذا البريد الإلكتروني مسبقاً',
            },
            { status: 409 }
          );
        }
        if (field === 'phone') {
          return NextResponse.json(
            {
              success: false,
              message: 'An account with this phone number already exists',
              messageAr: 'يوجد حساب بهذا الرقم مسبقاً',
            },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            success: false,
            message: `This ${field} is already registered`,
            messageAr: `${field === 'email' ? 'البريد الإلكتروني' : 'الرقم'} مستخدم مسبقاً`,
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to create account. Please try again.',
          messageAr: 'فشل في إنشاء الحساب. يرجى المحاولة مرة أخرى.',
          errorCode: 'USER_CREATION_FAILED',
        },
        { status: 500 }
      );
    }

    // Step 2: Create or update access request (non-critical, continue on failure)
    try {
      const existingRequest = await prisma.accessRequest.findFirst({
        where: { 
          email: email.toLowerCase(),
          status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
      });

      const reviewNote = autoMatchedMemberId 
        ? `Auto-matched to existing member ${autoMatchedMemberId} and approved via phone verification (IP: ${ipAddress})`
        : `Auto-approved via phone verification (IP: ${ipAddress})`;
      
      if (existingRequest) {
        await prisma.accessRequest.update({
          where: { id: existingRequest.id },
          data: {
            nameArabic: sanitizeString(nameArabic),
            nameEnglish: sanitizeString(nameEnglish) || null,
            phone: normalizedPhone,
            gender: gender || null,
            claimedRelation: sanitizeString(claimedRelation) || 'Phone Verified Registration',
            relatedMemberId: finalLinkedMemberId || null,
            relationshipType: autoMatchedMemberId ? 'AUTO_MATCHED' : (relationshipType || null),
            parentMemberId: parentMemberId || null,
            message: sanitizeString(message) || null,
            birthYear: birthYear ? parseInt(birthYear) : null,
            birthCalendar: birthCalendar || null,
            occupation: sanitizeString(occupation) || null,
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewNote,
            userId: user.id,
            approvedRole: 'MEMBER',
          }
        });
      } else {
        await prisma.accessRequest.create({
          data: {
            email: email.toLowerCase(),
            nameArabic: sanitizeString(nameArabic),
            nameEnglish: sanitizeString(nameEnglish) || null,
            phone: normalizedPhone,
            gender: gender || null,
            claimedRelation: sanitizeString(claimedRelation) || 'Phone Verified Registration',
            relatedMemberId: finalLinkedMemberId || null,
            relationshipType: autoMatchedMemberId ? 'AUTO_MATCHED' : (relationshipType || null),
            parentMemberId: parentMemberId || null,
            message: sanitizeString(message) || null,
            birthYear: birthYear ? parseInt(birthYear) : null,
            birthCalendar: birthCalendar || null,
            occupation: sanitizeString(occupation) || null,
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewNote,
            userId: user.id,
            approvedRole: 'MEMBER',
          }
        });
      }
      console.log('Access request created/updated successfully');
    } catch (accessError) {
      console.error('Failed to create/update access request (non-critical):', accessError);
      // Continue - access request is not critical for user functionality
    }

    // Step 3: Log activity (non-critical, continue on failure)
    try {
      await logActivity({
        userId: user.id,
        userEmail: email,
        userName: nameArabic,
        action: 'REGISTER_WITH_PHONE',
        category: 'AUTH',
        targetType: 'USER',
        targetId: user.id,
        targetName: nameArabic,
        details: {
          method: 'phone_otp',
          autoApproved: true,
          autoMatched: !!autoMatchedMemberId,
          autoMatchedMemberId: autoMatchedMemberId || null,
          linkedMemberId: finalLinkedMemberId,
        },
        ipAddress,
        userAgent,
        success: true,
      });
      console.log('Activity logged successfully');
    } catch (logError) {
      console.error('Failed to log activity (non-critical):', logError);
      // Continue - activity logging is not critical
    }

    // Step 4: Create session (critical for login)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
          rememberMe: false,
          ipAddress,
          userAgent,
          deviceName: 'تسجيل حساب جديد'
        }
      });
      console.log('Session created successfully');
    } catch (sessionError) {
      console.error('Failed to create session:', sessionError);
      // User was created but session failed - they can try logging in
      return NextResponse.json(
        {
          success: true,
          message: 'Account created. Please log in.',
          messageAr: 'تم إنشاء حسابك بنجاح. يرجى تسجيل الدخول.',
          needsLogin: true,
        },
        { status: 201 }
      );
    }

    // Step 5: Update last login (non-critical)
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    } catch (updateError) {
      console.error('Failed to update last login (non-critical):', updateError);
    }

    // Step 6: Record login history (non-critical)
    try {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          success: true,
          method: 'REGISTRATION',
          ipAddress,
          userAgent,
          deviceName: 'تسجيل حساب جديد',
        },
      });
    } catch (historyError) {
      console.error('Failed to record registration login history (non-critical):', historyError);
    }

    console.log(`Registration completed successfully for user: ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      messageAr: 'تم إنشاء حسابك بنجاح',
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        nameArabic: user.nameArabic,
        nameEnglish: user.nameEnglish,
        phone: user.phone,
        role: user.role,
        status: user.status,
        linkedMemberId: user.linkedMemberId,
      }
    });
  } catch (error: any) {
    console.error('Registration with phone verification error:', error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'حدث خطأ أثناء التسجيل';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error?.code === 'P2002') {
      errorMessage = 'البيانات المدخلة مستخدمة مسبقاً';
      errorCode = 'DUPLICATE_DATA';
    } else if (error?.code === 'P2003') {
      errorMessage = 'بيانات مرتبطة غير صحيحة';
      errorCode = 'INVALID_REFERENCE';
    } else if (error?.message?.includes('timeout')) {
      errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      errorCode = 'TIMEOUT';
    } else if (error?.message?.includes('connection')) {
      errorMessage = 'مشكلة في الاتصال بالخادم. يرجى المحاولة لاحقاً.';
      errorCode = 'CONNECTION_ERROR';
    }
    
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred during registration',
        messageAr: errorMessage,
        errorCode,
      },
      { status: 500 }
    );
  }
}
