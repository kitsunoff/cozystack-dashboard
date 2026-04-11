"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const NAMESPACE_PARAM = "namespace";

export function useNamespace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const namespace = searchParams.get(NAMESPACE_PARAM) || "";

  // Redirect to tenant selection if no namespace is set (only after hydration)
  useEffect(() => {
    if (hydrated && !namespace && pathname !== "/tenants") {
      router.replace("/tenants");
    }
  }, [hydrated, namespace, pathname, router]);

  const setNamespace = useCallback(
    (ns: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(NAMESPACE_PARAM, ns);
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  return { namespace, setNamespace };
}
