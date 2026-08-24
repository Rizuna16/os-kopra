import { useParams } from "react-router-dom";

/**
 * Public Online Store storefront. Maps to the AllowAny backend routes:
 *   GET /api/v1/stores/<slug>/
 *   GET /api/v1/stores/<slug>/products/
 * This page is intentionally NOT wrapped by the auth guard so guest
 * shoppers can browse without a token.
 */
export function Storefront() {
  const { slug } = useParams();

  return (
    <div className="storefront" data-testid="storefront">
      <h1>Online Store: {slug}</h1>
      <p>Public storefront (AllowAny). Catalog and cart load here.</p>
    </div>
  );
}
