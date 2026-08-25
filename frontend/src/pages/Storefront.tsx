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
    <div
      className="min-h-screen bg-gray-50"
      data-testid="storefront"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Online Store: {slug}
          </h1>
          <p className="text-sm text-gray-600">
            Public storefront (AllowAny). Catalog and cart load here.
          </p>
        </div>
      </div>
    </div>
  );
}
