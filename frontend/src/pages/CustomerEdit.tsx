import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { getCustomer, updateCustomer } from "../customer/customerService";
import type { Customer, CustomerUpdatePayload } from "../customer/types";
import { ApiError } from "../auth/types";

export function CustomerEdit() {
  const { customerId } = useParams();
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [item, setItem] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentBusinessId || !customerId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCustomer(currentBusinessId, customerId)
      .then((d) => {
        if (!cancelled) setItem(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load customer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentBusinessId, customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !customerId) return;
    const name = nameRef.current?.value ?? "";
    if (!name.trim()) {
      setError("Name must not be empty or whitespace only.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload: CustomerUpdatePayload = {
        name,
        phone: phoneRef.current?.value ?? "",
        email: emailRef.current?.value ?? "",
        address: addressRef.current?.value ?? "",
      };
      await updateCustomer(currentBusinessId, customerId, payload);
      navigate(`/customers/${customerId}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && e.errors) {
        const first =
          e.errors.name?.[0] ??
          e.errors.non_field_errors?.[0] ??
          e.errors.phone?.[0] ??
          e.errors.email?.[0] ??
          e.errors.address?.[0];
        setError(first ?? e.message);
      } else {
        setError(e instanceof Error ? e.message : "Failed to update customer");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div data-testid="customer-edit-loading">Loading…</div>;
  if (error) return <div data-testid="customer-edit-error">{error}</div>;
  if (!item) return <div data-testid="customer-edit">Customer not found.</div>;
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Edit customer</h1>
      <form data-testid="customer-edit-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block">Name</label>
          <input
            id="name"
            type="text"
            data-testid="customer-name-input"
            ref={nameRef}
            defaultValue={item.name}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block">Phone</label>
          <input
            id="phone"
            type="text"
            data-testid="customer-phone-input"
            ref={phoneRef}
            defaultValue={item.phone}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="email" className="block">Email</label>
          <input
            id="email"
            type="text"
            data-testid="customer-email-input"
            ref={emailRef}
            defaultValue={item.email}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="address" className="block">Address</label>
          <input
            id="address"
            type="text"
            data-testid="customer-address-input"
            ref={addressRef}
            defaultValue={item.address}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        {error && <div data-testid="customer-edit-error" className="text-red-600">{error}</div>}
        <button
          type="submit"
          data-testid="customer-edit-submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {loading ? "…" : "Update customer"}
        </button>
      </form>
    </div>
  );
}
