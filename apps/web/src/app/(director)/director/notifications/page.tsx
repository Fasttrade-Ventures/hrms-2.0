import { AccountNotificationsScreen } from "@/components/account/account-screens";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string; filter?: string }>;
}) {
  return <AccountNotificationsScreen notificationPortal="account" searchParams={searchParams} />;
}
