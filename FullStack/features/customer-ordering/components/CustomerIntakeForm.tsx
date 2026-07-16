import { Brain } from "lucide-react";

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
        <p className="eyebrow">Customer intake</p>
        <h2>Validated contact details before AI recommendation.</h2>
        <p className="muted">Stage 2 rules are preserved: name is alphabets/spaces only, phone must be Indian mobile format, and every failure gets a specific message.</p>
      </div>
      <div className="form-grid">
        <label>Name
          <input value={customer.name} onChange={(event) => onCustomerChange({ ...customer, name: event.target.value })} placeholder="Aarav Sharma" />
          {errors.name && <em>{errors.name}</em>}
        </label>
        <label>Phone
          <input value={customer.phone} onChange={(event) => onCustomerChange({ ...customer, phone: event.target.value })} placeholder="9876543210" />
          {errors.phone && <em>{errors.phone}</em>}
        </label>
        <label>Delivery radius
          <select value={customer.deliveryZone ?? ""} onChange={(event) => onCustomerChange({ ...customer, deliveryZone: event.target.value as CustomerDetails["deliveryZone"] })}>
            <option value="">Choose radius</option>
            <option value="0-2">0-2 km priority zone</option>
            <option value="2-4">2-4 km launch radius</option>
            <option value="4-6">4-6 km expansion waitlist</option>
          </select>
          {errors.deliveryZone && <em>{errors.deliveryZone}</em>}
        </label>
        <label className="wide">Delivery address
          <textarea value={customer.address} onChange={(event) => onCustomerChange({ ...customer, address: event.target.value })} placeholder="Flat, landmark, street, New Ashok Nagar" />
          {errors.address && <em>{errors.address}</em>}
        </label>
        <label className="wide">Delivery note
          <input value={customer.note ?? ""} onChange={(event) => onCustomerChange({ ...customer, note: event.target.value })} placeholder="Ring bell once, leave with security..." />
        </label>
        <button className="primary wide" type="button" onClick={onSubmit}><Brain /> Get AI recommendation</button>
      </div>
    </section>
  );
}
