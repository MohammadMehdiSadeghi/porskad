export default async function handler(req, res) {
  return res.status(200).json({
    disabled: true,
    message: "Amoot webhook is currently disabled",
  });
}
