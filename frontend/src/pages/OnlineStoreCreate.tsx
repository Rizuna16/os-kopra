import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../business/BusinessContext";
import { createOnlineStore } from "../onlinestore/onlineStoreService";

export function OnlineStoreCreate() {
  const { currentBusinessId, currentLocationId, locations } = useBusiness();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [defaultLocation, setDefaultLocation] = useState(currentLocationId || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const safeLocations = Array.isArray(locations) ? locations : [];

  useEffect(() => {
    if (currentLocationId && !defaultLocation) {
      setDefaultLocation(currentLocationId);
    } else if (safeLocations.length > 0 && !defaultLocation) {
      setDefaultLocation(safeLocations[0].id);
    }
  }, [safeLocations, currentLocationId, defaultLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId || !name.trim() || !slug.trim() || !defaultLocation) {
      setError("All fields are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createOnlineStore(currentBusinessId, {
        name: name.trim(),
        slug: slug.trim(),
        default_location: defaultLocation,
      });
      navigate("/stores");
    } catch (err: any) {
      setError(err.message || "Failed to create online store");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-100 mt-6" data-testid="store-create-form">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Online Store</h1>
      {error && (
        <div data-testid="store-form-error" className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Store Name</label>
          <input
            type="text"
            data-testid="store-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Slug</label>
          <input
            type="text"
            data-testid="store-slug-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Location</label>
          <select
            data-testid="store-location-select"
            value={defaultLocation}
            onChange={(e) => setDefaultLocation(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
          >
            <option value="">Select a location</option>
            {defaultLocation && !safeLocations.some((l) => l.id === defaultLocation) && (
              <option value={defaultLocation}>{defaultLocation}</option>
            )}
            {safeLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          data-testid="store-submit-btn"
          disabled={submitting}
          className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Store"}
        </button>
      </form>
    </div>
  );
}