import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { verifySavingsRecord, fetchSavingsByCycle } from "../store/slices/savingsSlice";
import { approveLoan, disburseLoan, verifyRepayment, updateLoan, fetchLoans } from "../store/slices/loanSlice";
import { invalidateMembers } from "../store/slices/memberSlice";
import { CheckCircle2, XCircle, Clock, PiggyBank, DollarSign, HandCoins, Filter, Search, Eye, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export function Approvals() {
  const dispatch = useDispatch();
  const savings = useSelector((state) => state.savings?.savings || []);
  const loans = useSelector((state) => state.loans?.loans || []);
  const members = useSelector((state) => state.members?.members || []);
  const user = useSelector((state) => state.auth?.user || {});
  const currentCycle = useSelector((state) => state.cycles?.currentCycle);
  const savingsStale = useSelector((state) => state.savings?.stale);
  const loansStale = useSelector((state) => state.loans?.stale);
  const savingsLoading = useSelector((state) => state.savings?.loading);
  const loansLoading = useSelector((state) => state.loans?.loading);

  const savingsFetched = useRef(false);
  const loansFetched = useRef(false);

  // Fetch savings when stale or on first mount
  useEffect(() => {
    if (currentCycle?.id && !savingsLoading) {
      if (savingsStale) {
        savingsFetched.current = false;
      }
      if (!savingsFetched.current) {
        savingsFetched.current = true;
        dispatch(fetchSavingsByCycle(currentCycle.id));
      }
    }
  }, [dispatch, currentCycle?.id, savingsStale, savingsLoading]);

  // Fetch loans when stale or on first mount
  useEffect(() => {
    if (currentCycle?.id && !loansLoading) {
      if (loansStale) {
        loansFetched.current = false;
      }
      if (!loansFetched.current) {
        loansFetched.current = true;
        dispatch(fetchLoans(currentCycle.id));
      }
    }
  }, [dispatch, currentCycle?.id, loansStale, loansLoading]);

  // Helper: resolve member name from members list by user_id
  const getMemberName = (userId) => {
    const member = members.find((m) => m.id === userId);
    return member?.name || null;
  };
  
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter pending items — resolve memberName from members list as fallback
  const pendingSavings = savings
    .filter((s) => s.status === "pending")
    .map((s) => ({ ...s, memberName: s.memberName || s.userName || getMemberName(s.userId) }));
  const pendingLoans = loans.filter((l) => l.status === "pending" || l.status === "requested" || l.status === "approved");
  const pendingRepayments = loans.flatMap((loan) =>
    (loan.repayments || [])
      .filter((r) => r.status === "pending")
      .map((r) => {
        // Parse notes for payment method and reference
        const notesParts = r.notes ? r.notes.split(' | ') : [];
        const paymentMethod = notesParts.find(p => p.startsWith('Payment method:'))?.replace('Payment method: ', '') || '';
        const referenceNo = notesParts.find(p => p.startsWith('Ref:'))?.replace('Ref: ', '') || '';
        return {
          ...r,
          loanId: loan.id,
          memberName: loan.memberName,
          memberId: loan.memberId,
          proofUrl: r.proof_url, // Map to camelCase
          paymentMethod,
          referenceNo
        };
      })
  );

  // Search filter
  const filterBySearch = (items, nameField = "memberName") => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item[nameField]?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get filtered items based on active tab
  const getFilteredItems = () => {
    let items = [];
    
    switch (activeTab) {
      case "savings":
        items = filterBySearch(pendingSavings).map((s) => ({ ...s, type: "savings" }));
        break;
      case "loans":
        items = filterBySearch(pendingLoans).map((l) => ({ ...l, type: "loan" }));
        break;
      case "repayments":
        items = filterBySearch(pendingRepayments).map((r) => ({ ...r, type: "repayment" }));
        break;
      default: // "all"
        items = [
          ...filterBySearch(pendingSavings).map((s) => ({ ...s, type: "savings" })),
          ...filterBySearch(pendingLoans).map((l) => ({ ...l, type: "loan" })),
          ...filterBySearch(pendingRepayments).map((r) => ({ ...r, type: "repayment" })),
        ];
    }
    
    return items.sort((a, b) => {
      const dateA = new Date(a.paymentDate || a.requestedDate || a.createdAt || a.payment_date || a.requested_date || a.created_at || 0);
      const dateB = new Date(b.paymentDate || b.requestedDate || b.createdAt || b.payment_date || b.requested_date || b.created_at || 0);
      return dateB - dateA;
    });
  };

  // Handle approval actions
  const handleApproveSavings = (item) => {
    const userName = user?.name || "Admin";
    dispatch(
      verifySavingsRecord({
        id: item.id,
        status: "verified",
        verifiedBy: userName,
        verifiedAt: new Date().toISOString(),
      })
    );
    dispatch(invalidateMembers());
    toast.success(`Savings of K${item.amount.toLocaleString()} approved for ${item.memberName}`);
    setShowDetailModal(false);
  };

  const handleRejectSavings = (item) => {
    const userName = user?.name || "Admin";
    dispatch(
      verifySavingsRecord({
        id: item.id,
        status: "rejected",
        verifiedBy: userName,
        verifiedAt: new Date().toISOString(),
      })
    );
    toast.error(`Savings rejected for ${item.memberName}`);
    setShowDetailModal(false);
  };

  const handleApproveLoan = (item) => {
    dispatch(
      approveLoan({
        id: item.id,
        notes: item.notes || '',
      })
    );
    dispatch(invalidateMembers());
    toast.success(`Loan of K${item.amount.toLocaleString()} approved for ${item.memberName}`);
    setShowDetailModal(false);
  };

  const handleDisburseLoan = (item) => {
    dispatch(
      disburseLoan({
        id: item.id,
        disbursedDate: new Date().toISOString().split("T")[0],
      })
    );
    dispatch(invalidateMembers());
    toast.success(`Loan of K${item.amount.toLocaleString()} disbursed to ${item.memberName}`);
    setShowDetailModal(false);
  };

  const handleRejectLoan = (item) => {
    dispatch(
      updateLoan({
        ...item,
        status: "rejected",
        rejectedDate: new Date().toISOString().split("T")[0],
      })
    );
    toast.error(`Loan rejected for ${item.memberName}`);
    setShowDetailModal(false);
  };

  const handleApproveRepayment = (item) => {
    const userName = (user?.firstName && user?.lastName) 
      ? `${user.firstName} ${user.lastName}` 
      : user?.name || "Admin";
    dispatch(
      verifyRepayment({
        loanId: item.loanId,
        repaymentId: item.id,
        status: "verified",
        verifiedBy: userName,
        verifiedAt: new Date().toISOString(),
      })
    );
    dispatch(invalidateMembers());
    toast.success(`Repayment of K${item.amount.toLocaleString()} approved for ${item.memberName}`);
    setShowDetailModal(false);
  };

  const handleRejectRepayment = (item) => {
    const userName = (user?.firstName && user?.lastName) 
      ? `${user.firstName} ${user.lastName}` 
      : user?.name || "Admin";
    dispatch(
      verifyRepayment({
        loanId: item.loanId,
        repaymentId: item.id,
        status: "rejected",
        verifiedBy: userName,
        verifiedAt: new Date().toISOString(),
      })
    );
    toast.error(`Repayment rejected for ${item.memberName}`);
    setShowDetailModal(false);
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // Get action handlers based on item type
  const getActionHandlers = (item) => {
    if (item.type === "savings") {
      return {
        approve: () => handleApproveSavings(item),
        reject: () => handleRejectSavings(item),
      };
    } else if (item.type === "loan") {
      if (item.status === "approved") {
        return {
          approve: () => handleDisburseLoan(item),
          reject: () => handleRejectLoan(item),
          approveLabel: "Disburse",
        };
      }
      return {
        approve: () => handleApproveLoan(item),
        reject: () => handleRejectLoan(item),
      };
    } else if (item.type === "repayment") {
      return {
        approve: () => handleApproveRepayment(item),
        reject: () => handleRejectRepayment(item),
      };
    }
    return {};
  };

  const filteredItems = getFilteredItems();
  const totalPending = pendingSavings.length + pendingLoans.length + pendingRepayments.length;

  const tabs = [
    { id: "all", label: "All", count: totalPending, icon: Filter },
    { id: "savings", label: "Savings", count: pendingSavings.length, icon: PiggyBank },
    { id: "loans", label: "Loans", count: pendingLoans.length, icon: DollarSign },
    { id: "repayments", label: "Repayments", count: pendingRepayments.length, icon: HandCoins },
  ];

  const getItemIcon = (type) => {
    switch (type) {
      case "savings":
        return <PiggyBank className="w-5 h-5 text-blue-600" />;
      case "loan":
        return <DollarSign className="w-5 h-5 text-purple-600" />;
      case "repayment":
        return <HandCoins className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getItemBadgeColor = (type) => {
    switch (type) {
      case "savings":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "loan":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "repayment":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            ✅ Pending Approvals
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Review and approve pending transactions
          </p>
        </div>
        
        {/* Stats Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg"
        >
          <Clock className="w-5 h-5" />
          <span className="font-bold text-lg">{totalPending}</span>
          <span className="text-sm">Pending</span>
        </motion.div>
      </motion.div>

      {/* Info Alert */}
      {totalPending === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100 text-sm sm:text-base">
                All Caught Up!
              </h4>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200 mt-1">
                There are no pending transactions to review at this time.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {totalPending > 0 && (
        <>
          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by member name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-lg scale-105"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        activeTab === tab.id
                          ? "bg-white/20 text-white"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>

          {/* Items List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  No pending {activeTab === "all" ? "transactions" : activeTab} found
                  {searchQuery && " matching your search"}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredItems.map((item, index) => {
                  const handlers = getActionHandlers(item);
                  const itemType = item.type; // Use the type from the item directly
                  
                  return (
                    <motion.div
                      key={`${itemType}-${item.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
                    >
                      {/* Mobile View */}
                      <div className="block sm:hidden p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getItemIcon(itemType)}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                {item.memberName}
                              </h3>
                              <span
                                className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium border ${getItemBadgeColor(
                                  itemType
                                )}`}
                              >
                                {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                              </span>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            K{item.amount?.toLocaleString()}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p>Date: {item?.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : item.requestedDate ? new Date(item.requestedDate).toLocaleDateString() : ''}</p>
                          {item.purpose && <p className="mt-1">Purpose: {item.purpose}</p>}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">View</span>
                          </button>
                          <button
                            onClick={handlers.approve}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">{handlers.approveLabel || "Approve"}</span>
                          </button>
                          <button
                            onClick={handlers.reject}
                            className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Desktop View */}
                      <div className="hidden sm:flex items-center justify-between p-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            {getItemIcon(itemType)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {item?.memberName}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium border ${getItemBadgeColor(
                                  itemType
                                )}`}
                              >
                                {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.purpose || `${item?.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : item.requestedDate ? new Date(item.requestedDate).toLocaleDateString() : ''}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right mr-2">
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                              K{item.amount?.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item?.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : item.requestedDate ? new Date(item.requestedDate).toLocaleDateString() : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(item)}
                              className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handlers.approve}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{handlers.approveLabel || "Approve"}</span>
                            </button>
                            <button
                              onClick={handlers.reject}
                              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </motion.div>
        </>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getItemIcon(selectedItem.type)}
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Transaction Details
                      </h2>
                      <span
                        className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium border ${getItemBadgeColor(
                          selectedItem.type
                        )}`}
                      >
                        {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Member</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedItem.memberName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        K{selectedItem.amount?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedItem?.paymentDate ? new Date(selectedItem.paymentDate).toLocaleDateString() : selectedItem.requestedDate ? new Date(selectedItem.requestedDate).toLocaleDateString() : selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </span>
                    </div>
                  </div>

                  {selectedItem.purpose && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Purpose</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedItem.purpose}
                      </p>
                    </div>
                  )}

                  {selectedItem.type === "loan" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Interest</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            K{(selectedItem.interestAmount ?? selectedItem.interest_amount)?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            K{(selectedItem.totalAmount ?? selectedItem.total_amount)?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {(selectedItem.dueDate || selectedItem.due_date) && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {new Date(selectedItem.dueDate || selectedItem.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedItem.paymentMethod && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Payment Method</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedItem.paymentMethod}
                      </p>
                    </div>
                  )}

                  {selectedItem.proofUrl && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Payment Proof
                      </p>
                      {selectedItem.proofUrl.toLowerCase().endsWith('.pdf') ? (
                        <a
                          href={selectedItem.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          View PDF Proof
                        </a>
                      ) : (
                        <img
                          src={selectedItem.proofUrl}
                          alt="Payment proof"
                          className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={getActionHandlers(selectedItem).reject}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={getActionHandlers(selectedItem).approve}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{getActionHandlers(selectedItem).approveLabel || "Approve"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}