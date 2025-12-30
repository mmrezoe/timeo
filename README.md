# ⏱️ Timeo

A simple and beautiful personal time tracking and productivity management system.

[![Next.js](https://img.shields.io/badge/Next.js-13-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

## ✨ Features

- ⏲️ **Live Timer** - Track time with a simple start/stop interface
- 📊 **Analytics Dashboard** - View daily and weekly statistics
- 🎯 **Goal Management** - Set daily goals and track streaks
- 📁 **Project Management** - Organize work with color-coded projects
- 📈 **Detailed Reports** - Advanced charts and statistics
- 🔥 **Streak System** - Build consistent habits with streak tracking
- 🌙 **Dark Theme** - Beautiful UI optimized for long work sessions

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/timeo.git
cd timeo

# Run with Docker Compose
docker-compose up -d
```

Then navigate to [http://localhost:3000](http://localhost:3000).

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/timeo.git
cd timeo

# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma migrate dev --name init

# Run development server
npm run dev
```

## ⚙️ Configuration

Create a `.env` file in the project root:

```env
DATABASE_URL="file:./data/prod.db"
NODE_ENV="development"

# for docker
DOMAIN=localhost
EMAIL=example@gmail.com
user=user
pass=$$2y$$05$$Km9uBOW4zRDG6pmlbNcZJOlHrRjQQHHuv978QYpwKeoEqJolpNhtq
# htpasswd -nbB user password
```

## 📖 Usage Guide

### 🏠 Dashboard

The dashboard provides an overview of your productivity:

- **Today's Stats**: View hours tracked today, active projects, and total entries
- **Goals & Streaks**: Monitor your daily goals with visual streak indicators (🔥 for active streaks)
- **Last 10 Days**: Browse your recent activity organized by date and project
- **14-Day Visual Streak**: Interactive calendar showing your goal completion history

### ⏱️ Timer

Track your work time in real-time:

1. **Start Tracking**:

   - Navigate to the Timer page
   - Select a project from the dropdown (or create a new one)
   - Optionally add a description of what you're working on
   - Click **Start** to begin tracking

2. **Stop Tracking**:

   - Click **Stop** when you're done
   - The time entry is automatically saved with the correct start and end times
   - The timer uses system time, so it works even if your browser tab is minimized or your computer sleeps

3. **View Today's Entries**:
   - Scroll down to see all entries for today
   - Each entry shows the project, duration, and description
   - Click the edit icon (✏️) to modify an entry
   - Click the delete icon (🗑️) to remove an entry

### 📁 Projects

Organize your work with projects:

1. **Create a Project**:

   - Go to the Projects page
   - Click **New Project**
   - Enter a project name
   - Choose a color from the palette or enter a custom hex color
   - Click **Create Project**

2. **Manage Projects**:

   - View all projects with their total time and entry count for today
   - Click the edit icon to modify project name or color
   - Click the delete icon to remove a project (this also deletes all associated entries and goals)

3. **View Project Entries**:
   - Expand any project to see its time entries for today
   - Each entry shows start time, end time, duration, and description

### 🎯 Goals

Set daily targets and build consistency:

1. **Create a Goal**:

   - Navigate to the Goals page
   - Click **Create Goal**
   - Select a project
   - Set the minimum minutes per day (e.g., 120 = 2 hours)
   - Click **Create Goal**

2. **Track Progress**:

   - View your current streak (🔥 indicates an active streak)
   - See today's progress toward your goal
   - Check the 14-day visual calendar for your completion history
   - Provisional streaks (🪵) show your streak even if today isn't complete yet

3. **Manage Goals**:
   - Delete goals you no longer need
   - Goals automatically update when you track time for their associated projects

### 📊 Reports

Analyze your productivity with detailed reports:

1. **Select Time Period**:

   - Go to the Reports page
   - Choose 7, 30, or 90 days

2. **View Analytics**:

   - **Line Chart**: See your time trends over the selected period
   - **Project Breakdown**: Detailed statistics for each project:
     - Total time tracked
     - Percentage of total time
     - Daily average
     - Number of entries
     - Visual progress indicators

3. **Summary Statistics**:
   - Total time tracked
   - Daily average
   - Number of active projects

### ✏️ Editing Time Entries

You can edit any time entry to correct mistakes:

1. **Find the Entry**:

   - Go to Timer or Projects page
   - Expand the project containing the entry
   - Locate the entry you want to edit

2. **Edit the Entry**:
   - Click the edit icon (✏️) on the entry
   - Modify the start time, end time, or description
   - Click **Save** to update
   - The duration is automatically recalculated based on the new times

## 🛠️ Tech Stack

- **Frontend**: Next.js 13, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite
- **Charts**: Recharts

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️**
