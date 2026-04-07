const TOKEN_KEY = "snaphouse_jwt";
const REFRESH_KEY = "snaphouse_refresh_token";
const ROLE_KEY = "snaphouse_user_role";
const NAME_KEY = "snaphouse_user_name";
const EMAIL_KEY = "snaphouse_user_email";

export type AppRole =
  | "admin"
  | "accountant"
  | "floor_manager"
  | "team_lead"
  | "researcher"
  | "editor"
  | "qa"
  | "uploader"
  | "pending";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);
export const isAuthenticated = (): boolean => !!getToken();

export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (token: string) => localStorage.setItem(REFRESH_KEY, token);

export const getRole = (): AppRole => (localStorage.getItem(ROLE_KEY) as AppRole) || "pending";
export const setRole = (role: AppRole) => localStorage.setItem(ROLE_KEY, role);

export const getUserName = (): string => localStorage.getItem(NAME_KEY) || "";
export const getUserEmail = (): string => localStorage.getItem(EMAIL_KEY) || "";

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(NAME_KEY);
  localStorage.removeItem(EMAIL_KEY);
};

export const API_BASE = "https://api.dailyvertex.io/api";
