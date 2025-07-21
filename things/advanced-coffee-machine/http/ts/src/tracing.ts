import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "advanced-coffee-machine"
  }),
});
const exporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || "http://host.docker.internal:14268/api/traces"
});
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();
