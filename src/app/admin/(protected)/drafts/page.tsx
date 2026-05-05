import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function DraftsPage() {
  const drafts = await prisma.post.findMany({
    where: { published: false },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="mx-auto max-w-[935px]">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <h1 className="text-lg font-semibold dark:text-white">Brouillons</h1>
        <Link
          href="/admin/new"
          className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
          + Nouvelle publication
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 dark:text-zinc-600">
          <p>Aucun brouillon.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800">
            {drafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/admin/new?edit=${draft.id}`}
                className="group relative block w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                style={{ aspectRatio: "3 / 4" }}
              >
                <Image
                  src={draft.imagePath}
                  alt={draft.caption || ""}
                  fill
                  sizes="33vw"
                  className="object-cover transition-opacity duration-150 group-hover:opacity-90"
                />
                {/* Indicateur carousel */}
                {JSON.parse(draft.extraImages).length > 0 && (
                  <svg
                    className="absolute right-1.5 top-1.5 h-4 w-4 drop-shadow"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm16-4a2 2 0 012 2v12a2 2 0 01-2 2v-2a2 2 0 000-4V4zm-2 2H4v12h12V4z" />
                  </svg>
                )}
              </Link>
            ))}
          </div>

          <div className="flex justify-center py-8">
            <p className="text-xs text-zinc-300 dark:text-zinc-700">— {drafts.length} brouillon{drafts.length !== 1 ? "s" : ""} —</p>
          </div>
        </>
      )}
    </div>
  )
}
