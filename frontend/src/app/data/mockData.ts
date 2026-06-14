export interface Session {
  id: string;
  title: string;
  description: string;
  speaker: string;
  speakerTitle: string;
  speakerAvatar?: string;
  startTime: Date;
  endTime: Date;
  isLive: boolean;
  viewerCount: number;
  status: 'upcoming' | 'live' | 'ended';
}

export interface Booth {
  id: string;
  name: string;
  category: 'sponsor' | 'exhibitor';
  tier?: 'platinum' | 'gold' | 'silver';
  logo: string;
  description: string;
  brochures: Array<{ name: string; url: string }>;
  representatives: Array<{ name: string; title: string; avatar?: string }>;
  isLive: boolean;
  visitCount: number;
}

export interface Meeting {
  id: string;
  title: string;
  scheduledTime: Date;
  duration: number;
  participants: Array<{ id: string; name: string; avatar?: string }>;
  status: 'scheduled' | 'active' | 'completed';
  roomUrl?: string;
}

export interface Startup {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  description: string;
  founder: string;
  founderTitle: string;
  industry: string;
  stage: string;
  seeking: string;
  pitchTime?: Date;
  status: 'waiting' | 'pitching' | 'completed';
}

export interface Question {
  id: string;
  text: string;
  askedBy: string;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected';
}

// Mock Sessions
export const MOCK_SESSIONS: Session[] = [
  {
    id: 's1',
    title: 'Opening Keynote: The Future of Innovation',
    description: 'Join us for an inspiring keynote on emerging technologies and innovation trends shaping 2026.',
    speaker: 'Dr. James Mitchell',
    speakerTitle: 'Chief Innovation Officer, TechVentures Global',
    startTime: new Date('2026-05-17T09:00:00'),
    endTime: new Date('2026-05-17T10:00:00'),
    isLive: true,
    viewerCount: 1247,
    status: 'live',
  },
  {
    id: 's2',
    title: 'AI & Machine Learning: Practical Applications',
    description: 'Explore real-world applications of AI and ML in modern business environments.',
    speaker: 'Rachel Kumar',
    speakerTitle: 'Head of AI Research, DataSphere',
    startTime: new Date('2026-05-17T11:00:00'),
    endTime: new Date('2026-05-17T12:00:00'),
    isLive: false,
    viewerCount: 0,
    status: 'upcoming',
  },
  {
    id: 's3',
    title: 'Scaling Startups: Lessons from the Field',
    description: 'Learn from successful founders about scaling strategies and common pitfalls.',
    speaker: 'Marcus Chen',
    speakerTitle: 'Serial Entrepreneur & Investor',
    startTime: new Date('2026-05-17T14:00:00'),
    endTime: new Date('2026-05-17T15:30:00'),
    isLive: false,
    viewerCount: 0,
    status: 'upcoming',
  },
];

// Mock Booths
export const MOCK_BOOTHS: Booth[] = [];

// Mock Meetings
export const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'm1',
    title: 'Investor Meeting - Alpha Ventures',
    scheduledTime: new Date('2026-05-17T10:30:00'),
    duration: 30,
    participants: [
      { id: '1', name: 'Emma Wilson' },
      { id: '2', name: 'Michael Park' },
    ],
    status: 'active',
    roomUrl: '#meeting-room-1',
  },
  {
    id: 'm2',
    title: 'Partnership Discussion - Global Tech',
    scheduledTime: new Date('2026-05-17T13:00:00'),
    duration: 45,
    participants: [
      { id: '3', name: 'Sarah Chen' },
      { id: '4', name: 'Lisa Anderson' },
    ],
    status: 'scheduled',
  },
  {
    id: 'm3',
    title: 'Technical Deep Dive - CloudScale',
    scheduledTime: new Date('2026-05-17T15:00:00'),
    duration: 60,
    participants: [
      { id: '5', name: 'David Park' },
      { id: '6', name: 'Tech Lead' },
    ],
    status: 'scheduled',
  },
];

// Mock Startups
export const MOCK_STARTUPS: Startup[] = [
  {
    id: 'st1',
    name: 'TechFlow AI',
    logo: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&h=200&fit=crop',
    tagline: 'Democratizing AI for small businesses',
    description: 'TechFlow AI provides no-code AI solutions that enable small businesses to leverage machine learning without technical expertise.',
    founder: 'Emma Wilson',
    founderTitle: 'CEO & Co-founder',
    industry: 'Artificial Intelligence',
    stage: 'Seed',
    seeking: '$2M Series A',
    pitchTime: new Date('2026-05-17T16:00:00'),
    status: 'pitching',
  },
  {
    id: 'st2',
    name: 'GreenChain',
    logo: 'https://images.unsplash.com/photo-1558403194-611308249627?w=200&h=200&fit=crop',
    tagline: 'Blockchain for sustainable supply chains',
    description: 'Tracking and verifying sustainable practices across global supply chains using blockchain technology.',
    founder: 'Carlos Rodriguez',
    founderTitle: 'Founder & CTO',
    industry: 'Supply Chain',
    stage: 'Pre-Seed',
    seeking: '$500K Seed',
    pitchTime: new Date('2026-05-17T16:15:00'),
    status: 'waiting',
  },
  {
    id: 'st3',
    name: 'HealthSync',
    logo: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&h=200&fit=crop',
    tagline: 'Unified patient health records platform',
    description: 'Connecting healthcare providers with a secure, interoperable patient data platform.',
    founder: 'Dr. Priya Sharma',
    founderTitle: 'CEO & Medical Director',
    industry: 'HealthTech',
    stage: 'Series A',
    seeking: '$5M Series B',
    pitchTime: new Date('2026-05-17T16:30:00'),
    status: 'waiting',
  },
  {
    id: 'st4',
    name: 'EduMatch',
    logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop',
    tagline: 'AI-powered personalized learning',
    description: 'Adaptive learning platform that personalizes education content based on student performance and learning style.',
    founder: 'Kevin Tanaka',
    founderTitle: 'Founder',
    industry: 'EdTech',
    stage: 'Seed',
    seeking: '$1.5M Series A',
    pitchTime: new Date('2026-05-17T16:45:00'),
    status: 'waiting',
  },
];

// Mock Questions
export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'What are the key challenges in implementing AI at enterprise scale?',
    askedBy: 'Michael Park',
    timestamp: new Date('2026-05-17T09:15:00'),
    status: 'approved',
  },
  {
    id: 'q2',
    text: 'How do you handle data privacy concerns with cloud solutions?',
    askedBy: 'Sarah Chen',
    timestamp: new Date('2026-05-17T09:20:00'),
    status: 'pending',
  },
  {
    id: 'q3',
    text: 'What is your go-to-market strategy for emerging markets?',
    askedBy: 'Lisa Anderson',
    timestamp: new Date('2026-05-17T09:25:00'),
    status: 'pending',
  },
];

// Analytics Mock Data
export const ANALYTICS_DATA = {
  totalRegistrations: 2847,
  activeUsers: 1423,
  stageViewers: 1247,
  activeMeetings: 34,
  boothVisits: 891,
  startupRoomActivity: 156,
  registrationsByRole: [
    { role: 'Free Visitor', count: 1245 },
    { role: 'Paid Delegate', count: 892 },
    { role: 'Startup', count: 156 },
    { role: 'Investor', count: 234 },
    { role: 'Exhibitor', count: 89 },
    { role: 'Sponsor', count: 45 },
    { role: 'Speaker', count: 67 },
  ],
  engagementOverTime: [
    { time: '9:00', users: 450 },
    { time: '9:30', users: 780 },
    { time: '10:00', users: 1120 },
    { time: '10:30', users: 1423 },
    { time: '11:00', users: 1350 },
  ],
};
