import { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Info, Calculator, Loader2 } from "lucide-react";
import { fetchMembers } from "../store/slices/memberSlice";
import { fetchCyclesByGroup, fetchShareoutByCycle, fetchCycleStatistics } from "../store/slices/cycleSlice";
import { fetchLoans } from "../store/slices/loanSlice";
import { fetchSavingsByCycle } from "../store/slices/savingsSlice";

const INTEREST_RATE = 0.15;
const LOAN_THRESHOLD = 20000;

/**
 * CommonInterestCalculator Component
 *
 * Displays the common interest calculation breakdown using
 * real data from the Redux store and backend API.
 */
export function CommonInterestCalculator() {
  const dispatch = useDispatch();

  // ── Redux state ────────────────────────────────────────────────────────────
  const members = useSelector((state) => state.members.members);
  const membersLoading = useSelector((state) => state.members.loading);
  const currentCycle = useSelector((state) => state.cycles.currentCycle);
  const cycles = useSelector((state) => state.cycles.cycles);
  const cyclesLoading = useSelector((state) => state.cycles.loading);
  const selectedGroup = useSelector((state) => state.groups.selectedGroup);
  const loans = useSelector((state) => state.loans.loans);
  const savings = useSelector((state) => state.savings.savings);
  const shareoutData = useSelector((state) => state.cycles.shareoutData);
  const shareoutLoading = useSelector((state) => state.cycles.shareoutLoading);

  // ── Fetch data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (members.length === 0) dispatch(fetchMembers());
  }, [dispatch, members.length]);

  useEffect(() => {
    if (selectedGroup?.id && cycles.length === 0) {
      dispatch(fetchCyclesByGroup(selectedGroup.id));
    }
  }, [dispatch, selectedGroup?.id, cycles.length]);

  const activeCycle = useMemo(() => {
    if (currentCycle?.id) return currentCycle;
    return cycles.find((c) => c.status === "active") || cycles[0] || null;
  }, [currentCycle, cycles]);

  useEffect(() => {
    if (activeCycle?.id) {
      dispatch(fetchLoans(activeCycle.id));
      dispatch(fetchSavingsByCycle(activeCycle.id));
      dispatch(fetchShareoutByCycle(activeCycle.id));
    }
  }, [dispatch, activeCycle?.id]);

  // ── Computed values ────────────────────────────────────────────────────────

  // Total verified savings for the cycle
  const totalAvailable = useMemo(() => {
    if (savings.length > 0) {
      return savings
        .filter((s) => s.status === "verified")
        .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    }
    return members.reduce(
      (sum, m) => sum + Number(m.total_savings || m.totalSavings || m.currentSavings || 0),
      0
    );
  }, [savings, members]);

  // Total disbursed loans
  const totalLoaned = useMemo(() => {
    if (loans.length > 0) {
      return loans
        .filter((l) => l.status === "disbursed" || l.status === "repaid")
        .reduce((sum, l) => sum + Number(l.amount || 0), 0);
    }
    return members.reduce(
      (sum, m) => sum + Number(m.total_loan_borrowed || m.loanBorrowed || m.total_loans || 0),
      0
    );
  }, [loans, members]);

  const unborrowed = Math.max(0, totalAvailable - totalLoaned);
  const commonInterestPool = unborrowed * INTEREST_RATE;

  // Build per-member loan amounts from the loans slice
  const loanByMember = useMemo(() => {
    const map = {};
    loans
      .filter((l) => l.status === "disbursed" || l.status === "repaid")
      .forEach((l) => {
        const uid = l.user_id || l.userId;
        map[uid] = (map[uid] || 0) + Number(l.amount || 0);
      });
    return map;
  }, [loans]);

  // Identify members with shortfall (borrowed < K20,000 and NOT exempt)
  const membersWithShortfall = useMemo(() => {
    return members
      .filter((m) => {
        if (m.paid_mandatory_upfront || m.paidMandatoryUpfront) return false;
        const memberLoan = loanByMember[m.id] || loanByMember[m.user_id] || 0;
        return memberLoan < LOAN_THRESHOLD;
      })
      .map((m) => {
        const memberLoan = loanByMember[m.id] || loanByMember[m.user_id] || 0;
        return {
          id: m.id || m.user_id,
          name: m.name || `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Unknown",
          shortfall: LOAN_THRESHOLD - memberLoan,
          loanAmount: memberLoan,
        };
      });
  }, [members, loanByMember]);

  const totalShortfall = useMemo(
    () => membersWithShortfall.reduce((sum, m) => sum + m.shortfall, 0),
    [membersWithShortfall]
  );

  // Distribution: proportional share per member
  const commonInterestDistribution = useMemo(() => {
    if (totalShortfall === 0) return [];
    return membersWithShortfall.map((m) => ({
      ...m,
      commonInterest: Math.round(((m.shortfall / totalShortfall) * commonInterestPool) * 100) / 100,
    }));
  }, [membersWithShortfall, totalShortfall, commonInterestPool]);

  // Exempt members (paid K3,000 upfront)
  const exemptMembers = useMemo(
    () => members.filter((m) => m.paid_mandatory_upfront || m.paidMandatoryUpfront),
    [members]
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (membersLoading || cyclesLoading || shareoutLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-purple-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading common interest data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Calculator className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Common Interest Breakdown
          </h3>
          {activeCycle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cycle: {activeCycle.name}
            </p>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
            Common interest is calculated from unborrowed group funds and distributed proportionally
            among members with shortfall (those who borrowed less than K20,000 and didn&apos;t pay K3,000 upfront).
          </p>
        </div>
      </div>

      {/* Step 1: Unborrowed Funds */}
      <div className="space-y-3">
        <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Step 1: Calculate Unborrowed Funds
          </h4>
          <div className="space-y-1.5 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Available (Savings):</span>
              <span className="font-medium text-gray-900 dark:text-white">K {totalAvailable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Loaned:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">- K {totalLoaned.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Unborrowed:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">K {unborrowed.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Step 2: Interest Pool */}
        <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h4 className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
            Step 2: Calculate Interest on Unborrowed
          </h4>
          <div className="text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">K {unborrowed.toLocaleString()} × 15%</span>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                K {commonInterestPool.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-400 mt-2">
              This is the common interest pool to be distributed
            </p>
          </div>
        </div>

        {/* Step 3: Total Shortfall */}
        <div className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <h4 className="text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">
            Step 3: Calculate Total Shortfall
          </h4>
          <div className="space-y-2 text-xs sm:text-sm">
            {membersWithShortfall.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 italic">
                No members with shortfall — all members borrowed ≥ K20,000 or paid upfront.
              </p>
            ) : (
              <>
                {membersWithShortfall.slice(0, 3).map((member) => (
                  <div key={member.id} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {member.name} (borrowed K{member.loanAmount.toLocaleString()}):
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">K {member.shortfall.toLocaleString()}</span>
                  </div>
                ))}
                {membersWithShortfall.length > 3 && (
                  <div className="text-xs text-gray-500">
                    + {membersWithShortfall.length - 3} more members...
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between pt-2 border-t border-orange-200 dark:border-orange-800">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Total Shortfall:</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">K {totalShortfall.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Step 4: Distribution Formula */}
        <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
            Step 4: Proportional Distribution
          </h4>
          <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-xs sm:text-sm">
            <div className="text-center text-gray-700 dark:text-gray-300">
              <div>Your Common Interest =</div>
              <div className="my-2 text-base sm:text-lg font-bold">
                (Your Shortfall / Total Shortfall) × Interest Pool
              </div>
            </div>
          </div>
          {commonInterestDistribution.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {commonInterestDistribution.slice(0, 3).map((member) => (
                <div key={member.id} className="text-xs sm:text-sm">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-700 dark:text-gray-300">{member.name}:</span>
                    <span className="text-green-600 dark:text-green-400">
                      K {member.commonInterest.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    (K{member.shortfall.toLocaleString()} / K{totalShortfall.toLocaleString()}) × K{commonInterestPool.toLocaleString()}
                  </div>
                </div>
              ))}
              {commonInterestDistribution.length > 3 && (
                <div className="text-xs text-gray-500">
                  + {commonInterestDistribution.length - 3} more members...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Full Distribution Table */}
        {commonInterestDistribution.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Member</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Borrowed</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Shortfall</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Common Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {commonInterestDistribution.map((member, idx) => (
                  <tr key={member.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{member.name}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">K {member.loanAmount.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-orange-600 dark:text-orange-400">K {member.shortfall.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium text-purple-600 dark:text-purple-400">K {member.commonInterest.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-500">
                <tr>
                  <td className="px-4 py-2 font-bold text-gray-900 dark:text-white">Total</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-600 dark:text-gray-400">K {totalLoaned.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-bold text-orange-600 dark:text-orange-400">K {totalShortfall.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-bold text-purple-600 dark:text-purple-400">
                    K {commonInterestDistribution.reduce((s, m) => s + m.commonInterest, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Exempt Members */}
        {exemptMembers.length > 0 && (
          <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
              ✅ Exempt Members (Paid K3,000 Upfront)
            </h4>
            <div className="space-y-1 text-xs sm:text-sm">
              {exemptMembers.map((member) => (
                <div key={member.id || member.user_id} className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">
                    {member.name || `${member.first_name || ""} ${member.last_name || ""}`.trim()}
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-medium">K0 (Exempt)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
