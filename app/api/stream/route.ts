import { NextRequest } from "next/server";
import { Kafka } from "kafkajs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const kafka = new Kafka({
        clientId: "nextjs-consumer",
        brokers: ["localhost:19092"],
      });

      const consumer = kafka.consumer({ groupId: "dashboard-group" });

      try {
        await consumer.connect();
        await consumer.subscribe({ topic: "rsi-data", fromBeginning: false });

        console.log("✅ Connected to Redpanda, streaming RSI data...");

        await consumer.run({
          eachMessage: async ({ message }) => {
            if (message.value) {
              const data = message.value.toString();
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          },
        });
      } catch (error) {
        console.error("❌ Kafka error:", error);
        controller.error(error);
      }
    },
    cancel() {
      console.log("Stream cancelled");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
