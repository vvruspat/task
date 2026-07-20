import { IssuePage } from "../../../../../../../components/issue-page";

export default async function Page({
  params,
}: Readonly<{
  params: Promise<{ workspaceSlug: string; identifier: string; slug?: string[] }>;
}>) {
  const { workspaceSlug, identifier, slug } = await params;
  return (
    <IssuePage workspaceSlug={workspaceSlug} identifier={identifier} slug={slug?.at(0) ?? null} />
  );
}
