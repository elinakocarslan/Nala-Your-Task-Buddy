# Nala - Your Task Buddy

## 📌 Overview
A Chrome extension that helps users stay organized and motivated through a friendly virtual pet companion. Nala integrates with Google Calendar and provides a task management system, making productivity feel less like work and more like caring for your digital buddy.

> The project solves the problem of scattered task management by combining calendar events and to-do lists in one place, while adding a gamified, emotional connection to motivate users to stay on track.

---

## 🛠️ Technologies Used
- **JavaScript** (ES6 Modules)
- **HTML5 & CSS3**
- **Chrome Extension API** (Manifest V3)
- **Google Calendar API** & **Google Tasks API**
- **OAuth 2.0** for authentication
- Custom fonts (Noto Serif Display, Pixelify Sans)

---

## ✨ Features
- **Google Calendar Integration** - Fetches and displays events from multiple calendars for selected dates
- **To-Do List Management** - Add, complete, and track daily tasks with persistent storage
- **OAuth Authentication** - Secure sign-in with Google account
- **Visual Pet Companion** - Friendly interface with Nala character to make task management engaging
- **Browser Notifications** - Stay updated with reminders and alerts
- **Multi-Calendar Support** - Aggregates events from all selected Google calendars

---

## 🧠 Process & Design
**Approach:**
- Designed around the concept of a "task buddy" to make productivity feel personal and less mechanical
- Integrated Google APIs to avoid reinventing the wheel for calendar/task functionality
- Used Chrome's Manifest V3 architecture for better security and performance

**Key Decisions:**
- Chose Chrome Extension format for easy access via browser popup
- Implemented OAuth2 for secure, token-based authentication
- Separated concerns with modular JS files (calendar, to-do, sign-in logic)

**Challenges & Solutions:**
- Managing multiple calendar APIs required aggregating events from all visible calendars
- Handled date/time formatting and timezone considerations for accurate event display
- Implemented proper token storage and validation flow for seamless user experience

**Learnings:**
- Deepened understanding of Chrome Extension architecture and security policies
- Gained experience with Google API authentication flows
- Learned to balance feature richness with extension performance constraints

---

## 🚀 Future Plans
To make Nala a truly engaging productivity companion:

**Gamification & Motivation:**
[] **Pet Evolution System** - Nala grows, changes appearance, or unlocks accessories as users complete tasks
[] **Streak Tracking** - Reward users for consecutive days of task completion with visual badges
[] **Mood States** - Nala reacts with different animations based on productivity (happy when tasks are done, sleepy when neglected)

**Enhanced Functionality:**
[] **Smart Reminders** - AI-powered notifications that learn user patterns and suggest optimal task times
[] **Pomodoro Timer Integration** - Built-in focus sessions with Nala keeping you company
[] **Task Priority System** - Visual urgency indicators with automatic calendar conflict detection
[] **Analytics Dashboard** - Weekly/monthly productivity insights and completion rates

**Customization:**
- **Multiple Pet Options** - Choose from different virtual companions (cats, dogs, mythical creatures)
- **Theme Store** - Customizable UI themes and color schemes
- **Sound Effects** - Optional ambient sounds and celebration effects

---

## ▶️ Running the Project

```bash
# Clone the repository
git clone https://github.com/elinakocarslan/Nala-Your-Task-Buddy.git
cd Nala-Your-Task-Buddy
```

**Load the extension in Chrome:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `Nala-Your-Task-Buddy` folder
5. Click the extension icon in your browser toolbar to launch Nala

**Note:** You'll need to sign in with your Google account to access calendar and task features.

---
