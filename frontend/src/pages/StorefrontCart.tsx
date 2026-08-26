import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCart, addCartItem } from "../onlinestore/storefrontService";
import type { CartSummary } from "../onlinestore/types";

export function StorefrontCart() {
  const { slug } = useParams<{ slug: string }>();
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionToken, setSessionToken] = useState(() => {
    return localStorage.getItem("kopera_cart_session") || "session-abc-123";
  });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getCart(slug, sessionToken)
      .then((data) => {
        setCart(data);
        if (data && data.session_token) {
          setSessionToken(data.session_token);
          localStorage.setItem("kopera_cart_session", data.session_token);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.status === 404) {
          setCart(null);
          setLoading(false);
        } else {
          setError(err.message || "Failed to load cart");
          setLoading(false);
        }
      });
  }, [slug, sessionToken]);

  const [quantity, setQuantity] = useState("1");
  const [quantityError, setQuantityError] = useState("");

  const handleAddItem = async () => {
    setQuantityError("");
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setQuantityError("Quantity must be greater than 0.");
      return;
    }

    try {
      const formattedQty = qty.toFixed(2);
      const res = await addCartItem(slug!, {
        session_token: sessionToken,
        variant: "v1",
        quantity: formattedQty,
      });
      setCart(res);
      if (res && res.session_token) {
        setSessionToken(res.session_token);
        localStorage.setItem("kopera_cart_session", res.session_token);
      }
    } catch (err: any) {
      setError(err.message || "Failed to add item to cart");
    }
  };

  if (loading) {
    return (
      <div data-testid="storefront" className="min-h-screen bg-gray-50 p-6">
        <div data-testid="storefront-cart-loading">
          <p>Loading cart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="storefront" className="min-h-screen bg-gray-50 p-6">
        <div data-testid="storefront-cart-error">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="storefront">
      <div data-testid="storefront-cart">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Cart</h1>
        
        {!cart || !Array.isArray(cart.items) || cart.items.length === 0 ? (
          <p className="text-gray-600">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.product_name}</p>
                  <p className="text-sm text-gray-600">Variant ID: {item.variant}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{item.quantity} x {item.price}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="number"
              data-testid="cart-quantity-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-20 px-2 py-1 border border-gray-300 rounded-md"
            />
            <button
              data-testid="cart-add-btn"
              onClick={handleAddItem}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add Item
            </button>
          </div>
          {quantityError && (
            <p data-testid="cart-quantity-error" className="text-sm text-red-600">
              {quantityError}
            </p>
          )}
        </div>

        <div className="mt-6">
          <Link
            to={`/store/${slug}/checkout`}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}