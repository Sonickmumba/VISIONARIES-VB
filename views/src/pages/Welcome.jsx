import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Users,
  PiggyBank,
  HandCoins,
  TrendingUp,
  Shield,
  Smartphone,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Bell,
  FileText,
  Lock,
  Zap,
} from "lucide-react";

export function Welcome() {
  const features = [
    {
      icon: Users,
      title: "Member Management",
      description: "Easily manage all group members with digital profiles and tracking",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: PiggyBank,
      title: "Savings Tracking",
      description: "Track monthly savings with automatic 15% compound interest calculation",
      color: "from-green-500 to-green-600",
    },
    {
      icon: HandCoins,
      title: "Loan Processing",
      description: "Process loans with mandatory minimum rules and interest management",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: BarChart3,
      title: "Smart Reports",
      description: "Generate comprehensive reports for statements, loans, and shareouts",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Bell,
      title: "Real-time Notifications",
      description: "Get instant alerts for payments, verifications, and important updates",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: Shield,
      title: "Secure & Verified",
      description: "Payment proof management with admin verification for transparency",
      color: "from-indigo-500 to-indigo-600",
    },
  ];

  const benefits = [
    "Digitize your entire savings and loan cycle",
    "Automatic compound interest calculations",
    "Role-based access (Admin, Leader, Member)",
    "Mobile-first design for easy access",
    "Common interest distribution tracking",
    "End-of-cycle shareout calculations",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                VISIONARIES VB
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              <span>Zambia's #1 Village Banking Platform</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Digital Village Banking
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">Made Simple & Secure</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
              Manage your community savings group with confidence. Track savings, process loans,
              and calculate shareouts automatically — all in one beautiful platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all"
                >
                  Get Started Free
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700"
                >
                  <Lock className="w-5 h-5" />
                  Member Login
                </Link>
              </motion.div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto mt-16">
              {[
                { value: "1000+", label: "Active Members" },
                { value: "K2.5M", label: "Savings Managed" },
                { value: "150+", label: "Groups Served" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Powerful features designed for Zambian village banking groups
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 h-full">
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Why Village Banking Groups
                <span className="block text-blue-600">Trust VISIONARIES VB</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Built specifically for Zambian community savings groups, our platform handles
                everything from monthly contributions to end-of-cycle shareouts.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, i) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {benefit}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
                <Smartphone className="w-16 h-16 mb-6" />
                <h3 className="text-2xl font-bold mb-4">Mobile-First Design</h3>
                <p className="text-blue-100 mb-6">
                  Access your village banking group on any device. Our responsive design
                  works perfectly on smartphones, ensuring all members can participate easily.
                </p>
                <div className="flex items-center gap-2 text-blue-100">
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">Fast, secure, and always available</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Village Banking?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join hundreds of Zambian community groups already using VISIONARIES VB
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all"
              >
                Create Your Account
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">VISIONARIES VB</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © 2026 VISIONARIES VB. Empowering Zambian communities.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
