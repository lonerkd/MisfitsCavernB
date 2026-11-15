// A role's working day, written down: for each craft, the steps of its job in the order they happen, with the tool each step happens
// in. Pure data. A step's tool is only offered to a person who can open it (their suite, lib/roles/toolkit.ts); a step with no tool
// is something done away from the suite. A craft with no entry of its own uses its department's, then the generic one. The
// canonical jobs come from the role completeness map (plans/2026-11-13-role-completeness-map.md); nothing here invents a tool.

import type { ProductionView } from '@/lib/os/progress';

export type Stage = 'Prep' | 'The day before' | 'On the day' | 'After the shoot';
export const STAGES: readonly Stage[] = ['Prep', 'The day before', 'On the day', 'After the shoot'];

export interface WorkflowStep { text: string; tool?: ProductionView }
export interface Workflow {
  stages: Partial<Record<Stage, WorkflowStep[]>>;
  /** What this role receives, and from whom. */
  receives: string[];
  /** What this role hands on, and to whom. */
  hands: string[];
}

const s = (text: string, tool?: ProductionView): WorkflowStep => (tool ? { text, tool } : { text });

const DIRECTOR: Workflow = {
  stages: {
    'Prep': [s('Write your intent for each scene.', 'director'), s('Break the script down with the producer and the first AD.', 'breakdown'), s('Plan the shots.', 'shots'), s('Scout and choose the places.', 'scout'), s('Rehearse with the cast.', 'rehearsal'), s('When a decision changes the plan, mark the note "Changes the plan" and tell the departments it touches.', 'director')],
    'The day before': [s('Check the day at a glance on Your day: scenes, shots planned, and what needs you.'), s('Check the call sheet went out and who has confirmed.', 'schedule'), s('Settle tomorrow\'s shot list.', 'shots')],
    'On the day': [s('Run the day.', 'onset'), s('Choose takes with the script supervisor.', 'scriptsup')],
    'After the shoot': [s('Look at the takes selected for the editor.', 'editorial'), s('Give the editor your notes on the cut.', 'revisions')],
  },
  receives: ['The script and revisions (writer)', 'The schedule and budget limits (producer, first AD)', 'Selected takes (script supervisor)'],
  hands: ['Changes to the plan (every department it touches)', 'Intent and notes (editor)'],
};

const FIRST_AD: Workflow = {
  stages: {
    'Prep': [s('Break the script down by scene and day.', 'breakdown'), s('Build the schedule and the day out of days.', 'dood'), s('Check everything the shoot needs is ready.', 'readiness'), s('Chase the crew list and who has joined.', 'crew')],
    'The day before': [s('Finish the call sheet and issue it.', 'schedule'), s('See who has not acknowledged it, and chase them.', 'schedule')],
    'On the day': [s('Run the day and keep the clock.', 'onset'), s('Wrap the day and log what was not shot.', 'wrap')],
    'After the shoot': [s('Report the day: scenes shot, overtime, issues.', 'reports'), s('Move what was not shot onto the schedule.', 'schedule')],
  },
  receives: ['The director\'s priorities', 'The budget limits (producer)', 'Changes to the plan (director)'],
  hands: ['The call sheet (all crew and cast)', 'The day report (producer)'],
};

const SECOND_AD: Workflow = {
  stages: {
    'Prep': [s('Keep the crew and cast lists current.', 'crew'), s('Check the schedule against the day out of days.', 'dood')],
    'The day before': [s('Send the call sheet and the reminders.', 'schedule'), s('Confirm transport and meals.', 'transport')],
    'On the day': [s('Run the cast and background calls.', 'onset'), s('Keep the comms log.', 'comms')],
    'After the shoot': [s('Wrap the day and the paperwork.', 'wrap')],
  },
  receives: ['The schedule and call sheet (first AD)'],
  hands: ['Cast calls and sign-ins (production)'],
};

const SCRIPT_SUP: Workflow = {
  stages: {
    'Prep': [s('Read the script and its revisions.', 'revisions'), s('Set up continuity for each scene.', 'continuity')],
    'The day before': [s('See tomorrow\'s scenes and shots.', 'shots')],
    'On the day': [s('Log every take against its scene, its shot and the lines it covers.', 'scriptsup'), s('Circle the take to use for each shot.', 'scriptsup'), s('Note continuity: look, props, position.', 'continuity'), s('Keep the day\'s clock and notes.', 'onset')],
    'After the shoot': [s('Check the lined script: any lines no selected take covers.', 'scriptsup'), s('Hand the selected takes and notes to the editor.', 'editorial')],
  },
  receives: ['The script and revisions (writer)', 'The shot list (director, DP)'],
  hands: ['Selected takes and continuity notes (editor)'],
};

const PRODUCER: Workflow = {
  stages: {
    'Prep': [s('Set the budget and its limits.', 'money'), s('Break the script down to cost it.', 'breakdown'), s('Hire the crew and cast.', 'crew'), s('Get the permits, insurance and releases.', 'paperwork'), s('Check readiness against the schedule.', 'readiness')],
    'The day before': [s('Check the call sheet is issued and acknowledged.', 'schedule'), s('Approve the day\'s purchase orders.', 'po')],
    'On the day': [s('Watch the day against the schedule and the money.', 'onset'), s('Approve what cannot wait.', 'money')],
    'After the shoot': [s('Close the books on the day: actuals against the budget.', 'money'), s('Read the day report.', 'reports')],
  },
  receives: ['The script and the plan (director)', 'The day report (first AD)'],
  hands: ['Budget limits (first AD, department heads)', 'Approvals (accountant, coordinator)'],
};

const LINE_PRODUCER: Workflow = {
  stages: {
    'Prep': [s('Build the budget from the breakdown.', 'money'), s('Raise and track purchase orders.', 'po'), s('Plan the days against the money.', 'dood'), s('Watch the risks.', 'risk')],
    'The day before': [s('Check the schedule and the call sheet.', 'schedule')],
    'On the day': [s('Approve spend as it happens.', 'po')],
    'After the shoot': [s('Reconcile the day\'s actuals.', 'money'), s('Report to the producer.', 'reports')],
  },
  receives: ['The budget limits (producer)', 'Requests from departments (purchase orders)'],
  hands: ['Approved spend (accountant)', 'Cost reports (producer)'],
};

const ACCOUNTANT: Workflow = {
  stages: {
    'Prep': [s('Set up the budget lines and vendors.', 'money'), s('Track insurance and paperwork that carries a cost.', 'paperwork')],
    'The day before': [s('Check the approved purchase orders.', 'po')],
    'On the day': [s('Log expenses and receipts as they come in.', 'money')],
    'After the shoot': [s('Pay, reconcile and report: actuals against budget.', 'money'), s('Handle insurance claims.', 'claims')],
  },
  receives: ['Approved purchase orders (producer, line producer)', 'Receipts (departments)'],
  hands: ['Actuals against budget (producer)', 'Claims (insurer)'],
};

const COORDINATOR: Workflow = {
  stages: {
    'Prep': [s('Keep the crew list, contacts and paperwork complete.', 'paperwork'), s('Book transport, places and permits.', 'permit')],
    'The day before': [s('Get the call sheet out and chase acknowledgements.', 'schedule'), s('Confirm transport and catering.', 'transport')],
    'On the day': [s('Be the point of contact: the comms log.', 'comms')],
    'After the shoot': [s('Chase the paperwork and returns.', 'paperwork'), s('Wrap the day.', 'wrap')],
  },
  receives: ['The schedule (first AD)', 'Approvals (producer)'],
  hands: ['Confirmed crew, transport and meals (every department)'],
};

const LOCATION_MANAGER: Workflow = {
  stages: {
    'Prep': [s('Scout and log each place.', 'scout'), s('Record the place, permit and contact.', 'locations'), s('Get the permits and insurance.', 'permit'), s('Check weather and safety at each place.', 'weather')],
    'The day before': [s('Confirm access, parking and the contact.', 'locations'), s('Confirm the call sheet has the right address.', 'schedule')],
    'On the day': [s('Be on the place: open it, keep to the permit.', 'onset')],
    'After the shoot': [s('Leave it as found, close the permit and any paperwork.', 'paperwork')],
  },
  receives: ['The scenes and the schedule (first AD, production)'],
  hands: ['Place details and permits (call sheet, production)'],
};

const CASTING: Workflow = {
  stages: {
    'Prep': [s('List the characters and what each needs.', 'cast'), s('Audition and decide.', 'rehearsal'), s('Cast each character.', 'crew'), s('Get releases and contracts.', 'paperwork')],
    'The day before': [s('Confirm the cast for tomorrow\'s scenes.', 'cast')],
    'On the day': [s('Look after the cast and the background.', 'extras')],
    'After the shoot': [s('Close the cast paperwork.', 'paperwork')],
  },
  receives: ['The characters (writer, director)', 'Budget for cast (producer)'],
  hands: ['Who is cast in each role (call sheet, production)'],
};

const PRODUCTION_DEFAULT: Workflow = {
  stages: {
    'Prep': [s('Know the schedule and where to be.', 'schedule'), s('Keep your paperwork current.', 'paperwork')],
    'The day before': [s('Read the call sheet and confirm.', 'schedule')],
    'On the day': [s('Do your part of the day, and log what you do.', 'onset')],
    'After the shoot': [s('Hand back what you borrowed and close your paperwork.', 'paperwork')],
  },
  receives: ['The call sheet (first AD)'],
  hands: ['What you did that day (coordinator, first AD)'],
};

const WRITER: Workflow = {
  stages: {
    'Prep': [s('Draft and structure the story.', 'story'), s('Keep the world and its rules straight.', 'world'), s('Track continuity of what the story established.', 'continuity')],
    'The day before': [s('Check no scene changed since the last revision.', 'revisions')],
    'On the day': [s('Be reachable for rewrites on set.', 'revisions')],
    'After the shoot': [s('Revise for the edit.', 'revisions')],
  },
  receives: ['Notes (director, producer)'],
  hands: ['The script and its revisions (director, first AD, every department)'],
};

const CAMERA: Workflow = {
  stages: {
    'Prep': [s('Study the shot list and the places.', 'shots'), s('Choose and prepare the gear.', 'gear'), s('Test the camera and lenses.', 'camera')],
    'The day before': [s('Check the call, the gear and the card plan.', 'schedule')],
    'On the day': [s('Shoot to the list and log each setup.', 'camera')],
    'After the shoot': [s('Hand the cards to the DIT and log the media.', 'mediaoffload')],
  },
  receives: ['The shot list (director)', 'The call sheet (first AD)'],
  hands: ['Cards and the camera report (DIT, editor)'],
};

const DIT: Workflow = {
  stages: {
    'Prep': [s('Plan the card and storage workflow.', 'mediaoffload')],
    'The day before': [s('Check drives and the card plan.', 'gear')],
    'On the day': [s('Offload and verify every card, with a checksum.', 'mediaoffload'), s('Check the camera reports against the media.', 'camera')],
    'After the shoot': [s('Back up, archive and report what is safe.', 'reports')],
  },
  receives: ['Cards (camera department)'],
  hands: ['Verified media (editor)'],
};

const LIGHT_GRIP: Workflow = {
  stages: {
    'Prep': [s('Recce the places and plan the rig.', 'scout'), s('Choose the gear and book it.', 'gear'), s('Plan the safe way to do each setup.', 'safety')],
    'The day before': [s('Check the call and the load-in.', 'schedule')],
    'On the day': [s('Rig and strike to the shot list.', 'shots')],
    'After the shoot': [s('Return the gear and report damage.', 'gear')],
  },
  receives: ['The shot list and the plan (director, DP)'],
  hands: ['A lit and safe set (camera, director)'],
};

const SOUND: Workflow = {
  stages: {
    'Prep': [s('Read the script for sound problems.', 'sound'), s('Choose and test the gear.', 'gear')],
    'The day before': [s('Check the call and the batteries.', 'schedule')],
    'On the day': [s('Record each take and log it: mic, room tone, wild track.', 'sound'), s('Offload the day\'s sound.', 'mediaoffload')],
    'After the shoot': [s('Hand the sound and its notes to the editor.', 'editorial')],
  },
  receives: ['The script and the shot list (director)'],
  hands: ['Sound and the sound report (editor, sound designer)'],
};

const ART: Workflow = {
  stages: {
    'Prep': [s('Break down what each scene needs.', 'breakdown'), s('Design the look and the places.', 'world'), s('Source and track props and set dressing.', 'props'), s('Scout with the director.', 'scout')],
    'The day before': [s('Check what is ready and what is not.', 'breakdown'), s('Check the call.', 'schedule')],
    'On the day': [s('Dress the set and keep it continuous between takes.', 'continuity')],
    'After the shoot': [s('Strike and return the hire.', 'props')],
  },
  receives: ['The scenes and changes to the plan (director)'],
  hands: ['A dressed set and the props (set, script supervisor)'],
};

const WARDROBE: Workflow = {
  stages: {
    'Prep': [s('Break down each character\'s looks by scene.', 'breakdown'), s('Plan and source the costumes.', 'costume'), s('Plan hair and makeup.', 'makeup')],
    'The day before': [s('Check each look for tomorrow\'s scenes.', 'costume'), s('Check the call.', 'schedule')],
    'On the day': [s('Dress and make up the cast, and keep continuity between takes.', 'continuity')],
    'After the shoot': [s('Return and clean what is hired.', 'costume')],
  },
  receives: ['The scenes and the cast (director, casting)'],
  hands: ['Looks that match from take to take (script supervisor)'],
};

const POST: Workflow = {
  stages: {
    'Prep': [s('Agree the handoff and the file formats with production.', 'editorial')],
    'The day before': [s('Check what media has been offloaded and verified.', 'mediaoffload')],
    'On the day': [s('Receive the package: selected takes, sound and camera reports.', 'editorial')],
    'After the shoot': [s('Cut, and send versions for notes.', 'revisions'), s('Deliver what each version needs.', 'editorial')],
  },
  receives: ['Verified media (DIT)', 'Selected takes and notes (script supervisor)', 'Sound and the sound report (sound)'],
  hands: ['Cut versions (director, producer, client)'],
};

const MUSIC: Workflow = {
  stages: {
    'Prep': [s('Read the script for where music lives.', 'sound')],
    'The day before': [s('Check what music is needed for tomorrow\'s scenes.', 'schedule')],
    'On the day': [s('Clear and log what plays on set.', 'paperwork')],
    'After the shoot': [s('Spot, write or license music to the cut.', 'editorial'), s('Handle the licensing paperwork.', 'paperwork')],
  },
  receives: ['The cut (editor)', 'Budget for music (producer)'],
  hands: ['Cues and the licences (editor, producer)'],
};

const PERFORMER: Workflow = {
  stages: {
    'Prep': [s('Accept your invitation and see your role.'), s('Learn your pages: they are on your call sheet.'), s('Come to rehearsals.', 'rehearsal')],
    'The day before': [s('Open My calls: your call time, the place, your pages.'), s('Confirm you have seen the call.')],
    'On the day': [s('Arrive at your call and follow the day.')],
    'After the shoot': [s('Look out for any pick-ups.')],
  },
  receives: ['Your call and your pages (second AD)'],
  hands: ['Your performance on the day (director)'],
};

const OUTSIDE: Workflow = {
  stages: {
    'Prep': [s('Open the review link you were sent: it is for your role.')],
    'On the day': [s('Read what is shared with you.')],
    'After the shoot': [s('Comment where your role allows; the client approves or asks for changes.')],
  },
  receives: ['A review link (producer)'],
  hands: ['Comments, or the client\'s decision (producer)'],
};

const GENERIC: Workflow = PRODUCTION_DEFAULT;

/** By craft name (public.crafts). */
export const WORKFLOWS: Record<string, Workflow> = {
  'Director': DIRECTOR, 'First assistant director': FIRST_AD, 'Second assistant director': SECOND_AD, 'Script supervisor': SCRIPT_SUP,
  'Producer': PRODUCER, 'Line producer': LINE_PRODUCER, 'Production manager': LINE_PRODUCER, 'Production accountant': ACCOUNTANT,
  'Production coordinator': COORDINATOR, 'Location manager': LOCATION_MANAGER, 'Casting director': CASTING,
  'DIT': DIT,
  'Actor': PERFORMER, 'Stunt performer': PERFORMER, 'Voice actor': PERFORMER,
  'Client': OUTSIDE, 'Investor': OUTSIDE, 'Distributor or festival guest': OUTSIDE, 'Press': OUTSIDE,
};

/** The department a craft belongs to when it has no workflow of its own (crafts an admin adds later). */
export const DEPARTMENT_WORKFLOWS: Record<string, Workflow> = {
  'Direction': DIRECTOR, 'Production': PRODUCTION_DEFAULT, 'Writing': WRITER, 'Camera': CAMERA, 'Lighting & grip': LIGHT_GRIP, 'Sound': SOUND,
  'Art': ART, 'Wardrobe, hair & makeup': WARDROBE, 'Editorial & post': POST, 'Music': MUSIC, 'Performance': PERFORMER, 'Outside': OUTSIDE, 'Other': GENERIC,
};

export function workflowFor(craft: string | null | undefined, department?: string | null): Workflow {
  if (craft && WORKFLOWS[craft]) return WORKFLOWS[craft];
  if (department && DEPARTMENT_WORKFLOWS[department]) return DEPARTMENT_WORKFLOWS[department];
  return GENERIC;
}
