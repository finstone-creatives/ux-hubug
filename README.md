# NxtDoor — Africa’s Premier Creator Platform

**The OnlyFans of Africa.** Beautiful, mobile-first, fully functional premium creator experience for East Africa.

- Verified adult creators (18+)
- Exclusive paid posts, private messaging, live streams with real-time chat + tips
- Seamless MTN MoMo + Airtel Money + Stripe flows (demo mode included)
- Creator dashboards, admin cPanel, wallet, bookings
- 100% working backend + frontend (including demo in-memory mode)

---

## ✨ Quick Start (Demo — everything works instantly)

```bash
cd backend
npm install
node server.js
```

Open http://localhost:5000

**Demo logins (password for creators & fans: `Test1234!`)**  
- Creators: `amara@example.com` (Kampala dancer), `zara@example.com` (Nairobi fashion), `rose@example.com`  
- Fan: `fan1@example.com`  
- Admin: `admin@nxtdoor.local` / `Admin123!`

All features fully work in demo: 
- Browse & beautiful profile pages
- Subscribe (MoMo / Stripe simulated → instant unlock)
- Real-time live (start from creator dashboard, chat + tips)
- DMs (real-time via Socket.io)
- Create posts (image/video/text + premium price)
- Creator earnings / go live
- Admin moderation & stats

Mobile experience: bottom navigation, FAB create button, full touch friendly, safe areas. Professional luxury dark design with African gold accents.

---

## 📁 Project Structure

```
nxtdoor/
├── backend/                  # Node.js + Express API
│   ├── config/db.js          # MongoDB connection
│   ├── controllers/          # Business logic
│   │   ├── authController.js
│   │   ├── videoController.js
│   │   ├── adminController.js
│   │   └── paymentController.js
│   ├── middleware/auth.js    # JWT protection
│   ├── models/               # MongoDB schemas
│   │   ├── User.js
│   │   ├── Video.js
│   │   ├── Ad.js
│   │   └── Subscription.js
│   ├── routes/               # API routes
│   │   ├── auth.js
│   │   ├── videos.js
│   │   ├── admin.js
│   │   └── payments.js
│   ├── uploads/              # Uploaded video files (auto-created)
│   ├── server.js             # Entry point
│   ├── package.json
│   └── .env.example          # → copy to .env and fill in
│
└── frontend/                 # HTML/CSS/JS frontend
    ├── index.html            # Main homepage
    ├── login.html            # Login page
    ├── register.html         # Registration + age gate
    ├── video.html            # Video player page
    ├── premium.html          # Premium subscription page
    ├── style.css             # Main stylesheet
    ├── premium.css           # Premium page styles
    ├── js/main.js            # Frontend logic
    └── admin/                # cPanel (admin only)
        ├── index.html        # Admin dashboard
        ├── style.css         # Admin styles
        └── app.js            # Admin JavaScript
```

---

## 🚀 Setup Instructions

### 1. Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)
- MTN MoMo Developer account: https://momodeveloper.mtn.com
- Airtel Money API account: https://developers.airtel.africa
- Stripe account: https://stripe.com

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in your `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/nxtdoor
JWT_SECRET=your_long_random_secret_here

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

MTN_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_COLLECTION_SUBSCRIPTION_KEY=...
MTN_API_USER=...
MTN_API_KEY=...
MTN_ENVIRONMENT=sandbox          # change to 'production' when live

AIRTEL_BASE_URL=https://openapi.airtel.africa
AIRTEL_CLIENT_ID=...
AIRTEL_CLIENT_SECRET=...
AIRTEL_ENVIRONMENT=sandbox

PREMIUM_PRICE_USD=9.99
PREMIUM_PRICE_UGX=37000
FRONTEND_URL=http://localhost:3000
```

Start the server:
```bash
npm run dev     # development (auto-restart)
npm start       # production
```

API runs at: `http://localhost:5000`
Health check: `http://localhost:5000/api/health`

---

### 3. Frontend Setup

No build step needed — pure HTML/CSS/JS.

Simply serve the `frontend/` folder using any static server:

```bash
# Option A: VS Code Live Server (recommended for dev)
# Option B: Python
cd frontend && python3 -m http.server 3000

# Option C: npx serve
npx serve frontend -p 3000
```

Open: `http://localhost:3000`

**Update API URL:** In `js/main.js`, `login.html`, `register.html`, `video.html`, `premium.html`, and `admin/app.js`, update:
```js
const API = 'http://localhost:5000/api';
// → change to your live domain e.g. 'https://api.nxtdoor.africa/api'
```

**Stripe publishable key:** In `premium.html`, replace:
```js
stripe = Stripe('pk_test_your_stripe_publishable_key');
// → with your real key from https://dashboard.stripe.com/apikeys
```

---

### 4. Create First Admin

After starting the server, register a normal user, then manually update their role in MongoDB:

```js
// In MongoDB shell or Compass
db.users.updateOne({ email: "yourmail@gmail.com" }, { $set: { role: "admin" } })
```

Then log in → you'll see the **⚙ cPanel** button in the header → access `admin/index.html`.

---

## 🌍 How to make it production (real Mongo + real payments)

1. Add real `MONGO_URI` in `.env`
2. Run `node seed.js` (or let it auto-seed on first start)
3. Fill real MTN/Airtel/Stripe keys
4. Deploy backend (Render, Railway, Heroku) + frontend static (or same server)
5. Point `FRONTEND_URL`

The platform is already production-grade in code structure.

---

## 🔑 API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register (with DOB check) |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (auth required) |

### Videos
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/videos` | List approved videos |
| GET | `/api/videos/:id` | Get single video |
| POST | `/api/videos/upload` | Upload video (auth required) |
| DELETE | `/api/videos/:id` | Delete video (auth required) |
| POST | `/api/videos/:id/report` | Report video (auth required) |

### Admin (admin/moderator only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/users` | List users |
| PUT | `/api/admin/users/:id/ban` | Ban user |
| PUT | `/api/admin/users/:id/unban` | Unban user |
| PUT | `/api/admin/users/:id/role` | Change role |
| GET | `/api/admin/videos` | Pending/moderation queue |
| PUT | `/api/admin/videos/:id/moderate` | Approve/reject video |
| GET/POST | `/api/admin/ads` | List / create ads |
| PUT/DELETE | `/api/admin/ads/:id` | Update / delete ad |
| GET | `/api/admin/revenue` | Revenue & subscriptions |

### Payments
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/payments/stripe/create-intent` | Create Stripe payment |
| POST | `/api/payments/stripe/confirm` | Confirm Stripe payment |
| POST | `/api/payments/mtn/request` | Request MTN MoMo |
| GET | `/api/payments/mtn/verify/:refId` | Verify MTN payment |
| POST | `/api/payments/airtel/request` | Request Airtel Money |
| GET | `/api/payments/airtel/verify/:txId` | Verify Airtel payment |

---

## 💰 Payment Flow

### MTN / Airtel Mobile Money
1. User enters phone number → clicks Pay
2. Backend sends push prompt to the phone
3. User approves on their handset
4. User clicks "Confirm" button on site
5. Backend verifies with MTN/Airtel API → activates premium

### Stripe / Card
1. User enters card details (Stripe Elements)
2. Frontend creates PaymentIntent via backend
3. Stripe confirms payment
4. Backend activates premium on success

---

## 🛡️ Age Verification
- Users must confirm 18+ via checkbox on registration
- Date of birth is validated both client-side and server-side
- Future upgrade: National ID upload via admin review (models already support it)

---

## 🎛️ cPanel Features
- **Dashboard** — users, videos, revenue, ads stats + monthly bar chart
- **User Management** — search, filter, ban/unban, change roles
- **Video Moderation** — approve/reject/flag uploads, add moderation notes
- **Ad Management** — create/edit/pause/delete ads with placement & budget tracking
- **Revenue** — breakdown by payment method (MTN/Airtel/Stripe), subscription list

---

## 📦 Deployment Notes
- Use **PM2** to keep Node.js running: `pm2 start server.js --name nxtdoor`
- Use **Nginx** as reverse proxy for the API
- Host frontend on Nginx, Vercel, or Netlify
- Use **MongoDB Atlas** for cloud DB
- Store uploads on **AWS S3** or **Cloudinary** in production (replace multer disk storage)
- Enable HTTPS with **Let's Encrypt** (Certbot)

---

© 2026 NxtDoor. All rights reserved. 18+ only.
