import { memo, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  IdCard,
  Calendar,
  PiggyBank,
  HandCoins,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Activity,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnimatedCard, GlassCard, StatCard } from '../components/AnimatedCard';

const currencyFormatter = new Intl.NumberFormat('en-ZM', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-ZM', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatCurrency = (value) => `K ${currencyFormatter.format(toAmount(value))}`;

const DetailItem = memo(function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
      <div className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
});

const ActivityList = memo(function ActivityList({ title, icon: Icon, items, emptyText, renderMeta }) {
  return (
    <GlassCard className="p-5 h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = renderMeta(item);

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{meta.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{meta.subtitle}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${meta.statusClass}`}>
                    {meta.statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>
      )}
    </GlassCard>
  );
});

const normalizeMemberDetail = (payload) => {
  const member = payload?.data || payload || {};

  return {
    id: member.id,
    memberNo: member.member_no || 'N/A',
    name: member.name || 'Unknown User',
    email: member.email || 'N/A',
    phone: member.phone || 'N/A',
    nationalId: member.national_id || 'N/A',
    role: member.role || 'member',
    status: member.is_active ? 'active' : 'inactive',
    groupName: member.group_name || 'Unassigned',
    cycleName: member.cycle_name || 'No Active Cycle',
    cycleStatus: member.cycle_status || 'n/a',
    cycleStartDate: member.cycle_start_date,
    cycleEndDate: member.cycle_end_date,
    joinDate: member.created_at,
    totalSavings: toAmount(member.total_savings),
    savingsInterest: toAmount(member.total_savings_interest),
    totalLoanBorrowed: toAmount(member.total_loan_borrowed),
    outstandingLoan: toAmount(member.outstanding_loan),
    shortfall: toAmount(member.shortfall),
    commonInterestAmount: toAmount(member.common_interest_amount),
    verifiedSavingsCount: Number(member.verified_savings_count || 0),
    pendingSavingsCount: Number(member.pending_savings_count || 0),
    activeLoansCount: Number(member.active_loans_count || 0),
    pendingLoansCount: Number(member.pending_loans_count || 0),
    recentSavings: Array.isArray(member.recent_savings) ? member.recent_savings : [],
    recentLoans: Array.isArray(member.recent_loans) ? member.recent_loans : [],
  };
};

export function MemberDetail() {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchMemberDetails = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await axios.get(`/api/users/${memberId}/details`);

        if (!mounted) return;
        setMember(normalizeMemberDetail(response.data));
      } catch (fetchError) {
        if (!mounted) return;
        setError(
          fetchError.response?.data?.message ||
            fetchError.message ||
            'Failed to load member details'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchMemberDetails();

    return () => {
      mounted = false;
    };
  }, [memberId]);

  const loanStatus = useMemo(() => {
    if (!member) return null;

    if (member.commonInterestAmount === 0 && member.shortfall === 0) {
      return {
        tone: 'blue',
        title: 'Target achieved',
        description: 'Member has met the minimum threshold with no common interest due.',
      };
    }

    if (member.shortfall > 0) {
      return {
        tone: 'orange',
        title: 'Below threshold',
        description: `Shortfall of ${formatCurrency(member.shortfall)} requires common interest contribution of ${formatCurrency(member.commonInterestAmount)}.`,
      };
    }

    return {
      tone: 'green',
      title: 'In good standing',
      description: 'Member has no outstanding shortfall for the active cycle.',
    };
  }, [member]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="h-80 rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <AnimatedCard>
        <GlassCard className="p-10 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link
            to="/dashboard/members"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-linear-to-r from-blue-500 to-purple-500 text-white font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Members
          </Link>
        </GlassCard>
      </AnimatedCard>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <Link
            to="/dashboard/members"
            className="mt-1 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-1">{member.memberNo}</p>
            <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {member.name}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              {member.groupName} • {member.cycleName}
            </p>
          </div>
        </div>

        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold self-start ${member.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
          {member.status}
        </span>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={PiggyBank} label="CURRENT SAVINGS" value={formatCurrency(member.totalSavings)} color="green" delay={0.05} />
        <StatCard icon={HandCoins} label="LOAN BORROWED" value={formatCurrency(member.totalLoanBorrowed)} color="blue" delay={0.1} />
        <StatCard icon={Wallet} label="OUTSTANDING LOAN" value={formatCurrency(member.outstandingLoan)} color="orange" delay={0.15} />
        <StatCard icon={AlertCircle} label="SHORTFALL" value={formatCurrency(member.shortfall)} color="purple" delay={0.2} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <AnimatedCard delay={0.25}>
            <GlassCard className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${loanStatus.tone === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20' : loanStatus.tone === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                  {loanStatus.tone === 'orange' ? (
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  ) : (
                    <CheckCircle2 className={`w-5 h-5 ${loanStatus.tone === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`} />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Loan Status</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{loanStatus.title}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{loanStatus.description}</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Common Interest</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(member.commonInterestAmount)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active Loans</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{member.activeLoansCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pending Loans</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{member.pendingLoansCount}</p>
                </div>
              </div>
            </GlassCard>
          </AnimatedCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityList
              title="Recent Savings"
              icon={PiggyBank}
              items={member.recentSavings}
              emptyText="No savings records available yet."
              renderMeta={(saving) => ({
                title: formatCurrency(saving.amount),
                subtitle: `${saving.month}/${saving.year} • ${saving.payment_date ? dateFormatter.format(new Date(saving.payment_date)) : 'No payment date'}`,
                statusLabel: saving.status,
                statusClass:
                  saving.status === 'verified'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : saving.status === 'pending'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              })}
            />
            <ActivityList
              title="Recent Loans"
              icon={HandCoins}
              items={member.recentLoans}
              emptyText="No loan records available yet."
              renderMeta={(loan) => ({
                title: `${formatCurrency(loan.amount)} • ${loan.purpose || 'Loan record'}`,
                subtitle: `Outstanding ${formatCurrency(toAmount(loan.total_amount) - toAmount(loan.amount_repaid))}${loan.due_date ? ` • Due ${dateFormatter.format(new Date(loan.due_date))}` : ''}`,
                statusLabel: loan.status,
                statusClass:
                  loan.status === 'repaid'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : loan.status === 'pending'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              })}
            />
          </div>
        </div>

        <div className="space-y-6">
          <AnimatedCard delay={0.3}>
            <GlassCard className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Personal Information</h3>
              </div>
              <div className="space-y-3">
                <DetailItem icon={Phone} label="Phone" value={member.phone} />
                <DetailItem icon={Mail} label="Email" value={member.email} />
                <DetailItem icon={IdCard} label="National ID" value={member.nationalId} />
                <DetailItem icon={Calendar} label="Join Date" value={member.joinDate ? dateFormatter.format(new Date(member.joinDate)) : 'N/A'} />
                <DetailItem icon={Activity} label="Verified Savings" value={String(member.verifiedSavingsCount)} />
                <DetailItem icon={Activity} label="Pending Savings" value={String(member.pendingSavingsCount)} />
              </div>
            </GlassCard>
          </AnimatedCard>

          <AnimatedCard delay={0.35}>
            <div className="grid grid-cols-1 gap-3">
              <Link
                to="/dashboard/record-repayment"
                className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-linear-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Record Repayment
              </Link>
              <Link
                to="/dashboard/disburse-loan"
                className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Disburse Loan
              </Link>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}

export default MemberDetail;