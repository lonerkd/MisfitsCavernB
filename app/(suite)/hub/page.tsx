import { redirect } from 'next/navigation';

// The hub's feed is a section of Community now; posts keep /hub/<id> and Help keeps /hub/help.
export default function HubPage() {
  redirect('/community');
}
