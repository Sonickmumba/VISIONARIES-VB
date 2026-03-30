import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, IdCard, Calendar, PiggyBank, HandCoins, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMemberDetails, clearSelectedMember } from "../store/slices/memberSlice";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const statusColors = {
  verified: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  approved: "bg-blue-100 text-blue-700",
  disbursed: "bg-indigo-100 text-indigo-700",
  repaid: "bg-green-100 text-green-700",
  defaulted: "bg-red-100 text-red-700",
};

export function MemberDetail() {
  const { memberId } = useParams();
  const dispatch = useDispatch();
  const { selectedMember: member, loading, error } = useSelector((state) => state.members);

  useEffect(() => {
    dispatch(fetchMemberDetails(memberId));
    return () => { dispatch(clearSelectedMember()); };
  }, [dispatch, memberId]);

  if (loading && !member) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-gray-600">Loading member details…</p>
      </div>
    );
  }

  if (error && !member) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-900 font-medium">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => dispatch(fetchMemberDetails(memberId))}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <Link to=".." className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Back to Members
          </Link>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Member not found</p>
        <Link to=".." className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Back to Members
        </Link>
      </div>
    );
  }

  // Safe defaults from backend snake_case fields
  const totalSavings = Number(member.total_savings || 0);
  const totalLoanBorrowed = Number(member.total_loan_borrowed || 0);
  const outstandingLoan = Number(member.outstanding_loan || 0);
  const shortfall = Number(member.shortfall || 0);
  const commonInterestOwed = Number(member.common_interest_amount || 0);
  const recentSavings = member.recent_savings || [];
  const recentLoans = member.recent_loans || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link to="/dashboard/members" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{member.name}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{member.member_no}</p>
        </div>
      </div>

      {/* Member Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <PiggyBank className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Current Savings</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-green-600">
            K {totalSavings.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HandCoins className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Loan Borrowed</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">
            K {totalLoanBorrowed.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <HandCoins className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-600">Outstanding Loan</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-orange-600">
            K {outstandingLoan.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Shortfall</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-purple-600">
            K {shortfall.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Loan Status */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">📊 Loan Status</h3>
        <div className="space-y-3">
          {member.paid_mandatory_upfront ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-green-900">Paid K3,000 Upfront</p>
                  <p className="text-sm text-green-700">Exempt from common interest</p>
                </div>
              </div>
            </div>
          ) : shortfall === 0 ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Met K20,000 Minimum</p>
                  <p className="text-sm text-blue-700">No common interest required</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900">Below K20,000 Minimum</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Shortfall: K {shortfall.toLocaleString()} • Must pay common interest
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Common Interest Owed: K {commonInterestOwed.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">👤 Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-600">Phone Number</p>
              <p className="text-sm font-medium text-gray-900">{member.phone || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-600">Email Address</p>
              <p className="text-sm font-medium text-gray-900">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IdCard className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-600">National ID</p>
              <p className="text-sm font-medium text-gray-900">{member.national_id || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-600">Join Date</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(member.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Savings */}
      {recentSavings.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">💰 Recent Savings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-600 font-medium">Period</th>
                  <th className="text-right py-2 pr-4 text-gray-600 font-medium">Amount</th>
                  <th className="text-center py-2 text-gray-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSavings.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900">{MONTHS[s.month - 1]} {s.year}</td>
                    <td className="py-2 pr-4 text-right font-medium text-gray-900">K {Number(s.amount).toLocaleString()}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || "bg-gray-100 text-gray-700"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Loans */}
      {recentLoans.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">🏦 Recent Loans</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-600 font-medium">Purpose</th>
                  <th className="text-right py-2 pr-4 text-gray-600 font-medium">Amount</th>
                  <th className="text-right py-2 pr-4 text-gray-600 font-medium">Repaid</th>
                  <th className="text-center py-2 text-gray-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLoans.map((l) => (
                  <tr key={l.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900">{l.purpose || "—"}</td>
                    <td className="py-2 pr-4 text-right font-medium text-gray-900">K {Number(l.total_amount).toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">K {Number(l.amount_repaid || 0).toLocaleString()}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status] || "bg-gray-100 text-gray-700"}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to={`../record-repayment/${member.id}`}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
        >
          Record Repayment
        </Link>
        <Link
          to="../disburse-loan"
          className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center font-medium"
        >
          Disburse Loan
        </Link>
      </div>
    </div>
  );
}