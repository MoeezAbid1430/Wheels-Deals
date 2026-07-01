export const verificationLevels = [
  'guest',
  'registered',
  'email_phone_verified',
  'kyc_pending',
  'kyc_verified',
  'kyc_rejected',
  'dealer_verified',
  'bank_partner_verified',
  'suspended',
];

export const defaultPrivacySettings = {
  showFullName: false,
  showDisplayName: true,
  showProfilePhoto: true,
  showCity: true,
  showPhone: false,
  showEmail: false,
  showGarage: true,
  showOwnedVehicles: true,
  showArchivedVehicles: false,
  showBadgesRankings: true,
  showAuctionHistory: false,
  showWishlist: false,
  showCommunityHistory: true,
  messagePolicy: 'verified_users',
  bidDisplayPolicy: 'masked_username',
};

export const sensitivePublicFields = new Set([
  'passwordHash',
  'cnic',
  'cnicNumber',
  'passportNumber',
  'drivingLicenseNumber',
  'licenseNumber',
  'fullAddress',
  'bankAccount',
  'bankAccountNumber',
  'easypaisaNumber',
  'jazzcashNumber',
  'paymentProofs',
  'riskScore',
  'adminNotes',
  'documents',
]);

const kycVerifiedStatuses = new Set(['verified', 'approved', 'kyc_verified']);
const kycPendingStatuses = new Set(['pending', 'pending_review', 'submitted', 'needs_manual_review']);
const kycRejectedStatuses = new Set(['rejected', 'needs_resubmission', 'expired']);
const suspendedStatuses = new Set(['suspended', 'blocked', 'banned', 'disabled']);

const roleHas = (user, roles) => Boolean(user?.roles?.some((role) => roles.includes(role)));

export const getPrivacySettings = (store, userId) => {
  const existing = store.userPrivacySettings?.find((item) => String(item.userId) === String(userId));
  return { ...defaultPrivacySettings, ...(existing?.settings || existing || {}) };
};

export const setPrivacySettings = (store, userId, patch = {}) => {
  const allowed = Object.keys(defaultPrivacySettings);
  const sanitized = allowed.reduce((result, key) => {
    if (patch[key] !== undefined) result[key] = patch[key];
    return result;
  }, {});
  let record = store.userPrivacySettings.find((item) => String(item.userId) === String(userId));
  if (!record) {
    record = { id: `privacy-${userId}`, userId, settings: { ...defaultPrivacySettings }, createdAt: new Date().toISOString() };
    store.userPrivacySettings.push(record);
  }
  record.settings = { ...defaultPrivacySettings, ...record.settings, ...sanitized };
  record.updatedAt = new Date().toISOString();
  return record.settings;
};

export const getKycProfile = (store, userId) => store.kycProfiles?.find((profile) => String(profile.userId) === String(userId)) || null;

export const getDealerProfile = (store, userId) => store.dealers?.find((dealer) => String(dealer.userId || dealer.id) === String(userId)) || null;

export const hasVerifiedBankPartner = (store, partnerId) => {
  const partners = store.bankPartners || [];
  if (partnerId) {
    return partners.some((partner) => String(partner.id) === String(partnerId) && partner.status === 'verified');
  }
  return partners.some((partner) => partner.status === 'verified' && partner.publicEnabled);
};

export const getVerificationLevel = (store, user) => {
  if (!user) return 'guest';
  if (suspendedStatuses.has(String(user.status || '').toLowerCase())) return 'suspended';

  const dealer = getDealerProfile(store, user.id);
  if ((dealer?.verified || dealer?.status === 'verified') && roleHas(user, ['dealer'])) return 'dealer_verified';
  if (roleHas(user, ['bank_partner']) && hasVerifiedBankPartner(store)) return 'bank_partner_verified';

  const kyc = getKycProfile(store, user.id);
  const kycStatus = String(kyc?.status || '').toLowerCase();
  if (kycVerifiedStatuses.has(kycStatus)) return 'kyc_verified';
  if (kycRejectedStatuses.has(kycStatus)) return 'kyc_rejected';
  if (kycPendingStatuses.has(kycStatus)) return 'kyc_pending';
  if (user.emailVerified || user.phoneVerified) return 'email_phone_verified';
  return 'registered';
};

const levelRank = {
  guest: 0,
  registered: 1,
  email_phone_verified: 2,
  kyc_pending: 2,
  kyc_rejected: 1,
  kyc_verified: 3,
  dealer_verified: 4,
  bank_partner_verified: 5,
  suspended: -1,
};

export const canPerform = (store, user, action, context = {}) => {
  const level = getVerificationLevel(store, user);
  if (level === 'suspended') return { ok: false, level, reason: 'account_suspended', message: 'This account is suspended for sensitive actions.' };

  const allow = (minimumLevel, extra = true) => {
    const ok = levelRank[level] >= levelRank[minimumLevel] && extra;
    return {
      ok,
      level,
      requiredLevel: minimumLevel,
      reason: ok ? 'allowed' : `requires_${minimumLevel}`,
      message: ok ? 'Allowed.' : `This action requires ${minimumLevel.replaceAll('_', ' ')} verification.`,
    };
  };

  switch (action) {
    case 'wishlist':
    case 'profile.update':
      return allow('registered');
    case 'comment':
    case 'message':
    case 'request_info':
      return allow('email_phone_verified');
    case 'bid':
    case 'listing.create':
    case 'auction.create':
    case 'accessory.sell':
    case 'garage.claim':
    case 'payout.receive':
      return allow('kyc_verified');
    case 'dealer.tools':
      return allow('dealer_verified', roleHas(user, ['dealer', 'admin', 'super_admin']));
    case 'bank_auction.bid':
      return allow('bank_partner_verified', hasVerifiedBankPartner(store, context.bankPartnerId));
    case 'admin':
      return { ok: roleHas(user, ['admin', 'super_admin']), level, reason: roleHas(user, ['admin', 'super_admin']) ? 'allowed' : 'requires_admin', message: 'Admin access required.' };
    default:
      return allow('registered');
  }
};

export const publicProfileFor = (store, user) => {
  if (!user) return null;
  const privacy = getPrivacySettings(store, user.id);
  const safe = Object.entries(user).reduce((result, [key, value]) => {
    if (!sensitivePublicFields.has(key)) result[key] = value;
    return result;
  }, {});

  return {
    id: safe.id,
    displayName: privacy.showDisplayName ? (safe.username || safe.fullName || safe.email || 'Member') : 'Wheels&Deals member',
    fullName: privacy.showFullName ? safe.fullName : undefined,
    avatar: privacy.showProfilePhoto ? safe.avatar || safe.avatarUrl : undefined,
    city: privacy.showCity ? safe.city : undefined,
    phone: privacy.showPhone ? safe.phone : undefined,
    email: privacy.showEmail ? safe.email : undefined,
    roles: safe.roles || ['buyer'],
    verificationLevel: getVerificationLevel(store, user),
    badges: privacy.showBadgesRankings ? safe.badges : undefined,
    joinedAt: safe.createdAt,
  };
};
