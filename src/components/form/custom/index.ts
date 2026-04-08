import { registerCustomForm } from "../registry";
import { VMInstanceForm } from "./vm-instance-form";
import { VMDiskForm } from "./vm-disk-form";
import { KubernetesForm } from "./kubernetes-form";

registerCustomForm("vminstances", VMInstanceForm);
registerCustomForm("vmdisks", VMDiskForm);
registerCustomForm("kuberneteses", KubernetesForm);
