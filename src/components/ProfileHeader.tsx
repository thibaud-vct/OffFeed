"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Props {
    name: string;
    username: string;
    bio: string;
    website: string;
    avatarPath: string;
    igUsername: string; // handle Instagram réel (ex: "thiboad")
    postCount: number;
    followersCount: number;
    followsCount: number;
}

function StatCol({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-start">
            <span className="text-base font-bold dark:text-white">
                {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            </span>
            <span
                className="text-xs text-zinc-600 dark:text-zinc-400"
                style={{ fontSize: "0.85rem" }}
            >
                {label}
            </span>
        </div>
    );
}

function parseBioMentions(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const regex = /@[a-zA-Z0-9_.]+/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before the mention
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        // Add the mention as a link
        const handle = match[0].slice(1); // Remove the @
        parts.push(
            <a
                key={`mention-${match.index}`}
                href={`https://www.instagram.com/${handle}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 dark:text-blue-400 font-medium hover:underline"
            >
                {match[0]}
            </a>
        );

        lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

export function ProfileHeader({
    name,
    username,
    bio,
    website,
    avatarPath,
    igUsername,
    postCount,
    followersCount,
    followsCount,
}: Props) {
    const router = useRouter();
    const { data: session } = useSession();

    async function handleShare() {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: name || username,
                    text: `Découvrez mon profil ${name ? `(${name})` : ""}`,
                    url
                });
            } else {
                await navigator.clipboard.writeText(url);
                alert("Lien copié dans le presse-papiers !");
            }
        } catch (err) {
            // Si la Web Share API échoue ou est annulée par l'utilisateur, fallback sur le clipboard
            if (err instanceof Error && err.name !== "AbortError") {
                try {
                    await navigator.clipboard.writeText(url);
                    alert("Lien copié dans le presse-papiers !");
                } catch (clipboardErr) {
                    console.error("Erreur lors de la copie:", clipboardErr);
                    alert("Impossible de copier le lien. Veuillez réessayer.");
                }
            }
        }
    }

    const igUrl = igUsername
        ? `https://www.instagram.com/${igUsername.replace(/^@/, "")}/`
        : null;

    return (
        <div className="px-4 pb-2 pt-4">
            {/* Ligne avatar + stats */}
            <div className="flex items-center gap-6">
                {/* Avatar — plus grand */}
                <div className="relative h-[95px] w-[95px] flex-shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                    {avatarPath ? (
                        <Image
                            src={avatarPath}
                            alt={name || username}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <svg
                                className="h-12 w-12 text-zinc-400"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Nom + stats empilés à droite */}
                <div className="flex flex-1 flex-col gap-2">
                    {name && (
                        <p className="text-base font-bold dark:text-white leading-tight">
                            {name}
                        </p>
                    )}
                    <div className="flex justify-between pr-2">
                        <StatCol value={postCount} label="publications" />
                        <StatCol value={followersCount} label="followers" />
                        <StatCol value={followsCount} label="suivi(e)s" />
                    </div>
                </div>
            </div>

            {/* Bio + site (sans le nom — déjà affiché en haut) */}
            <div className="mt-3 space-y-0.5">
                {bio && (
                    <p className="whitespace-pre-line text-sm leading-snug text-zinc-800 dark:text-zinc-200">
                        {parseBioMentions(bio)}
                    </p>
                )}
                {website && (
                    <a
                        href={
                            website.startsWith("http")
                                ? website
                                : `https://${website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-medium text-blue-500 dark:text-blue-400"
                    >
                        {website.replace(/^https?:\/\//, "")}
                    </a>
                )}
            </div>

            {/* Boutons Modifier / Partager */}
            <div className="mt-3 flex gap-2">
                {session && (
                    <Link
                        href="/admin/settings"
                        className="flex flex-1 items-center justify-center rounded-lg border border-zinc-300 py-1.5 text-sm font-semibold dark:border-zinc-700 dark:text-white"
                    >
                        Modifier
                    </Link>
                )}
                <button
                    onClick={handleShare}
                    className={`flex items-center justify-center rounded-lg border border-zinc-300 py-1.5 text-sm font-semibold dark:border-zinc-700 dark:text-white ${session ? "flex-1" : "w-full"}`}
                >
                    Partager le profil
                </button>
                {/* Bouton + pour suivre (ici renvoie vers IG) */}
                {igUrl && (
                    <a
                        href={igUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700"
                    >
                        <svg
                            className="h-4 w-4 dark:text-white"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </a>
                )}
            </div>
        </div>
    );
}
