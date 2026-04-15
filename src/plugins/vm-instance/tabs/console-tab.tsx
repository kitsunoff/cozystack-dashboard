import dynamic from "next/dynamic";

const VmConsoleTab = dynamic(
  () => import("./console-tab-inner").then((m) => ({ default: m.VmConsoleTabInner })),
  { ssr: false },
);

export { VmConsoleTab };
