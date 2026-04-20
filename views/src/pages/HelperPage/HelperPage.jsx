import { Link } from "react-router-dom";
import { ArrowLeft, Info, DollarSign, TrendingUp, Users, Calculator } from "lucide-react";

export function HelpPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">💡 How It Works</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Understanding VISIONARIES VB</p>
        </div>
      </div>

      {/* Quick Facts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-900">Savings</span>
          </div>
          <p className="text-sm text-green-800">Max K30,000/month with 15% compound interest</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Loans</span>
          </div>
          <p className="text-sm text-blue-800">K20,000 minimum with 15% interest rate</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-900">Common Interest</span>
          </div>
          <p className="text-sm text-purple-800">Proportional to your shortfall from K20,000</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-orange-900">Mandatory</span>
          </div>
          <p className="text-sm text-orange-800">Everyone must contribute K3,000 to group fund</p>
        </div>
      </div>

      {/* The K3,000 Rule */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
          🎯 The K3,000 Mandatory Rule
        </h2>
        <p className="text-sm sm:text-base text-gray-700 mb-4">
          Every member MUST contribute K3,000 to the group fund. How you pay depends on your borrowing:
        </p>

        <div className="space-y-3">
          {/* Scenario 1 */}
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <h3 className="font-semibold text-green-900 mb-2">✅ Borrow K20,000 or More</h3>
            <p className="text-sm text-green-800 mb-2">
              Your loan interest automatically covers the K3,000 requirement
            </p>
            <div className="bg-white rounded p-3 text-sm font-mono">
              Borrow K25,000 → Interest K3,750<br />
              K3,750 &gt; K3,000 ✅ REQUIREMENT MET
            </div>
          </div>

          {/* Scenario 2 */}
          <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
            <h3 className="font-semibold text-orange-900 mb-2">⚠️ Borrow Less Than K20,000</h3>
            <p className="text-sm text-orange-800 mb-2">
              You must pay loan interest + common interest (proportional to shortfall)
            </p>
            <div className="bg-white rounded p-3 text-sm font-mono">
              Borrow K15,000 → Interest K2,250<br />
              Shortfall: K5,000<br />
              Common Interest: Based on K5,000<br />
              Total Interest: K2,250 + Common Interest
            </div>
          </div>

          {/* Scenario 3 */}
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">💰 Don't Want to Borrow? Option A</h3>
            <p className="text-sm text-blue-800 mb-2">
              Pay K3,000 upfront to be EXEMPT from common interest
            </p>
            <div className="bg-white rounded p-3 text-sm font-mono">
              Pay K3,000 upfront ✅<br />
              Common Interest: K0 (EXEMPT)<br />
              No additional payments required
            </div>
          </div>

          {/* Scenario 4 */}
          <div className="p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
            <h3 className="font-semibold text-purple-900 mb-2">📊 Don't Want to Borrow? Option B</h3>
            <p className="text-sm text-purple-800 mb-2">
              Pay through common interest (K20,000 shortfall)
            </p>
            <div className="bg-white rounded p-3 text-sm font-mono">
              Shortfall: K20,000<br />
              Common Interest: Based on K20,000<br />
              (Highest common interest amount)
            </div>
          </div>
        </div>
      </div>

      {/* Common Interest Explained */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
          🧮 Common Interest Calculation
        </h2>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">What is Common Interest?</h3>
                <p className="text-sm text-blue-800">
                  Common interest is the <strong>interest earned on money that was NOT loaned out, total amount saved by member plus the total membership and social fund minus the total money loaned out</strong>. 
                  This interest is shared among members who borrowed any money from the fund for the first 3 month (meaning that each member who never borrowed will pay common interest). After 3 months, if a member borrowed less than K20,000 also must pay common interest (and didn't pay K3,000 upfront), 
                  proportional to their shortfall.<br />
                  <strong className="text-purple-600">Example:</strong> If the common interest pool is K46,500 and you had a K10,000 shortfall, you would pay (K10,000 / Total Shortfall) × K46,500 as your common interest charge.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Step-by-Step Example:</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-white rounded p-3">
                <strong className="text-purple-600">Step 1:</strong> Calculate Unborrowed Money<br />
                <span className="text-gray-600 ml-4">
                  Total Available: K930,000<br />
                  Total Loaned: K620,000<br />
                  Unborrowed: K310,000
                </span>
              </div>

              <div className="bg-white rounded p-3">
                <strong className="text-purple-600">Step 2:</strong> Calculate Interest on Unborrowed<br />
                <span className="text-gray-600 ml-4">
                  K310,000 × 15% = K46,500<br />
                  (This is the common interest pool)
                </span>
              </div>

              <div className="bg-white rounded p-3">
                <strong className="text-purple-600">Step 3:</strong> Calculate Total Shortfall<br />
                <span className="text-gray-600 ml-4">
                  Member A: K10,000 shortfall<br />
                  Member B: K5,000 shortfall<br />
                  Member C: K20,000 shortfall<br />
                  Total: K35,000
                </span>
              </div>

              <div className="bg-white rounded p-3">
                <strong className="text-purple-600">Step 4:</strong> Distribute Proportionally<br />
                <span className="text-gray-600 ml-4">
                  Member A: (K10,000 / K35,000) × K46,500 = K13,286<br />
                  Member B: (K5,000 / K35,000) × K46,500 = K6,643<br />
                  Member C: (K20,000 / K35,000) × K46,500 = K26,571
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compound Interest */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
          📈 Compound Interest on Savings
        </h2>
        <p className="text-sm sm:text-base text-gray-700 mb-4">
          Your savings earn 15% interest each month, calculated on your total accumulated balance:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-right">New Savings</th>
                <th className="px-4 py-2 text-right">Previous Balance</th>
                <th className="px-4 py-2 text-right">Interest (15%)</th>
                <th className="px-4 py-2 text-right">New Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="px-4 py-2">1</td>
                <td className="px-4 py-2 text-right">K30,000</td>
                <td className="px-4 py-2 text-right">K0</td>
                <td className="px-4 py-2 text-right text-green-600">K4,500</td>
                <td className="px-4 py-2 text-right font-semibold">K34,500</td>
              </tr>
              <tr>
                <td className="px-4 py-2">2</td>
                <td className="px-4 py-2 text-right">K0</td>
                <td className="px-4 py-2 text-right">K34,500</td>
                <td className="px-4 py-2 text-right text-green-600">K5,175</td>
                <td className="px-4 py-2 text-right font-semibold">K39,675</td>
              </tr>
              <tr>
                <td className="px-4 py-2">3</td>
                <td className="px-4 py-2 text-right">K0</td>
                <td className="px-4 py-2 text-right">K39,675</td>
                <td className="px-4 py-2 text-right text-green-600">K5,951</td>
                <td className="px-4 py-2 text-right font-semibold">K45,626</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <p className="text-xs sm:text-sm text-gray-600 mt-3">
          * Membership fees (K80) and Social fund (K240) deducted monthly
        </p>
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
          💡 Smart Tips
        </h2>
        <ul className="space-y-2 text-sm sm:text-base text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 flex-shrink-0">✓</span>
            <span>Save early and consistently - compound interest grows faster over time</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 flex-shrink-0">✓</span>
            <span>Borrow K20,000+ to avoid common interest charges</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 flex-shrink-0">✓</span>
            <span>If not borrowing, pay K3,000 upfront to be exempt from common interest</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 flex-shrink-0">✓</span>
            <span>Repay loans on time to avoid penalties</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 flex-shrink-0">✓</span>
            <span>Check your statement regularly to track progress</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
