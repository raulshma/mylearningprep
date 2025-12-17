import { Check } from 'lucide-react';
import { PRICING_TIERS, COMPARISON_FEATURES } from '@/lib/pricing-data';

export function ComparisonTable() {
  return (
    <div className="p-8 rounded-4xl bg-card/30 border border-white/5">
      <h3 className="text-xl font-bold text-center mb-8">Feature Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">
                Feature
              </th>
              {PRICING_TIERS.map((tier) => (
                <th
                  key={tier.id}
                  className={`text-center py-4 px-6 text-sm font-bold ${
                    tier.id === 'max' ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {COMPARISON_FEATURES.map((feature, index) => (
              <tr key={index}>
                <td className="py-4 px-6 text-sm font-medium">{feature.name}</td>
                <td className="text-center py-4 px-6 text-sm text-muted-foreground">
                  {typeof feature.free === 'boolean' ? (
                    feature.free ? (
                      <Check className="w-4 h-4 mx-auto text-foreground" />
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )
                  ) : (
                    feature.free
                  )}
                </td>
                <td className="text-center py-4 px-6 text-sm text-foreground">
                  {typeof feature.pro === 'boolean' ? (
                    feature.pro ? (
                      <Check className="w-4 h-4 mx-auto text-foreground" />
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )
                  ) : (
                    feature.pro
                  )}
                </td>
                <td className="text-center py-4 px-6 text-sm font-bold text-foreground">
                  {typeof feature.max === 'boolean' ? (
                    feature.max ? (
                      <Check className="w-4 h-4 mx-auto text-primary" />
                    ) : (
                      <span className="text-muted-foreground/30">-</span>
                    )
                  ) : (
                    feature.max
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
