/**
 * Singleton Resumable Stream Context
 * 
 * Creates a shared context for resumable streams that persists across requests.
 * This is required for stream resumption to work properly - the same context
 * must be used when creating and resuming streams.
 * 
 * The resumable-stream package uses Redis pub/sub internally to coordinate
 * stream data across serverless function instances. It automatically creates
 * Redis clients using REDIS_URL or KV_URL environment variables.
 */

import { 
  createResumableStreamContext, 
  type ResumableStreamContext 
} from "resumable-stream";
import { after } from "next/server";

// Cache for the resumable stream context - must persist across requests
interface StreamContextCache {
  context: ResumableStreamContext | null;
}

declare global {
   
  var _resumableStreamContext: StreamContextCache | undefined;
}

const cached: StreamContextCache = global._resumableStreamContext ?? {
  context: null,
};

if (!global._resumableStreamContext) {
  global._resumableStreamContext = cached;
}

/**
 * Get the singleton resumable stream context
 * The package automatically creates Redis clients using REDIS_URL environment variable
 */
export function getResumableStreamContext(): ResumableStreamContext {
  if (cached.context) {
    return cached.context;
  }

  // Create the context - it will auto-create Redis clients from REDIS_URL
  cached.context = createResumableStreamContext({
    waitUntil: after,
  });

  return cached.context;
}
