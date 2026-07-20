import { IssuePage } from "../../../../../components/issue-page";

export default async function Page({
  params,
}: Readonly<{
  params: Promise<{ identifier: string; slug?: string[] }>;
}>) {
  const { identifier, slug } = await params;
  return <IssuePage identifier={identifier} slug={slug?.at(0) ?? null} />;
}
