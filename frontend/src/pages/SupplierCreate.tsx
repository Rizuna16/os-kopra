import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createSupplier } from "../supplier/supplierService";
import type { SupplierPayload } from "../supplier/types";
import { ApiError } from "../auth/types";

export function SupplierCreate() {
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
      const payload: SupplierPayload = {
        name,
        phone: phoneRef.current?.value ?? "",
        email: emailRef.current?.value ?? "",
        address: addressRef.current?.value ?? "",
      };
      await createSupplier(currentBusinessId!, payload);
      navigate("/suppliers");
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
        setError(e instanceof Error ? e.message : "Failed to create supplier");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">New supplier</h1>
      <form data-testid="supplier-create-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block">Name</label>
          <input
            id="name"
            type="text"
            data-testid="supplier-name-input"
            ref={nameRef}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block">Phone</label>
          <input
            id="phone"
            type="text"
            data-testid="supplier-phone-input"
            ref={phoneRef}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="email" className="block">Email</label>
          <input
            id="email"
            type="text"
            data-testid="supplier-email-input"
            ref={emailRef}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label htmlFor="address" className="block">Address</label>
          <input
            id="address"
            type="text"
            data-testid="supplier-address-input"
            ref={addressRef}
            className="border rounded px-2 py-1 w-full"
          />
        </div>
        {error && <div data-testid="supplier-create-error" className="text-red-600">{error}</div>}
        <button
          type="submit"
          data-testid="supplier-create-submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded px-3 py-1"
        >
          {submitting ? "…" : "Create supplier"}
        </button>
      </form>
    </div>
  );
}
