import { CUSTOMER_FLOW_TABS } from "../../../lib/customer-flow";

export type CustomerFlowTabsProps<TStep extends string> = {
  activeStep: TStep;
  onSelectStep: (step: TStep) => void;
  /** When false, Details tab reads as guest intake; members see "Your details". */
  customerLoggedIn?: boolean;
};

export function CustomerFlowTabs<TStep extends string>({
  activeStep,
  onSelectStep,
  customerLoggedIn = false,
}: CustomerFlowTabsProps<TStep>) {
  return (
    <div className="flow-tabs flow-tabs--stepper" role="tablist" aria-label="Ordering journey">
      {CUSTOMER_FLOW_TABS.map((item, index) => {
        const isActive = activeStep === item.id;
        const label =
          item.id === "intake"
            ? customerLoggedIn
              ? "Your details"
              : "Guest details"
            : item.label;

        return (
          <button
            key={item.id}
            className={isActive ? "active" : ""}
            onClick={() => onSelectStep(item.id as TStep)}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "step" : undefined}
          >
            <span className="flow-tabs__index" aria-hidden="true">
              {index + 1}
            </span>
            <span className="flow-tabs__label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
