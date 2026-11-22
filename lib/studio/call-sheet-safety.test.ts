import { describe, it, expect } from 'vitest';
import { changesBetween, issueState, sameSnapshot, snapshotOf, toSnapshot } from './call-sheet';
import { callSheetDoc, type CallSheetPrintInput } from './call-sheet-print';
import { callTextBody, smsHref } from './call-sms';
import { printHtml } from '@/lib/print/kit';

const sheet = {
  shoot_date: '2026-11-03', general_call: '06:00:00', shooting_call: null, estimated_wrap: null,
  location_address: '12 Harbor Rd', weather: null, notes: null,
};
const calls = [{ crew_user_id: 'u1', character_name: null, call_time: '05:45:00', remarks: null }];

describe('emergency details in the snapshot', () => {
  const withHospital = { ...sheet, hospital_name: 'St Mary’s', hospital_address: '1 Hospital Way', hospital_phone: '555 0100', police_phone: null, medic: null };

  it('are carried by the snapshot and read back from the database as the same thing', () => {
    const snap = snapshotOf(withHospital, calls);
    expect(snap.hospital_name).toBe('St Mary’s');
    expect(sameSnapshot(snap, toSnapshot({ ...snap } as never))).toBe(true);
  });

  it('make an issued sheet read as changed, under one label', () => {
    const issued = snapshotOf(sheet, calls);
    expect(issueState({ ...withHospital, version: 1, issued: issued as never }, calls)).toEqual({ status: 'changed', version: 1, changes: ['emergency details'] });
    const was = snapshotOf(withHospital, calls);
    expect(changesBetween(was, snapshotOf({ ...withHospital, hospital_phone: '555 0199', medic: 'Dana' }, calls))).toEqual(['emergency details']);
  });

  it('do not make a sheet issued before they existed read as changed', () => {
    const old = { ...sheet, calls: { u1: { call_time: '05:45:00', remarks: null } }, cast_calls: {} };
    expect(issueState({ ...sheet, hospital_name: null, hospital_address: null, hospital_phone: null, police_phone: null, medic: null, version: 1, issued: old as never }, calls))
      .toEqual({ status: 'issued', version: 1 });
    expect(issueState({ ...sheet, version: 1, issued: old as never }, calls)).toEqual({ status: 'issued', version: 1 });
  });
});

const input = (over: Partial<CallSheetPrintInput> = {}): CallSheetPrintInput => ({
  project: 'The Pier', day: 3, date: 'Thu 12 Mar 2026', generalCall: '06:00', shootingCall: '06:30', wrap: '18:00',
  location: 'Cais do Sodré', weather: null, light: '', planNotes: [], notes: null, scenes: [], pages: null,
  locations: [], cast: [], crew: [], generated: '8 Nov 2026', ...over,
});

describe('the emergency block on the printed call sheet', () => {
  it('prints the hospital, its phone, the police and the medic when any is set, and nothing when none is', () => {
    const html = printHtml(callSheetDoc(input({ emergency: { hospitalName: 'St Mary’s', hospitalAddress: '1 Hospital Way', hospitalPhone: '555 0100', policePhone: '911', medic: 'Dana' } })));
    for (const s of ['>Emergency<', 'Nearest hospital', 'St Mary’s, 1 Hospital Way', '555 0100', 'Police', 'Set medic', 'Dana']) expect(html).toContain(s);
    expect(printHtml(callSheetDoc(input()))).not.toContain('>Emergency<');
    expect(printHtml(callSheetDoc(input({ emergency: { hospitalName: ' ' } })))).not.toContain('>Emergency<');
  });
  it('escapes what was typed', () => {
    expect(printHtml(callSheetDoc(input({ emergency: { medic: '<b>x</b>' } })))).not.toContain('<b>x</b>');
  });
});

describe('the call as a text message', () => {
  const base = { project: 'The Pier', day: 3, date: 'Thu 12 Mar', call: '07:00', url: 'https://x.test/call/abc' };

  it('says the day, the person’s call and where, and ends with the link', () => {
    expect(callTextBody({ ...base, as: 'MAYA', location: '12 Harbor Rd' }))
      .toBe('The Pier — Day 3 · Thu 12 Mar. Your call 07:00 as MAYA. At 12 Harbor Rd. Full call sheet: https://x.test/call/abc');
    expect(callTextBody({ ...base, call: '' })).toBe('The Pier — Day 3 · Thu 12 Mar. Full call sheet: https://x.test/call/abc');
  });
  it('stays short and never cuts the link', () => {
    const t = callTextBody({ ...base, project: 'P'.repeat(500), location: 'L'.repeat(500) });
    expect(t.length).toBeLessThanOrEqual(320);
    expect(t.endsWith('Full call sheet: https://x.test/call/abc')).toBe(true);
    expect(t).toContain('…');
  });
  it('collapses stray whitespace and newlines', () => {
    expect(callTextBody({ ...base, location: '12 Harbor\n  Rd' })).toContain('At 12 Harbor Rd.');
  });
  it('the sms link starts with sms: and percent-encodes the body, so & # ? and accents survive', () => {
    const body = callTextBody({ ...base, project: 'Rock & Roll #1?', location: 'Café' });
    const href = smsHref(body);
    expect(href.startsWith('sms:?&body=')).toBe(true);
    expect(href).not.toMatch(/[ #]/);
    expect(decodeURIComponent(href.slice('sms:?&body='.length))).toBe(body);
    expect(href).toContain(encodeURIComponent('https://x.test/call/abc'));
  });
});
