import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { repayLoan, fetchLoans } from "../store/slices/loanSlice";
import { CheckCircle, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export function RecordRepayment() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const members = useSelector((state) => state.members.members);
  const loans = useSelector((state) => state.loans.loans);
  const currentCycle = useSelector((state) => state.cycles?.currentCycle);
  const loansStale = useSelector((state) => state.loans?.stale);
  const loansLoading = useSelector((state) => state.loans?.loading);
  const selectedGroup = useSelector((state) => state.groups.selectedGroup);

  const loansFetched = useRef(false);

  // Fetch loans on mount / when stale
  useEffect(() => {
    if (currentCycle?.id && !loansLoading) {
      if (loansStale) loansFetched.current = false;
      if (!loansFetched.current) {
        loansFetched.current = true;
        dispatch(fetchLoans(currentCycle.id));
      }
    }
  }, [dispatch, currentCycle?.id, loansStale, loansLoading]);

  // Filter members by selected group
  const groupMembers = useMemo(
    () => members.filter(m => m.group_id === selectedGroup?.id),
    [members, selectedGroup?.id]
  );
  
  const [selectedMember, setSelectedMember] = useState(memberId || "");
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [referenceNo, setReferenceNo] = useState("");
  const [proofFile, setProofFile] = useState(null);

  // Find active loans for selected member (any loan with remaining balance, excluding rejected/defaulted)
  const memberLoans = useMemo(
    () => loans.filter(
      (l) => l.memberId === selectedMember && l.balance > 0 && !["rejected", "defaulted", "repaid"].includes(l.status)
    ),
    [loans, selectedMember]
  );

  const activeLoan = memberLoans.find((l) => l.id === selectedLoanId);
  const maxAmount = activeLoan ? activeLoan.balance : 0;
  // Only disbursed loans can accept repayments
  const canRepay = activeLoan?.status === "disbursed";

  // Auto-select loan when only one exists
  useEffect(() => {
    if (memberLoans.length === 1) {
      setSelectedLoanId(memberLoans[0].id);
    } else if (!memberLoans.find((l) => l.id === selectedLoanId)) {
      setSelectedLoanId("");
    }
  }, [selectedMember, memberLoans.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      toast.error("Please select a member");
      return;
    }
    if (!selectedLoanId) {
      toast.error("Please select a loan to repay");
      return;
    }
    const repayAmount = parseFloat(amount);
    if (!amount || isNaN(repayAmount) || repayAmount <= 0) {
      toast.error("Enter a valid repayment amount");
      return;
    }
    if (repayAmount > maxAmount) {
      toast.error(`Amount exceeds outstanding balance of K${maxAmount.toLocaleString()}`);
      return;
    }
    if (!proofFile) {
      toast.error("Please upload payment proof");
      return;
    }
    const noteParts = [];
    if (paymentMethod) noteParts.push(`Payment method: ${paymentMethod.replace("_", " ")}`);
    if (referenceNo) noteParts.push(`Ref: ${referenceNo}`);

    try {
      // Upload the proof file first
      const formData = new FormData();
      formData.append('proof', proofFile);
      const uploadResponse = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const proofUrl = uploadResponse.data.url;

      await dispatch(repayLoan({
        loanId: selectedLoanId,
        amount: repayAmount,
        proofUrl,
        notes: noteParts.join(" | "),
      })).unwrap();
      toast.success("Repayment recorded! Awaiting verification.");
      setAmount("");
      setReferenceNo("");
      setProofFile(null);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">💳 Record Repayment</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          Record loan repayments from members
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Member selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Member
              </label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Choose a member...</option>
                {groupMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Loan selection (when member has multiple active loans) */}
            {selectedMember && memberLoans.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">No outstanding loans found for this member.</p>
              </div>
            )}

            {activeLoan && !canRepay && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  This loan is <strong>{activeLoan.status}</strong> — it needs to be <strong>disbursed</strong> by an admin before a repayment can be recorded. Go to <strong>Approvals</strong> to disburse it.
                </p>
              </div>
            )}

            {memberLoans.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Loan
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Choose a loan...</option>
                  {memberLoans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      [{loan.status.toUpperCase()}] K{Number(loan.amount).toLocaleString()} — Balance: K{Number(loan.balance).toLocaleString()} — {loan.purpose || "No purpose"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Loan summary card */}
            {activeLoan && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeLoan.status === "disbursed"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : activeLoan.status === "approved"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  }`}>
                    {activeLoan.status.charAt(0).toUpperCase() + activeLoan.status.slice(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Principal</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">K{Number(activeLoan.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Interest</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">K{Number(activeLoan.interestAmount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">K{Number(activeLoan.balance).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {activeLoan.dueDate ? new Date(activeLoan.dueDate).toLocaleDateString() : "—"}
                  </p>
                </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repayment Amount (K)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={activeLoan ? `Max: K${maxAmount.toLocaleString()}` : "Enter amount"}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                min="0"
                max={maxAmount || undefined}
                step="0.01"
                required
              />
              {amount && parseFloat(amount) > maxAmount && maxAmount > 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Amount exceeds outstanding balance of K{maxAmount.toLocaleString()}</p>
              )}
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>

            {/* Reference number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Transaction ID or reference"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            {/* Upload proof */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Payment Proof
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files[0])}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                PNG, JPG, PDF up to 10MB
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                onClick={handleCancel}
                disabled={loansLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loansLoading || !selectedLoanId || !canRepay}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{loansLoading ? 'Recording...' : 'Record Repayment'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}