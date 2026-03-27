import { refreshAccessToken } from './oauth'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

/**
 * Returns a valid access token for the user, refreshing if it expires within 5 minutes.
 * Updates the profile row with new token + expiry if refreshed.
 */
export async function getValidAccessToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  profile: Profile
): Promise<string> {
  if (!profile.google_access_token) {
    throw new Error('Google Calendar not connected')
  }

  const expiresAt = profile.google_token_expiry ? new Date(profile.google_token_expiry) : null
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (!expiresAt || expiresAt <= fiveMinFromNow) {
    if (!profile.google_refresh_token) {
      throw new Error('No refresh token — user must reconnect Google Calendar')
    }
    const { access_token, expires_in } = await refreshAccessToken(profile.google_refresh_token)
    const newExpiry = new Date(Date.now() + expires_in * 1000).toISOString()

    await supabase
      .from('profiles')
      .update({ google_access_token: access_token, google_token_expiry: newExpiry })
      .eq('id', profile.id)

    return access_token
  }

  return profile.google_access_token
}
