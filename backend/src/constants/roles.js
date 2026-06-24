/**
 * USER ROLES - Single Source of Truth (Backend)
 *
 * Jab bhi koi naya role add karna ho ya existing role change karna ho,
 * SIRF is file me changes karo. Baaki sab jagah se yahan se import hoga.
 */

const USER_ROLES = {
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
};

/** Sabhi valid roles ki list (Mongoose enum + validation ke liye) */
const ALL_ROLES = Object.values(USER_ROLES);

/**
 * Ye roles register karte waqt automatically approve ho jaate hain.
 * Baaki roles ko admin/organizer approve karta hai.
 */
const AUTO_APPROVE_ROLES = [
  USER_ROLES.ATTENDEE,
  USER_ROLES.ADMIN,
  USER_ROLES.ORGANIZER,
  USER_ROLES.HOST,
  USER_ROLES.MODERATOR,
  USER_ROLES.INVESTOR,
];

/**
 * Ye roles admin + organizer level access ke saath hain -
 * meetings create kar sakte hain, lobby manage kar sakte hain, etc.
 */
const ADMIN_LEVEL_ROLES = [
  USER_ROLES.ADMIN,
  USER_ROLES.ORGANIZER,
  USER_ROLES.HOST,
  USER_ROLES.MODERATOR,
];

/** Booth manage karne wale roles */
const BOOTH_MANAGER_ROLES = [
  USER_ROLES.EXHIBITOR,
  USER_ROLES.SPONSOR,
  USER_ROLES.SUB_EXHIBITOR,
];

module.exports = {
  USER_ROLES,
  ALL_ROLES,
  AUTO_APPROVE_ROLES,
  ADMIN_LEVEL_ROLES,
  BOOTH_MANAGER_ROLES,
};
