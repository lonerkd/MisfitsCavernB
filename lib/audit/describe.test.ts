import { describe, expect, it } from 'vitest';
import { actionTone, describeAction, describeDetails, resourceHref } from './describe';

describe('describeAction', () => {
  it('says each action in a sentence, including the admin ones', () => {
    expect(describeAction('user_login')).toBe('Signed in');
    expect(describeAction('admin_close_job')).toBe('Closed a reported job (admin)');
    expect(describeAction('admin_suspend_user')).toBe('Suspended an account (admin)');
    expect(describeAction('admin_unsuspend_user')).toBe('Lifted a suspension (admin)');
    expect(describeAction('admin_hide_message')).toBe('Hid a reported message (admin)');
  });
  it('reads an unknown action as itself, with what it was about', () => {
    expect(describeAction('portfolio_published', 'portfolio')).toBe('portfolio published');
    expect(describeAction('thing_exported', 'report')).toBe('thing exported (report)');
  });
});

describe('resourceHref', () => {
  it('points at a job, a person or a project, and at nothing else', () => {
    expect(resourceHref('job', 'j1')).toBe('/jobs/j1');
    expect(resourceHref('user', 'u1')).toBe('/crew/u1');
    expect(resourceHref('project', 'p1')).toBe('/projects/p1');
    expect(resourceHref('message', 'm1')).toBeNull();
    expect(resourceHref('job', null)).toBeNull();
  });
});

describe('actionTone', () => {
  it('marks admin actions, and keeps the old colours for the rest', () => {
    expect(actionTone('admin_suspend_user')).toBe('#e8431a');
    expect(actionTone('admin_unsuspend_user')).toBe('#10b981');
    expect(actionTone('project_created')).toBe('#10b981');
    expect(actionTone('script_deleted')).toBe('#ef4444');
    expect(actionTone('user_login')).toBe('#6366f1');
    expect(actionTone('whatever')).toBe('#0099ff');
  });
});

describe('describeDetails', () => {
  it('is a dash when empty, readable when short, and cut with an ellipsis only when long', () => {
    expect(describeDetails({})).toBe('-');
    expect(describeDetails(null)).toBe('-');
    expect(describeDetails({ title: 'Night Shift', project_id: 'abc' })).toBe('title: Night Shift, project_id: abc');
    const long = describeDetails({ note: 'x'.repeat(200) });
    expect(long).toHaveLength(80);
    expect(long.endsWith('…')).toBe(true);
  });
});
