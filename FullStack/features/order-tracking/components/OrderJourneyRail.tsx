import { Bike, Check, ChefHat, House, PackageCheck } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { StatusPill } from "../../../components/ui/StatusPill";
import { getOrderJourney, type OrderJourneyStep } from "../orderJourney";

const stepIcons: Record<OrderJourneyStep["id"], typeof Check> = {
  confirmed: Check,
  preparing: ChefHat,
  ready: PackageCheck,
  delivery: Bike,
  delivered: House,
};

type OrderJourneyRailProps = {
  orderId: string;
  status?: string | null;
};

export function OrderJourneyRail({ orderId, status }: OrderJourneyRailProps) {
  const steps = getOrderJourney(status);
  const currentStep = steps.find((step) => step.state === "current") ?? steps[0];

  return (
    <Card className="order-journey" aria-labelledby="order-journey-title">
      <header className="order-journey__header">
        <div>
          <p className="eyebrow">Order journey</p>
          <h2 id="order-journey-title">Order {orderId.slice(0, 8)}</h2>
        </div>
        <StatusPill tone="info">{currentStep.label}</StatusPill>
      </header>

      <ol className="order-journey__steps" aria-label="Order progress">
        {steps.map((step) => {
          const Icon = stepIcons[step.id];
          return (
            <li className={`order-journey__step order-journey__step--${step.state}`} key={step.id}>
              <span className="order-journey__marker" aria-hidden="true">
                {step.state === "complete" ? <Check /> : <Icon />}
              </span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.description}</p>
                <span className="sr-only">
                  {step.state === "complete" ? "Completed" : step.state === "current" ? "Current status" : "Upcoming"}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="order-journey__notice" role="note">
        <Bike aria-hidden="true" />
        <div>
          <strong>Delivery assignment pending</strong>
          <p>Rider, ETA, and map details will appear only when verified delivery data is available.</p>
        </div>
      </div>
    </Card>
  );
}
