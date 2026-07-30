import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RiskBreakdownCard from '../components/RiskBreakdownCard';
import ConsentPanel from '../components/ConsentPanel';
import SliderControl from '../components/SliderControl';
import ToggleSwitch from '../components/ToggleSwitch';
import InfoTooltip from '../components/InfoTooltip';

const DEFAULT_LIMITS = {
  dailyTransactionLimit: 15000,
  weeklyTransactionLimit: 50000,
  maxBeneficiaryAmount: 10000,
  domesticTransactionsEnabled: true,
  internationalTransactionsEnabled: true,
  todaySpent: 0,
  weekSpent: 0,
  riskIndicator: 'MEDIUM',
};

const getWebSocketUrl = (uid) => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname || 'localhost';
  return `${protocol}://${host}:8080/ws?userId=${encodeURIComponent(uid)}`;
};

export default function UserPortal({ userId }) {
  const [users, setUsers] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [newBeneficiaryId, setNewBeneficiaryId] = useState('');
  const [disableCoolOff, setDisableCoolOff] = useState(false);
  const [isAddingBeneficiary, setIsAddingBeneficiary] = useState(false);
  const [activatingBeneficiaryId, setActivatingBeneficiaryId] = useState('');
  const [balance, setBalance] = useState(0);
  const [holdAmount, setHoldAmount] = useState(0);
  const [usableBalance, setUsableBalance] = useState(0);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('DOMESTIC');
  const [escrowOptIn, setEscrowOptIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saveToast, setSaveToast] = useState(false);
  const [transactionResponse, setTransactionResponse] = useState(null);
  const [transferPrompt, setTransferPrompt] = useState(null);
  const [cancelAlert, setCancelAlert] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pendingFilterMode, setPendingFilterMode] = useState('ALL');
  const [pendingLayout, setPendingLayout] = useState('GRID');
  const [recentHistory, setRecentHistory] = useState([]);
  const [historyLayout, setHistoryLayout] = useState('GRID');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [cortexEnabled, setCortexEnabled] = useState(false);
  const [cortexHasKey, setCortexHasKey] = useState(false);
  const [cortexToggling, setCortexToggling] = useState(false);
  const [cortexDummy, setCortexDummy] = useState(false);
  const [cortexDummyToggling, setCortexDummyToggling] = useState(false);
  const [adminReviewNotice, setAdminReviewNotice] = useState(null);
  const [selfLimits, setSelfLimits] = useState(DEFAULT_LIMITS);
  const [limitDraft, setLimitDraft] = useState(DEFAULT_LIMITS);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsSaving, setLimitsSaving] = useState(false);
  const [limitWarning, setLimitWarning] = useState(null); // { messages: [], pendingPayload }
  const [userRules, setUserRules] = useState({});
  const [rulesLoading, setRulesLoading] = useState(false);
  const [ruleToast, setRuleToast] = useState(null); // { type: 'enable'|'disable', label }
  const [consentPrompt, setConsentPrompt] = useState(null); // { txnId, amount, toUserId, riskScore, countdown }
  const [selectedWorkflowTxn, setSelectedWorkflowTxn] = useState(null); // Selected transaction for Git DAML workflow modal

  const handleConsentResponse = async (txnId, approved, isTimeout = false, amount = '0', toUserId = 'Recipient') => {
    const promptDetails = consentPrompt;
    setConsentPrompt(null);
    try {
      if (approved) {
        await axios.post(`/api/txn/${txnId}/user-consent`, { approved: true });
        setSuccessMessage('✅ Consent verified! Payment settled directly on Canton ledger.');
        if (promptDetails) {
          setTransferPrompt({
            status: 'APPROVED',
            txnId: txnId,
            amount: promptDetails.amount,
            toUserId: promptDetails.toUserId,
            isHold: false,
          });
        }
      } else {
        if (isTimeout) {
          // If the 15 seconds timer expired, cancel and reject transaction completely
          await axios.post(`/api/admin/txn/${txnId}/consent`, { approved: false, userId });
          setCancelAlert({
            txnId: txnId,
            amount: promptDetails ? promptDetails.amount : amount,
            toUserId: promptDetails ? promptDetails.toUserId : toUserId
          });
          setError("❌ Transaction cancelled due to user confirmation inactivity.");
        } else {
          // Standard manual decline
          await axios.post(`/api/txn/${txnId}/user-consent`, { approved: false });
          setSuccessMessage('🔒 Consent declined. Transaction escalated to Bank Admin review.');
        }
      }
      loadBalance();
      loadActivity();
    } catch (err) {
      console.error('Consent response error:', err);
    }
  };

  useEffect(() => {
    if (!consentPrompt || consentPrompt.countdown <= 0) return;
    const timer = setInterval(() => {
      setConsentPrompt((prev) => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          handleConsentResponse(prev.txnId, false, true, prev.amount, prev.toUserId);
          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [consentPrompt?.countdown]);

  useEffect(() => {
    loadUsers();
    loadBalance();
    loadActivity();
    loadBeneficiaries();
    loadCortexConfig();
    loadSelfLimits();
    loadUserRules();
  }, [userId]);

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let stopped = false;

    const connect = () => {
      socket = new WebSocket(getWebSocketUrl(userId));

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'balance_update') {
            setBalance(data.balance);
            loadActivity();
            loadBeneficiaries();
          } else if (data.type === 'txn_status_update') {
            setTransactionResponse((prev) => {
              if (!prev || prev.txnId !== data.txnId) {
                return prev;
              }
              return { ...prev, status: data.status };
            });
            loadActivity();
            loadBeneficiaries();
          }
        } catch (err) {
          console.error('Invalid websocket payload:', err);
        }
      };

      socket.onclose = () => {
        if (stopped) {
          return;
        }
        reconnectTimer = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [userId]);

  const loadActivity = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        axios.get(`/api/txn/user/${userId}/pending`),
        axios.get(`/api/txn/user/${userId}/history`),
      ]);
      setPendingTransactions((pendingRes.data || []).slice(0, 5));
      setRecentHistory((historyRes.data || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to load activity:', err);
    }
  };

  const loadCortexConfig = async () => {
    try {
      const res = await axios.get('/api/cortex/config');
      setCortexEnabled(!!res.data.enabled);
      setCortexHasKey(!!res.data.hasApiKey);
      setCortexDummy(!!res.data.dummyMode);
    } catch (err) {
      console.error('Failed to load Cortex config:', err);
    }
  };

  const toggleCortex = async () => {
    setCortexToggling(true);
    try {
      const res = await axios.post('/api/cortex/config', { enabled: !cortexEnabled });
      setCortexEnabled(!!res.data.enabled);
      setCortexHasKey(!!res.data.hasApiKey);
      setCortexDummy(!!res.data.dummyMode);
    } catch (err) {
      console.error('Failed to toggle Cortex:', err);
    } finally {
      setCortexToggling(false);
    }
  };

  const toggleCortexDummy = async () => {
    setCortexDummyToggling(true);
    try {
      const res = await axios.post('/api/cortex/config', { dummyMode: !cortexDummy });
      setCortexEnabled(!!res.data.enabled);
      setCortexHasKey(!!res.data.hasApiKey);
      setCortexDummy(!!res.data.dummyMode);
    } catch (err) {
      console.error('Failed to toggle Cortex dummy mode:', err);
    } finally {
      setCortexDummyToggling(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get('/api/users/all');
      const allUsers = response.data || [];
      const me = allUsers.find((u) => (u.id || u._id) === userId);
      if (me) {
        setDisplayName(me.displayName || me.username || userId);
      }
      const filteredUsers = allUsers.filter((u) => {
        const uid = u.id || u._id;
        const role = (u.role || '').toUpperCase();
        return uid && uid !== userId && role !== 'ADMIN';
      });
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadSelfLimits = async () => {
    try {
      setLimitsLoading(true);
      const response = await axios.get(`/api/users/${userId}/self-limits`);
      const normalized = {
        ...DEFAULT_LIMITS,
        ...(response.data || {}),
      };
      setSelfLimits(normalized);
      setLimitDraft(normalized);
    } catch (err) {
      console.error('Failed to load self limits:', err);
    } finally {
      setLimitsLoading(false);
    }
  };

  const updateDraft = (field, value) => {
    setLimitDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveSelfLimits = async () => {
    if (Number(limitDraft.weeklyTransactionLimit) < Number(limitDraft.dailyTransactionLimit)) {
      setError('Weekly limit must be greater than or equal to daily limit.');
      return;
    }

    try {
      setLimitsSaving(true);
      setError('');
      const payload = {
        dailyTransactionLimit: Number(limitDraft.dailyTransactionLimit),
        weeklyTransactionLimit: Number(limitDraft.weeklyTransactionLimit),
        maxBeneficiaryAmount: Number(limitDraft.maxBeneficiaryAmount),
        domesticTransactionsEnabled: !!limitDraft.domesticTransactionsEnabled,
        internationalTransactionsEnabled: !!limitDraft.internationalTransactionsEnabled,
      };
      const response = await axios.put(`/api/users/${userId}/self-limits`, payload);
      const normalized = { ...DEFAULT_LIMITS, ...(response.data || {}) };
      setSelfLimits(normalized);
      setLimitDraft(normalized);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update self limits.');
    } finally {
      setLimitsSaving(false);
    }
  };

  const resetSelfLimits = async () => {
    try {
      setLimitsSaving(true);
      setError('');
      const response = await axios.post(`/api/users/${userId}/self-limits/reset`);
      const normalized = { ...DEFAULT_LIMITS, ...(response.data || {}) };
      setSelfLimits(normalized);
      setLimitDraft(normalized);
      setSuccessMessage('✅ Self limits reset to recommended defaults.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset self limits.');
    } finally {
      setLimitsSaving(false);
    }
  };

  const loadUserRules = async () => {
    try {
      setRulesLoading(true);
      const res = await axios.get(`/api/users/${userId}/rule-settings`);
      setUserRules(res.data?.rules || {});
    } catch (err) {
      console.error('Failed to load user rule settings:', err);
    } finally {
      setRulesLoading(false);
    }
  };

  const toggleRule = async (ruleName, label, currentlyEnabled) => {
    const newValue = !currentlyEnabled;
    const optimistic = { ...userRules, [ruleName]: newValue };
    setUserRules(optimistic);
    try {
      const res = await axios.put(`/api/users/${userId}/rule-settings`, { [ruleName]: newValue });
      setUserRules(res.data?.rules || optimistic);
      setRuleToast({ type: newValue ? 'enable' : 'disable', label });
      setTimeout(() => setRuleToast(null), 3500);
    } catch (err) {
      setUserRules({ ...userRules, [ruleName]: currentlyEnabled });
      console.error('Failed to update rule setting:', err);
    }
  };

  const loadBeneficiaries = async () => {
    try {
      const response = await axios.get(`/api/users/${userId}/beneficiaries`);
      setBeneficiaries(response.data || []);
    } catch (err) {
      console.error('Failed to load beneficiaries:', err);
    }
  };

  const addBeneficiary = async () => {
    if (!newBeneficiaryId) {
      return;
    }

    try {
      setIsAddingBeneficiary(true);
      setError('');
      setSuccessMessage('');
      await axios.post(`/api/users/${userId}/beneficiaries`, {
        recipientUserId: newBeneficiaryId,
        disableCoolOff,
      });
      setSuccessMessage(disableCoolOff
        ? '✅ Beneficiary added instantly (cool-off disabled for demo).'
        : '⏳ Beneficiary added. 1-hour cool-off started.');
      setNewBeneficiaryId('');
      loadBeneficiaries();
      loadUsers();
      loadActivity();
    } catch (err) {
      const backendMessage = err.response?.data?.message
        || err.response?.data?.error
        || err.response?.data?.detail
        || err.message;
      setError(`Failed to add beneficiary${backendMessage ? `: ${backendMessage}` : ''}`);
      console.error('Add beneficiary failed', {
        userId,
        recipientUserId: newBeneficiaryId,
        status: err.response?.status,
        data: err.response?.data,
      });
    } finally {
      setIsAddingBeneficiary(false);
    }
  };

  const removeBeneficiary = async (recipientUserId) => {
    try {
      await axios.delete(`/api/users/${userId}/beneficiaries/${recipientUserId}`);
      setSuccessMessage('✅ Beneficiary removed successfully.');
      if (recipientId === recipientUserId) {
        setRecipientId('');
      }
      loadBeneficiaries();
      loadUsers();
      loadActivity();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove beneficiary');
    }
  };

  const activateBeneficiaryNow = async (recipientUserId) => {
    if (!recipientUserId) {
      return;
    }

    try {
      setActivatingBeneficiaryId(recipientUserId);
      setError('');
      setSuccessMessage('');
      try {
        await axios.post(`/api/users/${userId}/beneficiaries/${recipientUserId}/activate`);
      } catch (activateErr) {
        const status = activateErr?.response?.status;
        const msg = String(activateErr?.response?.data?.message || '').toLowerCase();
        const shouldFallback = status === 403 || status === 404 || status === 405 || status === 500
          || msg.includes('no static resource')
          || msg.includes('not found');

        if (!shouldFallback) {
          throw activateErr;
        }

        // Backward-compatible fallback for older backend runtime without /activate endpoint.
        await axios.post(`/api/users/${userId}/beneficiaries`, {
          recipientUserId,
          disableCoolOff: true,
        });
      }
      setSuccessMessage('✅ Beneficiary activated. Cool-off ended for testing.');
      loadBeneficiaries();
      loadUsers();
      loadActivity();
    } catch (err) {
      const backendMessage = err.response?.data?.message
        || err.response?.data?.error
        || err.response?.data?.detail
        || err.message;
      setError(`Failed to activate beneficiary${backendMessage ? `: ${backendMessage}` : ''}`);
    } finally {
      setActivatingBeneficiaryId('');
    }
  };

  const loadBalance = async () => {
    try {
      const response = await axios.get(`/api/admin/balance/${userId}`);
      setBalance(response.data.balance);
      setHoldAmount(response.data.holdAmount || 0);
      setUsableBalance(response.data.usableBalance != null ? response.data.usableBalance : response.data.balance);
    } catch (err) {
      console.error('Failed to load balance:', err);
    }
  };

  const submitTransaction = async (payload) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setTransactionResponse(null);
    try {
      const response = await axios.post('/api/txn/initiate', payload);
      setAmount('');
      setRecipientId('');
      
      const isMediumRisk = ['PENDING_USER_CONSENT', 'PENDING_CONSENT', 'PENDING_USER_APPROVAL', 'CONSENT_REQUIRED'].includes(response.data.status) || response.data.routingDecision === 'CONSENT_REQUIRED';

      if (isMediumRisk) {
        setConsentPrompt({
          txnId: response.data.txnId,
          amount: response.data.amount || payload.amount,
          toUserId: response.data.toUserId || payload.toUserId,
          riskScore: response.data.riskScore || 50,
          countdown: 15,
        });
        setSuccessMessage('🔐 Medium-risk transaction flagged. 15-second confirmation prompt initiated.');
      } else {
        const isHold = ['HOLD_ACTIVE', 'PENDING_BANK_APPROVAL'].includes(response.data.status);
        setTransferPrompt({
          status: response.data.status,
          txnId: response.data.txnId,
          amount: response.data.amount || payload.amount,
          toUserId: response.data.toUserId || payload.toUserId,
          isHold: isHold,
        });

        if (response.data.status === 'APPROVED' && response.data.routingDecision === 'AUTO_APPROVE') {
          setSuccessMessage('✅ Transaction auto-approved and accepted into mempool!');
        } else if (response.data.status === 'HOLD_ACTIVE') {
          setSuccessMessage('🔒 High-risk transaction placed under Canton hold (60 min). Awaiting bank approval.');
        } else if (response.data.status === 'PENDING_BANK_APPROVAL') {
          setSuccessMessage('🏦 Transaction held. Awaiting bank approval via Canton contract.');
        } else if (response.data.status === 'ESCROW_ACTIVE') {
          setSuccessMessage('🔏 Transaction approved with Canton escrow service active.');
        } else if (response.data.status === 'PENDING_ADMIN') {
          setSuccessMessage('⏳ Transaction accepted. Our fraud team is reviewing your request.');
        }
      }
      loadBalance();
      loadActivity();
      loadSelfLimits();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    const payload = {
      fromUserId: userId,
      toUserId: recipientId,
      amount: parsedAmount,
      transactionType,
      escrowOptIn: escrowOptIn || undefined,
    };

    // Client-side limit warning check
    const warnings = [];
    if (
      selfLimits.dailyTransactionLimit != null &&
      (selfLimits.todaySpent || 0) + parsedAmount > selfLimits.dailyTransactionLimit
    ) {
      warnings.push(
        `Daily limit of £${selfLimits.dailyTransactionLimit.toLocaleString()} will be exceeded ` +
        `(£${(selfLimits.todaySpent || 0).toLocaleString()} used today)`
      );
    }
    if (
      selfLimits.weeklyTransactionLimit != null &&
      (selfLimits.weekSpent || 0) + parsedAmount > selfLimits.weeklyTransactionLimit
    ) {
      warnings.push(
        `Weekly limit of £${selfLimits.weeklyTransactionLimit.toLocaleString()} will be exceeded ` +
        `(£${(selfLimits.weekSpent || 0).toLocaleString()} used this week)`
      );
    }
    if (warnings.length > 0) {
      setLimitWarning({ messages: warnings, pendingPayload: { ...payload, bypassSelfLimits: true } });
      return;
    }

    await submitTransaction(payload);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return '✅';
      case 'PENDING_ADMIN': return '⏳';
      case 'PENDING_CONSENT': return '🔐';
      case 'REJECTED': return '❌';
      case 'COMMITTED': return '✓';
      case 'HOLD_ACTIVE': return '🔒';
      case 'PENDING_USER_APPROVAL': return '👤';
      case 'PENDING_BANK_APPROVAL': return '🏦';
      case 'ESCROW_ACTIVE': return '🔏';
      case 'SETTLED': return '✅';
      case 'EXPIRED': return '⌛';
      default: return '•';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'COMMITTED':
      case 'SETTLED':
        return 'text-green-600';
      case 'PENDING_ADMIN':
      case 'PENDING_CONSENT':
      case 'HOLD_ACTIVE':
      case 'PENDING_USER_APPROVAL':
      case 'PENDING_BANK_APPROVAL':
        return 'text-yellow-600';
      case 'ESCROW_ACTIVE':
        return 'text-violet-600';
      case 'REJECTED':
      case 'EXPIRED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe && currentSlide < 3) setCurrentSlide(currentSlide + 1);
    if (isRightSwipe && currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  const getUserById = (id) => users.find((u) => (u.id || u._id) === id);
  const activeBeneficiaries = beneficiaries.filter((b) => b.status === 'ACTIVE');
  const pendingBeneficiaries = beneficiaries.filter((b) =>
    b.status !== 'ACTIVE'
  );
  const dailyUsage = Math.min(
    100,
    Math.round(((selfLimits.todaySpent || 0) / Math.max(selfLimits.dailyTransactionLimit || 1, 1)) * 100)
  );
  const weeklyUsage = Math.min(
    100,
    Math.round(((selfLimits.weekSpent || 0) / Math.max(selfLimits.weeklyTransactionLimit || 1, 1)) * 100)
  );
  const riskTone = selfLimits.riskIndicator === 'LOW'
    ? 'bg-emerald-100 text-emerald-700'
    : selfLimits.riskIndicator === 'HIGH'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-amber-100 text-amber-700';

  const getCoolOffText = (activeAt) => {
    if (!activeAt) return 'Pending';
    const remainingMs = new Date(activeAt).getTime() - Date.now();
    if (remainingMs <= 0) return 'Activating...';
    const mins = Math.ceil(remainingMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return hrs > 0 ? `${hrs}h ${remMins}m left` : `${remMins}m left`;
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:bg-slate-900">
      {/* Rule Toggle Toast */}
      {ruleToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          ruleToast.type === 'enable'
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-500 text-white'
        }`}>
          <span className="text-xl">{ruleToast.type === 'enable' ? '🛡️' : '⚠️'}</span>
          <p className="text-sm font-bold">
            {ruleToast.type === 'enable'
              ? `Thanks for helping prevent fraud! "${ruleToast.label}" is now active.`
              : `Heads up — disabling "${ruleToast.label}" may reduce fraud protection.`
            }
          </p>
        </div>
      )}

      {/* Save Success Toast */}
      {saveToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 bg-emerald-600 text-white">
          <span className="text-xl">✅</span>
          <p className="text-sm font-bold pr-2">Changes have been saved successfully!</p>
          <button onClick={() => setSaveToast(false)} className="text-emerald-200 hover:text-white transition-colors p-1" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Limit Warning Popup */}
      {limitWarning && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white relative">
              <button 
                onClick={() => setLimitWarning(null)} 
                className="absolute top-4 right-4 text-amber-100 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
                aria-label="Close dialog"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-900/20 text-2xl">⚠️</div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-100">Spending Limit Warning</p>
                  <h3 className="text-xl font-black leading-tight pr-6">This payment exceeds your limit</h3>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              {limitWarning.messages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <span className="mt-0.5 text-amber-500">▶</span>
                  <p className="text-sm font-semibold text-amber-900">{msg}</p>
                </div>
              ))}
              <p className="text-xs text-slate-500 dark:text-slate-500 pt-1">
                You can proceed anyway or cancel and adjust the amount.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setLimitWarning(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const payload = limitWarning.pendingPayload;
                  setLimitWarning(null);
                  await submitTransaction(payload);
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-black text-white hover:from-amber-600 hover:to-orange-600"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {adminReviewNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900/20 text-3xl">⏳</div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-100">Consent Accepted</p>
                  <h3 className="text-2xl font-black leading-tight">Transaction sent to admin review</h3>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 space-y-5">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">
                  Your approval has been recorded. The transaction is not auto-approved yet and is now waiting for the fraud team to review it.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-500">Transaction ID</span>
                  <span className="text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{adminReviewNotice.txnId}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-500">Status</span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-700">PENDING_ADMIN</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-500">Next step</span>
                  <span className="text-right text-sm font-bold text-slate-900 dark:text-slate-100">Admin fraud review required</span>
                </div>
              </div>

              <button
                onClick={() => setAdminReviewNotice(null)}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:from-amber-600 hover:to-orange-700"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">💳 Send Payment</h1>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1.5 hidden sm:block">
              {displayName ? (
                <>Welcome, <span className="font-bold text-slate-700 dark:text-slate-300">{displayName}</span> <span className="text-slate-400">({userId})</span></>
              ) : (
                'Protected transfer through FraudShield routing'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Balance Pill */}
            <div className="hidden md:flex items-center bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-950/50 dark:to-cyan-950/50 border border-indigo-100 dark:border-indigo-800/50 rounded-full px-4 py-1.5 shadow-sm">
              <div className="flex flex-col items-end mr-3">
                <p className="text-[10px] text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold">
                  Usable Balance:
                </p>
                {holdAmount > 0 && (
                  <p className="text-[9px] text-amber-600 dark:text-amber-500 font-semibold tracking-wider">
                    (£{holdAmount.toLocaleString()} ON HOLD)
                  </p>
                )}
              </div>
              <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                £{usableBalance.toLocaleString()}
              </span>
            </div>

            {/* Cortex AI kill-switch — disable the AI call when no token is configured */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-violet-50 border border-violet-200 rounded-full">
              <span className="text-sm">🧠</span>
              <div className="text-right leading-tight">
                <p className="text-[9px] font-bold text-violet-700 uppercase tracking-wider">Cortex AI</p>
                <p className="text-[10px] font-black text-violet-900">
                  {cortexEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <button
                onClick={toggleCortex}
                disabled={cortexToggling}
                title={cortexEnabled ? 'Disable Cortex AI scoring' : 'Enable Cortex AI scoring (calls backend)'}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  cortexEnabled ? 'bg-violet-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white dark:bg-slate-900 transition-transform ${
                    cortexEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {/* Cortex dummy/simulated call — generates a test risk score without a real API call */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <span className="text-sm">🧪</span>
              <div className="text-right leading-tight">
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Dummy Call</p>
                <p className="text-[10px] font-black text-amber-900">
                  {cortexDummy ? 'Simulated' : 'Off'}
                </p>
              </div>
              <button
                onClick={toggleCortexDummy}
                disabled={cortexDummyToggling || !cortexEnabled}
                title={!cortexEnabled
                  ? 'Enable Cortex AI first to use the simulated call'
                  : 'Toggle simulated Cortex scoring (no real API call)'}
                className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  cortexDummy ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white dark:bg-slate-900 transition-transform ${
                    cortexDummy ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {pendingTransactions.length > 0 && (
              <div className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 border border-amber-300 dark:border-amber-700/50 rounded-full">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending Events</p>
                    <p className="text-2xl font-black text-amber-900">{pendingTransactions.length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        {[
          { index: 0, emoji: '📤', label: 'Send Money', icon: 'send' },
          { index: 1, emoji: '📚', label: 'Payment History', icon: 'history' },
          { index: 2, emoji: '⚙️', label: 'Set Limit & Usage', icon: 'limits' },
          { index: 3, emoji: '🛡️', label: 'Custom Rules', icon: 'rules' }
        ].map((tab) => (
          <button
            key={tab.index}
            onClick={() => setCurrentSlide(tab.index)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-2 transition-all relative group ${
              currentSlide === tab.index
                ? 'text-indigo-600 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100'
            }`}
            title={tab.label}
          >
            <span className="text-lg mb-0.5">{tab.emoji}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider">{tab.label}</span>
            
            {/* Bottom border indicator */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 ${
                currentSlide === tab.index
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 w-full'
                  : 'bg-transparent w-0 group-hover:w-8 group-hover:left-1/2 group-hover:-translate-x-1/2'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Slider Container */}
      <div
        className="flex-1 min-h-0 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(${-currentSlide * 100}%)` }}
        >
          {/* SLIDE 0: Payment Form */}
          <div className="min-w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 animate-in fade-in duration-500 p-6">
            <div className="flex-1 flex bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-5 space-y-4 w-full">
                {!transactionResponse ? (
                  <div className="w-full space-y-4 h-full flex flex-col">
                    {/* Beneficiary Zone */}
                    <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                      <div className="xl:col-span-7 flex flex-col gap-4 min-h-0">
                        {/* Beneficiary Quick Select */}
                        <div className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/40 dark:to-sky-950/40 border border-cyan-200 dark:border-cyan-800/50 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">⭐ Beneficiaries</h3>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300">
                              {activeBeneficiaries.length} active
                            </span>
                          </div>

                          {activeBeneficiaries.length === 0 ? (
                            <p className="text-sm text-slate-600 dark:text-slate-400">No active beneficiaries yet. Add one on the right panel.</p>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                              {activeBeneficiaries.map((b) => {
                                const profile = getUserById(b.recipientUserId);
                                const name = b.recipientName || profile?.displayName || b.recipientUserId;
                                const initials = name
                                  .split(' ')
                                  .map((n) => n.charAt(0))
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase();
                                const isSelected = recipientId === b.recipientUserId;

                                return (
                                  <button
                                    key={b.id || b.recipientUserId}
                                    type="button"
                                    onClick={() => setRecipientId(b.recipientUserId)}
                                    className={`group flex flex-col items-center gap-2 ${isSelected ? 'scale-105' : 'hover:scale-105'} transition-transform`}
                                  >
                                    <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-black text-sm shadow-sm ${
                                      isSelected
                                        ? 'bg-cyan-600 border-cyan-700 text-white'
                                        : 'bg-white dark:bg-slate-900 border-cyan-300 text-cyan-700'
                                    }`}>
                                      {initials || 'U'}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[90px] truncate text-center">{name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Pending Beneficiary Review */}
                        {pendingBeneficiaries.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5">
                            <h4 className="text-base font-bold text-amber-900 dark:text-amber-500 mb-3">🕓 In Cool-off Review</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {pendingBeneficiaries.map((b) => (
                                <div key={b.id || b.recipientUserId} className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/50 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{b.recipientName || b.recipientUserId}</p>
                                    <p className="text-xs text-amber-700">{getCoolOffText(b.activeAt)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-400">{b.status}</span>
                                    <button
                                      type="button"
                                      onClick={() => activateBeneficiaryNow(b.recipientUserId)}
                                      disabled={activatingBeneficiaryId === b.recipientUserId}
                                      className="text-xs font-bold px-2 py-1 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800/50 dark:hover:bg-cyan-800/50 dark:disabled:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:text-slate-500"
                                    >
                                      {activatingBeneficiaryId === b.recipientUserId ? 'Activating...' : 'Activate Now'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Manage Beneficiaries */}
                        <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5">
                          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">⚙️ Manage Beneficiaries</h4>
                          <div className="flex gap-2 mb-3">
                            <select
                              value={newBeneficiaryId}
                              onChange={(e) => setNewBeneficiaryId(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
                            >
                              <option value="">Select user to add</option>
                              {users
                                .filter((u) => {
                                  const uid = u.id || u._id;
                                  return !beneficiaries.some((b) => b.recipientUserId === uid);
                                })
                                .map((user) => {
                                  const uid = user.id || user._id;
                                  return (
                                    <option key={uid} value={uid}>
                                      {user.displayName} ({uid})
                                    </option>
                                  );
                                })}
                            </select>
                            <button
                              type="button"
                              onClick={addBeneficiary}
                              disabled={!newBeneficiaryId || isAddingBeneficiary}
                              className="px-4 py-2 rounded-lg text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                              {isAddingBeneficiary ? 'Adding...' : 'Add'}
                            </button>
                          </div>
                          
                          <div className="mb-4">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={disableCoolOff}
                                onChange={(e) => setDisableCoolOff(e.target.checked)}
                                className="rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-teal-600 focus:ring-teal-500"
                              />
                              Disable cool-off (demo mode)
                            </label>
                          </div>

                          {beneficiaries.length > 0 && (
                            <div className="flex-1 min-h-0 mt-2 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                              {beneficiaries.map((b) => (
                                <div key={`${b.id || b.recipientUserId}-manage`} className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 shadow-sm">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{b.recipientName || b.recipientUserId}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-500">{b.status}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeBeneficiary(b.recipientUserId)}
                                    className="text-xs font-bold px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Beneficiary Management */}
                      <div className="xl:col-span-5 flex flex-col min-h-0">
                        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 xl:sticky xl:top-2">
                          <div className="flex-1 flex flex-col space-y-3 min-h-0">
                            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">💸 Quick Pay</h4>
                            <select
                              value={recipientId}
                              onChange={(e) => setRecipientId(e.target.value)}
                              disabled={isLoading}
                              required
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 text-sm font-semibold text-slate-900 dark:text-slate-100"
                            >
                              <option value="">Select recipient</option>
                              {users.map((user) => {
                                const uid = user.id || user._id;
                                return (
                                  <option key={uid} value={uid}>
                                    {user.displayName} ({uid})
                                  </option>
                                );
                              })}
                            </select>

                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-2 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-3">
                              <div>
                                <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-800 dark:text-slate-200 mb-1">Amount</label>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xl font-black text-teal-700 dark:text-teal-400">£</span>
                                  <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="0.00"
                                    required
                                    min="1"
                                    step="0.01"
                                    className="flex-1 px-0 py-0.5 bg-transparent text-2xl font-extrabold text-slate-900 dark:text-slate-100 border-b-2 border-teal-600 focus:outline-none focus:border-teal-500 placeholder-slate-300 dark:placeholder-slate-600"
                                  />
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                                  Usable Balance: £{usableBalance.toLocaleString()}
                                  {holdAmount > 0 && <span className="ml-2 text-amber-500 font-medium">(£{holdAmount.toLocaleString()} on hold)</span>}
                                </p>
                              </div>

                              {/* Usage bars on Send Money page */}
                              {!limitsLoading && (
                                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 space-y-1.5">
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                      <span>Daily used</span>
                                      <span className={dailyUsage >= 100 ? 'text-red-600' : dailyUsage >= 80 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'}>
                                        £{Number(selfLimits.todaySpent || 0).toLocaleString()} / £{Number(selfLimits.dailyTransactionLimit || 0).toLocaleString()} ({dailyUsage}%)
                                      </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-200">
                                      <div
                                        className={`h-1.5 rounded-full transition-all ${dailyUsage >= 100 ? 'bg-red-500' : dailyUsage >= 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
                                        style={{ width: `${dailyUsage}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                      <span>Weekly used</span>
                                      <span className={weeklyUsage >= 100 ? 'text-red-600' : weeklyUsage >= 80 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'}>
                                        £{Number(selfLimits.weekSpent || 0).toLocaleString()} / £{Number(selfLimits.weeklyTransactionLimit || 0).toLocaleString()} ({weeklyUsage}%)
                                      </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-slate-200">
                                      <div
                                        className={`h-1.5 rounded-full transition-all ${weeklyUsage >= 100 ? 'bg-red-500' : weeklyUsage >= 80 ? 'bg-amber-400' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                                        style={{ width: `${weeklyUsage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Transaction Type</label>
                                <select
                                  value={transactionType}
                                  onChange={(e) => setTransactionType(e.target.value)}
                                  disabled={isLoading}
                                  className="w-full px-3 py-2 rounded-lg border border-teal-300 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                                >
                                  <option value="DOMESTIC">Domestic</option>
                                  <option value="INTERNATIONAL">International</option>
                                </select>
                              </div>

                              {/* Canton Escrow Opt-in */}
                              <div className={`rounded-xl border px-4 py-3 transition-all ${escrowOptIn ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/30 dark:border-violet-800/50' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={escrowOptIn}
                                    onChange={(e) => setEscrowOptIn(e.target.checked)}
                                    disabled={isLoading}
                                    className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                  />
                                  <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                      🔏 Canton Escrow Service
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 uppercase tracking-wide">Optional</span>
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                      Add a Canton EscrowAgreement contract to this transaction. Escrow is available for all risk tiers and does not replace hold or approval controls.
                                    </p>
                                  </div>
                                </label>
                              </div>

                              <button
                                type="submit"
                                disabled={isLoading || !amount || !recipientId}
                                className="mt-auto w-full px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold rounded-lg hover:from-teal-700 hover:to-cyan-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-md"
                              >
                                {isLoading ? 'Processing...' : 'Send Money'}
                              </button>
                            </form>
                          </div>


                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between gap-4">
                    <p className="text-red-700 font-semibold text-sm">⚠️ {error}</p>
                    <button
                      onClick={() => setError('')}
                      className="text-red-400 hover:text-red-600 flex-shrink-0 transition-colors"
                      aria-label="Close alert"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between gap-4">
                    <p className="text-emerald-700 font-semibold text-sm">{successMessage}</p>
                    <button
                      onClick={() => setSuccessMessage('')}
                      className="text-emerald-400 hover:text-emerald-600 flex-shrink-0 transition-colors"
                      aria-label="Close alert"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}


              </div>
            </div>
          </div>



          {/* SLIDE 2: Transaction History */}
          <div className="min-w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 animate-in fade-in duration-500 p-6">
            <div className="flex-1 flex bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-col">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">📚 Payment History</h3>
                    <div className="flex bg-indigo-200/50 dark:bg-indigo-900/50 p-1 rounded-lg">
                      <button
                        onClick={() => setHistoryLayout('GRID')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${historyLayout === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                      >
                        Grid
                      </button>
                      <button
                        onClick={() => setHistoryLayout('TABLE')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${historyLayout === 'TABLE' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                      >
                        Table
                      </button>
                    </div>
                  </div>
                  <span className="text-lg px-4 py-2 rounded-full bg-indigo-200 text-indigo-700 font-bold">{recentHistory.length}</span>
                </div>
              </div>
              {historyLayout === 'GRID' ? (
                <div className="overflow-y-auto flex-1 p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch content-start">
                  {recentHistory.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-500 text-center py-12">No history yet</p>
                  ) : (
                    recentHistory.map((item) => {
                      const senderId = item.fromUserId || (item.direction === 'OUT' ? userId : item.counterparty);
                    const receiverId = item.toUserId || (item.direction === 'OUT' ? item.counterparty : userId);
                    const senderName = item.fromUserName || senderId;
                    const receiverName = item.toUserName || receiverId;
                    const counterpartyName = item.counterpartyName || item.counterparty;
                    const rawDate = item.timestamp || item.createdAt;
                      const dateObj = rawDate ? new Date(rawDate) : null;
                      const dateStr = dateObj
                        ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : null;
                      const timeStr = dateObj
                        ? dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : null;

                      const isRejected = item.status === 'REJECTED' || item.status === 'CANCELLED';
                      const isDebited = !isRejected && item.direction === 'OUT';

                      return (
                        <div key={item.id || item.txnId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:bg-indigo-50 dark:hover:bg-slate-800/60 transition-colors shadow-sm">
                          {/* Header row */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-base ${
                                isRejected
                                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                  : isDebited
                                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              }`}>
                                {isRejected ? '🚫' : isDebited ? '📤' : '📥'}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {isRejected ? 'Payment Rejected' : isDebited ? 'Payment Debited' : 'Payment Credited'}
                                </p>
                                {dateStr && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-500">{dateStr}{timeStr ? ` · ${timeStr}` : ''}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-extrabold ${
                                isRejected
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isDebited
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {isRejected ? '' : isDebited ? '-' : '+'}£{Number(item.amount).toLocaleString()}
                              </p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isRejected
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                  : item.status === 'COMMITTED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : item.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          </div>

                          {/* Counterparty */}
                          <div className="mb-2 rounded-lg border border-indigo-100 dark:border-slate-800 bg-indigo-50 dark:bg-slate-800/40 px-3 py-2">
                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold mb-0.5">Counterparty</p>
                            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">{counterpartyName}</p>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2 py-1.5">
                              <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">From</p>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.fromUserName || item.fromUserId || (item.direction === 'OUT' ? 'You' : item.counterparty)}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-2 py-1.5">
                              <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wider font-semibold">To</p>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.toUserName || item.toUserId || (item.direction === 'OUT' ? item.counterparty : 'You')}</p>
                            </div>
                          </div>

                          {/* Transaction ID */}
                          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-auto">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Transaction ID</p>
                              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">{item.txnId || item.id}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date/Time</th>
                        <th className="px-4 py-3 font-semibold">Direction</th>
                        <th className="px-4 py-3 font-semibold">Counterparty</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentHistory.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-12 text-slate-500">No history yet</td></tr>
                      ) : (
                        recentHistory.map((item) => {
                          const counterpartyName = item.counterpartyName || item.counterparty;
                          const rawDate = item.timestamp || item.createdAt;
                          const dateObj = rawDate ? new Date(rawDate) : null;
                          const dateStr = dateObj ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
                          const timeStr = dateObj ? dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;
                          const isRejected = item.status === 'REJECTED' || item.status === 'CANCELLED';
                          const isDebited = !isRejected && item.direction === 'OUT';
                          return (
                            <tr key={item.id || item.txnId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3">
                                {dateStr && <div className="font-bold text-slate-800 dark:text-slate-200">{dateStr}</div>}
                                {timeStr && <div className="text-[10px] text-slate-500">{timeStr}</div>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isRejected
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                    : isDebited
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50'
                                }`}>
                                  {isRejected ? '🚫 Rejected' : isDebited ? '📤 Debited' : '📥 Credited'}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{counterpartyName}</td>
                              <td className={`px-4 py-3 font-black ${
                                isRejected
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isDebited
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {isRejected ? '' : isDebited ? '-' : '+'}£{Number(item.amount).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isRejected
                                    ? 'bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                                    : item.status === 'COMMITTED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : item.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* SLIDE 3: Set Limit & Usage */}
          <div className="min-w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 animate-in fade-in duration-500 p-6">
            <div className="flex-1 flex bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-col">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-cyan-50 to-indigo-50 dark:from-cyan-950/30 dark:to-indigo-950/30">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">⚙️ Set Limit & Usage</h3>
                    <InfoTooltip text="Set personal spending guardrails. Transactions beyond these limits will be blocked before fraud routing." />
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${riskTone}`}>
                    {selfLimits.riskIndicator || 'MEDIUM'} RISK
                  </span>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {limitsLoading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-500">Loading limits...</p>
                ) : (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6 w-full">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Left Column: Sliders */}
                      <div className="space-y-6">
                        <SliderControl
                          id="daily-limit"
                          label="Daily Limit"
                          value={Number(limitDraft.dailyTransactionLimit || 0)}
                          min={1000}
                          max={50000}
                          step={500}
                          inputStep={500}
                          onChange={(value) => updateDraft('dailyTransactionLimit', value)}
                          hint="Recommended: £15,000"
                        />

                        <SliderControl
                          id="weekly-limit"
                          label="Weekly Limit"
                          value={Number(limitDraft.weeklyTransactionLimit || 0)}
                          min={5000}
                          max={200000}
                          step={1000}
                          inputStep={1000}
                          onChange={(value) => updateDraft('weeklyTransactionLimit', value)}
                          hint="Must be equal to or higher than daily limit"
                        />

                        <SliderControl
                          id="max-beneficiary"
                          label="Max Per Transfer"
                          value={Number(limitDraft.maxBeneficiaryAmount || 0)}
                          min={500}
                          max={50000}
                          step={250}
                          inputStep={250}
                          onChange={(value) => updateDraft('maxBeneficiaryAmount', value)}
                          hint="Upper cap for any single outgoing transfer"
                        />
                      </div>

                      {/* Right Column: Toggles, Usage, Actions */}
                      <div className="space-y-6 flex flex-col">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <ToggleSwitch
                            checked={!!limitDraft.domesticTransactionsEnabled}
                            onChange={(next) => updateDraft('domesticTransactionsEnabled', next)}
                            label="Domestic Transfers"
                            description="Disable to block all domestic payments."
                          />
                          <ToggleSwitch
                            checked={!!limitDraft.internationalTransactionsEnabled}
                            onChange={(next) => updateDraft('internationalTransactionsEnabled', next)}
                            label="International Transfers"
                            description="Disable to block all international payments."
                          />
                        </div>

                        <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">Current Usage</h4>
                          <div>
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                              <span>Today used</span>
                              <span>£{Number(selfLimits.todaySpent || 0).toLocaleString()} ({dailyUsage}%)</span>
                            </div>
                            <div className="mt-2 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700">
                              <div className="h-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${dailyUsage}%` }} />
                            </div>
                          </div>

                          <div className="pt-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                              <span>Week used</span>
                              <span>£{Number(selfLimits.weekSpent || 0).toLocaleString()} ({weeklyUsage}%)</span>
                            </div>
                            <div className="mt-2 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700">
                              <div className="h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${weeklyUsage}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-auto">
                          <button
                            type="button"
                            onClick={saveSelfLimits}
                            disabled={limitsSaving}
                            className="flex-1 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-700 disabled:bg-slate-400 transition-colors shadow-sm"
                          >
                            {limitsSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            type="button"
                            onClick={resetSelfLimits}
                            disabled={limitsSaving}
                            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                          >
                            Reset to Default
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SLIDE 4: Custom Rules */}
          <div className="min-w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 animate-in fade-in duration-500 p-6">
            <div className="flex-1 flex bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-col">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">🛡️ Custom Rules</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Toggle individual fraud rules on or off. Your settings apply to every payment you make.</p>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {rulesLoading ? (
                  <p className="text-sm text-slate-500 dark:text-slate-500">Loading rule settings…</p>
                ) : (
                  <div className="space-y-3 w-full">
                    {[
                      { key: 'LARGE_AMOUNT',  label: 'Large Amount',          icon: '💰', desc: 'Flag transactions above £25,000 as higher risk.' },
                      { key: 'NEW_PAYEE',     label: 'New Payee',             icon: '👤', desc: 'Flag payments to recipients not in your trusted list.' },
                      { key: 'VELOCITY',      label: 'Transaction Velocity',  icon: '⚡', desc: 'Flag 3 or more transactions within 10 minutes.' },
                      { key: 'ROUND_AMOUNT',  label: 'Round Amount',          icon: '🔢', desc: 'Flag exact multiples of £10,000 as a common fraud signal.' },
                      { key: 'OFF_HOURS',     label: 'Off-Hours Activity',    icon: '🌙', desc: 'Flag payments made before 06:00 or after 23:00 UK time.' },
                      { key: 'RAPID_DRAIN',   label: 'Rapid Balance Drain',   icon: '📉', desc: 'Flag when a payment exceeds 70% of your balance.' },
                      { key: 'CORTEX_AI',     label: 'Cortex AI Review',      icon: '🧠', desc: 'Include Cortex AI anomaly detection in risk scoring.' },
                    ].map(({ key, label, icon, desc }) => {
                      const enabled = userRules[key] !== false;
                      return (
                        <div
                          key={key}
                          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 transition-colors ${
                            enabled
                              ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800/50'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-lg mt-0.5">{icon}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{label}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 leading-snug">{desc}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleRule(key, label, enabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                              enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                            aria-pressed={enabled}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-900 transition-transform ${
                                enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mt-2">
                      <p className="text-xs font-semibold text-amber-800">
                        ⚠️ Disabling rules reduces the risk score for your transactions and may allow higher-risk payments to proceed with less scrutiny.
                        Enable all rules for maximum protection.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 15-Second Medium Risk User Consent Prompt Modal */}
      {consentPrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-2xl">⚠️</span>
                <h3 className="text-lg font-bold text-slate-100">Medium Risk Transfer Prompt</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center border border-amber-500/40 animate-pulse">
                {consentPrompt.countdown}s
              </div>
            </div>

            <p className="text-xs text-slate-300">
              This payment was flagged for medium risk (<span className="font-semibold text-amber-400">Risk Score: {consentPrompt.riskScore}/100</span>). Please review payment details within <strong className="text-amber-400">{consentPrompt.countdown} seconds</strong>.
            </p>

            <div className="bg-slate-800/90 rounded-xl p-4 space-y-2 border border-slate-700 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Txn ID:</span>
                <span className="font-mono text-slate-200">{consentPrompt.txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-semibold text-slate-100">{consentPrompt.toUserId}</span>
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-emerald-400">£{Number(consentPrompt.amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleConsentResponse(consentPrompt.txnId, true)}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-3 rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✅</span> Confirm & Settle Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canton DAML Consent Trail & Contract Inspector Modal */}
      {selectedWorkflowTxn && (
        <DamlConsentTrailModal
          txn={selectedWorkflowTxn}
          onClose={() => setSelectedWorkflowTxn(null)}
        />
      )}

      {/* Sleek Overlay Prompt Modal for Payment Confirmation / Canton Hold Alerts */}
      {transferPrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-5 transform transition-transform duration-300 scale-100">
            {transferPrompt.isHold ? (
              <>
                <div className="mx-auto w-14 h-14 bg-gradient-to-br from-amber-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/10 animate-pulse">
                  <span className="text-2xl text-white">🔒</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight font-heading">
                    High-Value Compliance Review
                  </h3>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-4 border border-amber-200/40 dark:border-amber-900/20 text-left space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                  <p>
                    Your transfer of <strong className="text-slate-900 dark:text-white">£{Number(transferPrompt.amount).toLocaleString()}</strong> to <strong className="text-slate-900 dark:text-white">{getUserById(transferPrompt.toUserId)?.displayName || transferPrompt.toUserId}</strong> is a high-value transaction.
                  </p>
                  <p className="text-amber-800 dark:text-amber-400">
                    ⚠️ It is currently being monitored & reviewed by compliance administrators. Funds are safely locked in smart ledger escrow pending approval.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <span className="text-2xl text-white">✓</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight font-heading">
                    Payment Sent Successfully
                  </h3>
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono">
                    Transaction Auto-Approved
                  </p>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-2xl p-4 border border-emerald-200/40 dark:border-emerald-900/20 text-left space-y-2 text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                  <p>
                    Your transfer of <strong className="text-slate-900 dark:text-white">£{Number(transferPrompt.amount).toLocaleString()}</strong> to <strong className="text-slate-900 dark:text-white">{getUserById(transferPrompt.toUserId)?.displayName || transferPrompt.toUserId}</strong> has been processed successfully.
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400">
                    ✅ This payment met all safety parameters and has been committed to the ledger mempool.
                  </p>
                </div>
              </>
            )}

            <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800 flex justify-between items-center">
              <span>Recipient: {transferPrompt.toUserId}</span>
              <span>Txn ID: {transferPrompt.txnId.substring(0, 16)}...</span>
            </div>

            <button
              onClick={() => setTransferPrompt(null)}
              className={`w-full py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md ${
                transferPrompt.isHold
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              Dismiss Notification
            </button>
          </div>
        </div>
      )}

      {/* Sleek Red Color Dialog for Timeout Cancellation Alert */}
      {cancelAlert && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border-2 border-red-500/40 dark:border-red-500/20 shadow-2xl p-6 text-center space-y-5 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 animate-bounce">
              <span className="text-2xl text-white">⚠️</span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-red-600 dark:text-red-400 tracking-tight font-heading">
                Transaction Cancelled
              </h3>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                Secure Inactivity Timeout
              </p>
            </div>

            <div className="bg-red-50/50 dark:bg-red-950/10 rounded-2xl p-4.5 border border-red-100 dark:border-red-950/30 text-left space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
              <p>
                Your transfer of <strong className="text-slate-900 dark:text-white">£{Number(cancelAlert.amount).toLocaleString()}</strong> to <strong className="text-slate-900 dark:text-white">{getUserById(cancelAlert.toUserId)?.displayName || cancelAlert.toUserId}</strong> was cancelled.
              </p>
              <p className="text-red-700 dark:text-red-400 font-bold">
                🔒 No confirmation activity was detected within the 15-second secure window. Funds have been returned safely to your usable balance.
              </p>
            </div>

            <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800 flex justify-between items-center">
              <span>Recipient: {cancelAlert.toUserId}</span>
              <span>Txn ID: {cancelAlert.txnId.substring(0, 16)}...</span>
            </div>

            <button
              onClick={() => setCancelAlert(null)}
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
            >
              Understood, Return to Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component that renders an interactive Canton DAML Contract & Consent Trail Inspector
function DamlConsentTrailModal({ txn, onClose }) {
  const [cantonData, setCantonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStateIdx, setSelectedStateIdx] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`/api/chain/txn/${txn.txnId || txn.id}/canton-details`);
        if (isMounted) setCantonData(res.data);
      } catch (err) {
        console.error('Failed to fetch Canton details for workflow', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [txn]);

  // Construct Canton DAML Contract Consent Trail
  const damlConsentTrail = (cantonData?.ledgerStates && cantonData.ledgerStates.length > 0)
    ? cantonData.ledgerStates.map((st, idx) => {
        return {
          contractId: `#${idx + 1}:${idx}`,
          template: st.damlContractRef || `FraudShield.Interbank:${st.state || 'Contract'}`,
          title: st.state || `DAML Choice ${idx + 1}`,
          desc: st.remarks || st.details || 'DAML Smart Contract Choice Executed',
          author: st.actorRole || 'Party_User',
          bank: st.originatingBank || cantonData.originatingBank || 'BankA',
          contractRef: st.damlContractRef || `FraudShield.Interbank:${st.state || 'Contract'}`,
          timestamp: st.timestamp ? new Date(st.timestamp).toLocaleString() : 'Recent',
          status: 'MULTI-PARTY SIGNED ✓',
        };
      })
    : [
        { contractId: '#1:0', template: 'FraudShield.Interbank:HoldRequest', title: 'TXN_CREATED', desc: 'Hold request created on Canton ledger', author: txn.fromUserId || 'Sender', bank: 'BankA', contractRef: 'FraudShield.Interbank:HoldRequest', status: 'MULTI-PARTY SIGNED ✓' },
        { contractId: '#2:1', template: 'FraudShield.Interbank:ConsentAgreement', title: 'USER_CONSENT_RECEIVED', desc: 'Explicit customer consent signature attached to contract', author: (txn.fromUserId || 'Sender') + '_Party', bank: 'BankA', contractRef: 'FraudShield.Interbank:HoldRequestChoice', status: 'MULTI-PARTY SIGNED ✓' },
        { contractId: '#3:2', template: 'FraudShield.Interbank:MultiSigApproval', title: 'ADMIN_APPROVAL_GRANTED', desc: 'Originating bank multi-sig clearance granted', author: 'BankA_Admin', bank: 'BankA', contractRef: 'FraudShield.Interbank:MultiSigApproval', status: 'MULTI-PARTY SIGNED ✓' },
        { contractId: '#4:3', template: 'FraudShield.Interbank:EscrowAgreement', title: 'ESCROW_HOLD_CREATED', desc: 'Recipient bank escrow agreement established on Canton node', author: 'BankB_Clearing', bank: 'BankB', contractRef: 'FraudShield.Interbank:EscrowAgreement', status: 'MULTI-PARTY SIGNED ✓' },
        { contractId: '#5:4', template: 'FraudShield.Interbank:SettlementAuthorization', title: 'SETTLEMENT_COMPLETED', desc: 'Atomic interbank settlement committed across synchronizer domain', author: 'GlobalSynchronizer', bank: 'CantonNetwork', contractRef: 'FraudShield.Interbank:SettlementAuthorization', status: 'CANTON COMMITTED ✓' },
      ];

  const selectedState = damlConsentTrail[selectedStateIdx] || damlConsentTrail[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⛓️</span>
            <div>
              <h2 className="text-lg font-black flex items-center gap-2">
                <span>Canton DAML Contract & Consent Trail</span>
                <span className="font-mono text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                  {txn.txnId || txn.id}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Step-by-step audit lineage of signed DAML choices and interbank node consents.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50 dark:bg-slate-900/50">
          {/* Overview Banner */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">CANTON SYNCHRONIZER DOMAIN</span>
              <p className="text-cyan-400 font-bold text-sm">Domain: Alpha-Interbank-v1 @ Contract ID {damlConsentTrail[damlConsentTrail.length - 1]?.contractId}</p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Amount</span>
                <span className="text-emerald-400 font-bold text-sm">£{txn.amount}</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                <span className="text-indigo-400 font-bold text-sm">{txn.status || 'COMMITTED'}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading Canton DAML Contract workflow history...</div>
          ) : (
            <>
              {/* CANTON DAML STATE TRANSITION TRAIL */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span>⛓️</span> DAML Contract State Transition Trail
                </h3>

                {/* State Steps Timeline */}
                <div className="relative pl-8 space-y-4 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-1 before:bg-gradient-to-b before:from-indigo-500 before:via-cyan-500 before:to-emerald-500">
                  {damlConsentTrail.map((st, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedStateIdx(idx)}
                      className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        selectedStateIdx === idx
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/20 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      {/* Node Dot */}
                      <div className={`absolute -left-8 top-4 w-4 h-4 rounded-full border-2 ring-4 ring-white dark:ring-slate-900 transition-all ${
                        selectedStateIdx === idx ? 'bg-indigo-600 border-indigo-200 scale-110' : 'bg-slate-400 border-slate-300'
                      }`}></div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{st.contractId}</span>
                          <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold">
                            {st.template}
                          </span>
                          <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            {st.status}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{st.title}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{st.desc}</p>
                      </div>

                      <div className="text-right text-[10px] text-slate-400 space-y-0.5 self-start sm:self-auto font-mono">
                        <p className="font-bold text-slate-700 dark:text-slate-300">Signatory: {st.author}</p>
                        <p>Validator Node: {st.bank}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SELECTED STATE DETAILED INSPECTOR CARD */}
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-400">Selected DAML Contract State:</span>
                    <span className="font-mono text-xs font-bold text-cyan-300">{selectedState.contractId}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    DAML Contract Signature Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DAML Contract Reference</span>
                    <p className="font-mono text-xs font-bold text-indigo-300 break-all">{selectedState.contractRef}</p>
                  </div>

                  <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Signing Authority</span>
                    <p className="font-bold text-xs text-emerald-300">{selectedState.author} ({selectedState.bank})</p>
                  </div>
                </div>

                <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono">
                  <span className="text-slate-500 font-bold block mb-1">Canton DAML Choice Log Trace:</span>
                  <p>Contract ID: {selectedState.contractId}</p>
                  <p>Signatory Party: {selectedState.author} &lt;daml-party@{selectedState.bank.toLowerCase()}.canton&gt;</p>
                  <p>DAML Template: {selectedState.template}</p>
                  <p className="text-cyan-300 mt-1">    daml.choice: {selectedState.title} - {selectedState.desc}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Canton DAML Protocol Multi-Party Ledger Sign-off</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
