// app.js

// Check if admin token is valid
if (window.location.pathname === '/admin.html') {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/';
  } else {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role !== 'admin') {
      window.location.href = '/';
    }
  }
}


// ===================== USER DASHBOARD =====================

// Load User Dashboard (for user.html)
async function loadUserPage() {
  if (window.location.pathname !== "/user.html") return;

  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "/");

  // Fetch videos
  const res = await fetch("http://localhost:5000/api/videos", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const videos = await res.json();

  const container = document.getElementById("videoContainer");
  container.innerHTML = "";

  videos.forEach((video) => {
    const card = document.createElement("div");
    card.classList.add("video-card");
    card.innerHTML = `
      <h4>${video.title}</h4>
      <video controls width="100%">
        <source src="${video.url}" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <button onclick="likeVideo('${video._id}')">👍 Like (${video.likes})</button>
    `;
    container.appendChild(card);
  });

  // Handle logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  });
}

// Like a video
async function likeVideo(videoId) {
  const token = localStorage.getItem("token");
  await fetch(`http://localhost:5000/api/videos/${videoId}/like`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  loadUserPage(); // reload videos with updated like counts
}


// ===================== ADMIN SIDE =====================

// Upload new video
const uploadForm = document.getElementById('upload-form');
if (uploadForm) {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('video-title').value;
    const url = document.getElementById('video-url').value;

    await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url })
    });

    document.getElementById('video-title').value = '';
    document.getElementById('video-url').value = '';
    loadAdminVideos();
  });
}

// Load all videos (Admin view)
async function loadAdminVideos() {
  const res = await fetch('/api/videos');
  const videos = await res.json();

  const container = document.getElementById('admin-video-list');
  if (!container) return;
  container.innerHTML = '';

  videos.forEach(video => {
    const videoEl = document.createElement('div');
    videoEl.classList.add('video-item');
    videoEl.innerHTML = `
      <h4>${video.title}</h4>
      <video controls width="100%">
        <source src="${video.url}" type="video/mp4">
      </video>
      <button onclick="deleteVideo('${video._id}')">Delete</button>
    `;
    container.appendChild(videoEl);
  });
}

// Delete video
async function deleteVideo(id) {
  await fetch(`/api/videos/${id}`, { method: 'DELETE' });
  loadAdminVideos();
}

// Load all users (Admin view)
async function loadUsers() {
  const res = await fetch('/api/admin/users');
  const users = await res.json();

  const tbody = document.getElementById('user-list');
  if (!tbody) return;
  tbody.innerHTML = '';

  users.forEach(user => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td><button onclick="deleteUser('${user._id}')">Delete</button></td>
    `;
    tbody.appendChild(row);
  });
}

// Delete user
async function deleteUser(id) {
  await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  loadUsers();
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('video-list')) {
    loadVideos(); // User dashboard
  }
  if (document.getElementById('admin-video-list')) {
    loadAdminVideos(); // Admin dashboard
    loadUsers();
  }
});
