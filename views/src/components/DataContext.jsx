import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useDashboardStore } from "../store/dashboardStore";

const DataContext = createContext(undefined);

const EMPTY_ARRAY = [];

const toAmount = (...values) => {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return amount;
  }
  return 0;
};

const mapUserToMember = (user) => ({
  id: user.id,
  memberNo: user.member_no || user.memberNo || "N/A",
  name: user.name || "Unknown Member",
  phone: user.phone || "N/A",
  email: user.email || "N/A",
  nationalId: user.national_id || user.nationalId || "",
  status: user.is_active === false ? "inactive" : "active",
  joinDate: user.created_at || user.joinDate || new Date().toISOString(),
  currentSavings: toAmount(user.total_savings, user.totalSavings, user.currentSavings),
  totalSavings: toAmount(user.total_savings, user.totalSavings, user.currentSavings),
  currentLoans: toAmount(user.total_loans, user.totalLoans, user.currentLoans),
  loanAmount: toAmount(user.loan_amount, user.loanAmount),
  loanBorrowed: toAmount(user.total_loan_borrowed, user.loanBorrowed, user.loan_amount),
  shortfall: toAmount(user.shortfall),
  paidMandatoryUpfront: Boolean(user.paid_mandatory_upfront || user.paidMandatoryUpfront),
});

const mockNotifications = [
  {
    id: "1",
    type: "payment_verified",
    title: "Payment Verified",
    message: "Amina Zimba's payment of K1,183 has been verified. Receipt #: RCP-20260315-001",
    date: "2026-03-24T09:45:00",
    read: false,
  },
  {
    id: "2",
    type: "payment_pending",
    title: "Payment Pending Verification",
    message: "New payment from Catherine Nkandu requires verification. Amount: K 2,250 | Method: Mobile Money",
    date: "2026-03-23T14:30:00",
    read: false,
  },
  {
    id: "3",
    type: "loan_due",
    title: "Loan Due Reminder",
    message: "Henry Daka's loan payment of K 13,500 is due in 3 days",
    date: "2026-03-23T10:15:00",
    read: false,
  },
  {
    id: "4",
    type: "common_interest",
    title: "Common Interest Calculation",
    message: "K46,500 common interest calculated from unborrowed funds. Members with shortfall will pay proportionally.",
    date: "2026-03-10T00:00:00",
    read: true,
  },
];

export function DataProvider({ children }) {
  const token = useAuthStore((s) => s.token);
  const [members, setMembers] = useState(EMPTY_ARRAY);
  const [savings, setSavings] = useState(EMPTY_ARRAY);
  const [loans, setLoans] = useState(EMPTY_ARRAY);
  const [payments, setPayments] = useState(EMPTY_ARRAY);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState("");

  const currentCycle = useDashboardStore((s) => s.currentCycle);
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard);

  useEffect(() => {
    if (token) {
      fetchDashboard().catch(() => {});
    }
  }, [token, fetchDashboard]);

  useEffect(() => {
    let cancelled = false;

    const fetchMembers = async () => {
      try {
        setIsLoadingMembers(true);
        setMembersError("");

        const response = await fetch("/api/users", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Failed to fetch members");
        }

        const payload = await response.json();
        const list = Array.isArray(payload) ? payload : payload?.data || [];
        const normalized = list.map(mapUserToMember);

        if (!cancelled) {
          setMembers(normalized);
        }
      } catch (error) {
        if (!cancelled) {
          setMembersError(error.message || "Unable to load members");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMembers(false);
        }
      }
    };

    fetchMembers();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const refreshMembers = async () => {
    try {
      setIsLoadingMembers(true);
      setMembersError("");
      const response = await fetch("/api/users", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error("Failed to refresh members");
      }
      const payload = await response.json();
      const list = Array.isArray(payload) ? payload : payload?.data || [];
      setMembers(list.map(mapUserToMember));
    } catch (error) {
      setMembersError(error.message || "Unable to refresh members");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Calculate dashboard metrics
  const totalSavingsAmount = members.reduce((sum, m) => sum + m.currentSavings, 0);
  const totalLoansAmount = members.reduce((sum, m) => sum + m.currentLoans, 0);
  
  const dashboardMetrics = {
    totalSavings: totalSavingsAmount,
    totalLoans: totalLoansAmount,
    availableFunds: totalSavingsAmount - totalLoansAmount, // Savings minus loans
    totalCollected: totalSavingsAmount + totalLoansAmount * 0.15, // includes interest
    activeMembers: members.filter(m => m.status === "active").length,
  };

  // Calculate common interest
  const calculateCommonInterest = () => {
    // Example: Assume total available is K930,000, total loaned is K620,000
    const totalAvailable = 930000;
    const totalLoaned = members.reduce((sum, m) => sum + m.loanBorrowed, 0);
    const unborrowed = totalAvailable - totalLoaned;
    const commonInterestPool = unborrowed * 0.15; // 15% of unborrowed

    // Calculate total shortfall from all members
    const totalShortfall = members.reduce((sum, m) => {
      if (m.paidMandatoryUpfront) return sum; // Exempt if paid upfront
      return sum + m.shortfall;
    }, 0);

    // Return proportional common interest for each member
    return members.map(member => {
      if (member.paidMandatoryUpfront) {
        return { memberId: member.id, commonInterest: 0 };
      }
      if (totalShortfall === 0) {
        return { memberId: member.id, commonInterest: 0 };
      }
      const proportion = member.shortfall / totalShortfall;
      const commonInterest = proportion * commonInterestPool;
      return { memberId: member.id, commonInterest: Math.round(commonInterest * 100) / 100 };
    });
  };

  const addSavings = async (memberId, amount, month, year) => {
    const monthNumber = Number(month);
    const targetYear = Number(year) || new Date().getFullYear();

    if (!currentCycle?.id) {
      throw new Error("No active cycle configured");
    }

    const response = await fetch("/api/savings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        cycleId: currentCycle.id,
        userId: memberId,
        amount,
        month: monthNumber,
        year: targetYear,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || "Failed to record savings");
    }

    const created = payload?.data;
    setSavings((prev) => [...prev, created]);

    setMembers((prev) =>
      prev.map((member) => {
        if (member.id !== memberId) return member;
        const interest = Number(amount) * 0.15;
        const accumulated = Number(amount) + interest;
        const nextSavings = member.currentSavings + accumulated;
        return {
          ...member,
          currentSavings: nextSavings,
          totalSavings: nextSavings,
        };
      })
    );

    return created;
  };

  const disburseLoan = (memberId, amount) => {
    const newLoan = {
      id: `loan-${Date.now()}`,
      memberId,
      amount,
      interest: amount * 0.15,
      outstanding: amount + amount * 0.15,
      disbursementDate: new Date().toISOString(),
      type: "regular",
      status: "active",
    };
    setLoans([...loans, newLoan]);

    // Update member's loan info
    setMembers(members.map(m => {
      if (m.id === memberId) {
        const newLoanBorrowed = m.loanBorrowed + amount;
        const newShortfall = Math.max(0, 20000 - newLoanBorrowed);
        return {
          ...m,
          currentLoans: m.currentLoans + newLoan.outstanding,
          loanBorrowed: newLoanBorrowed,
          shortfall: newShortfall,
        };
      }
      return m;
    }));
  };

  const recordPayment = (payment) => {
    const newPayment = {
      ...payment,
      id: `payment-${Date.now()}`,
    };
    setPayments([...payments, newPayment]);
  };

  const verifyPayment = (paymentId) => {
    setPayments(
      payments.map((p) =>
        p.id === paymentId ? { ...p, status: "verified" } : p
      )
    );
  };

  const payMandatoryUpfront = (memberId) => {
    // Member pays K3,000 upfront to be exempt from common interest
    setMembers(members.map(m =>
      m.id === memberId
        ? { ...m, paidMandatoryUpfront: true, shortfall: 0 }
        : m
    ));
  };

  const contextValue = useMemo(
    () => ({
      members,
      savings,
      loans,
      payments,
      notifications,
      currentCycle,
      dashboardMetrics,
      addSavings,
      disburseLoan,
      recordPayment,
      verifyPayment,
      calculateCommonInterest,
      payMandatoryUpfront,
      isLoadingMembers,
      membersError,
      refreshMembers,
    }),
    [
      members,
      savings,
      loans,
      payments,
      notifications,
      currentCycle,
      dashboardMetrics,
      isLoadingMembers,
      membersError,
    ]
  );

  return (
    <DataContext.Provider
      value={contextValue}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}