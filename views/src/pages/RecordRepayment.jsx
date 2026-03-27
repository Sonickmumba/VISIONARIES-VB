import { useState } from "react";
import { useParams } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { addRepayment } from "../store/slices/loanSlice";
import { CheckCircle, Upload } from "lucide-react";
import { toast } from "sonner";

export function RecordRepayment() {
  const { memberId } = useParams();
  const dispatch = useDispatch();
  const members = useSelector((state) => state.members.members);
  const loans = useSelector((state) => state.loans.loans);
  const selectedGroup = useSelector((state) => state.groups.selectedGroup);
  
  // Filter members by selected group
  const groupMembers = members.filter(m => m.groupId === selectedGroup?.id);
  
  const [selectedMember, setSelectedMember] = useState(memberId || "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [referenceNo, setReferenceNo] = useState("");

  // Find active loans for selected member
  const memberLoans = loans.filter(l => l.memberId === selectedMember && l.balance > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (memberLoans.length === 0) {
      toast.error("No active loans found for this member");
      return;
    }

    const repayment = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      paymentDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      verifiedBy: null,
      verifiedAt: null,
      paymentMethod,
      referenceNo,
    };

    // Add to the first active loan (you can modify this logic)
    dispatch(addRepayment({
      loanId: memberLoans[0].id,
      repayment,
    }));

    toast.success("Repayment recorded! Awaiting verification.");
    setAmount("");
    setReferenceNo("");
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
                    {member.name} - Outstanding: K{member.currentLoans.toLocaleString()}
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
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Record Repayment</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}