
# Disaster Help & Rescue Platform

A full-stack web application that connects disaster victims with NGOs/rescue teams through real-time SOS alerts and communication.

## Features

- **Split-screen Landing Page**: Choose between User/Victim or NGO/Rescue roles
- **Authentication System**: Secure registration and login for both user types
- **User Dashboard**: Emergency SOS alerts with live location sharing
- **NGO Dashboard**: Receive and manage incoming emergency requests
- **Real-time Chat**: Instant communication between victims and rescue teams
- **Gamification**: Points system and leaderboard for NGOs
- **Live Mapping**: Location tracking and emergency visualization

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **UI Framework**: TailwindCSS + Shadcn/ui components
- **Authentication**: Session-based with Passport.js
- **Database**: In-memory storage (easily configurable for PostgreSQL)
- **State Management**: TanStack Query + React Context
- **Form Handling**: React Hook Form + Zod validation

## Prerequisites

Before running this application, make sure you have:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Git** for cloning the repository

## Installation & Setup

### 1. Clone the Repository

bash
git clone <your-repository-url>
cd JeevanRakhsha


### 2. Install Dependencies

bash
npm install


This will install all required packages for both frontend and backend.

### 3. Environment Variables (Optional)

Create a `.env` file in the root directory if you want to customize:

env
SESSION_SECRET=your-secret-key-here
PORT=5000
NODE_ENV=development


### 4. Start the Application

bash
npm run dev


This command will:
- Start the Express backend server on port 5000
- Start the Vite frontend development server
- Open your browser automatically

### 5. Access the Application

Open your browser and navigate to:

http://localhost:5000


## Usage Guide

### For Victims/Users:
1. Visit the landing page and click "I Need Help"
2. Register or login with your credentials
3. Fill in your location and emergency details
4. Click the "SEND SOS ALERT" button
5. Wait for an NGO to approve your request
6. Once approved, enter the chat room for real-time communication

### For NGOs/Rescue Teams:
1. Visit the landing page and click "I'm Here to Help"
2. Register with your organization details or login
3. View incoming SOS requests on your dashboard
4. Click "Accept & Connect" to approve a request
5. Coordinate rescue through the chat interface
6. Mark rescues as completed to earn points

## Project Structure


```plaintext
disaster-help-rescue/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Backend Express application
│   ├── auth.ts             # Authentication logic
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Data storage layer
│   └── index.ts            # Server entry point
├── shared/                 # Shared types and schemas
└── package.json
```



## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### SOS Requests
- `GET /api/sos-requests` - Get requests (filtered by user role)
- `POST /api/sos-requests` - Create new SOS request
- `PATCH /api/sos-requests/:id/approve` - Approve request (NGO only)
- `PATCH /api/sos-requests/:id/complete` - Complete rescue (NGO only)

### NGO Management
- `GET /api/ngos` - Get all NGOs
- `GET /api/ngo/profile` - Get NGO profile

### Chat System
- `GET /api/chat/:sosRequestId` - Get chat messages
- `POST /api/chat/:sosRequestId` - Send message

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run type-check` - Run TypeScript checks

### Database Configuration

The application currently uses in-memory storage for easy setup. To use PostgreSQL:

1. Install PostgreSQL and create a database
2. Set up environment variables:
   env
   DATABASE_URL=postgresql://username:password@localhost:5432/disaster_help
   
3. The application will automatically use database storage when DATABASE_URL is provided

## Customization

### Adding New Emergency Types
Edit the emergency types in `client/src/pages/user-dashboard.tsx`:

typescript
<SelectItem value="new-type">New Emergency Type</SelectItem>


### Modifying Points System
Adjust point awards in `server/routes.ts`:

typescript
await storage.updateNgoPoints(ngo.id, 15); // Change point value


### UI Theming
Customize colors in `client/src/index.css`:

css
:root {
  --primary: hsl(207, 90%, 54%); /* Change primary color */
  --destructive: hsl(0, 84.2%, 60.2%); /* Change alert color */
}


## Troubleshooting

### Common Issues

1. **Port Already in Use**
   bash
   Error: listen EADDRINUSE: address already in use :::5000
   
   Solution: Change the port in `.env` or kill the process using port 5000

2. **Dependencies Installation Failed**
   bash
   npm ERR! peer dep missing
   
   Solution: Delete `node_modules` and `package-lock.json`, then run `npm install` again

3. **Build Errors**
   bash
   TypeScript errors in console
   
   Solution: Run `npm run type-check` to identify and fix type issues

### Getting Help

If you encounter issues:
1. Check the browser console for frontend errors
2. Check the terminal for backend errors
3. Ensure all dependencies are properly installed
4. Verify Node.js version compatibility

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Deployment

The application is ready for deployment on platforms like:
- **Replit** (recommended for quick deployment)
- **Vercel** (for frontend with serverless functions)
- **Heroku** (for full-stack deployment)
- **Digital Ocean** (for VPS deployment)

For production deployment, make sure to:
1. Set up a production database
2. Configure environment variables
3. Build the application (`npm run build`)
4. Set up proper security headers
5. Configure HTTPS

## Security Considerations

- Session secrets should be randomly generated
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Validate and sanitize all user inputs
- Implement proper CORS policies

---

Built with ❤ for emergency response and disaster relief


