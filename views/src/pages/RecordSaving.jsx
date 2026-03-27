import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { createBulkSavings, fetchSavingsByCycle } from "../store/slices/savingsSlice";
import { Save, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_SAVINGS = 30000;
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function RecordSavings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { members, loading: membersLoading } = useSelector((state) => state.members);
  const { submitting, savings: cycleSavings } = useSelector((state) => state.savings);
  const currentCycle = useSelector((state) => state.cycles.currentCycle);
  const selectedGroup = useSelector((state) => state.groups.selectedGroup);

  const [month, setMonth] = useState(null); // set after we know cycle range
  const [year, setYear] = useState(new Date().getFullYear());
  const [amounts, setAmounts] = useState({});

  // Fetch existing savings for the current cycle (to compute remaining allowance)
  useEffect(() => {
    if (currentCycle?.id) {
      dispatch(fetchSavingsByCycle(currentCycle.id));
    }
  }, [dispatch, currentCycle?.id]);

  // Compute months available within the cycle's date range
  const allowedMonths = useMemo(() => {
    if (!currentCycle?.start_date || !currentCycle?.end_date) return [];
    const start = new Date(currentCycle.start_date);
    const end = new Date(currentCycle.end_date);
    const result = [];
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= end) {
      result.push({ month: d.getMonth() + 1, year: d.getFullYear() });
      d.setMonth(d.getMonth() + 1);
    }
    return result;
  }, [currentCycle?.start_date, currentCycle?.end_date]);

  // Auto-select first allowed month if month not yet set
  useEffect(() => {
    if (allowedMonths.length > 0 && month === null) {
      const now = new Date();
      const cur = allowedMonths.find(
        (m) => m.month === now.getMonth() + 1 && m.year === now.getFullYear()
      );
      if (cur) {
        setMonth(cur.month);
        setYear(cur.year);
      } else {
        setMonth(allowedMonths[0].month);
        setYear(allowedMonths[0].year);
      }
    }
  }, [allowedMonths, month]);

  // Compute per-member cycle totals from loaded savings
  const memberCycleTotals = useMemo(() => {
    const totals = {};
    if (Array.isArray(cycleSavings)) {
      for (const s of cycleSavings) {
        const uid = s.user_id;
        totals[uid] = (totals[uid] || 0) + parseFloat(s.amount || 0);
      }
    }
    return totals;
  }, [cycleSavings]);

  // Filter members by selected group
  const groupMembers = useMemo(() => {
    if (!selectedGroup) return members;
    return members.filter((m) => m.group_id === selectedGroup.id);
  }, [members, selectedGroup]);

  const handleAmountChange = (memberId, value) => {
    setAmounts((prev) => ({ ...prev, [memberId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentCycle?.id) {
      toast.error("No active cycle selected");
      return;
    }

    const entries = [];
    for (const m of groupMembers) {
      const raw = amounts[m.id];
      const amt = parseFloat(raw);
      if (!raw || !Number.isFinite(amt) || amt <= 0) continue;

      const remaining = MAX_SAVINGS - (memberCycleTotals[m.id] || 0);
      if (amt > remaining) {
        toast.error(
          `${m.name} can only save K${remaining.toLocaleString()} more this cycle (already saved K${(memberCycleTotals[m.id] || 0).toLocaleString()})`
        );
        return;
      }
      entries.push({ userId: m.id, amount: amt });
    }

    if (entries.length === 0) {
      toast.error("Please enter at least one savings amount");
      return;
    }

    try {
      await dispatch(
        createBulkSavings({ cycleId: currentCycle.id, month, year, entries })
      ).unwrap();
      toast.success(`Savings recorded for ${entries.length} member(s)!`);
      navigate("..");
    } catch (err) {
      if (err?.duplicateUserIds?.length) {
        const dupeNames = err.duplicateUserIds
          .map((uid) => groupMembers.find((m) => m.id === uid)?.name || uid)
          .join(", ");
        toast.error(`Already recorded for ${MONTHS[(month || 1) - 1]} ${year}: ${dupeNames}`);
      } else if (err?.overLimitUsers?.length) {
        const names = err.overLimitUsers
          .map((u) => groupMembers.find((m) => m.id === u.userId)?.name || u.userId)
          .join(", ");
        toast.error(`Per-cycle limit exceeded for: ${names}`);
      } else {
        const msg = typeof err === "string" ? err : err?.message || "Failed to record savings";
        toast.error(msg);
      }
    }
  };

  const handleCancel = () => {
    navigate("..");
  };

  if (membersLoading && members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-600">Loading members…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">💰 Record Savings</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Record monthly savings{currentCycle ? ` for ${currentCycle.name}` : ""}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 text-sm sm:text-base">Important Information</h4>
            <p className="text-xs sm:text-sm text-blue-800 mt-1">
              • Maximum savings: K30,000 per member per cycle<br />
              • Interest rate: 15% compound interest<br />
              • Membership fee: K80 • Social fund: K240
            </p>
          </div>
        </div>
      </div>

      {/* Month / Year selector — restricted to cycle range */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={month || ""}
            onChange={(e) => {
              const val = e.target.value.split("-");
              setMonth(Number(val[0]));
              setYear(Number(val[1]));
            }}
            className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {allowedMonths.map((m) => (
              <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>
                {MONTHS[m.month - 1]} {m.year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Mobile View */}
          <div className="block sm:hidden divide-y">
            {groupMembers.map((m) => {
              const amount = parseFloat(amounts[m.id]) || 0;
              const cycleTotal = memberCycleTotals[m.id] || 0;
              const remaining = MAX_SAVINGS - cycleTotal;
              const exceedsRemaining = amount > remaining;

              return (
                <div key={m.id} className="p-4">
                  <p className="font-medium text-gray-900 mb-1">{m.name}</p>
                  <p className="text-xs text-gray-500 mb-1">{m.member_no}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Saved: K{cycleTotal.toLocaleString()} / K{MAX_SAVINGS.toLocaleString()} · Remaining: K{remaining.toLocaleString()}
                  </p>
                  {remaining <= 0 ? (
                    <p className="text-xs text-amber-600 font-medium">Cycle limit reached</p>
                  ) : (
                    <>
                      <input
                        type="number"
                        value={amounts[m.id] || ""}
                        onChange={(e) => handleAmountChange(m.id, e.target.value)}
                        placeholder="0.00"
                        className={`w-full px-3 py-2 border rounded-lg ${
                          exceedsRemaining ? "border-red-500" : "border-gray-300"
                        }`}
                        min="0"
                        max={remaining}
                        step="0.01"
                      />
                      {exceedsRemaining && (
                        <p className="text-xs text-red-600 mt-1">Max K{remaining.toLocaleString()} remaining this cycle</p>
                      )}
                      {amount > 0 && !exceedsRemaining && (
                        <p className="text-xs text-green-600 mt-1">
                          Interest: K{(amount * 0.15).toFixed(2)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saved / Limit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount (K)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interest (15%)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groupMembers.map((m, index) => {
                  const amount = parseFloat(amounts[m.id]) || 0;
                  const interest = amount * 0.15;
                  const cycleTotal = memberCycleTotals[m.id] || 0;
                  const remaining = MAX_SAVINGS - cycleTotal;
                  const exceedsRemaining = amount > remaining;

                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.member_no}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={remaining <= 0 ? "text-amber-600 font-medium" : "text-gray-600"}>
                          K{cycleTotal.toLocaleString()} / K{MAX_SAVINGS.toLocaleString()}
                        </span>
                        {remaining > 0 && (
                          <p className="text-xs text-gray-400">K{remaining.toLocaleString()} left</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {remaining <= 0 ? (
                          <span className="text-xs text-amber-600 font-medium">Limit reached</span>
                        ) : (
                          <>
                            <input
                              type="number"
                              value={amounts[m.id] || ""}
                              onChange={(e) => handleAmountChange(m.id, e.target.value)}
                              placeholder="0.00"
                              className={`w-32 px-3 py-2 border rounded-lg ${
                                exceedsRemaining ? "border-red-500" : "border-gray-300"
                              }`}
                              min="0"
                              max={remaining}
                              step="0.01"
                            />
                            {exceedsRemaining && (
                              <p className="text-xs text-red-600 mt-1">Max K{remaining.toLocaleString()}</p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">
                        K {interest.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {groupMembers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No members found{selectedGroup ? ` in ${selectedGroup.name}` : ""}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{submitting ? "Saving…" : "Save Savings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}