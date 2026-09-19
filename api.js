import { API_URL } from "./constants.js";
export const API_URL = "http://localhost:3000";

export function handleForceLogout(redirectToLogin = true) {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");

  if (redirectToLogin) {
    setTimeout(() => (window.location.href = "login.html"), 500);
  }
}

export async function authFetch(url, options = {}, json = true) {
  let accessToken = localStorage.getItem("accessToken");

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && json) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    method: options.method || "GET",
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
      handleForceLogout();
      return response;
    }

    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      localStorage.setItem("accessToken", data.accessToken);

      config.headers["Authorization"] = `Bearer ${data.accessToken}`;
      response = await fetch(url, config);
    } else {
      handleForceLogout();
    }
  }

  return response;
}
