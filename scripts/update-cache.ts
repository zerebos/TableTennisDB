import * as revspin from "../src/revspin";

console.log("Updating cache for RevSpin.net\n");

const start = performance.now();
await revspin.refresh(category => console.log(`  ⏳ ${category}...`));

console.log(`\n✅ RevSpin cache updated in ${Math.round(performance.now() - start)}ms.`);
