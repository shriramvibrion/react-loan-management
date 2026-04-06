import { ROUTES, ROLES } from "../constants";

/**
 * Centralized route configuration for the application.
 * Each route defines its path, page component name, access level, and optional metadata.
 */
export const publicRoutes = [
  { path: ROUTES.HOME, page: "IndexPage" },
  { path: ROUTES.USER_LOGIN, page: "UserLogin" },
  { path: ROUTES.USER_REGISTER, page: "UserRegister" },
  { path: ROUTES.ADMIN_LOGIN, page: "AdminLogin" },
  { path: ROUTES.ADMIN_REGISTER, page: "AdminRegister" },
];

export const userRoutes = [
  { path: ROUTES.DOCUMENTATION, page: "Documentation", role: ROLES.USER },
  { path: ROUTES.USER_DASHBOARD, page: "UserDashboard", role: ROLES.USER },
  { path: ROUTES.USER_ANALYTICS, page: "UserLoanAnalytics", role: ROLES.USER },
  { path: ROUTES.USER_LOAN_DETAIL, page: "UserLoanDetail", role: ROLES.USER },
  { path: ROUTES.APPLY_LOAN, page: "ApplyLoan", role: ROLES.USER },
  { path: ROUTES.EMI_CALCULATOR, page: "EMICalculator", role: ROLES.USER },
  { path: ROUTES.ELIGIBILITY_CHECKER, page: "EligibilityChecker", role: ROLES.USER },
];

export const adminRoutes = [
  { path: ROUTES.ADMIN_DASHBOARD, page: "AdminDashboard", role: ROLES.ADMIN },
  { path: ROUTES.ADMIN_LOAN_DETAIL, page: "AdminLoanDetail", role: ROLES.ADMIN },
  { path: ROUTES.ADMIN_ANALYTICS, page: "AdminAnalytics", role: ROLES.ADMIN },
  { path: ROUTES.ADMIN_USERS_LOANS, page: "AdminUserLoanList", role: ROLES.ADMIN },
];
