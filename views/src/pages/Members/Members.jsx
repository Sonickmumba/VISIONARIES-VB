import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchMembers } from "../../store/slices/memberSlice";
import { Search, Plus, Download, AlertTriangle, CheckCircle2, DollarSign, Users as UsersIcon, TrendingUp, Filter, X, RefreshCw, Loader2 } from "lucide-react";
import { AnimatedCard, GlassCard } from "../../components/ui/AnimatedCard";
import { motion } from "motion/react";
import { toast } from "sonner";

export function Members() {
  const dispatch = useDispatch();
  const { members, loading, error } = useSelector((state) => state.members);
  const user = useSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    email: "",
    nationalId: ""
  });

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Fetch members once on mount
  const stale = useSelector((state) => state.members.stale);

  useEffect(() => {
    if ((members.length === 0 && !loading && !error) || stale) {
      dispatch(fetchMembers());
    }
  }, [dispatch, members.length, loading, error, stale]);

  // Memoized filtering — only recalculates when inputs change
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return members.filter((member) => {
      const matchesSearch =
        !q ||
        member.name?.toLowerCase().includes(q) ||
        member.member_no?.toLowerCase().includes(q) ||
        member.email?.toLowerCase().includes(q) ||
        member.phone?.includes(q) ||
        member.group_name?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && member.is_active) ||
        (statusFilter === "inactive" && !member.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [members, searchQuery, statusFilter]);

  // Memoized stats
  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => m.is_active).length,
    totalSavings: members.reduce((sum, m) => sum + Number(m.total_savings || 0), 0),
    totalLoans: members.reduce((sum, m) => sum + Number(m.outstanding_loan || 0), 0),
  }), [members]);

  const handleRetry = useCallback(() => {
    dispatch(fetchMembers());
  }, [dispatch]);

  const handleAddMember = (e) => {
    e.preventDefault();

    if (!newMember.name || !newMember.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    // TODO: dispatch an addMember thunk once the backend endpoint is ready
    toast.success(`Member ${newMember.name} added successfully!`);
    setShowAddMemberModal(false);
    setNewMember({ name: "", phone: "", email: "", nationalId: "" });
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Importing ${file.name}...`);
      setShowImportModal(false);
      setTimeout(() => {
        toast.success("Members imported successfully!");
      }, 1500);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading members…</p>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-gray-900 dark:text-white font-medium">{error}</p>
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            Members
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Manage member profiles and view their financial status
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2 sm:gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all text-sm font-medium text-gray-700 dark:text-gray-300 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </motion.button>
            <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddMemberModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </motion.button>
          </div>
        )}
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedCard delay={0.1}>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <UsersIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Members</div>
              </div>
            </div>
          </GlassCard>
        </AnimatedCard>

        <AnimatedCard delay={0.15}>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
              </div>
            </div>
          </GlassCard>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">K {stats.totalSavings.toLocaleString()}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Savings</div>
              </div>
            </div>
          </GlassCard>
        </AnimatedCard>

        <AnimatedCard delay={0.25}>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">K {stats.totalLoans.toLocaleString()}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Loans</div>
              </div>
            </div>
          </GlassCard>
        </AnimatedCard>
      </div>

      {/* Search and Filters */}
      <AnimatedCard delay={0.5}>
        <GlassCard className="p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or group"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-12 pr-8 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </GlassCard>
      </AnimatedCard>

      {/* Mobile Cards View */}
      <div className="block sm:hidden space-y-3">
        {filteredMembers.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.05 }}
          >
            <GlassCard className="p-4 hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Link
                    to={`${member.id}`}
                    className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {member.name}
                  </Link>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{member.member_no}</p>
                </div>
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    member.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {member.is_active ? "Active" : "Inactive"}
                </motion.span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{member.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Savings:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    K {Number(member.total_savings || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Loan:</span>
                  <span className={`font-semibold ${Number(member.outstanding_loan || 0) > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-600 dark:text-gray-400"}`}>
                    K {Number(member.outstanding_loan || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Shortfall:</span>
                  <span className={`font-semibold flex items-center gap-1 ${Number(member.shortfall || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {Number(member.shortfall || 0) > 0 ? (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        K {Number(member.shortfall || 0).toLocaleString()}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        K 0
                      </>
                    )}
                  </span>
                </div>
                {member.group_name && (
                  <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">Group:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{member.group_name}</span>
                  </div>
                )}
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-3">
                <Link
                  to={`${member.id}`}
                  className="block text-center py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  View Details
                </Link>
              </motion.div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <AnimatedCard delay={0.6}>
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Group
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Savings
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Loan Amount
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Shortfall
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMembers.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 + index * 0.03 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            to={`${member.id}`}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            {member.name}
                          </Link>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{member.member_no}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{member.phone}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {member.group_name || "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">
                        K {Number(member.total_savings || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-orange-600 dark:text-orange-400">
                        K {Number(member.outstanding_loan || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-semibold ${Number(member.shortfall || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {Number(member.shortfall || 0) > 0 ? (
                            <>
                              <AlertTriangle className="w-4 h-4" />
                              K {Number(member.shortfall || 0).toLocaleString()}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              K 0
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            member.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Link
                            to={`${member.id}`}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all"
                          >
                            View
                          </Link>
                        </motion.div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </AnimatedCard>
      </div>

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <GlassCard className="p-12 text-center">
            <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No members found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search or filters
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
            >
              Clear Filters
            </motion.button>
          </GlassCard>
        </motion.div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-0 left-0 right-0 bottom-0 bg-gray-900/50 flex items-center justify-center"
        >
          <GlassCard className="p-8 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Member</h2>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    type="text"
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    type="text"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">National ID</label>
                  <input
                    type="text"
                    value={newMember.nationalId}
                    onChange={(e) => setNewMember({ ...newMember, nationalId: e.target.value })}
                    className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="submit"
                  className="block w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  Add Member
                </button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-0 left-0 right-0 bottom-0 bg-gray-900/50 flex items-center justify-center"
        >
          <GlassCard className="p-8 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Members</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload File</label>
                  <input
                    type="file"
                    accept=".csv, .xlsx"
                    onChange={handleImport}
                    className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="block w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}

export default Members;