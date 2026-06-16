const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const HMS_ACCESS_KEY = process.env.HMS_ACCESS_KEY;
const HMS_SECRET = process.env.HMS_SECRET;

/**
 * Generate a management token for 100ms REST API calls
 */
const generateManagementToken = () => {
  if (!HMS_ACCESS_KEY || !HMS_SECRET) {
    throw new Error('100ms access credentials are not configured in environment variables.');
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 3600; // 24 hours validity
  const jti = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

  const payload = {
    access_key: HMS_ACCESS_KEY,
    type: 'management',
    version: 2,
    iat,
    nbf: iat,
    exp,
    jti
  };

  return jwt.sign(payload, HMS_SECRET, { algorithm: 'HS256' });
};

/**
 * Generate a client join token for a specific room and role
 * @param {string} roomId - 100ms Room ID
 * @param {string} userId - Platform user ID
 * @param {string} role - HMS Template Role (e.g., host, speaker, viewer, attendee)
 */
const generateJoinToken = (roomId, userId, role) => {
  if (!HMS_ACCESS_KEY || !HMS_SECRET) {
    throw new Error('100ms access credentials are not configured in environment variables.');
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 3600; // 24 hours validity
  const jti = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);

  const payload = {
    access_key: HMS_ACCESS_KEY,
    room_id: roomId,
    user_id: String(userId),
    role: role || 'guest',
    type: 'app',
    version: 2,
    iat,
    nbf: iat,
    exp,
    jti
  };

  return jwt.sign(payload, HMS_SECRET, { algorithm: 'HS256' });
};

/**
 * Create a new Room in 100ms.live
 * @param {string} name - Room name identifier
 * @param {string} description - Room description
 * @returns {Promise<object>} The 100ms room response object
 */
const createRoom = async (name, description = '') => {
  try {
    const token = generateManagementToken();
    const cleanName = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();

    const response = await fetch('https://api.100ms.live/v2/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${cleanName}-${Date.now().toString(36)}`,
        description: description || 'Virtual Event Platform Room',
        enabled: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `100ms API Error: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Error in 100ms createRoom:', error);
    throw error;
  }
};

/**
 * Map user platform role to 100ms SDK role.
 *
 * ⚠️  MUST match the roles configured in the 100ms template (6a2470934a799ad17a8b64f9):
 *    - broadcaster      → can publish audio, video, screen
 *    - viewer-on-stage  → can publish audio, video, screen (used for speakers approved to go live)
 *    - viewer           → receive-only (audience)
 *
 * @param {string} userRole - Platform UserRole
 * @returns {string} Mapped 100ms role
 */
const mapPlatformRoleToHMSRole = (userRole) => {
  switch (userRole) {
    // Full broadcast control
    case 'admin':
    case 'organizer':
      return 'broadcaster';

    // Speakers join as viewer-on-stage so they can publish once approved
    case 'speaker':
      return 'viewer-on-stage';

    // Everyone else watches only
    case 'exhibitor':
    case 'startup_participant':
    case 'sponsor':
    case 'attendee':
    default:
      return 'viewer';
  }
};


module.exports = {
  generateManagementToken,
  generateJoinToken,
  createRoom,
  mapPlatformRoleToHMSRole
};
