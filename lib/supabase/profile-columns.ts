/**
 * The profile columns anyone may read. The rest (admin flag, notification
 * settings, Discord id) are private: get_my_account() returns them to their
 * owner, admin_list_users() to admins. `select('*')` on profiles is refused.
 * (Kept dependency-free: lib/os/boot imports it.)
 */
export const PUBLIC_PROFILE_COLUMNS = 'id, username, avatar_url, bio, role, location, status, discord_username, discord_avatar, created_at, updated_at';
