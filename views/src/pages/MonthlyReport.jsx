import { useState, useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ArrowLeft, Download, Mail, Calendar, TrendingUp, Users, DollarSign, PiggyBank, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import html2pdf from "html2pdf.js";
import {
  fetchMonthlyReport,
  sendMonthlyReportEmail,
  setSelectedPeriod,
  selectMonthlyReportData,
  selectMonthlyReportLoading,
  selectMonthlyReportError,
  selectMonthlyReportEmailLoading,
  selectMonthlyReportEmailError,
  selectSelectedPeriod,
} from "../store/slices/monthlyReportSlice";

export function MonthlyReport() {
  const dispatch = useDispatch();
  const reportRef = useRef(null);

  // Redux state
  const reportData = useSelector(selectMonthlyReportData);
  const loading = useSelector(selectMonthlyReportLoading);
  const error = useSelector(selectMonthlyReportError);
  const emailLoading = useSelector(selectMonthlyReportEmailLoading);
  const emailError = useSelector(selectMonthlyReportEmailError);
  const { year: selectedYear, month: selectedMonth } = useSelector(selectSelectedPeriod);

  // Local state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ email: '', includeDetails: true });

  // Month options
  const months = useMemo(() => [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ], []);

  // Year options (current year ± 2 years)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  // Fetch report data when period changes
  useEffect(() => {
    if (selectedYear && selectedMonth) {
      dispatch(fetchMonthlyReport({ year: selectedYear, month: selectedMonth }));
    }
  }, [dispatch, selectedYear, selectedMonth]);

  // Handle period change
  const handlePeriodChange = (type, value) => {
    const newPeriod = {
      year: type === 'year' ? value : selectedYear,
      month: type === 'month' ? value : selectedMonth,
    };
    dispatch(setSelectedPeriod(newPeriod));
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    if (!reportRef.current || !reportData) return;

    try {
      toast.loading('Generating PDF...');

      const printContent = generatePDFContent();

      const opt = {
        margin: 10,
        filename: `Monthly_Report_${reportData.period.monthName}_${reportData.period.year}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      };

      await html2pdf().set(opt).from(printContent).save();

      toast.dismiss();
      toast.success('PDF exported successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export PDF');
      console.error('PDF export error:', error);
    }
  };

  // Handle email send
  const handleSendEmail = async () => {
    if (!emailData.email || !emailData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      await dispatch(sendMonthlyReportEmail({
        year: selectedYear,
        month: selectedMonth,
        emailData: {
          recipientEmail: emailData.email,
          subject: `Monthly Report - ${reportData?.period?.monthName} ${selectedYear}`,
          includeDetails: emailData.includeDetails,
        },
      })).unwrap();

      toast.success('Report sent successfully!');
      setShowEmailModal(false);
      setEmailData({ email: '', includeDetails: true });
    } catch (error) {
      toast.error('Failed to send report');
    }
  };

  // Generate PDF content
  const generatePDFContent = () => {
    if (!reportData) return '';

    const { period, summary, savings, loans, repayments, interest, memberActivity } = reportData;

    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h1 style="color: #1f2937; text-align: center; margin-bottom: 10px; font-size: 24px;">
          📊 Monthly Report - ${period.monthName} ${period.year}
        </h1>
        <p style="color: #6b7280; text-align: center; margin-bottom: 30px; font-size: 14px;">
          ${period.startDate} to ${period.endDate}
        </p>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 15px; font-size: 16px;">Summary</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div style="background: white; padding: 15px; border-radius: 6px;">
              <div style="font-size: 20px; font-weight: bold; color: #059669;">K ${summary.totalSavings.toLocaleString()}</div>
              <div style="color: #6b7280; font-size: 12px;">Total Savings</div>
              <div style="color: #6b7280; font-size: 11px;">${summary.activeMembers} active members</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px;">
              <div style="font-size: 20px; font-weight: bold; color: #dc2626;">K ${summary.totalLoansDisbursed.toLocaleString()}</div>
              <div style="color: #6b7280; font-size: 12px;">Loans Disbursed</div>
              <div style="color: #6b7280; font-size: 11px;">${summary.newLoans} new loans</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px;">
              <div style="font-size: 20px; font-weight: bold; color: #0891b2;">K ${summary.totalRepayments.toLocaleString()}</div>
              <div style="color: #6b7280; font-size: 12px;">Repayments</div>
              <div style="color: #6b7280; font-size: 11px;">${summary.completedRepayments} repayments</div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px;">
              <div style="font-size: 20px; font-weight: bold; color: #7c3aed;">K ${summary.totalInterestDistributed.toLocaleString()}</div>
              <div style="color: #6b7280; font-size: 12px;">Interest Distributed</div>
            </div>
          </div>
        </div>

        <h2 style="color: #1f2937; margin-top: 20px; margin-bottom: 15px; font-size: 16px;">Monthly Savings</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-weight: bold;">Member</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #d1d5db; font-weight: bold;">Amount</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #d1d5db; font-weight: bold;">Contributions</th>
            </tr>
          </thead>
          <tbody>
            ${savings.byMember.map((member) => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${member.name} (${member.memberNo})</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">K ${member.amount.toLocaleString()}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${member.contributionCount}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2 style="color: #1f2937; margin-top: 20px; margin-bottom: 15px; font-size: 16px;">Loan Activity</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px;">
          <div>
            <h3 style="color: #dc2626; margin-bottom: 10px;">Disbursements</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #fef2f2;">
                  <th style="padding: 6px; text-align: left; border-bottom: 1px solid #fecaca; font-weight: bold;">Member</th>
                  <th style="padding: 6px; text-align: right; border-bottom: 1px solid #fecaca; font-weight: bold;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${loans.disbursed.byMember.map((loan) => `
                  <tr>
                    <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${loan.name}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: right;">K ${loan.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div>
            <h3 style="color: #0891b2; margin-bottom: 10px;">Repayments</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #ecfeff;">
                  <th style="padding: 6px; text-align: left; border-bottom: 1px solid #a5f3fc; font-weight: bold;">Member</th>
                  <th style="padding: 6px; text-align: right; border-bottom: 1px solid #a5f3fc; font-weight: bold;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${repayments.byMember.map((repayment) => `
                  <tr>
                    <td style="padding: 6px; border-bottom: 1px solid #e5e7eb;">${repayment.name}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: right;">K ${repayment.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <p style="margin-top: 40px; font-size: 10px; color: #6b7280; text-align: center;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </p>
      </div>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">Loading monthly report...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-red-500 mb-4">⚠️</div>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={() => dispatch(fetchMonthlyReport({ year: selectedYear, month: selectedMonth }))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                📊 Monthly Report
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Track monthly savings, loans, and member activity
              </p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => handlePeriodChange('month', parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => handlePeriodChange('year', parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {reportData && (
          <>
            {/* Action Buttons */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={handleExportPDF}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                disabled={emailLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Send via Email</span>
                <span className="sm:hidden">Email</span>
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Savings</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      K {reportData.summary.totalSavings.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {reportData.summary.activeMembers} active members
                    </p>
                  </div>
                  <PiggyBank className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loans Disbursed</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      K {reportData.summary.totalLoansDisbursed.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {reportData.summary.newLoans} new loans
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Repayments</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      K {reportData.summary.totalRepayments.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {reportData.summary.completedRepayments} repayments
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Interest Distributed</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      K {reportData.summary.totalInterestDistributed.toLocaleString()}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </motion.div>
            </div>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Monthly Savings */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Savings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Contributions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {reportData.savings.byMember.slice(0, 10).map((member, index) => (
                        <tr key={member.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {member.name}
                            <div className="text-xs text-gray-500 dark:text-gray-400">{member.memberNo}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600 dark:text-green-400">
                            K {member.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                            {member.contributionCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Loan Activity */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Loan Activity</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {/* Disbursements */}
                  <div className="border-r border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Disbursements</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {reportData.loans.disbursed.byMember.slice(0, 8).map((loan) => (
                        <div key={loan.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-900 dark:text-white truncate">{loan.name}</div>
                            <div className="text-sm font-medium text-red-600 dark:text-red-400">
                              K {loan.amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Repayments */}
                  <div>
                    <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">Repayments</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {reportData.repayments.byMember.slice(0, 8).map((repayment) => (
                        <div key={repayment.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                          <div key={repayment.id} className="flex justify-between items-center">
                            <div className="text-sm text-gray-900 dark:text-white truncate">{repayment.name}</div>
                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              K {repayment.amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Hidden PDF content */}
            <div ref={reportRef} className="hidden">
              {/* PDF content will be generated dynamically */}
            </div>
          </>
        )}

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Monthly Report</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={emailData.email}
                    onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeDetails"
                    checked={emailData.includeDetails}
                    onChange={(e) => setEmailData({ ...emailData, includeDetails: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeDetails" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Include detailed member breakdown
                  </label>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={emailLoading || !emailData.email}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {emailLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}