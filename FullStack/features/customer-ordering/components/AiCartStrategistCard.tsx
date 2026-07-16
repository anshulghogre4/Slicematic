import { Brain, Sparkles } from "lucide-react";

export type CartInsightView = {
  headline: string;
  message: string;
  nextAction: string;
  expectedImpact: string;
  confidence: number;
};

export type AiCartStrategistCardProps = {
  insight: CartInsightView | null;
  loading: boolean;
  onAsk: () => void;
  onApply: () => void;
};

export function AiCartStrategistCard({
  insight,
  loading,
  onAsk,
  onApply
}: AiCartStrategistCardProps) {
  return (
    <div className="ai-cart-card" aria-live="polite">
      <div><Brain /><strong>AI cart strategist</strong></div>
      {insight ? (
        <>
          <h3>{insight.headline}</h3>
          <p>{insight.message}</p>
          <small>{insight.expectedImpact} / confidence {Math.round(insight.confidence * 100)}%</small>
          <button type="button" onClick={onApply}>{insight.nextAction}</button>
        </>
      ) : (
        <>
          <p>Get a margin-aware pairing, discount cue, or checkout reassurance based on this cart.</p>
          <button type="button" onClick={onAsk} disabled={loading}>
            <Sparkles /> {loading ? "Reading cart" : "Ask AI"}
          </button>
        </>
      )}
    </div>
  );
}
