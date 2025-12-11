/**
 * Model Slice Reducer
 *
 * Pure reducer function for managing model selection state.
 * Handles model selection, provider tools, and image support.
 */

import type { AIProviderType, AIModelMetadata } from '@/lib/ai/types';
import type { ProviderToolType } from '@/lib/ai/provider-tools';
import type { ModelState, ModelAction } from '../types';
import { createInitialModelState } from '../types';

// =============================================================================
// Reducer
// =============================================================================

/**
 * Pure reducer function for model state
 * Given the same state and action, always produces the same result
 */
export function modelReducer(state: ModelState, action: ModelAction): ModelState {
  switch (action.type) {
    case 'SET_AVAILABLE': {
      return {
        ...state,
        available: action.payload,
      };
    }

    case 'SELECT_MODEL': {
      return {
        ...state,
        selectedId: action.payload.id,
        selectedProvider: action.payload.provider,
        supportsImages: action.payload.supportsImages,
      };
    }

    case 'SET_PROVIDER_TOOLS': {
      return {
        ...state,
        enabledProviderTools: action.payload,
      };
    }

    case 'CLEAR_SELECTION': {
      return {
        ...state,
        selectedId: null,
        selectedProvider: null,
        enabledProviderTools: [],
        supportsImages: false,
      };
    }

    default: {
      // Exhaustive check - TypeScript will error if we miss a case
      const _exhaustive: never = action;
      return state;
    }
  }
}

// =============================================================================
// Selectors
// =============================================================================

/**
 * Get all available models
 */
export function selectAvailableModels(state: ModelState): AIModelMetadata[] {
  return state.available;
}

/**
 * Get the currently selected model ID
 */
export function selectSelectedModelId(state: ModelState): string | null {
  return state.selectedId;
}

/**
 * Get the currently selected provider
 */
export function selectSelectedProvider(state: ModelState): AIProviderType | null {
  return state.selectedProvider;
}

/**
 * Get the currently selected model metadata
 */
export function selectSelectedModel(state: ModelState): AIModelMetadata | null {
  if (!state.selectedId) {
    return null;
  }
  return state.available.find((m) => m.id === state.selectedId) ?? null;
}

/**
 * Check if the selected model supports images
 */
export function selectSupportsImages(state: ModelState): boolean {
  return state.supportsImages;
}

/**
 * Get enabled provider tools
 */
export function selectEnabledProviderTools(state: ModelState): ProviderToolType[] {
  return state.enabledProviderTools;
}

/**
 * Check if a specific provider tool is enabled
 */
export function selectIsProviderToolEnabled(
  state: ModelState,
  tool: ProviderToolType
): boolean {
  return state.enabledProviderTools.includes(tool);
}

/**
 * Get models grouped by provider
 */
export function selectModelsGroupedByProvider(
  state: ModelState
): Map<AIProviderType, AIModelMetadata[]> {
  const grouped = new Map<AIProviderType, AIModelMetadata[]>();

  for (const model of state.available) {
    const existing = grouped.get(model.provider) ?? [];
    existing.push(model);
    grouped.set(model.provider, existing);
  }

  return grouped;
}

/**
 * Get models for a specific provider
 */
export function selectModelsByProvider(
  state: ModelState,
  provider: AIProviderType
): AIModelMetadata[] {
  return state.available.filter((m) => m.provider === provider);
}

/**
 * Get models that support images
 */
export function selectImageCapableModels(state: ModelState): AIModelMetadata[] {
  return state.available.filter((m) => m.capabilities.vision);
}

/**
 * Get models that support tools
 */
export function selectToolCapableModels(state: ModelState): AIModelMetadata[] {
  return state.available.filter((m) => m.capabilities.tools);
}

/**
 * Check if any model is selected
 */
export function selectHasModelSelected(state: ModelState): boolean {
  return state.selectedId !== null;
}

/**
 * Get the count of available models
 */
export function selectModelCount(state: ModelState): number {
  return state.available.length;
}

/**
 * Get unique providers from available models
 */
export function selectAvailableProviders(state: ModelState): AIProviderType[] {
  const providers = new Set<AIProviderType>();
  for (const model of state.available) {
    providers.add(model.provider);
  }
  return Array.from(providers);
}

// =============================================================================
// Initial State
// =============================================================================

export { createInitialModelState };
