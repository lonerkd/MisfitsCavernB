import { describe, it, expect } from 'vitest';
import type { Activity } from './activity';

describe('Activity interface', () => {
	it('has required properties with correct types', () => {
		const activity: Activity = {
			id: 'test-id',
			user_id: 'user-123',
			action: 'created',
			target_type: 'project',
			target_id: 'proj-1',
			created_at: new Date().toISOString(),
		};
		expect(activity.id).toBe('test-id');
		expect(activity.user_id).toBe('user-123');
		expect(activity.action).toBe('created');
		expect(activity.target_type).toBe('project');
		expect(activity.target_id).toBe('proj-1');
	});

	it('allows optional metadata', () => {
		const activity: Activity = {
			id: 'test-id',
			user_id: 'user-123',
			action: 'updated',
			target_type: 'scene',
			target_id: 'scene-1',
			metadata: { project_id: 'proj-1' },
			created_at: new Date().toISOString(),
		};
		expect(activity.metadata).toEqual({ project_id: 'proj-1' });
	});

	it('allows optional profiles', () => {
		const activity: Activity = {
			id: 'test-id',
			user_id: 'user-123',
			action: 'deleted',
			target_type: 'beat',
			target_id: 'beat-1',
			created_at: new Date().toISOString(),
			profiles: { username: 'alice' },
		};
		expect(activity.profiles?.username).toBe('alice');
	});

	it('allows optional avatar_url in profiles', () => {
		const activity: Activity = {
			id: 'test-id',
			user_id: 'user-123',
			action: 'commented',
			target_type: 'project',
			target_id: 'proj-1',
			created_at: new Date().toISOString(),
			profiles: { username: 'bob', avatar_url: 'https://example.com/avatar.png' },
		};
		expect(activity.profiles?.avatar_url).toBe('https://example.com/avatar.png');
	});

	it('allows missing profiles', () => {
		const activity: Activity = {
			id: 'test-id',
			user_id: 'user-123',
			action: 'liked',
			target_type: 'project',
			target_id: 'proj-1',
			created_at: new Date().toISOString(),
		};
		expect(activity.profiles).toBeUndefined();
	});

	it('allows missing metadata', () => {
		const activity: Activity = {
			id: 'test-id',
			user_id: 'user-123',
			action: 'viewed',
			target_type: 'project',
			target_id: 'proj-1',
			created_at: new Date().toISOString(),
		};
		expect(activity.metadata).toBeUndefined();
	});
});
