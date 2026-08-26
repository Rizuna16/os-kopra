import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { checkout } from "../onlinestore/storefrontService";

export function StorefrontCheckout() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError(null);
    try {
      await checkout(slug, {
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        shipping_address: shippingAddress,
        lines: [{ variant: "v1", quantity: "1" }],
      });
      navigate(`/store/${slug}`);
    } catch (err: any) {
      setError(err.message || "Failed to place order");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="storefront">
      <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100 mt-6" data-testid="storefront-checkout">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
        {error && (
          <div data-testid="checkout-error" className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">
            {error}
          </div>
        )}
<form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              data-testid="checkout-name-input"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              data-testid="checkout-email-input"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              data-testid="checkout-phone-input"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Shipping Address</label>
            <textarea
              data-testid="checkout-address-input"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            />
          </div>
          <button
            type="submit"
            data-testid="checkout-submit-btn"
            disabled={submitting}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Placing Order..." : "Place Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
