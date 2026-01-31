# 🎥 Convox - Project Documentation

Welcome to **Convox**! This project is a modern, real-time live learning platform designed to make online classes feel alive and interactive.

## 🚀 1. Topic & Description
**Convox** is a platform where teachers can schedule video lessons that start automatically for all students at the same time. Think of it like a "watch party" for education!

- **Why it was made**: Online learning can feel lonely. Pre-recorded videos are boring, and live streaming is hard to manage. This tool bridges that gap by letting teachers schedule pre-recorded videos to play "live" with real-time chat and automated teacher-messages.

---

## ✨ 2. Tech Stack & Tools (Small Student Level)
We used the best "Lego blocks" of web development to build this:
*   **Next.js (React)**: The "brain" that makes the website fast and easy to navigate.
*   **Tailwind CSS**: The "paint" that makes everything look premium and sleek.
*   **Supabase**: Our "digital filing cabinet" (Database) that stores users, sessions, and videos.
*   **Pusher**: The "fast walkie-talkie" (Real-time Sync) that makes sure everyone sees the same thing at the same time.
*   **Cloudinary**: Our "video vault" where all lessons are stored and streamed from.
*   **Lucide React**: Beautiful icons that make the menu easy to understand.

---

## ⚙️ 3. The Core Engine (How it Works)

### 🔄 The "Sync-Lock" Workflow
1.  **Creation**: Admin uploads a video and schedules a "Live Session" for a specific time.
2.  **The Pulse**: When the scheduled time arrives, the session status changes to `live` automatically.
3.  **Synchronization**: 
    - When a student joins, the system calculates: `Current Time - Start Time = Current Playback Position`.
    - Every student’s video player jumps to that exact second. If one person pauses, it doesn't affect others—they stay synced to the "live" clock!
4.  **Real-time Chat**: Messages sent via Pusher appear instantly on everyone's screen without refreshing.

### 🤖 Automated Messaging Flow
Admins can set "Timed Messages". For example:
- **At 02:00**: "Pay attention to this part!"
- **At 10:00**: "Download the PDF from the resources."
The system monitors the video time and "fires" these messages via Pusher at the exact second for everyone.

---

## 📊 4. Minute Technical Details
For those who want to know the "under the hood" secrets:
- **Database Schema**: We use tables for `users` (logins), `videos` (URLs and names), and `sessions` (the live events).
- **API Doorboats**: Routes like `/api/admin/sessions` handle the heavy lifting—checking if a session should be live or ended every time someone asks.
- **State Management**: We use **React Context** so the app "remembers" your login and current session details even when you move between pages.

---

## 🛠️ 5. How to Manage & Run (Student Guide)

### Local Setup (If you have the code)
1.  **Get the tools**: Make sure you have **Node.js** installed.
2.  **Install**: Open your terminal in the project folder and type `npm install`.
3.  **Configure**: Copy `.env.example` to a new file named `.env` and add your keys (Supabase, Pusher, Cloudinary).
4.  **Run**: Type `npm run dev`. Open `http://localhost:3000`.

### Using the Platform
1.  **Admin**: Log in to add videos and create sessions.
2.  **Student**: Log in to see "Upcoming" or "Live" sessions. Click "Join" to enter the room.
3.  **Chat**: Type in the box to talk to your classmates in real-time!

---

## 🔗 Live Demo
Check out the live version here:
👉 **[Convox Live](https://convox.vercel.app/login)**

---
*Created with ❤️ for students to build and learn.*
