import { memo, useEffect, useMemo, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  User,
  Home,
  Users,
  PiggyBank,
  HandCoins,
  Calendar,
  Menu,
  DollarSign,
  FileText,
  HelpCircle,
  X,
  Moon,
  Sun,
  ChevronDown,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDispatch, useSelector } from "react-redux";
import { logout as logoutThunk } from "../store/slices/authSlice";
import { fetchGroups, selectGroup } from "../store/slices/groupSlice";
import { fetchCyclesByGroup } from "../store/slices/cycleSlice";

const NAV_ITEMS = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/dashboard/members", label: "Members", icon: Users },
  { path: "/dashboard/record-savings", label: "Record Savings", icon: PiggyBank },
  { path: "/dashboard/disburse-loan", label: "Disburse Loan", icon: DollarSign },
  { path: "/dashboard/record-repayment", label: "Repayments", icon: HandCoins },
  { path: "/dashboard/shareout", label: "Shareout", icon: FileText },
  { path: "/dashboard/groups", label: "Groups", icon: Building2, adminOnly: true },
    { path: "/dashboard/help", label: "Help", icon: HelpCircle },
  ];

const NavItem = memo(function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
        active
          ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
          : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  );
});

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  const user = useSelector((state) => state.auth.user);
  const { groups, selectedGroup } = useSelector((state) => state.groups);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  // When the selected group changes, load its cycles
  useEffect(() => {
    if (selectedGroup?.id) {
      dispatch(fetchCyclesByGroup(selectedGroup.id));
    }
  }, [dispatch, selectedGroup?.id]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const userName = useMemo(() => user?.name || "Member", [user]);
  const userRole = useMemo(() => (user?.role || "member").replace("_", " "), [user]);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  const handleGroupChange = (e) => {
    const group = groups.find((g) => g.id === e.target.value);
    if (group) dispatch(selectGroup(group));
  };

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await dispatch(logoutThunk()).unwrap();
    } finally {
      setMobileMenuOpen(false);
      setIsLoggingOut(false);
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <motion.header
        initial={{ y: -36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center">
              <div className="text-xl sm:text-2xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                VISIONARIES VB
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                type="button"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {groups.length > 1 && (
                <div className="relative flex items-center gap-1.5 px-2 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <select
                    value={selectedGroup?.id || ""}
                    onChange={handleGroupChange}
                    className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none cursor-pointer pr-5 appearance-none"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 absolute right-2 pointer-events-none" />
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-blue-200 dark:border-gray-600">
                <div className="p-1.5 bg-linear-to-br from-blue-500 to-purple-500 rounded-full">
                  <User className="w-3 h-3 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{userName}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                type="button"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>

            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                type="button"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                type="button"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:block border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 overflow-x-auto">
              {visibleNavItems.map((item) => (
                <NavItem key={item.path} item={item} active={isActive(item.path)} />
              ))}
            </nav>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <div className="px-4 py-2">
                <div className="flex items-center gap-3 px-3 py-3 bg-linear-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-lg mb-2">
                  <div className="p-2 bg-linear-to-br from-blue-500 to-purple-500 rounded-full">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{userName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{userRole}</span>
                  </div>
                </div>

                <nav className="space-y-1">
                  {groups.length > 1 && (
                    <div className="flex items-center gap-2 px-3 py-2.5 mb-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                      <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <select
                        value={selectedGroup?.id || ""}
                        onChange={handleGroupChange}
                        className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent border-none outline-none w-full cursor-pointer"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                          active
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-3 px-3 py-3 mt-2 w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  type="button"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">{isLoggingOut ? "Logging out..." : "Logout"}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
