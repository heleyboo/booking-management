import { logger } from "../lib/logger"

console.log("Starting logger test...")
logger.info("Test log info", { foo: "bar" })
logger.error("Test log error", new Error("Something broke"))
console.log("Logger test complete. Check auth.log")
