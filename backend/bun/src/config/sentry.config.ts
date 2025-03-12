//...
import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: "https://f5c48d01bb52980be877384188ad29b3@o4508964507287553.ingest.de.sentry.io/4508964533305424",
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  integrations: [Sentry.prismaIntegration()],
});


export default Sentry;