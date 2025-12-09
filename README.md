Timeo is a modern, minimal, and fast time-tracking web application inspired by Toggl Track.
Built with Go (Fiber) and SQLite, it provides a clean interface for managing daily tasks, generating reports, and tracking long-term goals.

## 🚀 Usage (Docker Deployment)

1. Clone project

```bash
git clone https://github.com/mmrezoe/timeo.git
cd timeo
```

2. Create .env file

```bash
cp .env.example .env
vim .env
```

3. Create shared network (first time only)

```bash
docker network create app_net
```

4. Start services (Traefik + Timeo)

```bash
docker compose up -d --build
```

5. Access the application

- Timeo App → `https://timeo.<DOMAIN>`
- Traefik Dashboard → `https://traefik.<DOMAIN>`
- Both behind BasicAuth

5. View logs

```bash
docker logs -f timeo
docker logs -f traefik
```

### Features

- ⏱ Timer — Start and stop tasks with project names, live active timer list, and daily summaries
- 📊 Reports — Weekly, monthly, and yearly insights with line charts and project totals
- 🎯 Goals — Track project-based habits using streaks and progress indicators
- 💾 SQLite Storage — Simple local datastore, no external DB required
- ⚡ Fast & Lightweight — Built with Go Fiber for high performance
- 🎨 UI Inspired by Toggl — Clean sidebar navigation and a modern interface
  Perfect for freelancers, developers, or anyone who wants a simple self-hosted time tracker.
