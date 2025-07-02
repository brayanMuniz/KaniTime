# KaniTime 🦀⏰

Earn internet time by doing your WaniKani reviews! This Chrome extension gamifies your study sessions by giving you precious seconds of browsing time for every review you complete.

## ✨ Features

*   **Earn Time:** Complete WaniKani reviews to gain internet browsing time.
*   **Time Management:** Your earned time depletes while you browse blocked sites.
*   **Site Blocking:** Customize a list of distracting websites to block when your time runs out.
*   **Password Protection:** Secure your blocked sites list with a password to prevent easy disabling.
*   **Real-time Updates:** See your remaining time and review count live in the extension popup.

## 🚀 How to Use

1.  **Install the Extension:**
    *   Download or clone this repository.
    *   Open Chrome, navigate to `chrome://extensions`.
    *   Enable "Developer mode" (toggle in the top right).
    *   Click "Load unpacked" and select the extension's folder.
2.  **Set Your WaniKani API Key:**
    *   Click the KaniTime icon in your browser toolbar to open the popup.
    *   In the "WaniKani API Key" section, enter your WaniKani Personal Access Token (v2 API). You can get one from [WaniKani Settings](https://www.wanikani.com/settings/personal_access_tokens).
    *   Click "Save".
3.  **Add Blocked Websites:**
    *   In the "Blocked Websites" section, enter the password (`wanikani`) and click "Unlock".
    *   Type the domain of a website you want to block (e.g., `youtube.com`, `facebook.com`) and click "Add".
    *   Click "Lock" to secure your list again.
4.  **Earn Time & Browse:**
    *   Go to WaniKani and complete your reviews. KaniTime automatically checks for completed reviews every few minutes (or click "Check WaniKani Reviews" manually).
    *   Each completed review earns you 30 seconds of internet time.
    *   When you visit a blocked site, your earned time will start counting down. If your time runs out, the site will be blocked!

## ⚠️ Important Notes

*   **Manifest V3:** This extension is built using Manifest V3 for Chrome Extensions.
*   **Aggressive Blocking:** The extension aims to block sites as effectively as possible, even with tab changes and new page loads.
*   **WaniKani API:** Requires a WaniKani API v2 key.

## 🛠️ Development

Feel free to fork, modify, and improve KaniTime! Contributions are welcome.

---

This is still a work in progress, please report any bugs that you find 
