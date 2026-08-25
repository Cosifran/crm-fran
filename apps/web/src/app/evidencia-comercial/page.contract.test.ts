import { describe,expect,it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
describe("commercial evidence page",()=>{it("exposes the four responsive evidence sections",()=>{const source=readFileSync(resolve(process.cwd(),"src/app/evidencia-comercial/page.tsx"),"utf8");for(const title of ["Evidencia comercial explicable","Score económico","Casos gemelos","Microsegmentos","Confianza"])expect(source).toContain(title);expect(source).toContain("flex-wrap");expect(source).toContain("Verdad económica insuficiente");});});
