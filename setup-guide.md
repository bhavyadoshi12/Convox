# 🚀 Setup Guide: Convox

This guide will walk you through setting up the necessary cloud services for Convox.

---

## 1. 🍃 MongoDB Atlas (Database)

MongoDB Atlas provides a free-tier cluster for your data.

1.  **Sign Up**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2.  **Create Cluster**: Follow the prompts to create a "Shared" (Free) cluster. Choose a provider and region near you.
3.  **Setup Database Access**: 
    *   Navigate to **Database Access** under Security.
    *   Add a new database user with a username and password. Keep these handy.
4.  **Setup Network Access**:
    *   Navigate to **Network Access** under Security.
    *   Add your current IP address, or `0.0.0.0/0` (Allow access from everywhere) for development.
5.  **Get Connection String**:
    *   Go to **Deployment > Database**.
    *   Click **Connect** on your cluster.
    *   Choose **Connect your application (Drivers)**.
    *   Copy the connection string and replace `<password>` with your user's password.
    *   Paste this into `MONGODB_URI` in your `.env` file.

---

## 2. ☁️ Cloudinary (Video & Image Hosting)

Cloudinary handles the storage and optimization of your uploaded videos.

1.  **Sign Up**: Go to [Cloudinary](https://cloudinary.com/signup) and create a free account.
2.  **Dashboard**: Once logged in, navigate to your **Dashboard**.
3.  **Get Credentials**:
    *   Copy your **Cloud Name**, **API Key**, and **API Secret**.
    *   Paste these into the corresponding `CLOUDINARY_*` variables in your `.env` file.
4.  **Enable Video**: Cloudinary supports videos by default, but ensure you have the "Video" product enabled if prompted.

---

## 3. 📡 Pusher (Real-time Features)

Pusher enables real-time synchronization of chat and video state.

1.  **Sign Up**: Go to [Pusher](https://pusher.com/signup) and create a free account.
2.  **Create App**:
    *   Under **Channels**, click "Create App".
    *   Give it a name and select a cluster (e.g., `ap2`).
    *   Set the frontend to "React" and backend to "Node.js" (though the keys are what matter).
3.  **App Keys**: 
    *   Navigate to **App Keys** in the sidebar.
    *   Copy your `app_id`, `key`, `secret`, and `cluster`.
    *   Paste these into the `PUSHER_*` and `NEXT_PUBLIC_PUSHER_*` variables in your `.env` file.

---

## 4. 🔐 JWT Secret (Authentication)

The `JWT_SECRET` is used to sign and verify user tokens.

1.  **Generate a Secret**: You can generate a strong random string using a terminal or an online tool.
2.  **Using OpenSSL (Recommended)**:
    Run this command in your terminal:
    ```bash
    openssl rand -base64 32
    ```
3.  **Using Node.js**:
    Alternatively, run this in your terminal:
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
4.  **Configure**: Copy the output and paste it into `JWT_SECRET` in your `.env` file. Ensure it is at least 32 characters long for security.

---

## 🏁 Final Step

After filling in all values in `.env.example`, rename the file to `.env` (or copy it to a new file named `.env`) to make them active in your local development environment.

```bash
# Example copy command
cp .env.example .env
```
