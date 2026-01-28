# 🚀 Deployment Guide: ZoomStream_Sync

This guide walks you through deploying your ZoomStream_Sync application to **Vercel**.

---

## 🏗️ Prerequisites

*   A [GitHub](https://github.com/) account.
*   A [Vercel](https://vercel.com/) account.
*   All environment variables ready from the [Setup Guide](./setup-guide.md).

---

## 📦 Step 1: Push Code to GitHub

1.  Initialize a git repository if you haven't already:
    ```bash
    git init
    ```
2.  Add all files:
    ```bash
    git add .
    ```
3.  Commit your changes:
    ```bash
    git commit -m "Initial commit - ZoomStream_Sync"
    ```
4.  Create a new repository on GitHub and push your code:
    ```bash
    git remote add origin https://github.com/your-username/your-repo-name.git
    git branch -M main
    git push -u origin main
    ```

---

## 🚀 Step 2: Connect to Vercel

1.  Log in to [Vercel](https://vercel.com/).
2.  Click **"Add New..."** and select **Project**.
3.  Import your GitHub repository.

---

## 🔑 Step 3: Add Environment Variables

In the **Configure Project** screen, expand the **Environment Variables** section. Add all the variables from your `.env` file:

*   `MONGODB_URI`
*   `CLOUDINARY_CLOUD_NAME`
*   `CLOUDINARY_API_KEY`
*   `CLOUDINARY_API_SECRET`
*   `NEXT_PUBLIC_PUSHER_KEY`
*   `PUSHER_APP_ID`
*   `PUSHER_SECRET`
*   `NEXT_PUBLIC_PUSHER_CLUSTER`
*   `JWT_SECRET`
*   `NEXT_PUBLIC_APP_URL` (Set this to your production Vercel URL, e.g., `https://your-project.vercel.app`)

---

## 🚢 Step 4: Deploy

1.  Click **Deploy**.
2.  Wait for the build process to finish. Vercel will automatically detect the Next.js framework and use the settings in `vercel.json`.

---

## 🧪 Step 5: Test Production

1.  Once the deployment is complete, visit the provided URL.
2.  Test the following:
    *   Login/Registration functionality.
    *   Video uploading (Admin).
    *   Session creation and live playback synchronization.
    *   Real-time chat.

---

## 🛠️ Troubleshooting

### 1. Database Connection (MongoDB)
*   **Issue**: Application crashes or returns 500 errors on login/fetch.
*   **Fix**: Ensure you have whitelisted "0.0.0.0/0" in MongoDB Atlas Network Access or added Vercel's IP ranges (though 0.0.0.0/0 is easier for serverless). Check that `MONGODB_URI` is correctly set in Vercel.

### 2. Pusher Synchronization
*   **Issue**: Chat messages or video sync not working in production.
*   **Fix**: Verify that `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` are correct. Remember that variables prefixed with `NEXT_PUBLIC_` are required on the client side.

### 3. Video Upload Failures
*   **Issue**: 500 error when uploading large videos.
*   **Fix**: Cloudinary has upload limits on free tiers. Also, Vercel has a payload limit of 4.5MB for serverless functions. For large videos, ensure you are using the client-side upload approach if possible, or check if Cloudinary's "Upload Presets" are configured for signed uploads.

### 4. JWT Errors
*   **Issue**: "Invalid Token" or "Unauthorized" errors after deployment.
*   **Fix**: Ensure `JWT_SECRET` matches between your local test and production if you are reusing tokens, or simply log in again to generate a new token with the production secret.

### 5. Deployment Region
*   **Issue**: High latency or connection timeouts.
*   **Fix**: Our `vercel.json` is set to `sin1` (Singapore). If your users are elsewhere, change the "regions" in `vercel.json` to a region closer to your main audience or your MongoDB cluster region.
