const TOKEN_KEY = "snaphouse_jwt";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);
export const isAuthenticated = (): boolean => !!getToken();

export const API_BASE = "https://api.dailyvertex.io";
