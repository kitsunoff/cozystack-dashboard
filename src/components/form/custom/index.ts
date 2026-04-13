import { registerCustomForm } from "../registry";

// Custom forms for resources too complex for declarative DashboardForm CRD.
// Simple resources use DashboardForm CRD manifests instead.

import { VMInstanceForm } from "./vm-instance-form";
import { VMDiskForm } from "./vm-disk-form";
import { KubernetesForm } from "./kubernetes-form";

registerCustomForm("vminstances", VMInstanceForm);
registerCustomForm("vmdisks", VMDiskForm);
registerCustomForm("kuberneteses", KubernetesForm);
