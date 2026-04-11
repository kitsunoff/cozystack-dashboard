import { registerCustomForm } from "../registry";

// IaaS
import { VMInstanceForm } from "./vm-instance-form";
import { VMDiskForm } from "./vm-disk-form";
import { KubernetesForm } from "./kubernetes-form";
import { BucketForm } from "./bucket-form";

registerCustomForm("vminstances", VMInstanceForm);
registerCustomForm("vmdisks", VMDiskForm);
registerCustomForm("kuberneteses", KubernetesForm);
registerCustomForm("buckets", BucketForm);

// PaaS
import { PostgresForm } from "./postgres-form";
import { RedisForm } from "./redis-form";
import { MariaDBForm } from "./mariadb-form";
import { MongoDBForm } from "./mongodb-form";
import { ClickHouseForm } from "./clickhouse-form";
import { RabbitMQForm } from "./rabbitmq-form";
import { NATSForm } from "./nats-form";
import { QdrantForm } from "./qdrant-form";
import { OpenBAOForm } from "./openbao-form";
import { FoundationDBForm } from "./foundationdb-form";
import { KafkaForm } from "./kafka-form";

registerCustomForm("postgreses", PostgresForm);
registerCustomForm("redises", RedisForm);
registerCustomForm("mariadbs", MariaDBForm);
registerCustomForm("mongodbs", MongoDBForm);
registerCustomForm("clickhouses", ClickHouseForm);
registerCustomForm("rabbitmqs", RabbitMQForm);
registerCustomForm("natses", NATSForm);
registerCustomForm("qdrants", QdrantForm);
registerCustomForm("openbaos", OpenBAOForm);
registerCustomForm("foundationdbs", FoundationDBForm);
registerCustomForm("kafkas", KafkaForm);

// NaaS
import { HTTPCacheForm } from "./http-cache-form";
import { TCPBalancerForm } from "./tcp-balancer-form";
import { VPNForm } from "./vpn-form";

registerCustomForm("httpcaches", HTTPCacheForm);
registerCustomForm("tcpbalancers", TCPBalancerForm);
registerCustomForm("vpns", VPNForm);
