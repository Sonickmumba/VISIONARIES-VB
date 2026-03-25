import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  PiggyBank,
  HandCoins,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Calendar,
  ArrowRight,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { motion } from "motion/react";

const currencyFormatter = new Intl.NumberFormat("en-ZM");

const DASHBOARD_METRICS = {
  totalSavings: 785000,
  totalLoans: 620000,
  availableFunds: 165000,
  activeMembers: 42,
};

const CURRENT_CYCLE = {
  name: "Cycle 1 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "Active",
};

const CHART_DATA = [
  { month: "Jan", amount: 695000, loans: 550000 },
  { month: "Feb", amount: 739675, loans: 590000 },
  { month: "Mar", amount: 785000, loans: 620000 },
];

const RECENT_ACTIVITIES = [
  { id: 1, icon: CheckCircle2, color: "green", text: "Grace Phiri repayment verified", time: "2 hours ago" },
  { id: 2, icon: PiggyBank, color: "blue", text: "Mary Banda savings recorded (K30,000)", time: "5 hours ago" },
  { id: 3, icon: HandCoins, color: "purple", text: "David Zulu loan disbursed (K25,000)", time: "1 day ago" },
];

const NOTIFICATIONS = [
  { id: 1, message: "2 loan applications waiting for approval", read: false, date: "2026-03-24" },
  { id: 2, message: "Cycle contribution reminders pending", read: false, date: "2026-03-23" },
  { id: 3, message: "3 members not yet paid this month", read: false, date: "2026-03-22" },
];

const QUICK_ACTIONS = [
  { label: "Record Savings", icon: PiggyBank, path: "/savings", color: "from-green-500 to-green-600" },
  { label: "Disburse Loan", icon: HandCoins, path: "/loans", color: "from-blue-500 to-blue-600" },
  { label: "View Groups", icon: Users, path: "/groups", color: "from-purple-500 to-purple-600" },
  { label: "Cycle Reports", icon: FileText, path: "/cycles", color: "from-orange-500 to-orange-600" },
];

const ACTIVITY_COLORS = {
  green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
};

const SectionCard = memo(function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {Icon ? <Icon className="w-5 h-5 text-gray-400" /> : null}
      </div>
      {children}
    </div>
  );
});

const StatCard = memo(function StatCard({ icon: Icon, label, value, trend, tone }) {
  const toneClasses = {
    green: "from-green-500 to-green-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {typeof trend === "number" ? (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">+{trend}% vs last month</p>
          ) : null}
        </div>
        <div className={`p-3 rounded-lg bg-linear-to-br ${toneClasses[tone] || toneClasses.blue} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
});

const ActivityItem = memo(function ActivityItem({ icon: Icon, color, text, time }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
      <div className={`p-2 rounded-lg ${ACTIVITY_COLORS[color] || ACTIVITY_COLORS.blue}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-900 dark:text-white font-medium">{text}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
});

const MiniComparisonChart = memo(function MiniComparisonChart({ data }) {
  const maxValue = useMemo(
    () => Math.max(...data.flatMap((item) => [item.amount, item.loans]), 1),
    [data]
  );

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.month}>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{item.month}</span>
            <span>S: K {currencyFormatter.format(item.amount)} | L: K {currencyFormatter.format(item.loans)}</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-linear-to-r from-green-500 to-green-600" style={{ width: `${(item.amount / maxValue) * 100}%` }} />
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-linear-to-r from-blue-500 to-blue-600" style={{ width: `${(item.loans / maxValue) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export function Dashboard() {
  const pendingActions = useMemo(() => NOTIFICATIONS.filter((item) => !item.read).slice(0, 3), []);
  const metrics = DASHBOARD_METRICS;
  const cycle = CURRENT_CYCLE;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Welcome to Village Banking Management
          </p>
        </div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
        >
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">Manage Groups</span>
        </Link>
      </motion.div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-linear-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 p-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">👋</div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              Welcome to VISIONARIES VB Demo!
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Explore member management, savings tracking, loan processing, and shareout reporting.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Member Management", "Savings Tracking", "Loan Processing", "Shareout Reports"].map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1.5 bg-white/70 dark:bg-gray-800/70 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  ✓ {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl shadow-xl p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5" />
              <h2 className="text-xl sm:text-2xl font-bold">{cycle.name}</h2>
            </div>
            <p className="text-blue-100 text-sm">
              {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg border border-white/30 bg-white/10">
            <span className="font-semibold uppercase text-sm">Status: {cycle.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={PiggyBank} label="TOTAL SAVINGS" value={`K ${currencyFormatter.format(metrics.totalSavings)}`} trend={12} tone="green" />
        <StatCard icon={HandCoins} label="TOTAL LOANS" value={`K ${currencyFormatter.format(metrics.totalLoans)}`} trend={8} tone="blue" />
        <StatCard icon={DollarSign} label="AVAILABLE FUNDS" value={`K ${currencyFormatter.format(metrics.availableFunds)}`} trend={5} tone="purple" />
        <StatCard icon={Users} label="ACTIVE MEMBERS" value={metrics.activeMembers} tone="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Savings Growth" icon={TrendingUp}>
          <MiniComparisonChart data={CHART_DATA} />
        </SectionCard>
        <SectionCard title="Loans vs Savings" icon={BarChart3}>
          <MiniComparisonChart data={CHART_DATA} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Activity" icon={Bell}>
          <div className="space-y-3">
            {RECENT_ACTIVITIES.map((activity) => (
              <ActivityItem key={activity.id} icon={activity.icon} color={activity.color} text={activity.text} time={activity.time} />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Pending Actions" icon={AlertTriangle}>
          <div className="space-y-3">
            {pendingActions.length > 0 ? (
              pendingActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                >
                  <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{action.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(action.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">All caught up! No pending actions.</p>
              </div>
            )}
          </div>
          {pendingActions.length > 0 ? (
            <Link
              to="/loans"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Review pending loans
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.path}
                className={`flex flex-col items-center justify-center gap-2 p-4 bg-linear-to-br ${action.color} text-white rounded-xl shadow-lg hover:shadow-xl transition-all`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium text-center">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

export default Dashboard;
