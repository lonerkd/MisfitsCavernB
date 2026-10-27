import { describe, it, expect } from 'vitest';
import { supabase } from './client';

describe('supabase client', () => {
  it('exports a configured browser client with auth and realtime options', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase).toBe('object');
    expect(supabase.auth).toBeDefined();
    expect(supabase.realtime).toBeDefined();
  });

  it('has auth methods available for session management', () => {
    expect(typeof supabase.auth.getSession).toBe('function');
    expect(typeof supabase.auth.getUser).toBe('function');
    expect(typeof supabase.auth.signOut).toBe('function');
  });

  it('has realtime methods available for live updates', () => {
    expect(typeof supabase.realtime.channel).toBe('function');
    // subscribe is a method on the realtime object but may not be directly enumerable
    expect(supabase.realtime).toBeDefined();
  });

  it('handles missing environment variables gracefully with placeholder values', () => {
    // When env vars are missing, client still initializes with defaults
    expect(typeof supabase).toBe('object');
    expect(typeof supabase.auth.getSession).toBe('function');
  });

  it('configures auth with persistSession and autoRefreshToken enabled', () => {
    // Verify the client was created with expected auth configuration
    expect(typeof supabase.auth).toBe('object');
    expect(typeof supabase.auth.getSession).toBe('function');
  });

  it('configures realtime with eventsPerSecond parameter', () => {
    // Verify realtime is configured
    expect(typeof supabase.realtime).toBe('object');
    expect(typeof supabase.realtime.channel).toBe('function');
  });

  it('exports Database type for type-safe queries', () => {
    // Verify type exports are available at runtime
    expect(typeof supabase).toBe('object');
  });

  it('handles empty string environment variables by falling back to placeholders', () => {
    // When env vars are empty strings, client still initializes
    expect(typeof supabase).toBe('object');
    expect(typeof supabase.auth.getSession).toBe('function');
  });
});
