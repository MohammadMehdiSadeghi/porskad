export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  const origin = `${proto}://${host}`;

  return res.status(200).json({
    name: "Porskad REST API",
    version: "v1",
    status: "online",
    docs_url: `${origin}/docs`,
    openapi_spec: `${origin}/openapi.json`,
    endpoints: {
      account: `${origin}/api/v1/me`,
      question_types: `${origin}/api/v1/question-types`,
      forms: `${origin}/api/v1/forms`,
      form_detail: `${origin}/api/v1/forms/{id}`,
      form_questions: `${origin}/api/v1/forms/{id}/questions`,
      form_responses: `${origin}/api/v1/forms/{id}/responses`,
      form_embed: `${origin}/api/v1/forms/{id}/embed`,
    },
  });
}
