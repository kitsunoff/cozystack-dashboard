"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

const NAMESPACE_PARAM = "namespace";
const DEFAULT_NAMESPACE = "default";

export function useNamespace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const namespace = searchParams.get(NAMESPACE_PARAM) || DEFAULT_NAMESPACE;

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
