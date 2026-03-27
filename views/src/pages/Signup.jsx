import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signup as signupThunk, clearError } from "../store/slices/authSlice";
import { motion } from "motion/react";
import {
  PiggyBank,
  Mail,
  Lock,
  User,
  Phone,
  CreditCard,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export function Signup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading: isSubmitting } = useSelector((s) => s.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nationalId: "",
    password: "",
    confirmPassword: "",
    groupId: "",
  });
  const [errors, setErrors] = useState({});

  // Fetch available groups for the dropdown
  useEffect(() => {
    axios
      .get("/api/groups/public")
      .then((res) => setAvailableGroups(res.data?.data || []))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^(09|\\+2609)\d{8,}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Invalid Zambian phone number";
    }

    if (!formData.nationalId.trim()) {
      newErrors.nationalId = "National ID is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    const result = await dispatch(
      signupThunk({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        nationalId: formData.nationalId,
        password: formData.password,
        groupId: formData.groupId || undefined,
      })
    );

    if (signupThunk.fulfilled.match(result)) {
      toast.success("Account created successfully! Please login.");
      navigate("/login");
    } else {
      toast.error(result.payload || "Failed to create account. Please try again.");
    }
  };

  const passwordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;

    const levels = [
      { strength: 1, label: "Weak", color: "bg-red-500" },
      { strength: 2, label: "Fair", color: "bg-orange-500" },
      { strength: 3, label: "Good", color: "bg-yellow-500" },
      { strength: 4, label: "Strong", color: "bg-green-500" },
    ];

    return levels.find((l) => l.strength === strength) || levels[0];
  };

  const strength = passwordStrength(formData.password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white text-center">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                <PiggyBank className="w-10 h-10" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold mb-2">Join VISIONARIES VB</h1>
            <p className="text-blue-100">Create your account to get started</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border ${
                    errors.name
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border ${
                      errors.email
                        ? "border-red-500"
                        : "border-gray-200 dark:border-gray-700"
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border ${
                      errors.phone
                        ? "border-red-500"
                        : "border-gray-200 dark:border-gray-700"
                    } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white`}
                    placeholder="0977 123456"
                  />
                </div>
                {errors.phone && (
                  <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* National ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                National ID (NRC) *
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border ${
                    errors.nationalId
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white`}
                  placeholder="123456/78/1"
                />
              </div>
              {errors.nationalId && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.nationalId}</span>
                </div>
              )}
            </div>

            {/* Group Selection */}
            {availableGroups.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Group (Optional)
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="groupId"
                    value={formData.groupId}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white appearance-none"
                  >
                    <option value=""> Choose existing group </option>
                    {availableGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border ${
                    errors.password
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all`}
                        style={{ width: `${(strength.strength / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {strength.label}
                    </span>
                  </div>
                </div>
              )}
              {errors.password && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-900 border ${
                    errors.confirmPassword
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-700"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="flex items-center gap-1 mt-1 text-green-500 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Passwords match</span>
                </div>
              )}
              {errors.confirmPassword && (
                <div className="flex items-center gap-1 mt-1 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </motion.button>

            {/* Login Link */}
            <p className="text-center text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Login here
              </Link>
            </p>
          </form>
        </div>

        {/* Security Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Shield className="w-4 h-4" />
            <span>Your information is secure and encrypted</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
