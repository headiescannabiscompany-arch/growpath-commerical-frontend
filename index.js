import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const indexHtml = path.join(distDir, "index.html");
const port = Number(process.env.PORT || 3000);

const app = express();

app.disable("x-powered-by");
app.use(express.static(distDir, { extensions: ["html"] }));
app.use((req, res) => res.sendFile(indexHtml));

app.listen(port, "0.0.0.0", () => {
  console.log(`[render-static-server] listening on ${port}`);
});
