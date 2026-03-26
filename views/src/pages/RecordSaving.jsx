import { useState, useCallback, useMemo, memo, useEffect } from "react";
import {
  Save,
  AlertCircle,
  PiggyBank,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useData } from "../components/DataContext";

const MAX_SAVINGS = 30000;
const INTEREST_RATE = 0.15;
const MEMBERSHIP_FEE = 80;
const SOCIAL_FUND = 240;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currencyFormatter = new Intl.NumberFormat("en-ZM", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// ─── Memoised desktop table row ──────────────────────────────────────────────
const MemberSavingRow = memo(function MemberSavingRow({ item, index, onChange }) {
  const amount = parseFloat(item.amount) || 0;
  const interest = amount * INTEREST_RATE;
  const accumulated = amount + interest;
  const exceedsMax = amount > MAX_SAVINGS;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
    >
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
      <td className="px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.memberName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.memberNo}</p>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
        K {currencyFormatter.format(item.currentSavings)}
      </td>
      <td className="px-6 py-4">
        <div>
          <input
            type="number"
            value={item.amount}
            onChange={(e) => onChange(item.memberId, e.target.value)}
            placeholder="0.00"
            className={`w-32 px-3 py-1.5 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 dark:bg-gray-800 dark:text-white ${
              exceedsMax
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
            }`}
            min="0"
            max={MAX_SAVINGS}
            step="0.01"
          />
          {exceedsMax && <p className="text-xs text-red-600 mt-1">Max K30,000</p>}
        </div>
      </td>
      <td className="px-6 py-4 text-sm font-medium text-green-600 dark:text-green-400">
        K {currencyFormatter.format(interest)}
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-blue-700 dark:text-blue-400">
        K {currencyFormatter.format(accumulated)}
      </td>
    </motion.tr>
  );
});

// ─── Memoised mobile card ─────────────────────────────────────────────────────
const MemberSavingCard = memo(function MemberSavingCard({ item, onChange }) {
  const amount = parseFloat(item.amount) || 0;
  const interest = amount * INTEREST_RATE;
  const accumulated = amount + interest;
  const exceedsMax = amount > MAX_SAVINGS;

  return (
    <div className="p-4 border-b dark:border-gray-700 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.memberName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.memberNo}</p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
          Balance: K {currencyFormatter.format(item.currentSavings)}
        </span>
      </div>

      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
        Savings Amount (K)
      </label>
      <input
        type="number"
        value={item.amount}
        onChange={(e) => onChange(item.memberId, e.target.value)}
        placeholder="0.00"
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
          exceedsMax ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        }`}
        min="0"
        max={MAX_SAVINGS}
        step="0.01"
      />
      {exceedsMax && <p className="text-xs text-red-600 mt-1">Maximum K30,000 allowed</p>}

      {amount > 0 && !exceedsMax && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">Interest (15%)</p>
            <p className="text-sm text-green-800 dark:text-green-300 font-semibold">
              K {currencyFormatter.format(interest)}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Accumulated</p>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold">
              K {currencyFormatter.format(accumulated)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Main component ──────────────────────────────────────────────────────────
export function RecordSavings() {
  const {
    members,
    currentCycle,
    addSavings,
    isLoadingMembers,
    membersError,
    refreshMembers,
  } = useData();

  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savingsData, setSavingsData] = useState([]);

  useEffect(() => {
    setSavingsData((prev) => {
      const amountMap = new Map(prev.map((item) => [item.memberId, item.amount]));
      return members.map((m) => ({
        memberId: m.id,
        memberNo: m.memberNo,
        memberName: m.name,
        currentSavings: m.currentSavings,
        amount: amountMap.get(m.id) || "",
      }));
    });
  }, [members]);

  const handleAmountChange = useCallback((memberId, value) => {
    setSavingsData((prev) =>
      prev.map((item) => (item.memberId === memberId ? { ...item, amount: value } : item))
    );
  }, []);

  const handleReset = useCallback(() => {
    setSavingsData((prev) => prev.map((item) => ({ ...item, amount: "" })));
  }, []);

  // Derived totals — only recompute when savingsData changes
  const totals = useMemo(() => {
    return savingsData.reduce(
      (acc, item) => {
        const amount = parseFloat(item.amount) || 0;
        const interest = amount * INTEREST_RATE;
        return {
          totalAmount: acc.totalAmount + amount,
          totalInterest: acc.totalInterest + interest,
          totalAccumulated: acc.totalAccumulated + amount + interest,
          filledCount: acc.filledCount + (amount > 0 ? 1 : 0),
        };
      },
      { totalAmount: 0, totalInterest: 0, totalAccumulated: 0, filledCount: 0 }
    );
  }, [savingsData]);

  const hasErrors = useMemo(
    () => savingsData.some((item) => parseFloat(item.amount) > MAX_SAVINGS),
    [savingsData]
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (hasErrors) {
        toast.error("Please fix the amount errors before saving.");
        return;
      }
      const toRecord = savingsData.filter((item) => parseFloat(item.amount) > 0);
      if (toRecord.length === 0) {
        toast.warning("No savings amounts have been entered.");
        return;
      }
      setIsSubmitting(true);
      try {
        const monthNumber = selectedMonth + 1;
        const year = Number(cycleYear);
        await Promise.all(
          toRecord.map((item) =>
            addSavings(item.memberId, parseFloat(item.amount), monthNumber, year)
          )
        );
        toast.success(
          `Savings for ${MONTHS[selectedMonth]} recorded — ${toRecord.length} member${toRecord.length > 1 ? "s" : ""} updated.`
        );
        handleReset();
      } catch {
        toast.error("Failed to record savings. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [savingsData, selectedMonth, hasErrors, addSavings, handleReset]
  );

  const cycleYear = currentCycle?.startDate?.slice(0, 4) ?? new Date().getFullYear();

  if (!currentCycle) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-gray-500 dark:text-gray-400">Loading cycle data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <PiggyBank className="w-7 h-7 text-blue-600" />
          Record Savings
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          Record monthly savings for{" "}
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {currentCycle.name}
          </span>
        </p>
      </motion.div>

      {membersError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-red-700 dark:text-red-300">{membersError}</p>
            <button
              type="button"
              onClick={refreshMembers}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Live summary cards ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            icon: Users,
            color: "text-purple-600",
            label: "Members",
            value: (
              <>
                {totals.filledCount}
                <span className="text-base font-normal text-gray-500 dark:text-gray-400">
                  /{members.length}
                </span>
              </>
            ),
          },
          {
            icon: Wallet,
            color: "text-green-600",
            label: "Total Savings",
            value: `K ${currencyFormatter.format(totals.totalAmount)}`,
          },
          {
            icon: TrendingUp,
            color: "text-blue-600",
            label: "Total Interest",
            value: (
              <span className="text-green-600 dark:text-green-400">
                K {currencyFormatter.format(totals.totalInterest)}
              </span>
            ),
          },
          {
            icon: PiggyBank,
            color: "text-orange-600",
            label: "Accumulated",
            value: (
              <span className="text-blue-700 dark:text-blue-400">
                K {currencyFormatter.format(totals.totalAccumulated)}
              </span>
            ),
          },
        ].map(({ icon: Icon, color, label, value }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {label}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </motion.div>

      {isLoadingMembers ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading members...
          </div>
        </div>
      ) : null}

      {/* ── Info banner ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.14 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm sm:text-base">
              Important Information
            </h4>
            <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-400 mt-1">
              • Maximum savings: K30,000 per member per month
              <br />
              • Interest rate: 15% compound interest
              <br />• Membership fee: K{MEMBERSHIP_FEE} &bull; Social fund: K{SOCIAL_FUND}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Month selector ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
      >
        <label
          htmlFor="month-select"
          className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >
          Recording for month:
        </label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          {MONTHS.map((month, idx) => (
            <option key={month} value={idx}>
              {month} {cycleYear}
            </option>
          ))}
        </select>
      </motion.div>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.24 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          {/* Mobile cards */}
          <div className="block sm:hidden divide-y dark:divide-gray-700">
            {savingsData.map((item) => (
              <MemberSavingCard key={item.memberId} item={item} onChange={handleAmountChange} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-600">
                <tr>
                  {["#", "Member", "Current Balance (K)", "Amount (K)", "Interest (15%)", "Accumulated"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {savingsData.map((item, index) => (
                  <MemberSavingRow
                    key={item.memberId}
                    item={item}
                    index={index}
                    onChange={handleAmountChange}
                  />
                ))}
              </tbody>

              {/* Totals footer */}
              {totals.totalAmount > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 text-right"
                    >
                      Totals:
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                      K {currencyFormatter.format(totals.totalAmount)}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-green-600 dark:text-green-400">
                      K {currencyFormatter.format(totals.totalInterest)}
                    </td>
                    <td className="px-6 py-3 text-sm font-bold text-blue-700 dark:text-blue-400">
                      K {currencyFormatter.format(totals.totalAccumulated)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </motion.div>

        {/* ── Action bar ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.28 }}
          className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totals.filledCount} of {members.length} members entered
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors text-sm flex-1 sm:flex-none"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasErrors || isLoadingMembers || members.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Savings
                </>
              )}
            </button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
