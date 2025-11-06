
// ===== LOGIN =====
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userid = document.getElementById("loginUserId").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!userid || !password) {
      alert("User ID and password are required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(data.user));

      if (data.user.approved === 1) {
        window.location.href = "dashboard.html";
      } else {
        alert("Your account is awaiting admin approval.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("An error occurred while logging in.");
    }
  });
}

// ===== SIGNUP =====
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const userid = document.getElementById("signupUserId").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const contact = document.getElementById("signupContact").value.trim();

    if (!name || !userid || !password || !email || !contact) {
      alert("All fields are required");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }

    if (!/^\d{10}$/.test(contact)) {
      alert("Contact number must be exactly 10 digits");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userid, password, email, contact }),
      });

      const data = await res.json();
      alert(data.message);
      if (res.ok) window.location.href = "index.html";
    } catch (error) {
      console.error("Signup error:", error);
      alert("Error during signup");
    }
  });
}

// ===== ADMIN DASHBOARD =====
async function fetchPendingUsers() {
  const table = document.getElementById("pendingUsers");
  if (!table) return;

  const res = await fetch("http://localhost:5000/api/auth/pending");
  const users = await res.json();

  table.innerHTML = "";
  if (users.length === 0) {
    table.innerHTML = "<tr><td colspan='6'>No pending users</td></tr>";
    return;
  }

  users.forEach((u) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${u.name}</td>
      <td>${u.userid}</td>
      <td>${u.email}</td>
      <td>${u.contact}</td>
      <td>${u.role}</td>
      <td>
        <button class="btn" onclick="approveUser(${u.id})">Approve</button>
        <button class="btn" style="background:red" onclick="rejectUser(${u.id})">Reject</button>
      </td>`;
    table.appendChild(row);
  });
}

async function approveUser(id) {
  const res = await fetch(`http://localhost:5000/api/auth/approve/${id}`, { method: "PUT" });
  const data = await res.json();
  alert(data.message);
  fetchPendingUsers();
}

async function rejectUser(id) {
  const res = await fetch(`http://localhost:5000/api/auth/reject/${id}`, { method: "DELETE" });
  const data = await res.json();
  alert(data.message);
  fetchPendingUsers();
}

// ===== LOGOUT =====
const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
  });
}

// ===== LOAD DASHBOARD =====
if (window.location.pathname.endsWith("dashboard.html")) {
  fetchPendingUsers();
}

// Dashboard button
const dashboardBtn = document.getElementById("dashboardBtn");
if (dashboardBtn) {
  dashboardBtn.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
}

// Get logged-in user
let currentUser = JSON.parse(localStorage.getItem("currentUser"));

// Settings button (modified to keep admin on pending.html)
const settingsBtn = document.getElementById("settingsBtn");
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("User not found. Please login again.");
      window.location.href = "index.html";
      return;
    }

    if (currentUser.role === "admin") {
      if (!window.location.pathname.endsWith("pending.html")) {
        window.location.href = "pending.html";
      }
    } else {
      if (!window.location.pathname.endsWith("settings.html")) {
        window.location.href = "settings.html";
      }
    }
  });
}

// ===== SETTINGS PAGE =====
if (window.location.pathname.endsWith("settings.html")) {
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser) {
    window.location.href = "index.html";
  } else {
    if (!currentUser.email || !currentUser.contact) {
      fetch(`http://localhost:5000/api/user/by-userid/${currentUser.userid}`)
      .then(res => res.json())
      .then(data => {
        currentUser = { ...currentUser, ...data };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));

        document.getElementById("currentName").textContent = currentUser.name || "";
        document.getElementById("currentEmail").textContent = currentUser.email || "";
        document.getElementById("currentContact").textContent = currentUser.contact || "";
        document.getElementById("currentUserId").textContent = currentUser.userid || "";
      })
      .catch(err => console.error(err));
    } else {
      document.getElementById("currentName").textContent = currentUser.name || "";
      document.getElementById("currentEmail").textContent = currentUser.email || "";
      document.getElementById("currentContact").textContent = currentUser.contact || "";
      document.getElementById("currentUserId").textContent = currentUser.userid || "";
    }
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });
  }

  const updateButtons = document.querySelectorAll(".update-btn");
  updateButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.field;
      const input = document.getElementById(`update${field.charAt(0).toUpperCase() + field.slice(1)}`);
      const span = document.getElementById(`current${field.charAt(0).toUpperCase() + field.slice(1)}`);

      if (btn.textContent === "Update") {
        input.style.display = "inline-block";
        btn.textContent = "Confirm";
        input.value = span.textContent;
      } else {
        const newValue = input.value.trim();
        if (!newValue) {
          alert("Value cannot be empty");
          return;
        }

        fetch(`http://localhost:5000/api/user/update/${currentUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value: newValue })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            span.textContent = newValue;
            input.style.display = "none";
            btn.textContent = "Update";

            currentUser[field] = newValue;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
          } else {
            alert(data.message || "Error updating detail");
          }
        })
        .catch(err => {
          console.error(err);
          alert("Error updating detail");
        });
      }
    });
  });

  const dashboardBtn = document.getElementById("dashboardBtn");
  if(dashboardBtn) dashboardBtn.addEventListener("click", () => window.location.href="dashboard.html");
}
const inventoryBtn = document.getElementById("inventoryBtn");
if(inventoryBtn) inventoryBtn.addEventListener("click", () => window.location.href="inventory.html");

// ===== PENDING PAGE (Admin) =====
if (window.location.pathname.endsWith("pending.html")) {
  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });
  }

  const dashboardBtn = document.getElementById("dashboardBtn");
  if(dashboardBtn) dashboardBtn.addEventListener("click", () => window.location.href="dashboard.html");

  async function fetchPendingUsers() {
    const tableBody = document.querySelector("#pendingUsers tbody");
    if (!tableBody) return;

    try {
      const res = await fetch("http://localhost:5000/api/auth/pending");
      const users = await res.json();

      tableBody.innerHTML = "";

      if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3">No pending users</td></tr>`;
        return;
      }

      users.forEach(u => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${u.name} <br><small>${u.userid}</small></td>
          <td>${u.email || '-'} <br> ${u.contact || '-'} <br> ${u.role}</td>
          <td>
            <button class="btn approve" onclick="approveUser(${u.id})">✔</button>
            <button class="btn reject" onclick="rejectUser(${u.id})">✖</button>
          </td>
        `;
        tableBody.appendChild(row);
      });

    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="3">Error loading pending users</td></tr>`;
    }
  }

  async function approveUser(id) {
    const res = await fetch(`http://localhost:5000/api/auth/approve/${id}`, { method: "PUT" });
    const data = await res.json();
    alert(data.message);
    fetchPendingUsers();
  }

  async function rejectUser(id) {
    const res = await fetch(`http://localhost:5000/api/auth/reject/${id}`, { method: "DELETE" });
    const data = await res.json();
    alert(data.message);
    fetchPendingUsers();
  }

  fetchPendingUsers();
}

// ===== INVENTORY PAGE =====
if (window.location.pathname.endsWith("inventory.html")) {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn)
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });

  const dashboardBtn = document.getElementById("dashboardBtn");
  if (dashboardBtn)
    dashboardBtn.addEventListener("click", () => (window.location.href = "dashboard.html"));

  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      if (!currentUser) {
        alert("User not found. Please login again.");
        window.location.href = "index.html";
        return;
      }
      if (currentUser.role === "admin") window.location.href = "pending.html";
      else window.location.href = "settings.html";
    });
  }

  async function fetchInventory() {
    const tableBody = document.querySelector("#inventoryTable tbody");
    if (!tableBody) return;

    try {
      const res = await fetch("http://localhost:5000/api/inventory");
      const items = await res.json();

      tableBody.innerHTML = "";
      if (items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7">No inventory items</td></tr>`;
        return;
      }

      items.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.itemId}</td>
          <td>${item.itemName}</td>
          <td>${item.itemQuantity}</td>
          <td>${item.itemCost}</td>
          <td>${item.supplierName}</td>
          <td>${item.supplierId}</td>
          <td>
            ${
              item.imagePath
                ? `<img src="http://localhost:5000${item.imagePath}" alt="${item.itemName}" width="60" height="60" style="object-fit:cover;border-radius:8px;">`
                : "No image"
            }
          </td>
        `;
        tableBody.appendChild(row);
      });
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="7">Error loading inventory</td></tr>`;
    }
  }

  fetchInventory();
}

// ===== CREATE ITEM MODAL LOGIC =====
const createBtn = document.getElementById("createBtn");
const createModal = document.getElementById("createModal");
const closeBtn = document.querySelector(".close-btn");

// Open modal
createBtn.addEventListener("click", () => {
  createModal.style.display = "block";
});

// Close modal
closeBtn.addEventListener("click", () => {
  createModal.style.display = "none";
});

// Close modal on outside click
window.addEventListener("click", (e) => {
  if (e.target === createModal) createModal.style.display = "none";
});

// Handle form submission
createItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const itemId = Number(document.getElementById("itemId").value.trim());
  const itemName = document.getElementById("itemName").value.trim();
  const itemQuantity = Number(document.getElementById("itemQuantity").value.trim());
  const itemCost = Number(document.getElementById("itemCost").value.trim());
  const supplierName = document.getElementById("supplierName").value.trim();
  const supplierId = Number(document.getElementById("supplierId").value.trim());

  if (!itemId || !itemName || !itemQuantity || !itemCost || !supplierName || !supplierId) {
    alert("All fields are required");
    return;
  }
  if (itemQuantity < 0 || itemCost < 0) {
    alert("Quantity and Cost cannot be negative");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("itemId", itemId);
    formData.append("itemName", itemName);
    formData.append("itemQuantity", itemQuantity);
    formData.append("itemCost", itemCost);
    formData.append("supplierName", supplierName);
    formData.append("supplierId", supplierId);

    const imageFile = document.getElementById("itemImage").files[0];
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const res = await fetch("http://localhost:5000/api/inventory/create", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message || "Item created successfully!");
      createModal.style.display = "none";
      createItemForm.reset();
      fetchInventory();
    } else {
      alert(data.message || "Error creating item");
    }
  } catch (err) {
    console.error("Error creating item:", err);
  }
});

// ===== UPDATE INVENTORY ITEM =====
const updateBtn = document.getElementById("updateBtn");
const updateModal = document.getElementById("updateModal");
const closeUpdateBtn = updateModal.querySelector(".close-btn");
const fetchItemBtn = document.getElementById("fetchItemBtn");
const updateItemForm = document.getElementById("updateItemForm");

let currentUpdateItemId = null;

// Open modal
updateBtn.addEventListener("click", () => {
  updateModal.style.display = "block";
  updateItemForm.reset();
  currentUpdateItemId = null;
});

// Close modal
closeUpdateBtn.addEventListener("click", () => (updateModal.style.display = "none"));
window.addEventListener("click", (e) => {
  if (e.target === updateModal) updateModal.style.display = "none";
});

// Fetch item details
fetchItemBtn.addEventListener("click", async () => {
  const itemId = Number(document.getElementById("updateItemId").value.trim());
  if (!itemId) return alert("Please enter a valid Item ID");

  try {
    const res = await fetch(`http://localhost:5000/api/inventory`);
    const items = await res.json();
    const item = items.find((i) => i.itemId === itemId);

    if (!item) {
      alert("Item ID does not match any inventory item");
      return;
    }

    document.getElementById("updateItemName").value = item.itemName;
    document.getElementById("updateItemQuantity").value = item.itemQuantity;
    document.getElementById("updateItemCost").value = item.itemCost;
    document.getElementById("updateSupplierName").value = item.supplierName;

    currentUpdateItemId = itemId;
  } catch (err) {
    console.error(err);
  }
});

// Handle update submission
updateItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUpdateItemId) return alert("Fetch an existing Item ID first");

  const itemName = document.getElementById("updateItemName").value.trim();
  const itemQuantity = Number(document.getElementById("updateItemQuantity").value.trim());
  const itemCost = Number(document.getElementById("updateItemCost").value.trim());
  const supplierName = document.getElementById("updateSupplierName").value.trim();

  if (!itemName || !itemQuantity || !itemCost || !supplierName) {
    return alert("All fields are required");
  }

  try {
    const formData = new FormData();
    formData.append("itemName", itemName);
    formData.append("itemQuantity", itemQuantity);
    formData.append("itemCost", itemCost);
    formData.append("supplierName", supplierName);

    const newImageFile = document.getElementById("updateItemImage").files[0];
    if (newImageFile) {
      formData.append("image", newImageFile);
    }

    const res = await fetch(`http://localhost:5000/api/inventory/${currentUpdateItemId}`, {
      method: "PUT",
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message || "Item updated successfully!");

      // Update table instantly
      const tableBody = document.querySelector("#inventoryTable tbody");
      const row = Array.from(tableBody.rows).find(
        (r) => Number(r.cells[0].textContent) === currentUpdateItemId
      );

      if (row) {
        row.cells[1].textContent = itemName;
        row.cells[2].textContent = itemQuantity;
        row.cells[3].textContent = itemCost;
        row.cells[4].textContent = supplierName;
      }

      updateModal.style.display = "none";
      updateItemForm.reset();
      currentUpdateItemId = null;
    } else {
      alert(data.message || "Error updating item");
    }
  } catch (err) {
    console.error(err);
    alert("Network or server error while updating item");
  }
});
