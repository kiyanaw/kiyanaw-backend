import type { ExtraBadge } from '../../services/adt';

interface ExtraBadgesProps {
  badges: ExtraBadge[];
}

/** Plain pills for Transcription.extra marks; renders nothing when there are none. */
export const ExtraBadges = ({ badges }: ExtraBadgesProps) => (
  <>
    {badges.map((badge) => (
      <span
        key={badge.kind}
        data-testid={`extra-badge-${badge.kind}`}
        title={badge.label}
        className="inline-block max-w-[16rem] truncate align-middle px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
      >
        {badge.label}
      </span>
    ))}
  </>
);
