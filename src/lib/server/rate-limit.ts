/**
 * Limitador de intentos en memoria.
 *
 * Es una primera barrera contra fuerza bruta y abuso de los endpoints de Auth.
 * En un despliegue serverless (Vercel) cada instancia tiene su propio Map, por
 * lo que no sustituye a un limitador distribuido (KV/Redis/edge). Se mantiene
 * deliberadamente sin dependencias nuevas y con limpieza para no crecer sin
 * control.
 */

interface Bucket {
	count: number;
	resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export interface RateLimitResult {
	allowed: boolean;
	/** Segundos que faltan para que se reinicie la ventana. */
	retryAfter: number;
}

function prune(now: number): void {
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt <= now) buckets.delete(key);
	}
}

function evictOldest(): void {
	const oldest = buckets.keys().next().value;
	if (oldest !== undefined) buckets.delete(oldest);
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
	const now = Date.now();

	if (buckets.size >= MAX_BUCKETS) {
		prune(now);
		while (buckets.size >= MAX_BUCKETS) evictOldest();
	}

	const current = buckets.get(key);

	if (!current || current.resetAt <= now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return { allowed: true, retryAfter: 0 };
	}

	if (current.count >= limit) {
		return {
			allowed: false,
			retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
		};
	}

	current.count += 1;
	return { allowed: true, retryAfter: 0 };
}

/** Solo para pruebas: deja el limitador en estado limpio. */
export function resetRateLimits(): void {
	buckets.clear();
}
