/**
 * Core plugin — registers built-in form blocks.
 */

import type { BlockComponent } from "@/components/form/declarative/types";
import { registerFormBlock } from "@/components/form/declarative/block-registry";

import { VersionPicker } from "@/components/form/blocks/version-picker";
import { ResourcesPicker } from "@/components/form/blocks/resources-picker";
import { StoragePicker } from "@/components/form/blocks/storage-picker";
import { ReplicasPicker } from "@/components/form/blocks/replicas-picker";
import { ExternalToggle } from "@/components/form/blocks/external-toggle";
import { UsersList } from "@/components/form/blocks/users-list";
import { BackupConfig } from "@/components/form/blocks/backup-config";
import { EnumPicker } from "@/components/form/blocks/enum-picker";
import { MultilineInput } from "@/components/form/blocks/multiline-input";
import { BooleanToggle } from "@/components/form/blocks/boolean-toggle";
import { StringListInput } from "@/components/form/blocks/string-list-input";
import { TextInput } from "@/components/form/blocks/text-input";
import { AccessMatrix } from "@/components/form/blocks/access-matrix";

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
