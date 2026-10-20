// Who runs The Cavern (made by Misfits Cavern), for the Privacy Policy and Terms (app/privacy,
// app/terms). Not yet a registered business: an individual.
//
// The identity and contact details are not in the code: the owner sets them in
// the environment (.env.example lists each; Vercel › Settings › Environment
// Variables in production) and redeploys. They are deliberately NOT
// NEXT_PUBLIC_: only server components read LEGAL, so the values are rendered
// into the pages at build time and never shipped as client config. Do not
// import this module from a client component.
// Move LEGAL_EFFECTIVE forward whenever the wording of either page changes.

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. The legal pages need it (see .env.example › Legal identity).`);
  }
  return value;
}

export const LEGAL = {
  operator: required('LEGAL_OPERATOR'),
  product: 'The Cavern',
  maker: 'Misfits Cavern',
  country: required('LEGAL_COUNTRY'),
  province: required('LEGAL_PROVINCE'),
  // How people reach the operator (no email address is published).
  contactLabel: required('LEGAL_CONTACT_LABEL'),
  contactUrl: required('LEGAL_CONTACT_URL'),
  contactAltLabel: required('LEGAL_CONTACT_ALT_LABEL'),
  contactAltUrl: required('LEGAL_CONTACT_ALT_URL'),
  effective: required('LEGAL_EFFECTIVE'),
} as const;
