import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongoClientCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
  indexesEnsured: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: MongoClientCache | undefined;
}

const cached: MongoClientCache = global._mongoClientPromise ?? {
  client: null,
  promise: null,
  indexesEnsured: false,
};

if (!global._mongoClientPromise) {
  global._mongoClientPromise = cached;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (cached.client) {
    return cached.client;
  }

  if (!cached.promise) {
    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 60000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = MongoClient.connect(MONGODB_URI!, options).then((client) => {
      cached.client = client;
      return client;
    });
  }

  return cached.promise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db();
  
  // Ensure indexes on first connection (non-blocking)
  if (!cached.indexesEnsured) {
    cached.indexesEnsured = true;
    import('./indexes').then(({ ensureIndexes }) => {
      ensureIndexes().catch(console.error);
    });
  }
  
  return db;
}

export async function closeConnection(): Promise<void> {
  if (cached.client) {
    await cached.client.close();
    cached.client = null;
    cached.promise = null;
  }
}
