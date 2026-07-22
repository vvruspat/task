import type { ReactNode } from "react";
import { InvitationAcceptance } from "../../../components/invitation-acceptance";

export default async function InvitationPage({
  params,
}: Readonly<{ params: Promise<{ token: string }> }>): Promise<ReactNode> {
  const { token } = await params;
  return <InvitationAcceptance token={token} />;
}
