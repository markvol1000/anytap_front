/**
 * Admin data access — single import for all admin pages.
 * Components must import from here only.
 *
 * Swap: set VITE_API_MODE=http in .env.local
 * HTTP paths: ./api/adminApiService.js (ALB OpenAPI + E2E dashboard)
 *
 * Demo preview (/demo/state/admin-*) always uses mock data — no Admin API login required.
 */

import { isHttpApi } from '../../lib/api/config.js';
import { hasDemoAdminAccess } from '../../lib/demo-session.js';
import * as mock from './mock/adminMockService.js';
import * as api from './api/adminApiService.js';

function adminImpl() {
  if (!isHttpApi) return mock;
  return api;
}

function bind(name) {
  return (...args) => adminImpl()[name](...args);
}

export const resetAdminStore = bind('resetAdminStore');
export const getCurrentAdmin = bind('getCurrentAdmin');
export const getDashboardKpis = bind('getDashboardKpis');
export const getPendingTasks = bind('getPendingTasks');
export const getSystemSummary = bind('getSystemSummary');
export const getDashboardData = bind('getDashboardData');
export const getRecentMembers = bind('getRecentMembers');
export const getRecentTransactions = bind('getRecentTransactions');
export const getRecentAdminActions = bind('getRecentAdminActions');
export const getMembers = bind('getMembers');
export const getMemberById = bind('getMemberById');
export const updateMember = bind('updateMember');
export const suspendMember = bind('suspendMember');
export const activateMember = bind('activateMember');
export const deleteMember = bind('deleteMember');
export const saveMemberMemo = bind('saveMemberMemo');
export const getKycApplications = bind('getKycApplications');
export const getKycById = bind('getKycById');
export const approveKyc = bind('approveKyc');
export const rejectKyc = bind('rejectKyc');
export const getCardApplications = bind('getCardApplications');
export const getCardById = bind('getCardById');
export const getMemberCardCount = bind('getMemberCardCount');
export const approveCard = bind('approveCard');
export const rejectCard = bind('rejectCard');
export const issueCard = bind('issueCard');
export const activateCard = bind('activateCard');
export const freezeCard = bind('freezeCard');
export const terminateCard = bind('terminateCard');
export const getCardTransactions = bind('getCardTransactions');
export const getWallets = bind('getWallets');
export const getWalletById = bind('getWalletById');
export const lockWallet = bind('lockWallet');
export const unlockWallet = bind('unlockWallet');
export const getTransactions = bind('getTransactions');
export const exportTransactionsCsv = bind('exportTransactionsCsv');
export const getReferrals = bind('getReferrals');
export const getReferralById = bind('getReferralById');
export const adjustReferralReward = bind('adjustReferralReward');
export const getWithdrawals = bind('getWithdrawals');
export const getWithdrawalById = bind('getWithdrawalById');
export const approveWithdrawal = bind('approveWithdrawal');
export const rejectWithdrawal = bind('rejectWithdrawal');
export const getNotifications = bind('getNotifications');
export const getContentItems = bind('getContentItems');
export const getSettings = bind('getSettings');
export const updateSettings = bind('updateSettings');
export const deleteSettingKey = bind('deleteSettingKey');
export const getEmailLogs = bind('getEmailLogs');
export const getEventLogs = bind('getEventLogs');
export const retryCregisWallet = bind('retryCregisWallet');
export const unfreezeCard = bind('unfreezeCard');
export const shipCard = bind('shipCard');
export const triggerFeePayout = bind('triggerFeePayout');
export const getAdminLogs = bind('getAdminLogs');
export const getCregisDepositList = bind('getCregisDepositList');

export { MAX_CARDS_PER_MEMBER } from './mock/adminMockData.js';
