import { rebuildAllSampleActionAssets } from "@/lib/repository";

async function main() {
  const count = rebuildAllSampleActionAssets();
  console.log(`[OK] rebuilt sample action assets for ${count} samples`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "rebuild sample action assets failed");
  process.exitCode = 1;
});
