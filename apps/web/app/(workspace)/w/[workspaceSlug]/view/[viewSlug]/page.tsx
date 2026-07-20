import { SavedViewsPage } from "../../../../../../components/saved-views-page";

export default async function Page({
  params,
}: Readonly<{ params: Promise<{ viewSlug: string }> }>) {
  const { viewSlug } = await params;
  return <SavedViewsPage viewSlug={viewSlug} />;
}
