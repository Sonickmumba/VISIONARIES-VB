import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { repayLoan } from "../store/slices/loanSlice";
import { CheckCircle, Upload } from "lucide-react";
import { toast } from "sonner";

export function RecordRepayment() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const members = useSelector((state) => state.members.members);
  const loans = useSelector((state) => state.loans.loans);

  console.log('DEBUG: Loans from state:', loans); // Debug log to check loans data

  const selectedGroup = useSelector((state) => state.groups.selectedGroup);
  const loading = useSelector((state) => state.loans.loading);

  // Filter members by selected group
  const groupMembers = members.filter(m => m.group_id === selectedGroup?.id);
  
  const [selectedMember, setSelectedMember] = useState(memberId || "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [referenceNo, setReferenceNo] = useState("");
  const [proofUrl] = useState(""); // Placeholder for file upload integration

  // Find active loans for selected member
  const memberLoans = loans.filter(l => l.memberId === selectedMember && l.balance > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      toast.error("Please select a member");
      return;
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      toast.error("Enter a valid repayment amount");
      return;
    }
    if (memberLoans.length === 0) {
      toast.error("No active loans found for this member");
      return;
    }
    try {
      await dispatch(repayLoan({
        loanId: memberLoans[0].id,
        amount: parseFloat(amount),
        proofUrl,
        notes: referenceNo,
      })).unwrap();
      toast.success("Repayment recorded! Awaiting verification.");
      setAmount("");
      setReferenceNo("");
    } catch (err) {
      toast.error(err || "Failed to record repayment");
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">💳 Record Repayment</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Record loan repayments from members
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
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
                    {member.name} - Outstanding: K{(member.outstanding_loan).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repayment Amount (K)
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
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Transaction ID or reference"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Payment Proof (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG, PDF up to 10MB
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{loading ? 'Recording...' : 'Record Repayment'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}