import mongoose from 'mongoose';
import dns from 'dns';

// DNS Configuration for MongoDB Atlas SRV Queries:
// If process.env.DNS_SERVERS is explicitly defined (comma-separated, e.g. "1.1.1.1,8.8.8.8"), use those servers.
// Otherwise, retain system default DNS resolvers so local router/ISP DNS works without ETIMEOUT.
if (process.env.DNS_SERVERS) {
  try {
    const customServers = process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean);
    if (customServers.length > 0) {
      dns.setServers(customServers);
      console.log('[MongoDB] Configured custom DNS servers:', customServers);
    }
  } catch (err) {
    console.warn('[MongoDB] Failed to configure custom DNS servers:', err.message);
  }
}

let connectionPromise = null;
let isMongoDisabledDueToError = false;
let lastErrorTimestamp = 0;
const RETRY_INTERVAL_MS = 60000;

export function isMongoConfigured() {
  if (process.env.DISABLE_MONGO === 'true') {
    return false;
  }
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());
}

export function isMongoConnected() {
  return Boolean(mongoose.connection && mongoose.connection.readyState === 1);
}

export function isMongoAvailable() {
  return isMongoConfigured() && isMongoConnected();
}

export async function connectMongo() {
  if (!isMongoConfigured()) {
    return null;
  }

  if (isMongoConnected()) {
    return mongoose.connection;
  }

  if (isMongoDisabledDueToError && (Date.now() - lastErrorTimestamp < RETRY_INTERVAL_MS)) {
    return null;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'syncspace',
      serverSelectionTimeoutMS: 3000
    }).then((conn) => {
      isMongoDisabledDueToError = false;
      console.log('[MongoDB] Connected successfully to MongoDB instance.');
      return conn;
    }).catch((err) => {
      connectionPromise = null;
      isMongoDisabledDueToError = true;
      lastErrorTimestamp = Date.now();
      console.warn('[MongoDB Connection Warning] Could not connect to MongoDB Atlas cluster:', err.message);
      console.warn('  -> Seamlessly falling back to local in-memory storage mode for snapshots, rooms, and auth.');
      console.warn('  -> To enable Atlas Mongo, ensure your current IP address (or 0.0.0.0/0) is whitelisted in Atlas Network Access.');
      return null;
    });
  }

  return connectionPromise;
}




