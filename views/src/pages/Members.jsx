import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Users as UsersIcon,
  Filter,
  Shield,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  HandCoins,
  Upload,
  UserPlus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { AnimatedCard, GlassCard, StatCard } from '../components/AnimatedCard';
import { useAuthStore } from '../store/authStore';

const PAGE_SIZE = 20;
const currencyFormatter = new Intl.NumberFormat('en-ZM', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toAmount = (...values) => {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  return 0;
};

const normalizeMembers = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.data || [];

  return list.map((member) => ({
    id: member.id,
    name: member.name || 'Unknown User',
    memberNo: member.member_no || member.memberNo || null,
    email: member.email || 'N/A',
    phone: member.phone || 'N/A',
    role: member.role || 'member',
    status: member.is_active ? 'active' : 'inactive',
    groupId: member.group_id || null,
    groupName: member.group_name || 'Unassigned',
    totalSavings: toAmount(member.total_savings, member.totalSavings, member.savings_total, member.savingsAmount),
    totalLoans: toAmount(member.total_loans, member.totalLoans, member.loan_total, member.loan_balance),
    createdAt: member.created_at,
  }));
};

const MemberRow = memo(function MemberRow({ member, index, onView }) {
  const shortfall = Math.max(member.totalLoans - member.totalSavings, 0);

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
    >
      <td className="px-6 py-4">
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{member.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{member.phone}</td>
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">K {currencyFormatter.format(member.totalSavings)}</td>
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">K {currencyFormatter.format(member.totalLoans)}</td>
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">K {currencyFormatter.format(shortfall)}</td>
      <td className="px-6 py-4 text-center">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            member.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {member.status}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          type="button"
          onClick={() => onView(member.id)}
          className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          View
        </button>
      </td>
    </motion.tr>
  );
});

const MemberCard = memo(function MemberCard({ member, index, onView }) {
  const shortfall = Math.max(member.totalLoans - member.totalSavings, 0);
  const memberCode = member.memberNo || 'N/A';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2) }}
    >
      <GlassCard className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-1xl sm:text-4xl font-bold text-blue-600 flex items-center gap-2">
              {member.name}
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400">{memberCode}</p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              member.status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {member.status}
          </span>
        </div>

        <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700 border-y border-gray-200 dark:border-gray-700">
          <div className="py-4 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Phone:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{member.phone}</span>
          </div>
          <div className="py-4 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Savings:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">K {currencyFormatter.format(member.totalSavings)}</span>
          </div>
          <div className="py-4 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Loan:</span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">K {currencyFormatter.format(member.totalLoans)}</span>
          </div>
          <div className="py-4 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Shortfall:</span>
            <span className={`inline-flex items-center gap-1 font-semibold ${shortfall > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
              <CheckCircle2 className="w-4 h-4" />
              K {currencyFormatter.format(shortfall)}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => onView(member.id)}
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-linear-to-r from-blue-500 to-purple-500 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            View Details
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
});

export function Members() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const deferredSearch = useDeferredValue(searchQuery);
  const userRole = String(user?.role || '').toLowerCase();
  const canManageMembers = userRole === 'super_admin' || userRole === 'admin';

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get('/api/users', {
        params: { role: 'member' },
      });

      setMembers(normalizeMembers(response.data));
    } catch (fetchError) {
      const message =
        fetchError.response?.data?.message ||
        fetchError.message ||
        'Failed to load members';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.phone.toLowerCase().includes(query) ||
        member.groupName.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [members, deferredSearch, statusFilter]);

  const stats = useMemo(() => {
    const active = members.filter((member) => member.status === 'active').length;
    const inactive = members.length - active;
    const assigned = members.filter((member) => member.groupId).length;
    const totalSavings = members.reduce((sum, member) => sum + member.totalSavings, 0);
    const totalLoans = members.reduce((sum, member) => sum + member.totalLoans, 0);

    return {
      total: members.length,
      active,
      inactive,
      assigned,
      totalSavings,
      totalLoans,
    };
  }, [members]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));

  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const onPrevPage = useCallback(() => {
    setCurrentPage((page) => Math.max(1, page - 1));
  }, []);

  const onNextPage = useCallback(() => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }, [totalPages]);

  const onViewMember = useCallback(
    (memberId) => {
      navigate(`/dashboard/members/${memberId}`);
    },
    [navigate]
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <UsersIcon className="w-8 h-8 text-blue-600" />
            Members
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Member directory with fast search, filters, and pagination
          </p>
        </div>

        {canManageMembers ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          </div>
        ) : null}
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard icon={UsersIcon} label="TOTAL MEMBERS" value={stats.total} color="blue" delay={0.05} />
        <StatCard icon={PiggyBank} label="TOTAL SAVINGS" value={`K ${currencyFormatter.format(stats.totalSavings)}`} color="green" delay={0.08} />
        <StatCard icon={HandCoins} label="TOTAL LOANS" value={`K ${currencyFormatter.format(stats.totalLoans)}`} color="purple" delay={0.1} />
        <StatCard icon={UserCheck} label="ACTIVE MEMBERS" value={stats.active} color="green" delay={0.1} />
        <StatCard icon={AlertTriangle} label="INACTIVE" value={stats.inactive} color="orange" delay={0.15} />
        <StatCard icon={Shield} label="ASSIGNED TO GROUP" value={stats.assigned} color="purple" delay={0.2} />
      </div>

      <AnimatedCard delay={0.25}>
        <GlassCard className="p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or group"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
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

      {loading ? (
        <AnimatedCard delay={0.3}>
          <GlassCard className="p-10 text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading members...</p>
          </GlassCard>
        </AnimatedCard>
      ) : error ? (
        <AnimatedCard delay={0.3}>
          <GlassCard className="p-10 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchMembers}
              className="px-4 py-2 bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </GlassCard>
        </AnimatedCard>
      ) : filteredMembers.length === 0 ? (
        <AnimatedCard delay={0.3}>
          <GlassCard className="p-10 text-center">
            <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No members found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try changing your search or status filter.</p>
          </GlassCard>
        </AnimatedCard>
      ) : (
        <>
          <div className="block sm:hidden space-y-3">
            {paginatedMembers.map((member, index) => (
              <MemberCard key={member.id} member={member} index={index} onView={onViewMember} />
            ))}
          </div>

          <div className="hidden sm:block">
            <AnimatedCard delay={0.3}>
              <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Member</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Savings</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Loan Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Shortfall</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedMembers.map((member, index) => (
                        <MemberRow key={member.id} member={member} index={index} onView={onViewMember} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </AnimatedCard>
          </div>

          <AnimatedCard delay={0.35}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredMembers.length)} of {filteredMembers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrevPage}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={onNextPage}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </AnimatedCard>
        </>
      )}
    </div>
  );
}

export default Members;
