import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canReadEvidenceLead } from "./service";
describe("commercial evidence boundaries",()=>{
 it("allows wildcard or current ownership only",()=>{expect(canReadEvidenceLead({actorId:"caller",admin:false,callerId:"caller",closerId:null})).toBe(true);expect(canReadEvidenceLead({actorId:"other",admin:false,callerId:"caller",closerId:"closer"})).toBe(false);expect(canReadEvidenceLead({actorId:"admin",admin:true,callerId:null,closerId:null})).toBe(true);});
 it("keeps admin analytics wildcard-only and accepts no client snapshot",()=>{const router=readFileSync(resolve(process.cwd(),"src/routers/commercial-evidence.ts"),"utf8");expect(router).toContain('microsegments:permittedProcedure(["*"])');expect(router).toContain('confidence:permittedProcedure(["*"])');expect(router).not.toContain("evidenceSnapshot");});
 it("contains no operational persistence",()=>{const source=readFileSync(resolve(process.cwd(),"src/commercial-evidence/service.ts"),"utf8");expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);});
});
