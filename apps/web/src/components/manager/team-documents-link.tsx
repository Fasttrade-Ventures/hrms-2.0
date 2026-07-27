import Link from "next/link";

export function TeamDocumentsLink() {
  return (
    <Link
      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      href="/manager/team-documents"
    >
      View team documents
    </Link>
  );
}
