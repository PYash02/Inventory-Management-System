// backend/server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Database connection error:", err.message);
  else console.log("Connected to SQLite database:", dbPath);
});
const multer = require("multer");

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads")); // Folder where images are saved
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

// Serve images statically
const upload = multer({ storage });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create the `users` table if it doesn't exist
db.run(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    userid TEXT UNIQUE,
    password TEXT,
    email TEXT,
    contact TEXT,
    approved INTEGER DEFAULT 0,
    role TEXT DEFAULT 'user'
  )`,
  (err) => {
    if (err) {
      console.error("Error creating users table:", err.message);
      return;
    }

    console.log("Users table ready.");

    // Ensure a default Master Admin exists
    db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1", (err2, row) => {
      if (err2) {
        console.error("Error checking for admin:", err2.message);
        return;
      }
      if (!row) {
        db.run(
          `INSERT INTO users (name, userid, password, email, contact, approved, role)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ["MasterAdmin", "admin", "pass", null, null, 1, "admin"],
          (err3) => {
            if (err3) console.error("Error creating default admin:", err3.message);
            else console.log("Default admin created → userid: admin | password: pass");
          }
        );
      } else {
        console.log("Admin user already exists.");
      }
    });
  }
);

// ---------------- API ROUTES ----------------
// Signup (new users, pending approval)
app.post("/api/auth/signup", (req, res) => {
  const { name, userid, password, email, contact } = req.body;

  if (!name || !userid || !password || !email || !contact) {
    return res.status(400).json({ message: "All fields are required" });
  }
  // === Backend Validation ===
  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long" });
  }
  if (!/^\d{10}$/.test(contact)) {
    return res
      .status(400)
      .json({ message: "Contact number must be exactly 10 digits" });
  }
  db.get("SELECT * FROM users WHERE userid = ?", [userid], (err, user) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (user) return res.status(400).json({ message: "User ID already exists" });

    db.run(
      `INSERT INTO users (name, userid, password, email, contact, approved, role)
       VALUES (?, ?, ?, ?, ?, 0, 'user')`,
      [name, userid, password, email, contact],
      function (err2) {
        if (err2) return res.status(500).json({ message: "Error saving user" });
        return res.json({ message: "Signup successful. Await admin approval." });
      }
    );
  });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { userid, password } = req.body;
  if (!userid || !password)
    return res.status(400).json({ message: "User ID and password are required" });
  db.get(
    `SELECT id, name, userid, email, contact, approved, role FROM users WHERE userid = ? AND password = ?`,
    [userid, password],
    (err, user) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      if (!user.approved) return res.status(403).json({ message: "Await admin approval" });
      return res.json({ message: "Login successful", user });
    }
  );
});
// Get all pending users (for admin)
app.get("/api/auth/pending", (req, res) => {
  db.all(
    `SELECT id, name, userid, email, contact, role FROM users WHERE approved = 0`,
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Error fetching pending users" });
      res.json(rows);
    }
  );
});
// Approve user
app.put("/api/auth/approve/:id", (req, res) => {
  const id = req.params.id;
  db.run("UPDATE users SET approved = 1 WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ message: "Error approving user" });
    if (this.changes === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User approved successfully" });
  });
});
// Reject user (delete)
app.delete("/api/auth/reject/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ message: "Error rejecting user" });
    if (this.changes === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User rejected and removed" });
  });
});
// Update user detail
app.put("/api/user/update/:id", (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;
  const allowedFields = ["name", "email", "contact"];
  if (!allowedFields.includes(field)) {
    return res.status(400).json({ success: false, message: "Invalid field" });
  }
  db.run(`UPDATE users SET ${field} = ? WHERE id = ?`, [value, id], function(err) {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    res.json({ success: true, message: `${field} updated successfully` });
  });
});
// Get user by ID (for settings page)
app.get("/api/user/by-userid/:userid", (req, res) => {
  const { userid } = req.params;
  db.get(
    "SELECT id, name, userid, email, contact, role FROM users WHERE userid = ?",
    [userid],
    (err, user) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    }
  );
});
// Create the `inventory` table if it doesn't exist
db.run(
  `CREATE TABLE IF NOT EXISTS inventory (
    itemId INTEGER PRIMARY KEY,
    itemName TEXT NOT NULL,
    itemQuantity INTEGER NOT NULL,
    itemCost REAL NOT NULL,
    supplierName TEXT NOT NULL,
    supplierId INTEGER NOT NULL,
    imagePath TEXT
  )`,
  (err) => {
    if (err) {
      console.error("Error creating inventory table:", err.message);
    } else {
      console.log("Inventory table ready.");
    }
  }
);
// ---------------- Inventory API ----------------
// Get all inventory items
app.get("/api/inventory", (req, res) => {
  db.all("SELECT * FROM inventory", (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows);
  });
});
// Add new inventory item
app.post("/api/inventory/create", upload.single("image"), (req, res) => {
  const { itemId, itemName, itemQuantity, itemCost, supplierName, supplierId } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  if (!itemId || !itemName || !itemQuantity || !itemCost || !supplierName || !supplierId) {
    return res.status(400).json({ message: "All fields are required" });
  }
  db.run(
    `INSERT INTO inventory (itemId, itemName, itemQuantity, itemCost, supplierName, supplierId, imagePath)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [itemId, itemName, itemQuantity, itemCost, supplierName, supplierId, imagePath],
    function (err) {
      if (err) return res.status(500).json({ message: "DB insert error", error: err.message });
      res.json({ message: "Item created successfully", id: this.lastID, imagePath });
    }
  );
});
// Update inventory item
app.put("/api/inventory/:itemId", upload.single("image"), (req, res) => {
  const { itemId } = req.params;
  const { itemName, itemQuantity, itemCost, supplierName } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  const query = imagePath
    ? `UPDATE inventory SET itemName = ?, itemQuantity = ?, itemCost = ?, supplierName = ?, imagePath = ? WHERE itemId = ?`
    : `UPDATE inventory SET itemName = ?, itemQuantity = ?, itemCost = ?, supplierName = ? WHERE itemId = ?`;
  const params = imagePath
    ? [itemName, itemQuantity, itemCost, supplierName, imagePath, itemId]
    : [itemName, itemQuantity, itemCost, supplierName, itemId];
  db.run(query, params, function (err) {
    if (err) return res.status(500).json({ message: "DB error: " + err.message });
    if (this.changes === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item updated successfully" });
  });
});
// Delete inventory item
app.delete("/api/inventory/:itemId", (req, res) => {
  const { itemId } = req.params;
  db.run("DELETE FROM inventory WHERE itemId = ?", [itemId], function (err) {
    if (err) return res.status(500).json({ message: "DB error" });
    if (this.changes === 0) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item deleted" });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// ---------------- Supplier Table ----------------
db.run(
  `CREATE TABLE IF NOT EXISTS suppliers (
    supplierId INTEGER PRIMARY KEY,
    supplierName TEXT NOT NULL,
    contact TEXT NOT NULL,
    address TEXT,
    email TEXT
  )`,
  (err) => {
    if (err) console.error("Error creating suppliers table:", err.message);
    else console.log("Suppliers table ready.");
  }
);
// ------------- Supplier API ----------------
// Get all suppliers
app.get("/api/suppliers", (req, res) => {
  db.all("SELECT * FROM suppliers", (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows);
  });
});
// Create supplier
app.post("/api/suppliers/create", (req, res) => {
  const { supplierId, supplierName, contact, address, email } = req.body;
  if (!supplierId || !supplierName || !contact) {
    return res.status(400).json({ message: "SupplierId, Name and Contact are required" });
  }
  db.run(
    `INSERT INTO suppliers (supplierId, supplierName, contact, address, email)
     VALUES (?, ?, ?, ?, ?)`,
    [supplierId, supplierName, contact, address || "", email || ""],
    function(err) {
      if (err) return res.status(500).json({ message: "DB insert error", error: err.message });
      res.json({ message: "Supplier created successfully", id: this.lastID });
    }
  );
});
// Update supplier
app.put("/api/suppliers/:supplierId", (req, res) => {
  const { supplierId } = req.params;
  const { supplierName, contact, address, email } = req.body;
  db.run(
    `UPDATE suppliers SET supplierName = ?, contact = ?, address = ?, email = ? WHERE supplierId = ?`,
    [supplierName, contact, address, email, supplierId],
    function(err) {
      if (err) return res.status(500).json({ message: "DB error" });
      if (this.changes === 0) return res.status(404).json({ message: "Supplier not found" });
      res.json({ message: "Supplier updated successfully" });
    }
  );
});
// Delete supplier
app.delete("/api/suppliers/:supplierId", (req, res) => {
  const { supplierId } = req.params;
  db.run("DELETE FROM suppliers WHERE supplierId = ?", [supplierId], function(err) {
    if (err) return res.status(500).json({ message: "DB error" });
    if (this.changes === 0) return res.status(404).json({ message: "Supplier not found" });
    res.json({ message: "Supplier deleted successfully" });
  });
});
