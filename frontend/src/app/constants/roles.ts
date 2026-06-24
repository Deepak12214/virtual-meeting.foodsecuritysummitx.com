/**
 * USER ROLES - Single Source of Truth (Frontend)
 *
 * Jab bhi koi naya role add karna ho ya existing role change karna ho,
 * SIRF is file me changes karo. Baaki sab jagah se yahan se import hoga.
 *
 * Backend ke saath sync me rakho: backend/src/constants/roles.js
 */

// ─── Enum (TypeScript const enum style) ──────────────────────────────────────

export const USER_ROLES = {
  ADMIN:               'admin',
  ORGANIZER:           'organizer',
  SPEAKER:             'speaker',
  EXHIBITOR:           'exhibitor',
  STARTUP_PARTICIPANT: 'startup_participant',
  SPONSOR:             'sponsor',
  ATTENDEE:            'attendee',
  HOST:                'host',
  MODERATOR:           'moderator',
  INVESTOR:            'investor',
  SUB_EXHIBITOR:       'sub_exhibitor',
} as const;

/** TypeScript type - automatically inferred from USER_ROLES values */
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// ─── Useful role sets ─────────────────────────────────────────────────────────

/** Sabhi roles ki list (dropdowns / validation ke liye) */
export const ALL_ROLES = Object.values(USER_ROLES) as UserRole[];

/** Admin + organizer level - can manage meetings, lobby, etc. */
export const ADMIN_LEVEL_ROLES: UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.ORGANIZER,
  USER_ROLES.HOST,
  USER_ROLES.MODERATOR,
];

/** Booth manage karne wale roles */
export const BOOTH_MANAGER_ROLES: UserRole[] = [
  USER_ROLES.EXHIBITOR,
  USER_ROLES.SPONSOR,
  USER_ROLES.SUB_EXHIBITOR,
];

// ─── Display Labels ──────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:               'Admin',
  organizer:           'Organizer',
  speaker:             'Speaker',
  exhibitor:           'Exhibitor',
  startup_participant: 'Startup Participant',
  sponsor:             'Sponsor',
  attendee:            'Attendee',
  host:                'Host',
  moderator:           'Moderator',
  investor:            'Investor',
  sub_exhibitor:       'Sub-Exhibitor',
};

/** Role ka human-readable label return karta hai */
export const getRoleLabel = (role: string): string =>
  ROLE_LABELS[role as UserRole] ?? role.replace(/_/g, ' ');

// ─── Role Colors (Tailwind CSS classes) ──────────────────────────────────────

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:               'bg-red-500/15 text-red-600 border-red-500/30',
  organizer:           'bg-purple-500/15 text-purple-600 border-purple-500/30',
  speaker:             'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  exhibitor:           'bg-teal-500/15 text-teal-600 border-teal-500/30',
  startup_participant: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  sponsor:             'bg-rose-500/15 text-rose-600 border-rose-500/30',
  attendee:            'bg-gray-500/15 text-gray-600 border-gray-500/30',
  host:                'bg-blue-500/15 text-blue-600 border-blue-500/30',
  moderator:           'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
  investor:            'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  sub_exhibitor:       'bg-orange-500/15 text-orange-600 border-orange-500/30',
};

// ─── Signup Role Options (with descriptions) ─────────────────────────────────

export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
}

export const SIGNUP_ROLE_OPTIONS: RoleOption[] = [
  { value: USER_ROLES.ATTENDEE,            label: 'Attendee',            description: 'Full event access and networking' },
  { value: USER_ROLES.ORGANIZER,           label: 'Organizer',           description: 'Manage events, sessions, and booths' },
  { value: USER_ROLES.SPEAKER,             label: 'Speaker',             description: 'Present at main stage' },
  { value: USER_ROLES.EXHIBITOR,           label: 'Exhibitor',           description: 'Showcase products and services' },
  { value: USER_ROLES.STARTUP_PARTICIPANT, label: 'Startup Participant', description: 'Pitch and display your startup' },
  { value: USER_ROLES.SPONSOR,             label: 'Sponsor',             description: 'Premium booth and visibility' },
  { value: USER_ROLES.INVESTOR,            label: 'Investor',            description: 'Watch pitches and evaluate startups' },
  { value: USER_ROLES.ADMIN,               label: 'Admin',               description: 'Full platform administrative control' },
  { value: USER_ROLES.SUB_EXHIBITOR,       label: 'Sub-Exhibitor',       description: 'Manage booth meetings and leads' },
];
