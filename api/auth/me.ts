import authHandler from "../_lib/authHandler";

export default async function handler(req: any, res: any) {
  return authHandler(req, res, "/api/auth/me");
}
