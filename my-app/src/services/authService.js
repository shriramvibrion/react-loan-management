import api from "../api";

/**
 * User login.
 */
export async function loginUser(email, password) {
  return api.post("/api/user/login", { email, password });
}

/**
 * User registration.
 */
export async function registerUser({ name, email, password, phone, city }) {
  return api.post("/api/user/register", { name, email, password, phone, city });
}

/**
 * Admin login.
 */
export async function loginAdmin(email, password) {
  return api.post("/api/admin/login", { email, password });
}

/**
 * Admin registration.
 */
export async function registerAdmin({ username, email, password }) {
  return api.post("/api/admin/register", { username, email, password });
}
