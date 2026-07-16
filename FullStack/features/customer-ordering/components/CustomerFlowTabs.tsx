import { CUSTOMER_FLOW_TABS } from "../../../lib/customer-flow";

export type CustomerFlowTabsProps<TStep extends string> = {
  activeStep: TStep;
  onSelectStep: (step: TStep) => void;
};

export function CustomerFlowTabs<TStep extends string>({ activeStep, onSelectStep }: CustomerFlowTabsProps<TStep>) {
  return (
    <div className="flow-tabs" role="tablist" aria-label="Ordering flow">
      {CUSTOMER_FLOW_TABS.map((item) => (
        <button
          key={item.id}
          className={activeStep === item.id ? "active" : ""}
          onClick={() => onSelectStep(item.id as TStep)}
          type="button"
          role="tab"
          aria-selected={activeStep === item.id}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
