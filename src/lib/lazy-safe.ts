import { lazy, type ComponentType } from "react"

/**
 * A wrapper around React.lazy that retries the import if it fails.
 * This is particularly useful for handling ChunkLoadErrors that occur
 * when a new version of the app is deployed and old chunks are removed.
 */
export function lazySafe<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T } | T>,
    retries = 2,
    interval = 1000
): ComponentType<any> {
    return lazy(async () => {
        try {
            const component = await importFn()
            // Handle both { default: T } and T cases
            return 'default' in component ? component : { default: component }
        } catch (error) {
            if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, interval))
                return (lazySafe(importFn, retries - 1, interval) as any)._payload._result
            }

            // If we're out of retries, we might want to force a page reload
            // but we'll let the ErrorBoundary handle it for now to avoid loops.
            throw error
        }
    })
}
