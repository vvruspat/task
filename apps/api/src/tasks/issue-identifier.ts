export const issueIdentifierPattern = /^([A-Z][A-Z0-9]{1,7})-([1-9]\d*)$/;

export type ParsedIssueIdentifier = {
  projectKey: string;
  taskNumber: number;
};

export function parseIssueIdentifier(value: string): ParsedIssueIdentifier | null {
  const match = issueIdentifierPattern.exec(value.toUpperCase());
  if (match === null) return null;
  const projectKey = match[1];
  const numberText = match[2];
  if (projectKey === undefined || numberText === undefined) return null;
  const taskNumber = Number(numberText);
  return Number.isSafeInteger(taskNumber) ? { projectKey, taskNumber } : null;
}
