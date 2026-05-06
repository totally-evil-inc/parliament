import { Hono } from "hono"
import { cors } from "hono/cors"
import { poweredBy } from "hono/powered-by";
import { logger } from "hono/logger";

import { auth } from "./lib/auth"

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null
	}
}>();
const port = Number(Bun.env.AUTH_PORT ?? Bun.env.PORT ?? 4000)

app.use(poweredBy())
app.use(logger())

app.use("*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
  	if (!session) {
    	c.set("user", null);
    	c.set("session", null);
    	await next();
        return;
  	}
  	c.set("user", session.user);
  	c.set("session", session.session);
  	await next();
});

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["*"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true
  })
)

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  auth.handler(c.req.raw)
})

export default {
  port,
  fetch: app.fetch,
}
