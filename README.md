<div align="center">

# ⏱️ Timeo

### Personal Time Tracking & Productivity Management System

A beautiful, modern time tracking application built with Next.js, featuring goal management, streaks, and comprehensive analytics.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [API](#-api) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

**Timeo** is a full-featured personal time tracking application designed to help you monitor your productivity, build consistent work habits, and gain insights into how you spend your time. Inspired by tools like Toggl Track, Timeo offers a clean, intuitive interface with powerful features for project management, goal tracking, and detailed analytics.

### ✨ Key Highlights

- 🎯 **Smart Goal Tracking** - Set daily goals and track your streaks with visual progress indicators
- ⏲️ **Real-time Timer** - Track time with a simple start/stop interface
- 📊 **Advanced Analytics** - Visualize your productivity with beautiful charts and reports
- 🎨 **Customizable Projects** - Organize work with color-coded projects
- 🔥 **Streak System** - Build consistency with streak tracking and provisional streak indicators
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🌙 **Dark Mode** - Beautiful dark theme optimized for long working hours
- 🚀 **Fast & Lightweight** - Built with performance in mind using Next.js and SQLite

---

## 🎯 Features

### 🏠 Dashboard
- **Quick Stats Overview** - Today's hours, weekly hours, active projects, and total entries
- **10-Day History** - Visual timeline of your recent work
- **Goals & Streaks** - Track daily goals with fire emoji streaks 🔥
- **14-Day Visual Streak** - Interactive calendar showing your progress

### ⏱️ Timer
- **Live Timer** - Real-time countdown with HH:MM:SS display
- **Project Selection** - Quick dropdown to select projects
- **Entry Description** - Add notes to your time entries
- **Today's Activity** - Expandable list showing all entries for the day
- **Entry Management** - Edit or delete time entries with ease

### 📁 Projects
- **Project Library** - View all projects with today's time and entry counts
- **CRUD Operations** - Create, read, update, and delete projects
- **Color Coding** - 15 beautiful color options for visual organization
- **Complete Deletion** - Remove projects with all associated data

### 🎯 Goals
- **Daily Targets** - Set minimum minutes per day for each project
- **Streak Tracking** - Build and maintain consistency streaks
- **Provisional Streaks** - See your streak even if today isn't complete yet 🪵
- **Progress Indicators** - Visual bars showing daily goal completion
- **Goal Management** - Create and delete goals with ease

### 📊 Reports & Analytics
- **Period Selection** - View data for 7, 30, or 90 days
- **Line Chart** - Visualize time trends over your selected period
- **Project Breakdown** - Detailed stats for each project:
  - Total time with percentage share
  - Daily average calculations
  - Entry counts and progress circles
- **Summary Statistics** - Total time, daily average, and active projects

### 📈 Review
- **Historical Data** - Browse entries by date
- **Project Filtering** - View time by project
- **Entry Details** - See start/end times and descriptions
- **Export Ready** - Data structured for future export features

---

## 🚀 Installation

### 🐳 Docker Installation (Recommended)

The easiest way to run Timeo is using Docker. No Node.js installation required!

#### Prerequisites

- **Docker** 20.10 or higher
- **Docker Compose** 2.0 or higher

#### Quick Start with Docker

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/timeo.git
cd timeo
```

2. **Start with Docker Compose**

```bash
docker-compose up -d
```

3. **Access the application**

Navigate to [http://localhost:3000](http://localhost:3000)

#### Using Makefile (Optional)

For convenience, use the provided Makefile:

```bash
# Install and start
make install

# View logs
make logs

# Stop
make down

# Backup database
make backup

# View all commands
make help
```

📖 **See [DOCKER.md](DOCKER.md) for detailed Docker documentation**

---

### 💻 Manual Installation

If you prefer to run without Docker:

#### Prerequisites

- **Node.js** 16.x or higher
- **npm** or **yarn** package manager

#### Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/timeo.git
cd timeo
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up the database**

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

4. **Start the development server**

```bash
npm run dev
```

5. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database configuration
DATABASE_URL="file:../data/dev.db"

# Optional: Next.js configuration
NODE_ENV="development"
```

### Database Location

- The SQLite database file is stored in `data/dev.db`
- You can change the location by modifying `DATABASE_URL` in `.env`
- The `data/` directory is gitignored to protect your personal data

---

## 📚 Usage

### Starting a Timer

1. Navigate to the **Timer** page
2. Select a project from the dropdown
3. Optionally add a description
4. Click **Start** to begin tracking
5. Click **Stop** when you're done

### Creating a Project

1. Go to the **Projects** page
2. Click **New Project**
3. Enter a name and choose a color
4. Click **Create Project**

### Setting Up Goals

1. Navigate to the **Goals** page
2. Click **Create Goal**
3. Select a project and set daily target minutes
4. Click **Create Goal**
5. Complete your daily target to build streaks! 🔥

### Viewing Reports

1. Go to the **Reports** page
2. Select a time period (7, 30, or 90 days)
3. View the line chart for overall trends
4. Scroll down to see project-by-project breakdown

### Editing Time Entries

1. On the **Timer** or **Projects** page
2. Expand a project to see its entries
3. Click the edit icon (✏️) on any entry
4. Modify start time, end time, or description
5. Save your changes

---

## 🔌 API Reference

### Timer Endpoints

#### Start Timer
```http
POST /api/timer/start
Content-Type: application/json

{
  "projectId": 1
}
```

#### Stop Timer
```http
POST /api/timer/stop
Content-Type: application/json

{
  "entryId": 123
}
```

### Project Endpoints

#### List Projects
```http
GET /api/projects
```

#### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "My Project",
  "color": "#6366f1"
}
```

#### Update Project
```http
PATCH /api/projects/[id]
Content-Type: application/json

{
  "name": "Updated Name",
  "color": "#ec4899"
}
```

#### Delete Project
```http
DELETE /api/projects/[id]
```
> Deletes the project and all associated entries, goals, and goal statuses.

### Entry Endpoints

#### List Entries
```http
GET /api/entries?startDate=2024-01-01&endDate=2024-01-02
```

#### Update Entry
```http
PATCH /api/entries/[id]
Content-Type: application/json

{
  "start": "2024-01-01T10:00:00Z",
  "end": "2024-01-01T11:00:00Z",
  "note": "Updated description"
}
```

#### Delete Entry
```http
DELETE /api/entries/[id]
```

### Goal Endpoints

#### List Goals
```http
GET /api/goals
```

#### Create Goal
```http
POST /api/goals
Content-Type: application/json

{
  "projectId": 1,
  "minMinutesPerDay": 120
}
```

#### Delete Goal
```http
DELETE /api/goals/[id]
```

### Review Endpoints

#### Get Today's Data
```http
GET /api/review/today
```

Returns entries, project totals, and goal statuses for today.

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Chart library for analytics
- **Custom CSS Animations** - Smooth, modern animations

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Type-safe database access
- **SQLite** - Lightweight, file-based database

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **PostCSS** - CSS processing

---

## 📁 Project Structure

```
timeo/
├── components/          # React components
│   └── ProjectsList.js  # Reusable project list component
├── data/               # Database files (gitignored)
│   └── dev.db         # SQLite database
├── lib/               # Utility functions
│   ├── prisma.js     # Prisma client instance
│   ├── dates.js      # Date utility functions
│   └── goals.js      # Goal calculation utilities
├── pages/            # Next.js pages
│   ├── api/         # API routes
│   │   ├── entries/ # Entry CRUD operations
│   │   ├── goals/   # Goal management
│   │   ├── projects/ # Project management
│   │   ├── review/  # Review and today data
│   │   └── timer/   # Timer operations
│   ├── index.js     # Dashboard
│   ├── timer.js     # Timer page
│   ├── projects.js  # Projects page
│   ├── goals.js     # Goals page
│   └── report.js    # Reports & Analytics
├── prisma/          # Database schema and migrations
│   └── schema.prisma # Database models
├── public/          # Static assets
├── styles/          # Global styles
│   └── globals.css  # Tailwind and custom CSS
├── .env            # Environment variables
├── package.json    # Dependencies and scripts
└── README.md       # This file
```

---

## 🎨 Design System

### Color Palette

- **Primary:** `#6366f1` (Indigo)
- **Secondary:** `#10b981` (Emerald)
- **Warning:** `#f59e0b` (Amber)
- **Background:** `#0f0f1e` (Dark Blue)
- **Surface:** `#1a1a2e` (Dark Blue Gray)
- **Elevated:** `#232338` (Lighter Dark)

### Typography

- **Font Family:** System UI, -apple-system, BlinkMacSystemFont
- **Headings:** Bold, larger sizes
- **Body:** Regular weight, comfortable line height
- **Monospace:** For time displays and numbers

### Components

- **Cards:** Rounded corners with subtle borders and shadows
- **Buttons:** Gradient backgrounds with hover effects
- **Inputs:** Dark backgrounds with focus states
- **Modals:** Backdrop blur with centered content

---

## 🧪 Testing

```bash
# Run the development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write clear commit messages
- Test your changes thoroughly
- Update documentation as needed
- Ensure all API routes work correctly

---

## 📝 Roadmap

### Planned Features

- [ ] **Data Export** - Export entries to CSV/JSON
- [ ] **Custom Reports** - Create custom date ranges and filters
- [ ] **Tags System** - Add tags to time entries
- [ ] **Multi-user Support** - Team features and permissions
- [ ] **Calendar View** - Month/week calendar with entries
- [ ] **Pomodoro Timer** - Integrated Pomodoro technique
- [ ] **Mobile App** - Native iOS/Android apps
- [ ] **Dark/Light Theme Toggle** - Theme customization
- [ ] **Backup & Sync** - Cloud backup options
- [ ] **Notifications** - Reminders and goal alerts

---

## 🐛 Known Issues

- Large datasets (>1000 entries) may slow down report generation
- SVG charts may not render perfectly on some older browsers
- Database file size grows over time (consider periodic cleanup)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👏 Acknowledgments

- Inspired by [Toggl Track](https://toggl.com/track/)
- Icons from [Heroicons](https://heroicons.com/)
- Charts powered by [Recharts](https://recharts.org/)
- UI components inspired by modern design systems

---

## 📞 Support

If you have any questions or need help:

- **Issues:** [GitHub Issues](https://github.com/yourusername/timeo/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/timeo/discussions)
- **Email:** your.email@example.com

---

## 💖 Show Your Support

If you like this project, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 🤝 Contributing code

---

<div align="center">

**Made with ❤️ and lots of ☕**

[⬆ Back to Top](#️-timeo)

</div>
