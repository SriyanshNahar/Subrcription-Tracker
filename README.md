# Vaultly — Smart Subscription & Expense Tracker

Vaultly is a complete, production-ready web application to track subscriptions, get renewal alerts, and manage expenses.

## Project Structure
- \`frontend/\`: Angular 17+ application with Tailwind CSS and Chart.js
- \`backend/\`: Node.js Express server with REST APIs

## Quick Start

### 1. Backend Setup
\`\`\`bash
cd backend
npm install
npm start
\`\`\`
The backend will run on \`http://localhost:5000\`. It currently uses an in-memory database to run instantly out-of-the-box.
To connect to a real Firebase Firestore instance, add your service account key JSON as a string to the \`FIREBASE_SERVICE_ACCOUNT_KEY\` environment variable in \`.env\`.

### 2. Frontend Setup
\`\`\`bash
cd frontend
npm install
npm start
\`\`\`
The frontend will run on \`http://localhost:4200\`. It connects automatically to the local backend.

## Features Implemented
- Authentication (Login/Register with JWT)
- Dashboard with total monthly/yearly spend
- Subscriptions CRUD (Add, List, Delete) with multi-currency support
- Expense Graveyard (Calculates wasted money)
- Responsive Glassmorphism Design UI

Enjoy Vaultly!
