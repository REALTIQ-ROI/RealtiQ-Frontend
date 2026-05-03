# RealtiQ Frontend: Not-Live Features Audit

Audit date: 2026-05-03

The frontend now uses the available live API surface for auth, properties, media upload, inquiries, payments, user management, admin stats, profile updates, and featured flags. The items below remain intentionally disabled or marked "Coming Soon" because the current backend contract does not expose the required capability.

## 1. Contact Form Submission

### Why It Is Not Live

The public contact page has no backend endpoint for storing or emailing non-property contact messages. The UI is disabled and directs users to phone/email.

### Endpoint Needed

```ts
POST /contact/messages
Auth: none
Body: {
  name: string;
  email: string;
  phone?: string;
  type: string;
  message: string;
}
Response: {
  message: string;
  contact: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    type: string;
    message: string;
    status: "new" | "closed";
    createdAt: string;
  };
}
```

### Backend Controller Code

```js
// models/ContactMessage.js
const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    type: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["new", "closed"], default: "new" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);

// controllers/contactController.js
const ContactMessage = require("../models/ContactMessage");

const createContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, type, message } = req.body;
    if (!name || !email || !type || !message) {
      return res.status(400).json({ message: "name, email, type, and message are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(422).json({ message: "Valid email is required" });
    }
    const contact = await ContactMessage.create({ name, email, phone, type, message });
    res.status(201).json({ message: "Contact message received", contact });
  } catch (err) {
    next(err);
  }
};

module.exports = { createContactMessage };

// routes/contactRoutes.js
const express = require("express");
const router = express.Router();
const { createContactMessage } = require("../controllers/contactController");

router.post("/messages", createContactMessage);

module.exports = router;
```

### Frontend Files Affected

- `src/pages/public/Contact.tsx`

## 2. Newsletter Subscription

### Why It Is Not Live

The footer has no newsletter endpoint or provider integration. The input and Join button are disabled.

### Endpoint Needed

```ts
POST /newsletter/subscribe
Auth: none
Body: { email: string }
Response: {
  message: string;
  subscriber: {
    _id: string;
    email: string;
    status: "subscribed";
    createdAt: string;
  };
}
```

### Backend Controller Code

```js
// models/NewsletterSubscriber.js
const mongoose = require("mongoose");

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ["subscribed", "unsubscribed"], default: "subscribed" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);

// controllers/newsletterController.js
const NewsletterSubscriber = require("../models/NewsletterSubscriber");

const subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(422).json({ message: "Valid email is required" });
    }
    const subscriber = await NewsletterSubscriber.findOneAndUpdate(
      { email: email.toLowerCase() },
      { email: email.toLowerCase(), status: "subscribed" },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: "Subscribed successfully", subscriber });
  } catch (err) {
    next(err);
  }
};

module.exports = { subscribe };

// routes/newsletterRoutes.js
const express = require("express");
const router = express.Router();
const { subscribe } = require("../controllers/newsletterController");

router.post("/subscribe", subscribe);

module.exports = router;
```

### Frontend Files Affected

- `src/components/layout/Footer.tsx`

## 3. Password Reset

### Why It Is Not Live

Login forms expose forgot-password affordances, but there are no reset request or reset confirmation endpoints.

### Endpoints Needed

```ts
POST /auth/forgot-password
Auth: none
Body: { email: string }
Response: { message: string }

POST /auth/reset-password
Auth: none
Body: { token: string; password: string }
Response: { message: string }
```

### Backend Controller Code

```js
// models/PasswordResetToken.js
const mongoose = require("mongoose");

const passwordResetTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);

// controllers/passwordResetController.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      await PasswordResetToken.deleteMany({ user: user._id });
      const token = crypto.randomBytes(32).toString("hex");
      await PasswordResetToken.create({
        user: user._id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      });
      // Send reset link through email service:
      // `${process.env.CLIENT_URL}/reset-password?token=${token}`
    }

    res.json({ message: "If the account exists, reset instructions have been sent" });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "token and password are required" });
    if (password.length < 8) return res.status(422).json({ message: "Password must be at least 8 characters" });

    const reset = await PasswordResetToken.findOne({ token, expiresAt: { $gt: new Date() } });
    if (!reset) return res.status(400).json({ message: "Invalid or expired reset token" });

    const hashed = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(reset.user, { password: hashed });
    await PasswordResetToken.deleteMany({ user: reset.user });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { forgotPassword, resetPassword };

// routes/authRoutes.js additions
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
```

### Frontend Files Affected

- `src/pages/auth/Login.tsx`
- `src/pages/auth/LoginToPurchase.tsx`
- `src/pages/auth/Admin/AdminLogin.tsx`
- `src/pages/auth/Landlord/LandlordLogin.tsx`
- new reset-password page if route is added

## 4. Virtual Tours and Gallery Management

### Why It Is Not Live

Properties support `media`, but there is no field or endpoint for a structured virtual-tour URL/model, no tour viewer metadata, and no media delete/reorder endpoint.

### Endpoints Needed

```ts
PATCH /properties/:id/tour
Auth: landlord owner or admin
Body: { tourUrl: string; provider: "matterport" | "youtube" | "custom" }
Response: { _id: string; tourUrl: string; tourProvider: string }

PATCH /properties/:id/media/reorder
Auth: landlord owner or admin
Body: { mediaIds: string[] }
Response: { media: MediaItem[] }

DELETE /properties/:id/media/:mediaId
Auth: landlord owner or admin
Response: { message: string; media: MediaItem[] }
```

### Backend Controller Code

```js
// controllers/propertyMediaController.js
const Property = require("../models/Property");
const { deleteFile } = require("../services/cloudinaryService");

const assertCanEdit = (req, property) => {
  if (req.user.role === "admin") return true;
  return property.ownerId?.toString() === req.user.id;
};

const updateTour = async (req, res, next) => {
  try {
    const { tourUrl, provider } = req.body;
    if (!tourUrl || !provider) return res.status(400).json({ message: "tourUrl and provider are required" });

    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (!assertCanEdit(req, property)) return res.status(403).json({ message: "Forbidden" });

    property.tourUrl = tourUrl;
    property.tourProvider = provider;
    await property.save();
    res.json({ _id: property._id, tourUrl: property.tourUrl, tourProvider: property.tourProvider });
  } catch (err) {
    next(err);
  }
};

const reorderMedia = async (req, res, next) => {
  try {
    const { mediaIds } = req.body;
    if (!Array.isArray(mediaIds)) return res.status(400).json({ message: "mediaIds must be an array" });

    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (!assertCanEdit(req, property)) return res.status(403).json({ message: "Forbidden" });

    const byId = new Map(property.media.map((item) => [item._id.toString(), item]));
    property.media = mediaIds.map((id) => byId.get(id)).filter(Boolean);
    await property.save();
    res.json({ media: property.media });
  } catch (err) {
    next(err);
  }
};

const deletePropertyMedia = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (!assertCanEdit(req, property)) return res.status(403).json({ message: "Forbidden" });

    const media = property.media.id(req.params.mediaId);
    if (!media) return res.status(404).json({ message: "Media item not found" });
    if (media.public_id) await deleteFile(media.public_id);

    property.media.pull(media._id);
    await property.save();
    res.json({ message: "Media deleted", media: property.media });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateTour, reorderMedia, deletePropertyMedia };
```

### Frontend Files Affected

- `src/pages/public/PropertyDetails.tsx`
- `src/pages/dashboard/Landlord/LandlordPropertyDetails.tsx`
- `src/pages/dashboard/Landlord/Editproperty.tsx`
- `src/components/property/MediaUploader.tsx`

## 5. Maps and Nearby Places

### Why It Is Not Live

Properties do not include coordinates, and there is no endpoint/provider for nearby places. The property detail map remains a static visual block.

### Endpoint Needed

```ts
PATCH /properties/:id/location
Auth: landlord owner or admin
Body: { latitude: number; longitude: number }
Response: { _id: string; latitude: number; longitude: number }

GET /properties/:id/nearby
Auth: none
Response: {
  places: Array<{ name: string; category: string; distanceKm: number }>
}
```

### Backend Controller Code

```js
// controllers/propertyLocationController.js
const Property = require("../models/Property");

const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(422).json({ message: "latitude and longitude must be numbers" });
    }
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (req.user.role !== "admin" && property.ownerId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    property.latitude = latitude;
    property.longitude = longitude;
    await property.save();
    res.json({ _id: property._id, latitude, longitude });
  } catch (err) {
    next(err);
  }
};

const getNearbyPlaces = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property?.latitude || !property?.longitude) {
      return res.status(404).json({ message: "Property coordinates not found" });
    }
    // Replace with Google Places, Mapbox, or another provider integration.
    res.json({ places: [] });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateLocation, getNearbyPlaces };
```

### Frontend Files Affected

- `src/pages/public/PropertyDetails.tsx`
- `src/pages/dashboard/Landlord/AddProperty.tsx`
- `src/pages/dashboard/Landlord/Editproperty.tsx`

## 6. Featured Listing Ordering, Rotation, and Analytics

### Why It Is Not Live

The backend supports `featured: boolean` only. Manual ordering, auto-rotation rules, and featured engagement metrics are not available.

### Endpoints Needed

```ts
PATCH /featured/order
Auth: admin
Body: { propertyIds: string[] }
Response: { featured: Array<{ property: string; order: number }> }

PATCH /featured/settings
Auth: admin
Body: { autoRotate: boolean; rotationIntervalHours: number }
Response: { autoRotate: boolean; rotationIntervalHours: number }

GET /featured/analytics
Auth: admin
Response: { impressions: number; clicks: number; inquiries: number }
```

### Backend Controller Code

```js
// models/FeaturedSettings.js
const mongoose = require("mongoose");

const featuredSettingsSchema = new mongoose.Schema(
  {
    autoRotate: { type: Boolean, default: false },
    rotationIntervalHours: { type: Number, default: 24 },
    order: [{ property: { type: mongoose.Schema.Types.ObjectId, ref: "Property" }, order: Number }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeaturedSettings", featuredSettingsSchema);

// controllers/featuredController.js
const FeaturedSettings = require("../models/FeaturedSettings");
const Property = require("../models/Property");

const updateFeaturedOrder = async (req, res, next) => {
  try {
    const { propertyIds } = req.body;
    if (!Array.isArray(propertyIds)) return res.status(400).json({ message: "propertyIds must be an array" });
    const count = await Property.countDocuments({ _id: { $in: propertyIds }, featured: true });
    if (count !== propertyIds.length) return res.status(422).json({ message: "All properties must be featured" });
    const settings = await FeaturedSettings.findOneAndUpdate(
      {},
      { order: propertyIds.map((property, order) => ({ property, order })) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ featured: settings.order });
  } catch (err) {
    next(err);
  }
};

const updateFeaturedSettings = async (req, res, next) => {
  try {
    const { autoRotate, rotationIntervalHours } = req.body;
    const settings = await FeaturedSettings.findOneAndUpdate(
      {},
      { autoRotate: Boolean(autoRotate), rotationIntervalHours: Number(rotationIntervalHours || 24) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

const getFeaturedAnalytics = async (req, res, next) => {
  try {
    res.json({ impressions: 0, clicks: 0, inquiries: 0 });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateFeaturedOrder, updateFeaturedSettings, getFeaturedAnalytics };
```

### Frontend Files Affected

- `src/pages/dashboard/Admin/FeaturedListings.tsx`
- `src/pages/public/Home.tsx`

## 7. Notifications, Inbox, Support Center, and Admin Settings

### Why It Is Not Live

The app has notification/help/mail/settings icons but no backend notification, message, support ticket, or settings resources. Unsupported admin settings are disabled.

### Endpoints Needed

```ts
GET /notifications
Auth: any
Response: { notifications: Array<{ _id: string; title: string; body: string; read: boolean; createdAt: string }> }

PATCH /notifications/:id/read
Auth: any
Response: { _id: string; read: true }

GET /messages
Auth: any
Response: { threads: Array<{ _id: string; subject: string; participants: string[]; updatedAt: string }> }

POST /support/tickets
Auth: any
Body: { subject: string; message: string }
Response: { ticket: { _id: string; subject: string; status: "open"; createdAt: string } }
```

### Backend Controller Code

```js
// controllers/notificationController.js
const Notification = require("../models/Notification");

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json(notification);
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markNotificationRead };

// controllers/supportController.js
const SupportTicket = require("../models/SupportTicket");

const createTicket = async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: "subject and message are required" });
    const ticket = await SupportTicket.create({ user: req.user.id, subject, message, status: "open" });
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTicket };
```

### Frontend Files Affected

- `src/components/layout/AdminLayout.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/LandlordPortalLayout.tsx`
- buyer, landlord, and admin dashboard pages with notification/mail/help controls

## 8. Analytics, Reports, and Exports

### Why It Is Not Live

The current backend exposes aggregate admin stats only. It does not expose property traffic, portfolio analytics, market insights, report generation, or downloadable PDFs.

### Endpoints Needed

```ts
GET /analytics/properties/:id
Auth: owner landlord or admin
Response: {
  views: number;
  inquiries: number;
  conversionRate: number;
  dailyViews: Array<{ date: string; count: number }>;
}

GET /reports/properties/:id.pdf
Auth: owner landlord or admin
Response: application/pdf

GET /reports/payments.csv
Auth: admin
Response: text/csv
```

### Backend Controller Code

```js
// controllers/analyticsController.js
const Property = require("../models/Property");
const Inquiry = require("../models/Inquiry");

const getPropertyAnalytics = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (req.user.role !== "admin" && property.ownerId?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const inquiries = await Inquiry.countDocuments({ property: property._id });
    res.json({ views: 0, inquiries, conversionRate: 0, dailyViews: [] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPropertyAnalytics };

// controllers/reportController.js
const Payment = require("../models/Payment");

const exportPaymentsCsv = async (req, res, next) => {
  try {
    const payments = await Payment.find().populate("user", "name email").populate("property", "title");
    const rows = ["reference,status,amount,buyer,property,createdAt"].concat(
      payments.map((p) =>
        [p.reference, p.status, p.amount, p.user?.email || "", p.property?.title || "", p.createdAt.toISOString()]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=payments.csv");
    res.send(rows.join("\n"));
  } catch (err) {
    next(err);
  }
};

module.exports = { exportPaymentsCsv };
```

### Frontend Files Affected

- `src/pages/dashboard/Admin/AdminDashboard.tsx`
- `src/pages/dashboard/Admin/ManageProperties.tsx`
- `src/pages/dashboard/Admin/AdminPropertyDetails.tsx`
- `src/pages/dashboard/Buyer/BuyerDashboard.tsx`
- `src/pages/dashboard/Landlord/LandlordDashboard.tsx`
- `src/pages/dashboard/Landlord/LandlordPropertyDetails.tsx`
- payment/report buttons across dashboards

## 9. Legal Pages

### Why It Is Not Live

Privacy and terms are displayed as non-clickable text because there are no CMS/static legal routes or content resources.

### Endpoint Needed

```ts
GET /pages/:slug
Auth: none
Params: slug = "privacy" | "terms"
Response: { slug: string; title: string; body: string; updatedAt: string }
```

### Backend Controller Code

```js
// models/Page.js
const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Page", pageSchema);

// controllers/pageController.js
const Page = require("../models/Page");

const getPage = async (req, res, next) => {
  try {
    const page = await Page.findOne({ slug: req.params.slug });
    if (!page) return res.status(404).json({ message: "Page not found" });
    res.json(page);
  } catch (err) {
    next(err);
  }
};

module.exports = { getPage };
```

### Frontend Files Affected

- `src/components/layout/Footer.tsx`
- `src/pages/auth/LoginToPurchase.tsx`
- `src/pages/auth/Admin/AdminLogin.tsx`

## 10. Purchase Registration Phone Capture

### Why It Is Not Live

`RegisterToPurchase` displays a phone field, but the current `POST /auth/register` contract accepts `name`, `email`, `password`, and `role` only. Phone can be added later through profile update after login.

### Endpoint Needed

```ts
POST /auth/register
Auth: none
Body: {
  name: string;
  email: string;
  password: string;
  role: "buyer" | "landlord";
  phone?: string;
}
Response: { user: User; token: string }
```

### Backend Controller Code

```js
// In authController.register after body destructuring:
const { name, email, password, role, phone } = req.body;

// In User.create payload:
const user = await User.create({
  name,
  email,
  password: hashed,
  role: role || "buyer",
  phone,
});
```

### Frontend Files Affected

- `src/pages/auth/RegisterToPurchase.tsx`
- `src/components/forms/RegisterForm.tsx`
