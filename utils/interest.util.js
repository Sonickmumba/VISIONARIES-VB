const { SAVINGS_INTEREST_RATE, MINIMUM_LOAN_INTEREST } = require('../config/constants');

/**
 * Calculate compound interest for savings
 * Formula: A = P(1 + r)^n
 * Where: P = principal, r = rate per period, n = number of periods
 */
const calculateSavingsInterest = (principal, monthsElapsed) => {
  if (monthsElapsed <= 0) return 0;
  
  const finalAmount = principal * Math.pow(1 + SAVINGS_INTEREST_RATE, monthsElapsed);
  const interest = finalAmount - principal;
  
  return Math.round(interest * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate total savings with compound interest
 */
const calculateTotalWithInterest = (principal, monthsElapsed) => {
  const interest = calculateSavingsInterest(principal, monthsElapsed);
  return principal + interest;
};

/**
 * Calculate loan interest
 * Minimum K3,000 or calculated percentage
 */
const calculateLoanInterest = (loanAmount, interestRate = 0.10, duration = 1) => {
  const calculatedInterest = loanAmount * interestRate * duration;
  return Math.max(calculatedInterest, MINIMUM_LOAN_INTEREST);
};

/**
 * Calculate monthly compound interest for each month
 * Returns array of interest per month
 */
const calculateMonthlyInterest = (monthlyPayments) => {
  const interestByMonth = [];
  let cumulativeAmount = 0;
  
  monthlyPayments.forEach((payment, index) => {
    // Add current month's payment
    cumulativeAmount += payment;
    
    // Calculate interest on cumulative amount
    const monthInterest = cumulativeAmount * SAVINGS_INTEREST_RATE;
    interestByMonth.push({
      month: index + 1,
      payment: payment,
      cumulativeAmount: cumulativeAmount,
      interest: Math.round(monthInterest * 100) / 100,
    });
  });
  
  return interestByMonth;
};

/**
 * Calculate shareout amount for a member
 */
const calculateShareout = (totalSavings, savingsInterest, commonInterest) => {
  return totalSavings + savingsInterest + commonInterest;
};

/**
 * Calculate common interest distribution
 * Distributes surplus loan interest proportionally based on savings
 */
const calculateCommonInterestDistribution = (members, totalCommonInterest) => {
  const totalSavings = members.reduce((sum, m) => sum + m.totalSavings, 0);
  
  return members.map(member => {
    const share = (member.totalSavings / totalSavings) * totalCommonInterest;
    return {
      userId: member.userId,
      totalSavings: member.totalSavings,
      commonInterestShare: Math.round(share * 100) / 100,
    };
  });
};

/**
 * Calculate total cycle interest earned
 */
const calculateCycleInterest = (savings) => {
  let totalInterest = 0;
  
  savings.forEach(saving => {
    const monthsRemaining = 12 - saving.month + 1; // Months until end of cycle
    const interest = calculateSavingsInterest(saving.amount, monthsRemaining);
    totalInterest += interest;
  });
  
  return Math.round(totalInterest * 100) / 100;
};

module.exports = {
  calculateSavingsInterest,
  calculateTotalWithInterest,
  calculateLoanInterest,
  calculateMonthlyInterest,
  calculateShareout,
  calculateCommonInterestDistribution,
  calculateCycleInterest,
};
