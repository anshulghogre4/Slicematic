import { Utensils } from "lucide-react";

import type { CustomerDetails } from "../../../lib/types";

export type CustomerIntakeErrors = Partial<Record<"name" | "phone" | "deliveryZone" | "address", string>>;

export type CustomerIntakeFormProps = {
  customer: CustomerDetails;
  errors: CustomerIntakeErrors;
  onCustomerChange: (customer: CustomerDetails) => void;
  onSubmit: () => void;
};

export function CustomerIntakeForm({ customer, errors, onCustomerChange, onSubmit }: CustomerIntakeFormProps) {
  return (
    <section className="glass-panel intake-grid">
      <div>
        <p className="eyebrow">Delivery details</p>
        <h2>Tell us where this order goes.</h2>
        <p className="muted">Empty fields stay blank until you type. Name uses letters and spaces only; phone must be a 10-digit Indian mobile.</p>
      </div>
      <div className="form-grid intake-form">
        <label htmlFor="intake-name">
          <span className="intake-form__label">Name <span className="intake-form__required" aria-hidden="true">*</span></span>
          <input
            id="intake-name"
            name="name"
            type="text"
            autoComplete="name"
            value={customer.name}
            onChange={(event) => onCustomerChange({ ...customer, name: event.target.value })}
            placeholder="e.g. your full name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "intake-name-error" : undefined}
          />
          {errors.name && <em id="intake-name-error" role="alert">{errors.name}</em>}
        </label>
        <label htmlFor="intake-phone">
          <span className="intake-form__label">Phone <span className="intake-form__required" aria-hidden="true">*</span></span>
          <input
            id="intake-phone"
            name="tel"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={customer.phone}
            onChange={(event) => onCustomerChange({ ...customer, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="10-digit mobile"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "intake-phone-error" : undefined}
          />
          {errors.phone && <em id="intake-phone-error" role="alert">{errors.phone}</em>}
        </label>
        <label htmlFor="intake-zone">
          <span className="intake-form__label">Delivery radius <span className="intake-form__required" aria-hidden="true">*</span></span>
          <select
            id="intake-zone"
            name="deliveryZone"
            value={customer.deliveryZone ?? ""}
            onChange={(event) => onCustomerChange({
              ...customer,
              deliveryZone: (event.target.value || undefined) as CustomerDetails["deliveryZone"],
            })}
            aria-invalid={Boolean(errors.deliveryZone)}
            aria-describedby={errors.deliveryZone ? "intake-zone-error" : undefined}
          >
            <option value="">Choose radius</option>
            <option value="0-2">0-2 km priority zone</option>
            <option value="2-4">2-4 km launch radius</option>
            <option value="4-6">4-6 km expansion waitlist</option>
          </select>
          {errors.deliveryZone && <em id="intake-zone-error" role="alert">{errors.deliveryZone}</em>}
        </label>
        <label className="wide" htmlFor="intake-address">
          <span className="intake-form__label">Delivery address <span className="intake-form__required" aria-hidden="true">*</span></span>
          <textarea
            id="intake-address"
            name="street-address"
            autoComplete="street-address"
            rows={3}
            value={customer.address}
            onChange={(event) => onCustomerChange({ ...customer, address: event.target.value })}
            placeholder="Flat, landmark, street, area"
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "intake-address-error" : undefined}
          />
          {errors.address && <em id="intake-address-error" role="alert">{errors.address}</em>}
        </label>
        <label className="wide" htmlFor="intake-note">
          <span className="intake-form__label">Delivery note <span className="intake-form__optional">(optional)</span></span>
          <input
            id="intake-note"
            name="note"
            type="text"
            value={customer.note ?? ""}
            onChange={(event) => onCustomerChange({ ...customer, note: event.target.value })}
            placeholder="Gate code, leave with security…"
          />
        </label>
        <button className="primary wide" type="button" onClick={onSubmit}>
          <Utensils /> Save details & continue
        </button>
      </div>
    </section>
  );
}
