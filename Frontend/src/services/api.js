const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

const TOKEN_KEY = "openNotes-access-token";

// Fired when the server rejects the stored token (expired or revoked).
export const SESSION_EXPIRED_EVENT = "opennotes:session-expired";

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiRequest(path, options = {}) {
  const { headers = {}, body, ...rest } = options;
  const token = getAccessToken();

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...rest,
        body,
        headers: {
          ...(body && !isFormData
            ? { "Content-Type": "application/json" }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
      }
    );
  } catch {
    const error = new Error(
      "Unable to reach the server. Check your connection and try again."
    );
    error.status = 0;
    throw error;
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    // A 401 on an authenticated request means the session is no longer valid.
    if (response.status === 401 && token && !path.startsWith("/auth/login")) {
      setAccessToken(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    const firstFieldError = payload?.errors?.[0]?.message;
    const error = new Error(
      firstFieldError ||
        payload?.message ||
        `Request failed (${response.status}).`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

// multipart upload with progress (fetch cannot report upload progress).
function uploadRequest(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const token = getAccessToken();

    xhr.open("POST", `${API_BASE_URL}${path}`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onerror = () => {
      const error = new Error(
        "Unable to reach the server. Check your connection and try again."
      );
      error.status = 0;
      reject(error);
    };

    xhr.onload = () => {
      let payload;

      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload?.success !== false) {
        resolve(payload);
        return;
      }

      if (xhr.status === 401 && token) {
        setAccessToken(null);
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }

      const error = new Error(
        payload?.errors?.[0]?.message ||
          payload?.message ||
          `Upload failed (${xhr.status}).`
      );
      error.status = xhr.status;
      error.payload = payload;
      reject(error);
    };

    xhr.send(formData);
  });
}

function toQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const result = query.toString();
  return result ? `?${result}` : "";
}

export const authApi = {
  register: (data) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyEmail: (token) =>
    apiRequest("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  resendVerification: (email) =>
    apiRequest("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  me: () => apiRequest("/auth/me"),

  logoutAll: () =>
    apiRequest("/auth/logout-all", {
      method: "POST",
      body: JSON.stringify({}),
    }),
};

// Update the signed-in user's own profile (name for everyone; college for
// students). The backend decides the resulting affiliation status.
export const profileApi = {
  update: (data) =>
    apiRequest("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// Account management: admins (students + teachers) and approved teachers
// (students of their own college). The backend enforces every rule.
export const userApi = {
  list: (params = {}) => apiRequest(`/users${toQuery(params)}`),

  block: (id, reason) =>
    apiRequest(`/users/${encodeURIComponent(id)}/block`, {
      method: "PATCH",
      body: JSON.stringify(reason ? { reason } : {}),
    }),

  unblock: (id) =>
    apiRequest(`/users/${encodeURIComponent(id)}/unblock`, {
      method: "PATCH",
      body: JSON.stringify({}),
    }),

  remove: (id) =>
    apiRequest(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

// Teacher applications (admin only).
export const teacherApprovalApi = {
  list: (params = {}) => apiRequest(`/admin/teachers${toQuery(params)}`),

  approve: (id) =>
    apiRequest(`/admin/teachers/${encodeURIComponent(id)}/approve`, {
      method: "PATCH",
      body: JSON.stringify({}),
    }),

  reject: (id, reason) =>
    apiRequest(`/admin/teachers/${encodeURIComponent(id)}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
};

export const collegeApi = {
  search: (q, limit = 10) =>
    apiRequest(`/colleges/search${toQuery({ q, limit })}`),

  get: (id) => apiRequest(`/colleges/${encodeURIComponent(id)}`),
};

export const academicApi = {
  list: (collegeId, filters = {}) =>
    apiRequest(
      `/academic-structures${toQuery({ collegeId, ...filters })}`
    ),
};

export const resourceApi = {
  notes: (params = {}) => apiRequest(`/notes${toQuery(params)}`),

  pyqs: (params = {}) => apiRequest(`/pyqs${toQuery(params)}`),

  getNote: (id) => apiRequest(`/notes/${encodeURIComponent(id)}`),

  getPYQ: (id) => apiRequest(`/pyqs/${encodeURIComponent(id)}`),

  uploadNotes: (formData, onProgress) =>
    uploadRequest("/notes", formData, onProgress),

  uploadPYQ: (formData, onProgress) =>
    uploadRequest("/pyqs", formData, onProgress),

  myUploads: (params = {}) =>
    apiRequest(`/resources/mine${toQuery(params)}`),

  // Returns { data: { url, expiresIn, fileName } }. The URL is short-lived.
  download: (type, id, partId) =>
    apiRequest(
      `/${type}/${encodeURIComponent(id)}/download/${encodeURIComponent(
        partId
      )}`
    ),

  pending: (type, params = {}) =>
    apiRequest(`/admin/resources/pending${toQuery({ type, ...params })}`),

  approve: (type, id) =>
    apiRequest(`/admin/resources/${type}/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify({}),
    }),

  reject: (type, id, rejectionReason) =>
    apiRequest(`/admin/resources/${type}/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ rejectionReason }),
    }),
};

// Google / GitHub sign-in. The backend owns the whole OAuth flow; the
// frontend only starts it. Keep VITE_OAUTH_ENABLED unset (or "false") until
// the backend routes /auth/google and /auth/github are live.
const OAUTH_PROVIDERS = ["google", "github"];

export const oauthApi = {
  isEnabled: import.meta.env.VITE_OAUTH_ENABLED === "true",

  startUrl: (provider) => {
    if (!OAUTH_PROVIDERS.includes(provider)) {
      throw new Error("Unsupported sign-in provider.");
    }

    return `${API_BASE_URL}/auth/${provider}`;
  },
};