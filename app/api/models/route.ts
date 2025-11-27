import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/utils/rate-limit';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  default_parameters?: {
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
  };
  per_request_limits?: {
    prompt_tokens?: string;
    completion_tokens?: string;
  };
}

export interface GroupedModels {
  free: OpenRouterModel[];
  paid: OpenRouterModel[];
}

export async function GET(request: Request) {
  // Rate limit by client IP
  const clientIp = getClientIp(request);
  const rateLimitResult = await rateLimit(`api:models:${clientIp}`, {
    maxRequests: 30,
    windowSeconds: 60,
  });

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.resetInSeconds),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetInSeconds),
        },
      }
    );
  }
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];

    // Group models by free/paid
    const grouped: GroupedModels = {
      free: [],
      paid: [],
    };

    models.forEach((model) => {
      const promptPrice = parseFloat(model.pricing.prompt);
      const completionPrice = parseFloat(model.pricing.completion);

      if (promptPrice === 0 && completionPrice === 0) {
        grouped.free.push(model);
      } else {
        grouped.paid.push(model);
      }
    });

    // Sort by name within each group
    grouped.free.sort((a, b) => a.name.localeCompare(b.name));
    grouped.paid.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
