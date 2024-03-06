import type { NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);
  url.host = "api.openai.com";
  url.protocol = "https:";
  url.port = "";

  const headers = new Headers(req.headers);
  headers.set("host", url.host);

  const keysToDelete: string[] = [];
  headers.forEach((_, key: string) => {
    if (
      key.toLowerCase().startsWith("x-") &&
      key.toLowerCase() !== "x-api-key"
    ) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key: string) => {
    headers.delete(key);
  });

  try {
    const { method, body, signal } = req;

    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
      signal,
    });

    return response;
  } catch (error) {
    console.error("Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
