import "dotenv/config";
import { createApp } from "./http/app.js";

const port = Number(process.env.PORT ?? 3004);
const app = createApp();

app.listen(port, () => {
  console.log(`My Fut API running at http://localhost:${port}`);
});
