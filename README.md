# My Tarot Readings

A modern MERN stack application built with Next.js 15 App Router, Bootstrap, Sass, and Express.

## Features

- **Frontend**: Next.js 15 with App Router
- **Styling**: Bootstrap 5 + Custom Sass
- **Backend**: Express.js API
- **Database**: MongoDB (optional)
- **Development**: Concurrent client/server development

## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## Development

### Client (Next.js)
```bash
cd client
npm run dev
```

### Server (Express)
```bash
cd server
npm run dev
```

### Environment Variables

**Client (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Server (.env):**
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/mytarotreadings
```

## API Endpoints


## Project Structure

```
mytarotreadings/
├── client/          # Next.js 15 App Router
│   ├── app/         # App Router pages
│   ├── components/  # React components
│   └── styles/      # Sass files
├── server/          # Express API
│   ├── routes/      # API routes
│   └── models/      # Data models
└── README.md
```
