export type BrandRuleKind = 'must_include' | 'never_say' | 'tone_note' | 'legal_line';
export type BrandRuleSeverity = 'blocker' | 'warning' | 'note';

export interface BrandRule {
  id: string;
  kind: BrandRuleKind;
  text: string;
  severity: BrandRuleSeverity;
}

export interface BrandRuleBreach {
  ruleId: string;
  kind: BrandRuleKind;
  severity: BrandRuleSeverity;
  message: string;
}

/** Checks literal requirements without treating client-authored text as a pattern. */
export function checkBrandRules(text: string, rules: BrandRule[]): BrandRuleBreach[] {
  const normalized = text.toLocaleLowerCase();
  return rules.flatMap((rule) => {
    const phrase = rule.text.trim();
    if (!phrase || rule.kind === 'tone_note') return [];
    const present = normalized.includes(phrase.toLocaleLowerCase());
    const breached = rule.kind === 'never_say' ? present : !present;
    if (!breached) return [];
    return [{
      ruleId: rule.id,
      kind: rule.kind,
      severity: rule.severity,
      message: rule.kind === 'never_say' ? 'Contains a restricted phrase.' : 'Required wording is missing.',
    }];
  });
}
