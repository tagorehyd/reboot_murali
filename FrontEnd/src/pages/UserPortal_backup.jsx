import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RiskBreakdownCard from '../components/RiskBreakdownCard';
import ConsentPanel from '../components/ConsentPanel';

export default function UserPortal({ userId }) {
  const [users, setUsers] = useState([]);
  const [balance, setBalance] = useState(0);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [transactionResponse, setTransactionResponse] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Fetch available users and balance on mount
  useEffect(() => {
    loadUsers();
    loadBalance();
    loadActivity();
  }, [userId]);

  // Set up WebSocket for real-time updates
  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8080/ws?userId=${userId}`);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'balance_update') {
        setBalance(data.balance);
        loadActivity();
      } else if (data.type === 'txn_status_update') {
        // Update transaction response with new status
        if (transactionResponse && transactionResponse.txnId === data.txnId) {
          setTransactionResponse({ ...transactionResponse, status: data.status });
        }
        loadActivity();
      }
    };
    return () => socket.close();
  }, [userId, transactionResponse]);

  const loadActivity = async () => {
    try {
      const [pendingRes, historyRes] = await Promise.all([
        axios.get(`/api/txn/user/${userId}/pending`),
        axios.get(`/api/txn/user/${userId}/history`),
      ]);
      setPendingTransactions((pendingRes.data || []).slice(0, 5));
      setRecentHistory((historyRes.data || []).slice(0, 5));
    } catch (err) {
      // Keep portal usable even if activity widgets fail
      console.error('Failed to load activity:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get('/api/users/all');
      const filteredUsers = (response.data || []).filter((u) => {
        const uid = u.id || u._id;
        const role = (u.role || '').toUpperCase();
        return uid && uid !== userId && role !== 'ADMIN';
      });
      setUsers(filteredUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await axios.get(`/api/admin/balance/${userId}`);
      setBalance(response.data.balance);
    } catch (err) {
      console.error('Failed to load balance:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setTransactionResponse(null);

    try {
      const response = await axios.post('/api/txn/initiate', {
        fromUserId: userId,
        toUserId: recipientId,
        amount: parseFloat(amount),
      });

      setTransactionResponse(response.data);
      setAmount('');
      setRecipientId('');

      if (
        response.data.status === 'APPROVED' &&
        response.data.routingDecision === 'AUTO_APPROVE'
      ) {
        setSuccessMessage('✅ Transaction auto-approved and accepted into mempool!');
      } else if (response.data.status === 'PENDING_ADMIN') {
        setSuccessMessage(
          '⏳ Transaction accepted. Our fraud team is reviewing your request.'
        );
      } else if (response.data.status === 'PENDING_CONSENT') {
        setSuccessMessage(
          '🔐 Transaction flagged. Please review the risk details and provide your consent.'
        );
      }

      loadBalance();
      loadActivity();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to initiate transaction. Please try again.'
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return '✅';
      case 'PENDING_ADMIN':
        return '⏳';
      case 'PENDING_CONSENT':
        return '🔐';
      case 'REJECTED':
        return '❌';
      case 'COMMITTED':
        return '✓';
      default:
        return '•';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
      case 'COMMITTED':
        return 'text-green-600';
      case 'PENDING_ADMIN':
      case 'PENDING_CONSENT':
        return 'text-yellow-600';
      case 'REJECTED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < 2) {
      setCurrentSlide(currentSlide + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Section */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">💳 Send Payment</h1>
            <p className="text-slate-500 mt-1">Protected transfer through FraudShield routing</p>
          </div>
          {pendingTransactions.length > 0 && (
            <div className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-full">
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
        <div className="mt-4 inline-block bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-100 rounded-lg px-6 py-3">
          <p className="text-sm text-slate-700">
            <span className="font-bold">Your Balance:</span>
            <span className="ml-2 text-3xl font-extrabold text-indigo-600 tracking-tight">
              £{balance.toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      {/* Slider Navigation Dots */}
      <div className="px-8 py-3 flex gap-2 justify-center bg-white/50 backdrop-blur-sm border-b border-slate-200">
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all ${
              currentSlide === index
                ? 'bg-indigo-600 w-8'
                : 'bg-slate-300 w-2 hover:bg-slate-400'
            }`}
            title={['Payment Form', 'Pending Events', 'Transaction History'][index]}
          />
        ))}
      </div>

      {/* Horizontal Slider Container */}
      <div
        className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${-currentSlide * 100}%)` }}
        >

        {/* SLIDE 0: Transaction Initiation (Full Width) */}
        <div className="min-w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-y-auto flex-1 p-6 space-y-5 w-full">
            
            {/* Transaction Form */}
            <form onSubmit={handleSubmit} className="space-y-5 bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Recipient</label>
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full px-4 py-3 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">— Select a recipient —</option>
                  {users.map((user) => {
                    const uid = user.id || user._id;
                    return (
                      <option key={uid} value={uid}>
                        {user.displayName} ({uid}) - £{(user.balance || 0).toLocaleString()}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">Amount (£)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isLoading}
                  placeholder="Enter amount"
                  required
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !recipientId || !amount}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-extrabold rounded-lg hover:from-indigo-700 hover:to-cyan-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isLoading ? '⏳ Processing...' : '📤 Send Payment'}
              </button>
            </form>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 font-semibold text-sm">⚠️ {error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-emerald-700 font-semibold text-sm">{successMessage}</p>
              </div>
            )}

            {/* Transaction Response */}
            {transactionResponse && (
              <div className="space-y-4">
                {/* Transaction Details */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Transaction ID</p>
                    <p className="font-mono text-xs font-bold text-slate-900 break-all mt-1">
                      {transactionResponse.txnId}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">To</p>
                      <p className="font-bold text-slate-900">{transactionResponse.toUserId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Amount</p>
                      <p className="font-bold text-slate-900">£{transactionResponse.amount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold">Status:</p>
                    <span className={`text-sm font-bold ${getStatusColor(transactionResponse.status)}`}>
                      {getStatusIcon(transactionResponse.status)} {transactionResponse.status}
                    </span>
                  </div>
                </div>

                {/* Risk Breakdown */}
                <RiskBreakdownCard
                  riskScore={transactionResponse.riskScore}
                  riskBreakdown={transactionResponse.riskBreakdown || []}
                />

                {/* Consent Panel (if required) */}
                {transactionResponse.status === 'PENDING_CONSENT' && (
                  <ConsentPanel
                    txnId={transactionResponse.txnId}
                    transaction={transactionResponse}
                    onApprove={() => {
                      setSuccessMessage('✅ Consent approved! Transaction sent to admin review.');
                      setTransactionResponse(null);
                    }}
                    onReject={() => {
                      setError('❌ You rejected this transaction.');
                      setTransactionResponse(null);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SLIDE 1: Pending Activity (Full Width) */}
        <div className="min-w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-col">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">🕒 Pending Events</h3>
                <span className="text-sm px-3 py-1 rounded-full bg-amber-200 text-amber-700 font-bold">
                  {pendingTransactions.length}
                </span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {pendingTransactions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">No pending items</p>
              ) : (
                pendingTransactions.map((txn) => (
                  <div key={txn.id || txn.txnId} className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:bg-amber-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">{txn.status}</p>
                      <p className="text-sm font-bold text-indigo-600">£{txn.amount}</p>
                    </div>
                    <p className="font-mono text-sm text-slate-600 break-all mt-2">{(txn.id || txn.txnId)}</p>
                    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">From</p>
                        <p className="text-sm font-bold text-slate-900">{txn.fromUserId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">To</p>
                        <p className="text-sm font-bold text-slate-900">{txn.toUserId}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SLIDE 2: Transaction History (Full Width) */}
        <div className="min-w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-col">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">📚 Transaction History</h3>
                <span className="text-sm px-3 py-1 rounded-full bg-indigo-200 text-indigo-700 font-bold">
                  {recentHistory.length}
                </span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {recentHistory.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">No history yet</p>
              ) : (
                recentHistory.map((item) => (
                  <div key={item.id || item.txnId} className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:bg-indigo-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-slate-900">
                        {item.direction === 'OUT' ? '📤' : '📥'} {item.direction === 'OUT' ? 'Sent' : 'Received'}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        item.status === 'COMMITTED' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : item.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    
                    {/* Amount */}
                    <p className="text-2xl font-extrabold text-indigo-600 mb-3">£{item.amount}</p>
                    
                    {/* Transaction Details Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sender</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{item.fromUserId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Receiver</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{item.toUserId}</p>
                      </div>
                    </div>

                    {/* Transaction ID */}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Transaction ID</p>
                      <p className="font-mono text-xs text-slate-600 break-all mt-1">{item.id || item.txnId}</p>
                    </div>

                    {/* Date/Timestamp if available */}
                    {item.timestamp && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
