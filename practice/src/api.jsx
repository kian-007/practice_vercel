const API_URL = import.meta.env.VITE_API_URL;

export async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  });

  // Access Token هنوز معتبره
  if (response.status !== 401) {
    return response;
  }

  // Access Token منقضی شده → تلاش برای Refresh
  const refreshResponse = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    credentials: "include",
  });

  // Refresh Token هم باطل شده / وجود نداره
  if (!refreshResponse.ok) {
    return response;
  }

  // Access Token جدید گرفتیم → درخواست اصلی رو دوباره بفرست
  return fetch(url, {
    ...options,
    credentials: "include",
  });
}
