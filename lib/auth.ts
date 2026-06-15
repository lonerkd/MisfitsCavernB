import { supabaseAdmin } from '@/lib/supabase/server';

export async function signUp(email: string, username: string, password: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes('already')) {
        return { success: false, error: 'Email or username already taken' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signIn(email: string, _password: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) return { success: false, error: error.message };

    const users = (data as any).users as any[];
    const user = users.find((u: any) => u.email === email);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUser(id: string) {
  try {
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
    if (authError || !authUser) return { success: false, error: 'User not found' };

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('creator_id', id);

    const { data: scripts } = await supabaseAdmin
      .from('scripts')
      .select('*')
      .eq('creator_id', id);

    return {
      success: true,
      user: {
        ...authUser.user,
        profile,
        projects: projects ?? [],
        scripts: scripts ?? [],
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProfile(
  id: string,
  data: {
    bio?: string;
    location?: string;
    specialty?: string;
    avatar?: string;
  }
) {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        bio: data.bio,
        location: data.location,
        avatar_url: data.avatar,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, user: profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCrewDirectory(filters?: {
  specialty?: string;
  location?: string;
  availability?: string;
}) {
  try {
    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url, bio, location, status');

    if (filters?.location) {
      query = query.eq('location', filters.location);
    }
    if (filters?.availability) {
      query = query.eq('status', filters.availability);
    }

    const { data: users, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, users };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
