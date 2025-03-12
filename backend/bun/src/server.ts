import app from "./app.ts";
import redis from "./config/redis.config.ts";

const PORT = Number(process.env.PORT) || 3000; // Convert to number
// const IP = process.env.IP || "0.0.0.0"; // Default to 0.0.0.0 if not set

// Test Redis Connection
redis.set("foo", "bar")
  .then(() => redis.get("foo"))
  .then((value) => console.log("🔹 Redis Value:", value))
  .catch((err) => console.error("❌ Redis Error:", err));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
