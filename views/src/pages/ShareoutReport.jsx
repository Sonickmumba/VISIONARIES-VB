import { Link } from "react-router";
import { ArrowLeft, Download, Printer, Mail, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useSelector } from "react-redux";

export function ShareoutReport() {
  const members = useSelector((state) => state.members.members);
  const currentCycle = useSelector((state) => state.cycles.currentCycle);
  const selectedGroup = useSelector((state) => state.groups.selectedGroup);
  const loans = useSelector((state) => state.loans.loans);

  // Filter members by selected group
  const groupMembers = members.filter(m => m.groupId === selectedGroup?.id);

  // Calculate shareout for each member
  const shareoutData = groupMembers.map((member) => {
    const commonInterestOwed = member.shortfall > 0 ? (member.shortfall * 0.15) : 0;

    const savings = member.totalSavings || 0;
    const loanOwed = member.loanBalance || 0;
    const penalty = 0; // Add penalty logic if needed
    
    // Shareout = Savings - Loan Owed - Common Interest Owed - Penalties
    const shareout = savings - loanOwed - commonInterestOwed - penalty;

    return {
      ...member,
      savings,
      loanOwed,
      penalty,
      commonInterestOwed,
      shareout,
      payoutStatus: shareout > 0 ? "pending" : "owes",
    };
  });

  const totalSavings = shareoutData.reduce((sum, item) => sum + item.savings, 0);
  const totalLoansOutstanding = shareoutData.reduce((sum, item) => sum + item.loanOwed, 0);
  const totalPenalties = shareoutData.reduce((sum, item) => sum + item.penalty, 0);
  const totalCommonInterest = shareoutData.reduce((sum, item) => sum + item.commonInterestOwed, 0);
  const netAvailable = totalSavings - totalLoansOutstanding - totalPenalties - totalCommonInterest;

  const membersToReceive = shareoutData.filter((item) => item.shareout > 0).length;
  const membersWhoOwe = shareoutData.filter((item) => item.shareout < 0).length;
  const totalToPayout = shareoutData
    .filter((item) => item.shareout > 0)
    .reduce((sum, item) => sum + item.shareout, 0);
  const totalToCollect = Math.abs(
    shareoutData
      .filter((item) => item.shareout < 0)
      .reduce((sum, item) => sum + item.shareout, 0)
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">📊 Cycle 11 Shareout Report</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">December 2026</p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
          </button>
        </div>
      </div>

      {/* Cycle Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-4 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <p className="text-blue-100 text-xs sm:text-sm">Cycle Period</p>
            <p className="font-semibold text-sm sm:text-base mt-1">
              {new Date(currentCycle.startDate).toLocaleDateString()} -{" "}
              {new Date(currentCycle.endDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-xs sm:text-sm">Shareout Date</p>
            <p className="font-semibold text-sm sm:text-base mt-1">December 31, 2026</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs sm:text-sm">Total Members</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{members.length}</p>
          </div>
          <div>
            <p className="text-blue-100 text-xs sm:text-sm">Net Available</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">K {netAvailable.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Common Interest Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 text-sm sm:text-base mb-1">
              Common Interest Calculation
            </h4>
            <p className="text-xs sm:text-sm text-blue-800">
              Members who borrowed less than K20,000 must pay common interest proportional to their shortfall. 
              Common interest = (Your shortfall / Total shortfall) × Interest on unborrowed funds.
              Those who paid K3,000 upfront are exempt.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Total Savings Pool</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">K {totalSavings.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Loans Outstanding</p>
          <p className="text-lg sm:text-xl font-bold text-orange-600 mt-1">
            K {totalLoansOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Common Interest</p>
          <p className="text-lg sm:text-xl font-bold text-purple-600 mt-1">K {totalCommonInterest.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600">Net Available</p>
          <p className="text-lg sm:text-xl font-bold text-green-600 mt-1">K {netAvailable.toLocaleString()}</p>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="block sm:hidden space-y-3">
        {shareoutData.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.memberNo}</p>
              </div>
              <span
                className={`text-lg font-bold ${
                  item.shareout >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {item.shareout >= 0 ? "+" : ""}K {item.shareout.toLocaleString()}
              </span>
            </div>
            
            <div className="space-y-2 text-sm border-t pt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Savings:</span>
                <span className="font-medium">K {item.savings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Owed:</span>
                <span className="font-medium text-orange-600">K {item.loanOwed.toLocaleString()}</span>
              </div>
              {item.commonInterestOwed > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Common Interest:</span>
                  <span className="font-medium text-purple-600">K {item.commonInterestOwed.toLocaleString()}</span>
                </div>
              )}
              {item.paidMandatoryUpfront && (
                <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  Paid K3,000 upfront (Exempt from common interest)
                </div>
              )}
              {item.shortfall > 0 && !item.paidMandatoryUpfront && (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                  Shortfall: K {item.shortfall.toLocaleString()}
                </div>
              )}
            </div>

            <div className="mt-3">
              {item.payoutStatus === "pending" && item.shareout > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending Payout
                </span>
              )}
              {item.payoutStatus === "owes" && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  ⚠️ OWES GROUP
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member Name
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Savings
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Owed
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Common Int
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Penalty
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SHAREOUT
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shareoutData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                      {item.paidMandatoryUpfront && (
                        <div className="text-xs text-green-600 mt-1">✓ Paid K3,000 upfront</div>
                      )}
                      {item.shortfall > 0 && !item.paidMandatoryUpfront && (
                        <div className="text-xs text-orange-600 mt-1">Shortfall: K{item.shortfall.toLocaleString()}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    K {item.savings.toLocaleString()}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    K {item.loanOwed.toLocaleString()}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                    K {item.commonInterestOwed.toLocaleString()}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    K {item.penalty.toLocaleString()}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          item.shareout >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {item.shareout >= 0 ? "+" : ""}K {item.shareout.toLocaleString()}
                      </span>
                      {item.payoutStatus === "pending" && item.shareout > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                      {item.payoutStatus === "owes" && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ⚠️ OWES
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td className="px-4 lg:px-6 py-4 font-bold text-gray-900">TOTAL</td>
                <td className="px-4 lg:px-6 py-4 font-bold text-gray-900">
                  K {totalSavings.toLocaleString()}
                </td>
                <td className="px-4 lg:px-6 py-4 font-bold text-orange-600">
                  K {totalLoansOutstanding.toLocaleString()}
                </td>
                <td className="px-4 lg:px-6 py-4 font-bold text-purple-600">
                  K {totalCommonInterest.toLocaleString()}
                </td>
                <td className="px-4 lg:px-6 py-4 font-bold text-gray-900">K {totalPenalties.toLocaleString()}</td>
                <td className="px-4 lg:px-6 py-4 font-bold text-green-600">
                  K {netAvailable.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payout Summary */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">📋 PAYOUT SUMMARY</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Members to Receive */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Members to Receive:</span>
              <span className="text-lg font-bold text-green-600">{membersToReceive}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total to Pay Out:</span>
              <span className="text-lg font-bold text-green-600">
                K {totalToPayout.toLocaleString()}
              </span>
            </div>
            <button className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Payouts</span>
            </button>
          </div>

          {/* Members Who Owe */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Members Who Owe:</span>
              <span className="text-lg font-bold text-red-600">{membersWhoOwe}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total to Collect:</span>
              <span className="text-lg font-bold text-red-600">
                K {totalToCollect.toLocaleString()}
              </span>
            </div>
            <button className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Record Collections</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}