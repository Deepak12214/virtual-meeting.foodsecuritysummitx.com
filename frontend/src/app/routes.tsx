import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./components/layouts/RootLayout";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import { Dashboard } from "./pages/Dashboard";
import { MainStageEnhanced } from "./pages/MainStageEnhanced";
import { ExhibitionHall } from "./pages/ExhibitionHall";
import { BoothDetail } from "./pages/BoothDetail";
import { MeetingRooms } from "./pages/MeetingRooms";
import { MeetingRoom } from "./pages/MeetingRoom";
import { PrivateMeetings } from "./pages/PrivateMeetings";
import { BoothMeetingRoom } from "./pages/BoothMeetingRoom";
import { StartupPitchEnhanced } from "./pages/StartupPitchEnhanced";
import { OrganizerDashboard } from "./pages/organizer/OrganizerDashboard";
import { OrganizerUsers } from "./pages/organizer/OrganizerUsers";
import { ContactSubmissions } from "./pages/organizer/ContactSubmissions";
import { Analytics } from "./pages/Analytics";
import { Profile } from "./pages/Profile";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/auth/login",
    Component: Login,
  },
  {
    path: "/auth/signup",
    Component: Signup,
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "stage", Component: MainStageEnhanced },
      { path: "exhibition", Component: ExhibitionHall },
      { path: "exhibition/:boothId", Component: BoothDetail },
      { path: "exhibition/meeting/:meetingId", Component: BoothMeetingRoom },
      { path: "meetings", Component: MeetingRooms },
      { path: "meetings/:meetingId", Component: MeetingRoom },
      { path: "private-meetings", Component: PrivateMeetings },
      { path: "pitch", Component: StartupPitchEnhanced },
      { path: "profile", Component: Profile },
      { path: "analytics", Component: Analytics },
      { path: "logs", element: <Navigate to="/" replace /> },
      {
        path: "organizer",
        children: [
          { index: true, Component: OrganizerDashboard },
          { path: "users", Component: OrganizerUsers },
          { path: "contacts", Component: ContactSubmissions },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
