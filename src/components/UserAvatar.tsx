import { PetCreature, type PetSpecies, type PetStage } from "@/components/PetCreature";
import { User as UserIcon } from "lucide-react";

interface Props {
  avatarUrl?: string | null;
  username?: string | null;
  petSpecies?: PetSpecies | null;
  petStage?: PetStage | null;
  size?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Avatar with a small pet companion floating at the top-right corner.
 */
export function UserAvatar({
  avatarUrl,
  username,
  petSpecies,
  petStage,
  size = 48,
  onClick,
  className = "",
}: Props) {
  const petSize = Math.round(size * 0.62);
  const initial = (username ?? "·").trim().charAt(0).toUpperCase();
  const interactive = !!onClick;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        aria-label={interactive ? "更换头像" : undefined}
        className={`relative h-full w-full overflow-hidden rounded-full border-2 border-card bg-gradient-to-br from-primary/15 to-primary/5 shadow-soft transition-smooth ${
          interactive ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : "cursor-default"
        }`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={username ?? "头像"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary">
            {initial && initial !== "·" ? (
              <span className="font-display text-base">{initial}</span>
            ) : (
              <UserIcon className="h-1/2 w-1/2" />
            )}
          </div>
        )}
      </button>

      {petSpecies && (
        <div
          className="pointer-events-none absolute"
          style={{
            width: petSize,
            height: petSize,
            top: -Math.round(petSize * 0.35),
            right: -Math.round(petSize * 0.35),
          }}
        >
          <PetCreature
            species={petSpecies}
            stage={(petStage ?? 0) as PetStage}
            size={petSize}
            state="idle"
          />
        </div>
      )}
    </div>
  );
}