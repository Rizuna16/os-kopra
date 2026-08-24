import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createCustomer } from "../customer/customerService";
import type { CustomerPayload } from "../customer/types";
import { ApiError } from "../auth/types";

export function CustomerCreate() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value ?? "";
    if (!name.trim()) {
      setError("Name must not be empty or whitespace only.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: CustomerPayload = {
        name,
        phone: phoneRef.current?.value ?? "",
        email: emailRef.current?.value ?? "",
        address: addressRef.current?.value ?? "",
      };
      await createCustomer(currentBusinessId!, payload);
      navigate("/customers");
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
        setError(e instanceof Error ? e.message : "Failed to create customer");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">New customer</h1>
      <form data-testid="customer-create-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block">Name</label>
          <input
            id="name"
            type="text"
            data-testid="customer-name-input"
            ref={nameRef}
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
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        {error && <div data-testid="customer-create-error" className="text-red-600">{error}</div>}
        <button
          type="submit"
          data-testid="customer-create-submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {submitting ? "…" : "Create customer"}
        </button>
      </form>
    </div>
  );
}
