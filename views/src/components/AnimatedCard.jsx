import { motion } from "motion/react";

export function AnimatedCard({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function GlassCard({ children, className = "", gradient = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`glass rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 ${
        gradient ? "relative overflow-hidden" : ""
      } ${className}`}
    >
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}

export function StatCard({ icon: Icon, label, value, trend, color = "blue", delay = 0 }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
  };

  return (
    <AnimatedCard delay={delay}>
      <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5`} />
        
        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            {trend && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: delay + 0.3, type: "spring" }}
                className={`text-sm font-semibold px-2 py-1 rounded-full ${
                  trend > 0
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {trend > 0 ? "+" : ""}{trend}%
              </motion.div>
            )}
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {label}
            </div>
          </motion.div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 pointer-events-none" />
      </div>
    </AnimatedCard>
  );
}
