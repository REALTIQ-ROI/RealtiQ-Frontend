# RealtIQ Backend — Full Implementation Guide

> Derived from frontend analysis. Covers every route, model, controller, middleware, and service needed to power the RealtIQ frontend. Copy each section into your `realtiq-backend/` project.

---

## 1. Final Directory Structure

```
realtiq-backend/
├── index.js
├── package.json
├── .env
├── .gitignore
└── src/
    ├── app.js
    ├── config/
    │   ├── db.js
    │   └── cloudinary.js
    ├── middleware/
    │   ├── authMiddleware.js
    │   ├── roleMiddleware.js
    │   ├── uploadMiddleware.js
    │   └── errorMiddleware.js
    ├── models/
    │   ├── User.js
    │   ├── Property.js
    │   ├── Payment.js
    │   ├── Ownership.js
    │   ├── Inquiry.js
    │   └── VerificationToken.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── propertyRoutes.js
    │   ├── inquiryRoutes.js
    │   ├── paymentRoutes.js
    │   ├── userRoutes.js
    │   ├── adminRoutes.js
    │   └── mediaRoutes.js
    ├── controllers/
    │   ├── authController.js
    │   ├── propertyController.js
    │   ├── inquiryController.js
    │   ├── paymentController.js
    │   ├── userController.js
    │   ├── adminController.js
    │   └── mediaController.js
    ├── services/
    │   ├── cloudinaryService.js
    │   └── emailService.js
    └── utils/
        └── generateToken.js
```

---

## 2. Environment Variables (`.env`)

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_min_32_chars

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key

CLIENT_URL=http://localhost:5173

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM="RealtIQ <noreply@realtiq.com>"
```

---

## 3. `package.json`

Run `npm install axios streamifier` to add the two new dependencies.

```json
{
  "name": "realtiq-backend",
  "version": "1.0.0",
  "description": "Server side logic for the realtiq website",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "bcryptjs": "^3.0.3",
    "cloudinary": "^2.9.0",
    "cors": "^2.8.6",
    "dotenv": "^17.4.0",
    "express": "^5.2.1",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^9.4.1",
    "multer": "^2.1.1",
    "nodemailer": "^8.0.4",
    "streamifier": "^0.1.1",
    "uuid": "^13.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.14"
  }
}
```

---

## 4. Models

### `src/models/User.js`

```js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    phone: String,
    role: {
      type: String,
      enum: ["buyer", "landlord", "admin"],
      default: "buyer",
    },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
```

---

### `src/models/Property.js`

Changes from original: added `squareFeet`, `amenities`, `buyerId`; renamed `isFeatured` → `featured`; expanded `propertyType` enum.

```js
const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    propertyType: {
      type: String,
      enum: ["house", "apartment", "land", "commercial", "villa", "penthouse", "estate"],
      required: true,
    },
    bedrooms: Number,
    bathrooms: Number,
    squareFeet: Number,
    description: String,
    media: [
      {
        url: String,
        public_id: String,
        type: { type: String, enum: ["image", "video"] },
      },
    ],
    amenities: [String],
    status: {
      type: String,
      enum: ["available", "sold"],
      default: "available",
    },
    featured: { type: Boolean, default: false },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Property", propertySchema);
```

---

### `src/models/Payment.js`

Bug fixed: added `mongoose` import. Status aligned to frontend (`paid` instead of `successful`).

```js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    reference: String,
    paystackData: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
```

---

### `src/models/Ownership.js`

Bug fixed: added `mongoose` import.

```js
const mongoose = require("mongoose");

const ownershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    status: {
      type: String,
      enum: ["processing", "owned"],
      default: "processing",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ownership", ownershipSchema);
```

---

### `src/models/Inquiry.js`

Bug fixed: added `mongoose` import. Status aligned to frontend (`open/closed`). Added `inquiryType`, `userId`, `ownerId`, `fullName`.

```js
const mongoose = require("mongoose");

const inquirySchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: { type: String, required: true },
    inquiryType: {
      type: String,
      enum: ["Schedule a Private Viewing", "Request Digital Brochure", "General Inquiry"],
      default: "General Inquiry",
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inquiry", inquirySchema);
```

---

### `src/models/VerificationToken.js`

No changes needed — already correct.

```js
const mongoose = require("mongoose");

const verificationTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    token: String,
    expiresAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("VerificationToken", verificationTokenSchema);
```

---

## 5. Middleware

### `src/middleware/authMiddleware.js`

No changes needed — already correct.

```js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
```

---

### `src/middleware/roleMiddleware.js` *(new)*

```js
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient permissions" });
  }
  next();
};

module.exports = authorize;
```

---

### `src/middleware/uploadMiddleware.js` *(new)*

```js
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  },
});

module.exports = upload;
```

---

### `src/middleware/errorMiddleware.js` *(new)*

```js
const errorHandler = (err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
};

module.exports = errorHandler;
```

---

## 6. Services

### `src/services/cloudinaryService.js`

Updated to support streaming Buffer uploads (required for Multer memoryStorage).

```js
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadBuffer = (buffer, folder = "realtiq", resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          type: result.resource_type === "video" ? "video" : "image",
        });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const deleteFile = async (public_id) => {
  await cloudinary.uploader.destroy(public_id);
};

module.exports = { uploadBuffer, deleteFile };
```

---

### `src/services/emailService.js`

Fully implemented (was an empty stub).

```js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendWelcomeEmail = async ({ to, name }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Welcome to RealtIQ",
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Your RealtIQ account has been created. Start browsing premium properties today.</p>
    `,
  });
};

const sendInquiryNotification = async ({
  to,
  landlordName,
  propertyTitle,
  inquirerName,
  message,
}) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `New Inquiry for "${propertyTitle}"`,
    html: `
      <h2>Hello ${landlordName},</h2>
      <p>You have a new inquiry for <strong>${propertyTitle}</strong>.</p>
      <p><strong>From:</strong> ${inquirerName}</p>
      <p><strong>Message:</strong> ${message}</p>
      <p>Log in to your dashboard to respond.</p>
    `,
  });
};

module.exports = { sendWelcomeEmail, sendInquiryNotification };
```

---

## 7. Utils

### `src/utils/generateToken.js`

No changes needed — already correct.

```js
const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = generateToken;
```

---

## 8. Routes & Controllers

### 8.1 Auth

**`src/routes/authRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);

module.exports = router;
```

**`src/controllers/authController.js`**

```js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { sendWelcomeEmail } = require("../services/emailService");

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required" });
    }
    if (role === "admin") {
      return res.status(403).json({ message: "Cannot self-register as admin" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "buyer",
    });

    sendWelcomeEmail({ to: user.email, name: user.name }).catch(console.error);

    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
// Accepts optional `role` — used by AdminLogin and LandlordLogin to scope the query
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const query = { email: email.toLowerCase() };
    if (role) query.role = role;

    const user = await User.findOne(query).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login };
```

---

### 8.2 Properties

**`src/routes/propertyRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  buyProperty,
  toggleFeatured,
} = require("../controllers/propertyController");

router.get("/", getProperties);
router.get("/:id", getPropertyById);
router.post("/", auth, authorize("landlord"), createProperty);
router.patch("/:id", auth, authorize("landlord", "admin"), updateProperty);
router.delete("/:id", auth, authorize("landlord", "admin"), deleteProperty);
router.post("/:id/buy", auth, authorize("buyer"), buyProperty);
router.patch("/:id/featured", auth, authorize("admin"), toggleFeatured);

module.exports = router;
```

**`src/controllers/propertyController.js`**

```js
const { v4: uuidv4 } = require("uuid");
const Property = require("../models/Property");
const Payment = require("../models/Payment");
const Ownership = require("../models/Ownership");
const { deleteFile } = require("../services/cloudinaryService");

// GET /api/properties
// Query params: search, minPrice, maxPrice, propertyType, bedrooms, ownerId, page, limit
const getProperties = async (req, res, next) => {
  try {
    const {
      search,
      minPrice,
      maxPrice,
      propertyType,
      bedrooms,
      ownerId,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [{ title: re }, { location: re }, { propertyType: re }];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (propertyType) query.propertyType = propertyType;
    if (bedrooms) query.bedrooms = Number(bedrooms);
    if (ownerId) query.ownerId = ownerId;

    const skip = (Number(page) - 1) * Number(limit);

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate("ownerId", "name email")
        .populate("buyerId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(query),
    ]);

    res.json({ properties, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/properties/:id
const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("ownerId", "name email phone")
      .populate("buyerId", "name email");

    if (!property) return res.status(404).json({ message: "Property not found" });
    res.json(property);
  } catch (err) {
    next(err);
  }
};

// POST /api/properties (landlord)
const createProperty = async (req, res, next) => {
  try {
    const {
      title,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      squareFeet,
      description,
      media,
      amenities,
    } = req.body;

    if (!title || !price || !location || !propertyType) {
      return res
        .status(400)
        .json({ message: "title, price, location, and propertyType are required" });
    }

    const property = await Property.create({
      title,
      price,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      squareFeet,
      description,
      media: media || [],
      amenities: amenities || [],
      ownerId: req.user.id,
    });

    res.status(201).json(property);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/properties/:id (landlord — own property only; admin — any)
const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    if (
      req.user.role === "landlord" &&
      property.ownerId?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "You can only update your own properties" });
    }

    const editable = [
      "title",
      "price",
      "location",
      "propertyType",
      "bedrooms",
      "bathrooms",
      "squareFeet",
      "description",
      "media",
      "amenities",
      "status",
    ];

    editable.forEach((field) => {
      if (req.body[field] !== undefined) property[field] = req.body[field];
    });

    await property.save();
    res.json(property);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/properties/:id (landlord — own; admin — any)
const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    if (
      req.user.role === "landlord" &&
      property.ownerId?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "You can only delete your own properties" });
    }

    for (const item of property.media) {
      if (item.public_id) {
        await deleteFile(item.public_id).catch(console.error);
      }
    }

    await property.deleteOne();
    res.json({ message: "Property deleted" });
  } catch (err) {
    next(err);
  }
};

// POST /api/properties/:id/buy (buyer)
// Creates Payment + Ownership, marks property sold
const buyProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (property.status === "sold") {
      return res.status(400).json({ message: "Property is already sold" });
    }

    const reference = `RTQ-${uuidv4()}`;

    const payment = await Payment.create({
      user: req.user.id,
      property: property._id,
      amount: property.price,
      status: "paid",
      reference,
    });

    const ownership = await Ownership.create({
      user: req.user.id,
      property: property._id,
      payment: payment._id,
      status: "owned",
    });

    property.status = "sold";
    property.buyerId = req.user.id;
    await property.save();

    res.status(201).json({ payment, ownership, property });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/properties/:id/featured (admin)
const toggleFeatured = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });

    property.featured =
      req.body.featured !== undefined ? req.body.featured : !property.featured;

    await property.save();
    res.json(property);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  buyProperty,
  toggleFeatured,
};
```

---

### 8.3 Inquiries

**`src/routes/inquiryRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  createInquiry,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
} = require("../controllers/inquiryController");

router.post("/", createInquiry);                                       // public
router.get("/", auth, getInquiries);                                   // role-filtered
router.get("/:id", auth, getInquiryById);
router.patch("/:id", auth, authorize("landlord", "admin"), updateInquiryStatus);

module.exports = router;
```

**`src/controllers/inquiryController.js`**

```js
const Inquiry = require("../models/Inquiry");
const Property = require("../models/Property");
const { sendInquiryNotification } = require("../services/emailService");

// POST /api/inquiries (public — auth optional)
const createInquiry = async (req, res, next) => {
  try {
    const { propertyId, fullName, email, message, inquiryType } = req.body;

    if (!propertyId || !fullName || !email || !message) {
      return res
        .status(400)
        .json({ message: "propertyId, fullName, email, and message are required" });
    }

    const property = await Property.findById(propertyId).populate("ownerId", "name email");
    if (!property) return res.status(404).json({ message: "Property not found" });

    const inquiry = await Inquiry.create({
      property: propertyId,
      userId: req.user?.id || null,
      ownerId: property.ownerId?._id || null,
      fullName,
      email,
      message,
      inquiryType: inquiryType || "General Inquiry",
    });

    if (property.ownerId?.email) {
      sendInquiryNotification({
        to: property.ownerId.email,
        landlordName: property.ownerId.name,
        propertyTitle: property.title,
        inquirerName: fullName,
        message,
      }).catch(console.error);
    }

    res.status(201).json(inquiry);
  } catch (err) {
    next(err);
  }
};

// GET /api/inquiries
// buyer → their own; landlord → for their properties; admin → all
const getInquiries = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === "buyer") {
      query.userId = req.user.id;
    } else if (req.user.role === "landlord") {
      query.ownerId = req.user.id;
    }

    const inquiries = await Inquiry.find(query)
      .populate("property", "title location price media")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(inquiries);
  } catch (err) {
    next(err);
  }
};

// GET /api/inquiries/:id
const getInquiryById = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate("property", "title location price media")
      .populate("userId", "name email");

    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

    const isRelated =
      inquiry.userId?.toString() === req.user.id ||
      inquiry.ownerId?.toString() === req.user.id;

    if (!isRelated && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(inquiry);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/inquiries/:id (landlord or admin)
const updateInquiryStatus = async (req, res, next) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

    if (
      req.user.role === "landlord" &&
      inquiry.ownerId?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { status } = req.body;
    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ message: "status must be 'open' or 'closed'" });
    }

    inquiry.status = status;
    await inquiry.save();
    res.json(inquiry);
  } catch (err) {
    next(err);
  }
};

module.exports = { createInquiry, getInquiries, getInquiryById, updateInquiryStatus };
```

---

### 8.4 Payments

**`src/routes/paymentRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getPayments,
  getPaymentById,
  initializePayment,
  paystackWebhook,
  verifyPayment,
} = require("../controllers/paymentController");

// Webhook must be registered before express.json() parses the body.
// The raw-body setup is handled in app.js for this specific path.
router.post("/webhook", paystackWebhook);

router.get("/", auth, getPayments);
router.get("/verify/:reference", auth, verifyPayment);
router.get("/:id", auth, getPaymentById);
router.post("/initialize", auth, authorize("buyer"), initializePayment);

module.exports = router;
```

**`src/controllers/paymentController.js`**

```js
const axios = require("axios");
const crypto = require("crypto");
const Property = require("../models/Property");
const Payment = require("../models/Payment");
const Ownership = require("../models/Ownership");

// GET /api/payments
// buyer → own; landlord → for their properties; admin → all
const getPayments = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === "buyer") {
      query.user = req.user.id;
    } else if (req.user.role === "landlord") {
      const props = await Property.find({ ownerId: req.user.id }).select("_id");
      query.property = { $in: props.map((p) => p._id) };
    }

    const payments = await Payment.find(query)
      .populate("user", "name email")
      .populate("property", "title location price media")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (err) {
    next(err);
  }
};

// GET /api/payments/:id
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("user", "name email")
      .populate("property", "title location price media");

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const isOwner = payment.user._id.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(payment);
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/initialize (buyer)
// Creates a pending Payment, calls Paystack, returns { redirectUrl, reference }
const initializePayment = async (req, res, next) => {
  try {
    const { propertyId } = req.body;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (property.status === "sold") {
      return res.status(400).json({ message: "Property is already sold" });
    }

    const amountInKobo = property.price * 100;

    const psRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount: amountInKobo,
        metadata: { propertyId: property._id.toString(), buyerId: req.user.id },
        callback_url: `${process.env.CLIENT_URL}/post-payment-redirect`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { authorization_url, reference } = psRes.data.data;

    await Payment.create({
      user: req.user.id,
      property: property._id,
      amount: property.price,
      status: "pending",
      reference,
    });

    res.json({ redirectUrl: authorization_url, reference });
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/webhook (Paystack)
const paystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.sendStatus(400);
    }

    const { event, data } = req.body;

    if (event === "charge.success") {
      const payment = await Payment.findOne({ reference: data.reference });
      if (!payment || payment.status === "paid") return res.sendStatus(200);

      payment.status = "paid";
      payment.paystackData = data;
      await payment.save();

      const property = await Property.findById(payment.property);
      if (property && property.status === "available") {
        property.status = "sold";
        property.buyerId = payment.user;
        await property.save();

        await Ownership.create({
          user: payment.user,
          property: property._id,
          payment: payment._id,
          status: "owned",
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200); // Always 200 to Paystack regardless
  }
};

// GET /api/payments/verify/:reference (buyer)
const verifyPayment = async (req, res, next) => {
  try {
    const psRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const { status, data } = psRes.data;

    if (status && data.status === "success") {
      const payment = await Payment.findOneAndUpdate(
        { reference: req.params.reference },
        { status: "paid", paystackData: data },
        { new: true }
      );
      return res.json({ verified: true, payment });
    }

    res.json({ verified: false });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPayments,
  getPaymentById,
  initializePayment,
  paystackWebhook,
  verifyPayment,
};
```

---

### 8.5 Users

**`src/routes/userRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getUsers,
  getLandlords,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

router.get("/", auth, authorize("admin"), getUsers);
router.get("/landlords", auth, authorize("admin"), getLandlords);
router.get("/:id", auth, getUserById);
router.patch("/:id", auth, updateUser);
router.delete("/:id", auth, authorize("admin"), deleteUser);

module.exports = router;
```

**`src/controllers/userController.js`**

```js
const User = require("../models/User");
const Property = require("../models/Property");

// GET /api/users (admin)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// GET /api/users/landlords (admin)
const getLandlords = async (req, res, next) => {
  try {
    const landlords = await User.find({ role: "landlord" }).sort({ createdAt: -1 });

    const result = await Promise.all(
      landlords.map(async (landlord) => {
        const propertyCount = await Property.countDocuments({ ownerId: landlord._id });
        return { ...landlord.toJSON(), propertyCount };
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id (self or admin)
const getUserById = async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:id
// Self: may update name and phone only
// Admin: may also update isVerified and role
const updateUser = async (req, res, next) => {
  try {
    const isSelf = req.user.id === req.params.id;
    const isAdmin = req.user.role === "admin";

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const allowed = isAdmin
      ? ["name", "phone", "isVerified", "role"]
      : ["name", "phone"];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    await user.save();
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id (admin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getLandlords, getUserById, updateUser, deleteUser };
```

---

### 8.6 Admin Stats

**`src/routes/adminRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { getDashboardStats } = require("../controllers/adminController");

router.get("/stats", auth, authorize("admin"), getDashboardStats);

module.exports = router;
```

**`src/controllers/adminController.js`**

```js
const User = require("../models/User");
const Property = require("../models/Property");
const Payment = require("../models/Payment");
const Inquiry = require("../models/Inquiry");

// GET /api/admin/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProperties,
      activeListings,
      soldProperties,
      totalInquiries,
      revenueResult,
    ] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments(),
      Property.countDocuments({ status: "available" }),
      Property.countDocuments({ status: "sold" }),
      Inquiry.countDocuments(),
      Payment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    res.json({
      totalUsers,
      totalProperties,
      activeListings,
      soldProperties,
      totalInquiries,
      totalRevenue: revenueResult[0]?.total || 0,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboardStats };
```

---

### 8.7 Media Upload

**`src/routes/mediaRoutes.js`**

```js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadMedia } = require("../controllers/mediaController");

// POST /api/media/upload
// Frontend: upload files first → get back { media: [{url, public_id, type}] }
//           then include those objects in the property create/update payload
router.post(
  "/upload",
  auth,
  authorize("landlord", "admin"),
  upload.array("files", 10),
  uploadMedia
);

module.exports = router;
```

**`src/controllers/mediaController.js`**

```js
const { uploadBuffer } = require("../services/cloudinaryService");

// POST /api/media/upload
const uploadMedia = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files provided" });
    }

    const media = await Promise.all(
      req.files.map((file) => uploadBuffer(file.buffer, "realtiq/properties"))
    );

    res.json({ media });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadMedia };
```

---

## 9. Updated `src/app.js`

```js
const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const mediaRoutes = require("./routes/mediaRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Paystack webhook needs raw body — must be registered before express.json()
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/media", mediaRoutes);

app.use(errorHandler);

module.exports = app;
```

---

## 10. Complete API Route Table

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | /api/auth/register | ✗ | — | Register buyer or landlord |
| POST | /api/auth/login | ✗ | — | Login (role param scopes query) |
| GET | /api/properties | ✗ | — | List with filters + pagination |
| GET | /api/properties/:id | ✗ | — | Single property detail |
| POST | /api/properties | ✓ | landlord | Create listing |
| PATCH | /api/properties/:id | ✓ | landlord, admin | Update listing |
| DELETE | /api/properties/:id | ✓ | landlord, admin | Delete listing |
| POST | /api/properties/:id/buy | ✓ | buyer | Direct purchase (no Paystack) |
| PATCH | /api/properties/:id/featured | ✓ | admin | Toggle featured badge |
| POST | /api/inquiries | ✗ | — | Submit inquiry (auth optional) |
| GET | /api/inquiries | ✓ | any | List inquiries (role-filtered) |
| GET | /api/inquiries/:id | ✓ | any | Single inquiry |
| PATCH | /api/inquiries/:id | ✓ | landlord, admin | Update status open/closed |
| GET | /api/payments | ✓ | any | List payments (role-filtered) |
| GET | /api/payments/:id | ✓ | any | Single payment |
| POST | /api/payments/initialize | ✓ | buyer | Paystack checkout init |
| POST | /api/payments/webhook | ✗ | — | Paystack webhook handler |
| GET | /api/payments/verify/:ref | ✓ | buyer | Manual payment verification |
| GET | /api/users | ✓ | admin | All users |
| GET | /api/users/landlords | ✓ | admin | All landlords + property count |
| GET | /api/users/:id | ✓ | any | User profile (self or admin) |
| PATCH | /api/users/:id | ✓ | any | Update profile |
| DELETE | /api/users/:id | ✓ | admin | Delete user |
| GET | /api/admin/stats | ✓ | admin | Dashboard aggregate stats |
| POST | /api/media/upload | ✓ | landlord, admin | Upload images/video to Cloudinary |

---

## 11. Bugs Fixed from Original Scaffold

| File | Bug | Fix Applied |
|------|-----|-------------|
| `Payment.js` | Missing `mongoose` import | Added |
| `Ownership.js` | Missing `mongoose` import | Added |
| `Inquiry.js` | Missing `mongoose` import | Added |
| `.env` | `JWT_SECRET` missing from template | Added |
| `Auth.js` | Empty stub causing confusion | Deleted — logic lives in `authController.js` |
| `emailService.js` | Empty stub | Fully implemented |
| `Property.js` | Missing `squareFeet`, `amenities`, `buyerId` fields used by frontend | Added |
| `Property.js` | `isFeatured` vs frontend's `featured` mismatch | Renamed to `featured` |
| `Inquiry.js` | Status `new/responded` vs frontend's `open/closed` | Aligned to `open/closed` |
| `Payment.js` | Status `successful` vs frontend's `paid` | Aligned to `paid` |
| `Inquiry.js` | Missing `inquiryType`, `userId`, `ownerId`, `fullName` fields | Added |

---

## 12. Frontend Integration Notes

**API base URL** — set `VITE_API_BASE_URL=http://localhost:5000/api` in the frontend `.env` file so the axios client points at the real backend.

**Auth** — Login/register responses return `{ user, token }`. The frontend stores both in `localStorage` under keys `user` and `token`. The token is sent as `Authorization: Bearer <token>` on every protected request.

**Media upload flow** — The frontend `PropertyForm` currently sends a URL string directly. To wire up real uploads:
1. Call `POST /api/media/upload` with `multipart/form-data` containing the `files` field.
2. The response returns `{ media: [{ url, public_id, type }] }`.
3. Pass that array as `media` in the subsequent `POST /api/properties` or `PATCH /api/properties/:id` body.

**Paystack** — Two purchase flows exist:
- `POST /properties/:id/buy` — instant purchase (marks paid immediately). Used by the current frontend mock flow.
- `POST /payments/initialize` → redirect user to Paystack → webhook confirms → property marked sold. This is the real payment path intended for the `/checkout` page.

**`GET /api/properties`** — The response wraps results: `{ properties, total, page, limit }`. Update `propertyService.getProperties()` in the frontend to unwrap `data.properties` instead of treating `data` as the array directly.

---

## 13. Admin Seed Script

Admin accounts cannot be self-registered (the register endpoint blocks `role: "admin"`). Create the initial admin directly from a one-time seed script.

**`src/scripts/seedAdmin.js`**

```js
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

const seed = async () => {
  await connectDB();

  const email = "admin@realtiq.com";
  const existing = await User.findOne({ email });

  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  const password = await bcrypt.hash("Admin@12345", 12);

  await User.create({
    name: "Platform Admin",
    email,
    password,
    role: "admin",
    isVerified: true,
  });

  console.log("Admin seeded:", email);
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Add to `package.json` scripts:

```json
"seed:admin": "node src/scripts/seedAdmin.js"
```

Run once after first deploy:

```bash
npm run seed:admin
```

---

## 14. Rate Limiting

Install: `npm install express-rate-limit`

Add to `src/app.js` after the `cors` call, before routes:

```js
const rateLimit = require("express-rate-limit");

// Global limit: 200 req/15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
  })
);

// Stricter limit on auth routes: 20 req/15 min per IP
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: "Too many login attempts, please try again later." },
  })
);
```

---

## 15. Input Validation

The controllers already do basic presence checks. For production, add `express-validator` for thorough validation.

Install: `npm install express-validator`

Example — auth validation middleware (`src/middleware/validators/authValidators.js`):

```js
const { body, validationResult } = require("express-validator");

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain a number"),
];

const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
];

module.exports = { registerRules, loginRules, handleValidation };
```

Wire into `authRoutes.js`:

```js
const { registerRules, loginRules, handleValidation } = require("../middleware/validators/authValidators");

router.post("/register", registerRules, handleValidation, register);
router.post("/login", loginRules, handleValidation, login);
```

Example — property validation (`src/middleware/validators/propertyValidators.js`):

```js
const { body, validationResult } = require("express-validator");

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

const createPropertyRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("price").isNumeric().withMessage("Price must be a number"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("propertyType")
    .isIn(["house", "apartment", "land", "commercial", "villa", "penthouse", "estate"])
    .withMessage("Invalid property type"),
  body("bedrooms").optional().isInt({ min: 0 }),
  body("bathrooms").optional().isInt({ min: 0 }),
  body("squareFeet").optional().isNumeric(),
];

module.exports = { createPropertyRules, handleValidation };
```

Wire into `propertyRoutes.js`:

```js
const { createPropertyRules, handleValidation } = require("../middleware/validators/propertyValidators");

router.post("/", auth, authorize("landlord"), createPropertyRules, handleValidation, createProperty);
```

---

## 16. `.gitignore`

```
node_modules/
.env
*.log
dist/
.DS_Store
```

---

## 17. Project Setup & Running Guide

### First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Install the two additional packages not in original scaffold
npm install axios streamifier express-rate-limit express-validator

# 3. Copy .env template and fill in your values
cp .env.example .env

# 4. Seed the admin account (run once)
npm run seed:admin

# 5. Start dev server
npm run dev
```

### Environment checklist before starting

| Variable | Where to get it |
|----------|----------------|
| `MONGO_URI` | MongoDB Atlas → Connect → Drivers |
| `JWT_SECRET` | Any long random string (32+ chars) |
| `CLOUD_NAME` / `CLOUD_API_KEY` / `CLOUD_API_SECRET` | Cloudinary dashboard → Settings → Access Keys |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard → Settings → API Keys |
| `CLIENT_URL` | `http://localhost:5173` in dev; your deployed frontend URL in prod |
| `EMAIL_*` | Gmail SMTP with an App Password (not your account password) |

### Verify the server is running

```bash
curl http://localhost:5000/api/properties
# Expected: { "properties": [], "total": 0, "page": 1, "limit": 50 }
```

---

## 18. Connecting the Frontend

Once the backend is running, open the frontend project and create `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Then replace the mock service calls. The mock layer is in `src/services/mockStore.ts`. Each service file (`authService.ts`, `propertyService.ts`, etc.) currently imports from there. Replace those imports with real API calls using the configured `API` axios instance from `src/services/api.ts`.

### `src/services/authService.ts` — replace mock with real calls

```ts
import API from "./api";

export const authService = {
  login: async (payload: { email: string; password: string; role?: string }) => {
    const { data } = await API.post("/auth/login", payload);
    return data; // { user, token }
  },
  register: async (payload: { name: string; email: string; password: string; role?: string }) => {
    const { data } = await API.post("/auth/register", payload);
    return data; // { user, token }
  },
};
```

### `src/services/propertyService.ts` — replace mock with real calls

```ts
import API from "./api";
import type { Property, PropertyFilters, CreatePropertyPayload } from "../types";

export const propertyService = {
  getProperties: async (filters?: PropertyFilters): Promise<Property[]> => {
    const { data } = await API.get("/properties", { params: filters });
    return data.properties; // unwrap the paginated response
  },
  getPropertyById: async (id: string): Promise<Property> => {
    const { data } = await API.get(`/properties/${id}`);
    return data;
  },
  addProperty: async (_ownerId: string, payload: CreatePropertyPayload): Promise<Property> => {
    const { data } = await API.post("/properties", payload);
    return data;
  },
  updateProperty: async (id: string, payload: Partial<Property>): Promise<Property> => {
    const { data } = await API.patch(`/properties/${id}`, payload);
    return data;
  },
  deleteProperty: async (id: string): Promise<void> => {
    await API.delete(`/properties/${id}`);
  },
  buyProperty: async (propertyId: string, _buyerId: string) => {
    const { data } = await API.post(`/properties/${propertyId}/buy`);
    return data;
  },
};
```

### `src/services/inquiryService.ts` — replace mock with real calls

```ts
import API from "./api";
import type { Inquiry, CreateInquiryPayload } from "../types";

export const inquiryService = {
  createInquiry: async (payload: CreateInquiryPayload): Promise<Inquiry> => {
    const { data } = await API.post("/inquiries", payload);
    return data;
  },
  getInquiries: async (): Promise<Inquiry[]> => {
    const { data } = await API.get("/inquiries");
    return data;
  },
  updateInquiryStatus: async (id: string, status: "open" | "closed"): Promise<Inquiry> => {
    const { data } = await API.patch(`/inquiries/${id}`, { status });
    return data;
  },
};
```

### `src/services/paymentService.ts` — replace mock with real calls

```ts
import API from "./api";
import type { Payment } from "../types";

export const paymentService = {
  getPayments: async (): Promise<Payment[]> => {
    const { data } = await API.get("/payments");
    return data;
  },
  initializePayment: async (payload: { propertyId: string; amount: number }) => {
    const { data } = await API.post("/payments/initialize", payload);
    return data; // { redirectUrl, reference }
  },
};
```

### `src/services/userService.ts` — replace mock with real calls

```ts
import API from "./api";
import type { User } from "../types";

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const { data } = await API.get("/users");
    return data;
  },
  getLandlords: async (): Promise<User[]> => {
    const { data } = await API.get("/users/landlords");
    return data;
  },
  updateUserName: async (userId: string, name: string): Promise<User> => {
    const { data } = await API.patch(`/users/${userId}`, { name });
    return data;
  },
};
```

### `src/services/adminService.ts` *(new)*

```ts
import API from "./api";

export const adminService = {
  getStats: async () => {
    const { data } = await API.get("/admin/stats");
    return data;
    // { totalUsers, totalProperties, activeListings, soldProperties, totalInquiries, totalRevenue }
  },
  toggleFeatured: async (propertyId: string, featured: boolean) => {
    const { data } = await API.patch(`/properties/${propertyId}/featured`, { featured });
    return data;
  },
};
```

### Media upload helper *(new)*

```ts
import API from "./api";
import type { MediaItem } from "../types";

export const mediaService = {
  upload: async (files: File[]): Promise<MediaItem[]> => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const { data } = await API.post("/media/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.media; // [{ url, public_id, type }]
  },
};
```

---

## 19. Deployment Checklist

- [ ] Set all environment variables on your hosting platform (Railway, Render, Fly.io, etc.)
- [ ] Set `CLIENT_URL` to your production frontend URL (no trailing slash)
- [ ] Register the Paystack webhook URL in the Paystack dashboard:
      `https://your-backend.com/api/payments/webhook`
- [ ] Run `npm run seed:admin` once on the production server to create the admin account
- [ ] Switch Paystack keys from `sk_test_*` to `sk_live_*` when going live
- [ ] Enable MongoDB Atlas IP allowlist for your server's IP
- [ ] Set `JWT_SECRET` to a securely generated random value (never reuse dev secrets)
