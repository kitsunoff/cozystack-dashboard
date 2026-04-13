"use client";

import { useParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

/**
 * Read namespace from URL path parameter.
 * Routes: /{namespace}/..., namespace is the first path segment in dashboard.
 */
export function useNamespace() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();

  const namespace = (params?.namespace as string) ?? "";

  const setNamespace = useCallback(
    (ns: string) => {
      // Replace namespace segment in current path
      if (namespace) {
        const newPath = pathname.replace(`/${namespace}`, `/${ns}`);
        router.push(newPath);
      } else {
        router.push(`/${ns}`);
      }
    },
    [namespace, pathname, router]
  );

  return { namespace, setNamespace };
}
