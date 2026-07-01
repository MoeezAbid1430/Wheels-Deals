import { platformApi } from '../api';

export const authRoles = {
  buyer: 'buyer',
  seller: 'seller',
  dealer: 'dealer',
  admin: 'admin',
  moderator: 'moderator',
};

export const accountStatuses = {
  active: 'active',
  pendingVerification: 'pending_verification',
  suspended: 'suspended',
  banned: 'banned',
};

export const authService = {
  register: (payload) => platformApi.auth.register(payload),
  login: (payload) => platformApi.auth.login(payload),
  logout: () => platformApi.auth.logout(),
  refresh: () => platformApi.auth.refresh(),
  getCurrentUser: () => platformApi.auth.getMe(),
  updateProfile: (payload) => platformApi.auth.updateMe(payload),
  verifyPhone: (payload) => platformApi.auth.verifyPhone(payload),
  verifyEmail: (payload) => platformApi.auth.verifyEmail(payload),
  forgotPassword: (payload) => platformApi.auth.forgotPassword(payload),
  resetPassword: (payload) => platformApi.auth.resetPassword(payload),
};
