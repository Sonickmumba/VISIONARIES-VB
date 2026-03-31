import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Wallet,
  FileText,
  PiggyBank,
  HandCoins,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Calendar,
  HelpCircle,
  ArrowRight,
  Sparkles,
  BarChart3, // Renamed to avoid conflict with recharts BarChart
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from "recharts";
import { StatCard, AnimatedCard, GlassCard } from "../../components/ui/AnimatedCard";
import { motion } from "motion/react";

// Version: 3.0 - Redux Integration
export function Dashboard() {
  const currentCycle = useSelector((state) => state.cycles.currentCycle);
  const members = useSelector((state) => state.members.members);
  const notifications = useSelector((state) => state.notifications.notifications);
  const selectedGroup = useSelector((state) => state.groups.selectedGroup);

  // Calculate metrics from Redux state
  const metrics = {
    totalSavings: currentCycle?.totalSavings || 0,
    totalLoans: currentCycle?.totalLoans || 0,
    availableFunds: currentCycle?.availableFunds || 0,
    activeMembers: members?.length || 0,
  };

  const cycle = currentCycle || {
    name: "Current Cycle",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    status: "Active"
  };

  const notificationsList = notifications || [];

  const savingsData = [
    { month: "Jan", amount: 695000, loans: 550000 },
    { month: "Feb", amount: 739675, loans: 590000 },
    { month: "Mar", amount: 785000, loans: 620000 },
  ];

  const recentActivities = [
    { icon: CheckCircle2, color: "green", text: "Grace Phiri repayment verified", time: "2 hours ago" },
    { icon: PiggyBank, color: "blue", text: "Mary Banda savings recorded (K30,000)", time: "5 hours ago" },
    { icon: HandCoins, color: "purple", text: "David Zulu loan disbursed (K25,000)", time: "1 day ago" },
  ];

  const pendingActions = notificationsList.filter(n => !n.read).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Page Header with Animation */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Welcome to Village Banking Management
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="help"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">How It Works</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Welcome Banner */}
      <GlassCard gradient className="p-6">
        <div className="flex items-start gap-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-4xl"
          >
            👋
          </motion.div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              Welcome to VISIONARIES VB Demo!
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              This is a fully functional prototype with mocked data showing how the Village Banking system works. All features are working with sample data. Backend integration can be added later.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Member Management", "Savings Tracking", "Loan Processing", "Shareout Reports"].map((feature, i) => (
                <motion.span
                  key={feature}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  ✓ {feature}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Cycle Info */}
      <AnimatedCard delay={0.1}>
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-xl shadow-xl p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -ml-32 -mb-32" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5" />
                <h2 className="text-xl sm:text-2xl font-bold">
                  {cycle.name}
                </h2>
              </div>
              <p className="text-blue-100 text-sm">
                {new Date(cycle.start_date).toLocaleDateString()} -{" "}
                {new Date(cycle.end_date).toLocaleDateString()}
              </p>
            </div>
            <div className="glass px-4 py-2 rounded-lg backdrop-blur-md">
              <span className="font-semibold uppercase text-sm">
                Status: {cycle.status}
              </span>
            </div>
          </div>
        </div>
      </AnimatedCard>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PiggyBank}
          label="TOTAL SAVINGS"
          value={`K ${metrics.totalSavings.toLocaleString()}`}
          trend={12}
          color="green"
          delay={0.2}
        />
        <StatCard
          icon={HandCoins}
          label="TOTAL LOANS"
          value={`K ${metrics.totalLoans.toLocaleString()}`}
          trend={8}
          color="blue"
          delay={0.3}
        />
        <StatCard
          icon={DollarSign}
          label="AVAILABLE FUNDS"
          value={`K ${metrics.availableFunds.toLocaleString()}`}
          trend={5}
          color="purple"
          delay={0.4}
        />
        <StatCard
          icon={Users}
          label="ACTIVE MEMBERS"
          value={metrics.activeMembers}
          color="orange"
          delay={0.5}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Growth Chart */}
        <AnimatedCard delay={0.6}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Savings Growth</h3>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={savingsData}>
                <defs>
                  <linearGradient id="dashboardColorSavingsAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: "12px" }} />
                <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#dashboardColorSavingsAmount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </AnimatedCard>

        {/* Loans vs Savings */}
        <AnimatedCard delay={0.7}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Loans vs Savings</h3>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={savingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: "12px" }} />
                <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="loans" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </AnimatedCard>
      </div>

      {/* Activity and Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <AnimatedCard delay={0.8}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
              <Bell className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {recentActivities.map((activity, i) => {
                const Icon = activity.icon;
                const colorClasses = {
                  green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                  purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
                };
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className={`p-2 rounded-lg ${colorClasses[activity.color]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {activity.text}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </AnimatedCard>

        {/* Pending Actions */}
        <AnimatedCard delay={0.9}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pending Actions</h3>
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="space-y-3">
              {pendingActions.length > 0 ? (
                pendingActions.map((action, i) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                  >
                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">
                        {action.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(action.date).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All caught up! No pending actions.
                  </p>
                </div>
              )}
            </div>
            {pendingActions.length > 0 && (
              <Link
                to="notifications"
                className="flex items-center justify-center gap-2 mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                View all notifications
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </GlassCard>
        </AnimatedCard>
      </div>

      {/* Quick Actions */}
      <AnimatedCard delay={1}>
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Record Savings", icon: PiggyBank, path: "record-savings", color: "from-green-500 to-green-600" },
              { label: "Disburse Loan", icon: HandCoins, path: "disburse-loan", color: "from-blue-500 to-blue-600" },
              { label: "View Members", icon: Users, path: "members", color: "from-purple-500 to-purple-600" },
              { label: "Shareout Report", icon: FileText, path: "shareout", color: "from-orange-500 to-orange-600" },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + i * 0.1 }}
                >
                  <Link
                    to={action.path}
                    className={`flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br ${action.color} text-white rounded-xl shadow-lg hover:shadow-xl transition-all`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center">{action.label}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      </AnimatedCard>
    </div>
  );
}

export default Dashboard;