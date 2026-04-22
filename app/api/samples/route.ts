import { ok } from "@/lib/api";
import { listSampleArticles } from "@/lib/repository";

export async function GET() {
  return ok({ samples: listSampleArticles() });
}

