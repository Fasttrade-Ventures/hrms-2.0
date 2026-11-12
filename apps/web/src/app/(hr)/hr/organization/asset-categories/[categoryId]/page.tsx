import { redirect } from "next/navigation";

export default async function AssetCategoryDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  redirect(`/hr/organization/asset-categories/${categoryId}/edit`);
}

