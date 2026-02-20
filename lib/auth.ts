/** Auth helperi za API pozive. */

export const TOKEN_KEY = 'povezi_access_token';

export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};
