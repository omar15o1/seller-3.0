function myFunction() {
  var x = document.getElementById("password");
  if (x.type === "password") {
    x.type = "text";
  } else {
    x.type = "password";
  }
}

function showToast(message) {
  var toast = document.getElementById("toast");
  if (!toast) {
    window.alert(message);
    return;
  }
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(function () {
    toast.classList.remove("show");
  }, 3000);
}

const API_BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "access_token";

function authHeaders(json = false) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(Boolean(options.body)), ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "../login/index.html";
    throw new Error("Please log in again");
  }
  if (!response.ok) throw new Error(payload.detail || "Request failed");
  return payload;
}

async function loadProfile() {
  const profile = await apiRequest("/me");
  document.getElementById("profileUsername").value = profile.username || "";
  document.getElementById("profileEmail").value = profile.email || "";
  document.getElementById("profileBirthday").value = profile.birthday || "";
  document.getElementById("profileGender").value = profile.gender || "gender";
}

async function saveProfile(event) {
  event.preventDefault();
  const data = {
    username: document.getElementById("profileUsername").value.trim(),
    email: document.getElementById("profileEmail").value.trim(),
    birthday: document.getElementById("profileBirthday").value,
    gender: document.getElementById("profileGender").value,
    password: document.getElementById("password").value,
  };
  if (!data.username) return showToast("Username is required");
  try {
    await apiRequest("/me", { method: "PUT", body: JSON.stringify(data) });
    document.getElementById("password").value = "";
    showToast("Profile updated successfully");
  } catch (error) {
    showToast(error.message);
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getFilenameFromContentDisposition(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
  if (!match) return fallback;
  return match[1].replace(/['"]/g, "");
}

async function downloadWithAuth(url, fallbackFilename) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    let payload = null;
    try {
      payload = await res.json();
    } catch (e) {
      // ignore
    }
    throw new Error((payload && payload.detail) || `Request failed (${res.status})`);
  }

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition");
  const filename = getFilenameFromContentDisposition(cd, fallbackFilename);

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) {
    window.location.href = "../login/index.html";
    return;
  }
  loadProfile().catch((error) => showToast(error.message));
  document.getElementById("profileForm")?.addEventListener("submit", saveProfile);
  const downloadBtn = document.querySelector(".download-d");
  const deleteBtn = document.querySelector(".delete-d");
  const uploadBtn = document.querySelector(".upload-d");

  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
      try {
        await downloadWithAuth(`${API_BASE_URL}/dashboard/export-excel`, "Predictions_Export.xlsx");
      } catch (err) {
        showToast(err.message || "Download failed");
      }
    });
  }

  // Backend doesn't expose these endpoints yet
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      showToast("هذا الزر غير مدعوم حاليًا في الـ backend");
    });
  }
  if (uploadBtn) {
    uploadBtn.addEventListener("click", () => {
      showToast("هذا الزر غير متصل حاليًا بـ backend");
    });
  }
});