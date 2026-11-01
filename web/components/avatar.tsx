import type { Person } from "../lib/roster";
export function Avatar({
  person,
  className = "",
}: {
  person: Person;
  className?: string;
}) {
  const extra = person.portrait !== undefined && person.portrait >= 3;
  const index = extra ? person.portrait! - 3 : person.portrait || 0;
  const width = extra ? 1536 : 1774,
    height = extra ? 1024 : 887;
  const cellWidth = width / (extra ? 4 : 3),
    cellHeight = height / (extra ? 2 : 1);
  return (
    <div
      role="img"
      aria-label={`${person.name}, ${person.photoDataUrl ? "contact photo" : "fictional character"}`}
      className={`avatar ${person.photoDataUrl || person.portrait !== undefined ? "portrait" : "monogram"} ${className}`}
      style={{ backgroundColor: person.color }}
    >
      {person.photoDataUrl ? (
        <img className="contact-photo-image" src={person.photoDataUrl} alt="" />
      ) : person.portrait !== undefined ? (
        <svg
          className="portrait-image"
          viewBox={`${extra ? (index % 4) * cellWidth : index * cellWidth} ${extra ? Math.floor(index / 4) * cellHeight : 0} ${cellWidth} ${cellHeight}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <image
            href={`/portraits/${extra ? "extended" : "cast"}.png`}
            width={width}
            height={height}
          />
        </svg>
      ) : (
        <span>
          {person.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </div>
  );
}
