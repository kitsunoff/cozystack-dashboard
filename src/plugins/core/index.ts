/**
 * Core plugin — registers built-in form blocks.
 */

import type { BlockComponent } from "@/components/form/declarative/types";
import { registerFormBlock } from "@/components/form/declarative/block-registry";

import { VersionPicker } from "./blocks/version-picker";
import { ResourcesPicker } from "./blocks/resources-picker";
import { StoragePicker } from "./blocks/storage-picker";
import { ReplicasPicker } from "./blocks/replicas-picker";
import { ExternalToggle } from "./blocks/external-toggle";
import { UsersList } from "./blocks/users-list";
import { BackupConfig } from "./blocks/backup-config";
import { EnumPicker } from "./blocks/enum-picker";
import { MultilineInput } from "./blocks/multiline-input";
import { BooleanToggle } from "./blocks/boolean-toggle";
import { StringListInput } from "./blocks/string-list-input";
import { TextInput } from "./blocks/text-input";
import { AccessMatrix } from "./blocks/access-matrix";

registerFormBlock("version-picker", VersionPicker as BlockComponent);
registerFormBlock("resources-picker", ResourcesPicker as BlockComponent);
registerFormBlock("storage-picker", StoragePicker as BlockComponent);
registerFormBlock("replicas-picker", ReplicasPicker as BlockComponent);
registerFormBlock("external-toggle", ExternalToggle as BlockComponent);
registerFormBlock("users-list", UsersList as BlockComponent);
registerFormBlock("backup-config", BackupConfig as BlockComponent);
registerFormBlock("enum-picker", EnumPicker as BlockComponent);
registerFormBlock("multiline-input", MultilineInput as BlockComponent);
registerFormBlock("boolean-toggle", BooleanToggle as BlockComponent);
registerFormBlock("string-list-input", StringListInput as BlockComponent);
registerFormBlock("text-input", TextInput as BlockComponent);
registerFormBlock("access-matrix", AccessMatrix as BlockComponent);
