import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createLoan } from "../store/slices/loanSlice";
import { fetchMembers } from "../store/slices/memberSlice";
import { DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function DisburseLoan() {
  const dispatch = useDispatch();
  const members = useSelector((state) => state.members.members);
  const selectedGroup = useSelector((state) => state.groups.selectedGroup);
  const currentCycle = useSelector((state) => state.cycles.currentCycle);

  // Filter members by selected group
  const groupMembers = members.filter(m => m.group_id === selectedGroup?.id);

  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  const selectedMemberData = groupMembers.find((m) => m.id === selectedMember);
  const loanInterest = Math.max(parseFloat(amount) * 0.15, 0) || 0; // 15% or minimum K3,000
  const totalRepayment = parseFloat(amount) + loanInterest || 0;
  
  const newBorrowedTotal = (selectedMemberData?.loanAmount || 0) + parseFloat(amount || 0);
  const newShortfall = Math.max(0, 3000 - loanInterest);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember || !amount || !purpose) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await dispatch(createLoan({
        cycleId: currentCycle.id,
        userId: selectedMember,
        amount: parseFloat(amount),
        purpose,
        memberName: selectedMemberData?.name,
      })).unwrap();
      toast.success(`Loan of K${parseFloat(amount).toLocaleString()} disbursed successfully!`);
      dispatch(fetchMembers()); // Refresh member data
      setSelectedMember("");
      setAmount("");
      setPurpose("");
    } catch (err) {
      toast.error(err || "Failed to disburse loan");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">💵 Disburse Loan</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Process loan disbursements to members
        </p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-900 text-sm sm:text-base">Loan Requirements</h4>
            <p className="text-xs sm:text-sm text-orange-800 mt-1">
              • Interest rate: 15% on loan amount, minimum K3,000<br />
              • Minimum loan requirement: K20,000 per member<br />
              • Members who borrow less than K20,000 must pay common interest<br />
              • Members can pay K3,000 upfront to be exempt from common interest
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Loan Form */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Loan Details</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Member
              </label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Choose a member...</option>
                {groupMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.memberNo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Amount (K)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose of Loan
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Enter purpose"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {amount && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Loan Amount:</span>
                  <span className="font-semibold">K {parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Interest (15%):</span>
                  <span className="font-semibold text-orange-600">K {loanInterest.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-600 font-medium">Total Repayment:</span>
                  <span className="font-bold text-blue-600">K {totalRepayment.toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <DollarSign className="w-5 h-5" />
              <span>Disburse Loan</span>
            </button>
          </form>
        </div>

        {/* Member Info */}
        {selectedMemberData && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Member Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Member Name</p>
                <p className="font-semibold text-gray-900">{selectedMemberData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Savings</p>
                <p className="font-semibold text-green-600">K {selectedMemberData.total_savings.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Borrowed</p>
                <p className="font-semibold text-blue-600">K {selectedMemberData.outstanding_loan.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Shortfall</p>
                <p className="font-semibold text-orange-600">K {selectedMemberData.shortfall.toLocaleString()}</p>
              </div>

              {amount && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">After This Loan:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Borrowed:</span>
                      <span className="font-semibold">K {newBorrowedTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">New Shortfall:</span>
                      <span className={`font-semibold ${newShortfall > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        K {newShortfall.toLocaleString()}
                      </span>
                    </div>
                    {newShortfall > 0 && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                        Member will need to pay common interest based on K{newShortfall.toLocaleString()} shortfall
                      </div>
                    )}
                    {newShortfall === 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        ✓ Member meets K20,000 minimum! No common interest required.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}