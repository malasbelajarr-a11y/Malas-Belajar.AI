import handler from "../[...path]";

export default async function authHandler(req: any, res: any) {
  return handler(req, res);
}
