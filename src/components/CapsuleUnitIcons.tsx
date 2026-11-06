import type { CapsuleProduct } from "../lib/types";

const SLEEVE_SIZE = 10;

type Props = {
  product: CapsuleProduct;
  count: number;
};

/** One row = 10 fixed slots (one sleeve); only filled slots show a capsule. */
export function CapsuleUnitIcons({ product, count }: Props) {
  if (count <= 0) {
    return <p className="capsule-unit-empty">No capsules yet</p>;
  }

  const sleeves: number[] = [];
  for (let i = 0; i < count; i += SLEEVE_SIZE) {
    sleeves.push(Math.min(SLEEVE_SIZE, count - i));
  }

  return (
    <div
      className="capsule-sleeves"
      role="img"
      aria-label={`${count} ${count === 1 ? "capsule" : "capsules"}`}
    >
      {sleeves.map((filled, row) => (
        <div key={row} className="capsule-sleeve-row">
          {Array.from({ length: SLEEVE_SIZE }, (_, i) => (
            <span
              key={i}
              className={`capsule-unit${i < filled ? "" : " capsule-unit--empty"}`}
            >
              {i < filled ? (
                <span className="capsule-unit-figure">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="capsule-unit-fallback" aria-hidden />
                  )}
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
