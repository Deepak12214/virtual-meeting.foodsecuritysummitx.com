# Virtual Event Platform - UI Prototype

This is a comprehensive **frontend UI prototype** for a browser-based virtual event ecosystem platform, built with **React**, **TypeScript**, **Tailwind CSS**, and **React Router**.

## 🎯 Project Overview

This prototype demonstrates all 7 core modules specified in the MVP requirements:

1. **Authentication & Access System** - Role-based signup/login
2. **Main Stage System** - Livestream interface with Q&A
3. **Exhibition Hall** - Sponsor/exhibitor booths
4. **1-on-1 Meeting System** - Scheduled video meetings
5. **Startup Pitch Ceremony** - Pitch queue and rotation
6. **Organizer Backend** - Event management dashboard
7. **Basic Analytics** - Metrics and engagement data

## 🚀 Features Implemented

### Authentication System
- **Login/Signup** with role selection
- **9 User Roles**: Free Visitor, Paid Delegate, Startup, Investor, Exhibitor, Sponsor, Speaker, Moderator, Organizer, Admin
- **Role-based access control** throughout the platform
- **Approval workflow** (pending/approved status)
- Quick login demo accounts for testing

### Main Stage
- **Live session interface** with video player mockup
- **Q&A system** with moderator approval workflow
- **Session schedule** display
- **Speaker controls** (mic, video, screen share)
- **Organizer controls** (go live, end session, timers)
- **Live viewer count** and engagement indicators

### Exhibition Hall
- **Booth listings** with search and filtering
- **Sponsor tiers** (Platinum, Gold, Silver)
- **Booth detail pages** with:
  - Live meeting access
  - Brochure downloads
  - Representative information
  - Lead sharing notices
- **Visit tracking** and booth analytics

### Meeting Rooms
- **Meeting list** by status (active, scheduled, completed)
- **Individual meeting room interface** with:
  - Video grid mockup
  - Media controls (mic, video, screen share)
  - Meeting timer countdown
  - Participant list
- **Organizer controls** for time extensions

### Startup Pitch Ceremony
- **Live pitch interface** with video mockup
- **Pitch queue** showing waiting startups
- **Pitch timer** with moderator controls
- **Startup rotation** (manual control by moderator)
- **Startup details** (founder, industry, stage, funding sought)
- **Completed pitches** tracking

### Organizer Backend
- **Main dashboard** with key metrics and alerts
- **User management** with approval workflow
- **Session management** with go-live controls
- **Meeting management** with scheduling
- **Booth management** with analytics
- **Recent activity** feed

### Analytics Dashboard
- **Key metrics** overview
- **Engagement charts** (line charts, pie charts, bar charts)
- **User demographics** by role
- **Activity breakdown** by feature
- **Timeline** of recent actions

## 👥 User Roles & Access

| Feature | Free Visitor | Paid Delegate | Startup | Investor | Exhibitor | Sponsor | Speaker | Moderator | Organizer |
|---------|-------------|---------------|---------|----------|-----------|---------|---------|-----------|-----------|
| Main Stage (watch) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Exhibition Hall | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Q&A Participation | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Meetings | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Startup Pitch | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Organizer Backend | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Analytics | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |

## 🎨 Demo Accounts

Use these credentials on the login page:

- **Organizer**: `organizer@event.com`
- **Investor**: `investor@vc.com`
- **Startup**: `startup@tech.com`
- **Visitor**: `visitor@email.com`
- **Sponsor**: `sponsor@corp.com`

(All demo accounts use any password)

## 📁 Project Structure

```
src/app/
├── components/
│   ├── layouts/
│   │   └── RootLayout.tsx          # Main layout with navigation
│   └── ui/                          # shadcn/ui components
├── context/
│   └── AuthContext.tsx              # Authentication context
├── data/
│   └── mockData.ts                  # Mock data (sessions, booths, etc.)
├── pages/
│   ├── auth/
│   │   ├── Login.tsx
│   │   └── Signup.tsx
│   ├── organizer/
│   │   ├── OrganizerDashboard.tsx
│   │   ├── OrganizerUsers.tsx
│   │   ├── OrganizerSessions.tsx
│   │   ├── OrganizerMeetings.tsx
│   │   └── OrganizerBooths.tsx
│   ├── Dashboard.tsx                # User dashboard
│   ├── MainStage.tsx
│   ├── ExhibitionHall.tsx
│   ├── BoothDetail.tsx
│   ├── MeetingRooms.tsx
│   ├── MeetingRoom.tsx
│   ├── StartupPitch.tsx
│   ├── Analytics.tsx
│   ├── Profile.tsx
│   └── NotFound.tsx
├── routes.tsx                       # React Router configuration
└── App.tsx                          # App entry point
```

## 🔧 Technical Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Router 7** - Client-side routing
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Component library
- **Recharts** - Charts and data visualization
- **Lucide React** - Icons
- **Sonner** - Toast notifications

## 🎯 MVP Principles Followed

✅ **Operational reliability** - Clear, stable UI flows
✅ **Manual organizer control** - Full control panels for live events
✅ **Browser-based** - Fully responsive web application
✅ **Role-based access** - Comprehensive permission system
✅ **Simple UI/UX** - Professional, clean design
✅ **No over-engineering** - Focused on core features only

## 🚫 Intentionally NOT Included (Per MVP Spec)

- Real video infrastructure (shows mockups only)
- Backend/database integration
- AI features
- Advanced automation
- Mobile applications
- Gamification
- CRM integrations
- WhatsApp automation

## 🔄 Next Steps for Production

To convert this prototype into a production system:

1. **Backend Development**
   - Set up Node.js/NestJS backend
   - PostgreSQL database
   - REST/GraphQL APIs

2. **Video Integration**
   - Integrate 100ms, Agora, or Zoom SDK
   - Real-time video conferencing
   - Screen sharing capabilities

3. **Authentication**
   - JWT-based auth
   - OAuth integration
   - Email verification

4. **Real-time Features**
   - WebSocket connections
   - Live updates
   - Push notifications

5. **Data Persistence**
   - Replace mock data with API calls
   - User management system
   - Meeting scheduling system

6. **Testing**
   - Unit tests
   - Integration tests
   - Load testing
   - Mock event simulations

## 📝 Notes

This is a **visual prototype** built in Figma Make environment. It uses:
- **Mock data** for demonstrations
- **Placeholder images** from Unsplash
- **Simulated video players** (no real streaming)
- **LocalStorage** for session persistence

All interactions are **client-side only** and demonstrate the intended user experience and workflows.

## 🎓 Key Learnings

This prototype successfully demonstrates:
- Complete user journeys for all 9 roles
- Role-based navigation and permissions
- Event organizer operational controls
- Live event simulation capabilities
- Analytics and reporting interfaces
- Meeting and networking workflows
- Sponsor/exhibitor engagement features

---

**Built with** ❤️ **for the Virtual Event Platform MVP**
