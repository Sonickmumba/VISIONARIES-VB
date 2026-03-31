import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchCyclesByGroup,
  createCycleAsync,
  closeCycleAsync,
  setCurrentCycle
} from "../../store/slices/cycleSlice";
import { Calendar, Plus, X, CheckCircle2, Clock } from "lucide-react";
import { AnimatedCard, GlassCard } from "../../components/ui/AnimatedCard";
import { motion } from "motion/react";
import { toast } from "sonner";

export function CycleManagement() {
  const dispatch = useDispatch();
  const cycles = useSelector((state) => state.cycles.cycles);
  const currentCycle = useSelector((state) => state.cycles.currentCycle);
  const selectedGroup = useSelector((state) => state.groups.selectedGroup);
  const loading = useSelector((state) => state.cycles.loading);
  const error = useSelector((state) => state.cycles.error);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // Cycle type options
  const cycleTypeOptions = [
    { key: 'jan-jun', label: 'Jan – Jun (6 months)', startMonth: 1, endMonth: 6 },
    { key: 'jun-dec', label: 'Jun – Dec (6 months)', startMonth: 6, endMonth: 12 },
    { key: 'jan-dec', label: 'Jan – Dec (12 months)', startMonth: 1, endMonth: 12 },
  ];

  const [newCycle, setNewCycle] = useState({
    name: '',
    year: new Date().getFullYear(),
    type: 'jan-jun', // default to Jan-Jun
  });

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    if (!newCycle.name || !newCycle.year || !newCycle.type) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!selectedGroup?.id) {
      toast.error("No group selected");
      return;
    }
    const typeObj = cycleTypeOptions.find(opt => opt.key === newCycle.type);
    if (!typeObj) {
      toast.error("Invalid cycle type");
      return;
    }
    const pad = (n) => n.toString().padStart(2, '0');
    const startDate = `${newCycle.year}-${pad(typeObj.startMonth)}-01`;
    // End date: last day of endMonth
    const endDateObj = new Date(newCycle.year, typeObj.endMonth, 0); // 0th day of next month = last day of this month
    const endDate = `${newCycle.year}-${pad(typeObj.endMonth)}-${pad(endDateObj.getDate())}`;
    
    try {
      await dispatch(createCycleAsync({
        groupId: selectedGroup.id,
        name: newCycle.name,
        startDate,
        endDate
      })).unwrap();
      toast.success(`Cycle \"${newCycle.name}\" created successfully!`);
      setShowCreateModal(false);
      setNewCycle({ name: '', year: new Date().getFullYear(), type: 'jan-jun' });
    } catch (err) {
      toast.error(err || "Failed to create cycle");
    }
  };

  const handleCloseCycle = async (cycleId) => {
    if (confirm("Are you sure you want to close this cycle? This action cannot be undone.")) {
      try {
        await dispatch(closeCycleAsync(cycleId)).unwrap();
        toast.success("Cycle closed successfully");
      } catch (err) {
        toast.error(err || "Failed to close cycle");
      }
    }
  };
  // Fetch cycles for selected group on mount or when group changes
  useEffect(() => {
    if (selectedGroup?.id) {
      dispatch(fetchCyclesByGroup(selectedGroup.id));
    }
  }, [dispatch, selectedGroup?.id]);

  const handleSetCurrent = (cycle) => {
    dispatch(setCurrentCycle(cycle));
    toast.success(`Current cycle set to "${cycle.name}"`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            Cycle Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Manage savings cycles (6 or 12 months)
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Cycle</span>
        </motion.button>
      </motion.div>

      {/* Cycles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && <div className="col-span-2 text-center text-blue-600">Loading cycles…</div>}
        {error && <div className="col-span-2 text-center text-red-600">{error}</div>}
        {cycles.map((cycle, index) => (
          <AnimatedCard key={cycle.id} delay={index * 0.1}>
            <GlassCard className={`p-6 ${cycle.id === currentCycle?.id ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {cycle.name}
                    {cycle.id === currentCycle?.id && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                        Current
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Duration: {cycle.duration} months
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  cycle.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {cycle.status}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(cycle.start_date
).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(cycle.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Total Savings:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    K {(cycle.totalSavings || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Total Loans:</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    K {(cycle.totalLoans || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {cycle.status === 'active' && (
                <div className="flex gap-2">
                  {cycle.id !== currentCycle?.id && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSetCurrent(cycle)}
                      className="flex-1 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                    >
                      Set as Current
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCloseCycle(cycle.id)}
                    className="flex-1 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                  >
                    Close Cycle
                  </motion.button>
                </div>
              )}
            </GlassCard>
          </AnimatedCard>
        ))}
      </div>

      {/* Create Cycle Modal */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4"
        >
          <GlassCard className="p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Cycle</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>


            <form onSubmit={handleCreateCycle} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cycle Name
                </label>
                <input
                  type="text"
                  value={newCycle.name}
                  onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                  placeholder="e.g., Jan – Jun 2026"
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Year
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={newCycle.year}
                  onChange={(e) => setNewCycle({ ...newCycle, year: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cycle Type
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {cycleTypeOptions.map((opt) => (
                    <motion.button
                      key={opt.key}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setNewCycle({ ...newCycle, type: opt.key })}
                      className={`p-4 border-2 rounded-xl transition-all flex items-center gap-3 ${
                        newCycle.type === opt.key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <div className="flex flex-col items-start">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{opt.label}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{opt.startMonth === 1 ? 'Starts January' : 'Starts June'}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Create Cycle
              </motion.button>
            </form>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
