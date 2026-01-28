# 🎥 ZoomStream Sync

**ZoomStream Sync** is a high-performance, real-time live learning platform designed to bridges the gap between pre-recorded content and live interaction. It allows instructors to schedule video-based sessions that stay perfectly synchronized for all participants, featuring automated messaging and real-time chat.

---

## ✨ Key Features

- **🚀 Live Synchronization**: Proprietary "Sync-Lock" technology ensures every student sees the exact same frame at the exact same time.
- **📅 Session Scheduling**: Plan classes in advance with automated start times.
- **💬 Real-Time Chat**: Interactive chat system with specialized "Instructor" badges and automated messaging.
- **⏱️ Message Timeline**: Admins can schedule automated messages to trigger at precise timestamps during the video playback.
- **📊 Admin Dashboard**: Comprehensive management of videos, sessions, and platform statistics.
- **📱 Responsive Design**: Fully optimized for Desktop, Tablet, and Mobile views.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide React
- **Backend**: Next.js API Routes, Mongoose (MongoDB)
- **Real-time**: Pusher Channels
- **Media**: Cloudinary (Video Hosting & Optimization)
- **State Management**: React Hooks (useMemo, useCallback) & Context API
- **Authentication**: JWT (JSON Web Tokens) with Role-Based Access Control

---

## 📋 Prerequisites

Before you begin, ensure you have the following:

- **Node.js**: v18.x or later
- **MongoDB Atlas Account**: For database storage
- **Cloudinary Account**: For video and thumbnail hosting
- **Pusher Account**: For real-time synchronization

---

## ⚙️ Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/ZoomStream_Sync.git
   cd ZoomStream_Sync
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Setup Environment Variables**:
   Create a `.env` file in the root directory by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Fill in your credentials as described in the [Setup Guide](./setup-guide.md).

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📂 Project Structure

```text
ZoomStream_Sync/
├── app/                  # Next.js App Router (Admin & Student routes)
│   ├── (admin)/          # Protected Admin Dashboard & Management
│   ├── (student)/        # Student Joining & Live Room
│   └── api/              # Backend API Endpoints
├── components/           # Reusable UI Components
│   ├── admin/            # Admin-only components (Modals, Forms, Stats)
│   ├── student/          # Student-only components (Player, Chat)
│   └── ui/               # Primary UI Kit (Buttons, Skeletons, Spinners)
├── lib/                  # Shared Utilities (Cloudinary, Pusher, MongoDB)
├── models/               # Mongoose Database Schemas
├── public/               # Static Assets
└── next.config.js        # Next.js Configuration
```

---

## 🛰️ API Documentation

### Authentication
- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Authenticate and receive a JWT.

### Admin Operations
- `GET /api/admin/stats`: Fetch dashboard statistics.
- `GET /api/admin/videos`: List all uploaded videos.
- `POST /api/admin/videos/upload`: Upload a new video to Cloudinary.
- `GET /api/admin/sessions`: List and filter live sessions.

### Real-time Features
- `POST /api/chat/send`: Send a real-time message.
- `POST /api/chat/trigger-admin-message`: Internal sync for automated messages.

---

## 🚀 Deployment

For detailed instructions on deploying to **Vercel**, please refer to our [Deployment Guide](./DEPLOYMENT.md).

---

## 🛠️ Troubleshooting

- **Server Lock Issue**: If you see "Unable to acquire lock" or "Port in use":
  - Run `npm run dev:clean` instead of `npm run dev`. This automatically clears the lock.
  - If still stuck, run `./fix-server.ps1` in PowerShell to kill all background node processes.
- **MongoDB Connection**: Ensure your IP is whitelisted in MongoDB Atlas.
- **Pusher Keys**: If chat fails, double-check your cluster and public keys in `.env`.
- **Large Uploads**: Cloudinary free tier has a 100MB video limit by default.

---

## 🤝 Contributing

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

**Built with ❤️ by the ZoomStream Sync Team**
