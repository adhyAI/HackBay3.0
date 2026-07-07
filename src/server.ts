import "dotenv/config";
import express from "express";
import cors from "cors";
import { tenantRouter } from "./db/tenantRouter";
import { rfqIngestWebhook } from "./routes/rfqIngestWebhook";
import { tenantDataRoutes } from "./routes/tenantData";
import { pipelineRoutes } from "./routes/pipeline";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use(tenantRouter);
app.use(rfqIngestWebhook);
app.use(tenantDataRoutes);
app.use(pipelineRoutes);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`RFQ Risk Navigator API listening on :${port}`));
