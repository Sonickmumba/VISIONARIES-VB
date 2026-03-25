import { memo, useEffect, useMemo } from "react";
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
  RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import { useDashboardStore } from "../store/dashboardStore";

const currencyFormatter = new Intl.NumberFormat("en-ZM");

const QUICK_ACTIONS = [
  { label: "Record Savings", icon: PiggyBank, path: "/dashboard/record-savings", color: "from-green-500 to-green-600" },
  { label: "Manage Loans", icon: HandCoins, path: "/dashboard/disburse-loan", color: "from-blue-500 to-blue-600" },
  { label: "View Groups", icon: Users, path: "/dashboard/members", color: "from-purple-500 to-purple-600" },
  { label: "Cycle Reports", icon: FileText, path: "/dashboard/shareout", color: "from-orange-500 to-orange-600" },
];

const ACTIVITY_COLORS = {
  green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
};

const SectionCard = memo(function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          {Icon ? <Icon className="w-5 h-5 text-gray-400" /> : null}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {action}
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
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">+{trend}% benchmark</p>
          ) : null}
        </div>
        <div className={`p-3 rounded-lg bg-linear-to-br ${toneClasses[tone] || toneClasses.blue} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
});

const ActivityItem = memo(function ActivityItem({ color, text, time }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
      <div className={`p-2 rounded-lg ${ACTIVITY_COLORS[color] || ACTIVITY_COLORS.blue}`}>
        <Bell className="w-4 h-4" />
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

  if (!data.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No historical cycle data yet.</p>;
  }

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

const DashboardSkeleton = memo(function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="h-36 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-72 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
});

export function Dashboard() {
  const metrics = useDashboardStore((state) => state.metrics);
  const currentCycle = useDashboardStore((state) => state.currentCycle);
  const chartData = useDashboardStore((state) => state.chartData);
  const recentActivities = useDashboardStore((state) => state.recentActivities);
  const pendingActions = useDashboardStore((state) => state.pendingActions);
  const groups = useDashboardStore((state) => state.groups);
  const loading = useDashboardStore((state) => state.loading);
  const error = useDashboardStore((state) => state.error);
  const fetchDashboard = useDashboardStore((state) => state.fetchDashboard);

  useEffect(() => {
    fetchDashboard().catch(() => {});
  }, [fetchDashboard]);

  if (loading && !currentCycle && groups.length === 0) {
    return <DashboardSkeleton />;
  }

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
            Real-time village banking summary
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/members"
            className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Manage Groups</span>
          </Link>
          <button
            type="button"
            onClick={() => fetchDashboard(true).catch(() => {})}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-linear-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 p-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">👋</div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              Welcome to VISIONARIES VB
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Monitor groups, cycle progress, savings performance, and loan exposure from one place.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                `${groups.length} Active Groups`,
                `${metrics.activeMembers} Members`,
                currentCycle?.name || 'No Active Cycle',
              ].map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1.5 bg-white/70 dark:bg-gray-800/70 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  {feature}
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
              <h2 className="text-xl sm:text-2xl font-bold">{currentCycle?.name || 'No Active Cycle'}</h2>
            </div>
            <p className="text-blue-100 text-sm">
              {currentCycle?.startDate && currentCycle?.endDate
                ? `${new Date(currentCycle.startDate).toLocaleDateString()} - ${new Date(currentCycle.endDate).toLocaleDateString()}`
                : 'Create a cycle to see live stats'}
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg border border-white/30 bg-white/10">
            <span className="font-semibold uppercase text-sm">Status: {currentCycle?.status || 'N/A'}</span>
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
          <MiniComparisonChart data={chartData} />
        </SectionCard>
        <SectionCard title="Loans vs Savings" icon={BarChart3}>
          <MiniComparisonChart data={chartData} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Recent Activity" icon={Bell}>
          <div className="space-y-3">
            {recentActivities.length ? (
              recentActivities.map((activity) => (
                <ActivityItem key={activity.id} color={activity.color} text={activity.text} time={activity.time} />
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No activity available yet.</p>
            )}
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
              to="/dashboard/disburse-loan"
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
