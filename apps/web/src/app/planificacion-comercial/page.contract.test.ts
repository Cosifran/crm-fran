import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("commercial planning page", () => {
  it("shows the three planning blocks, editable assumptions and honest states", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/planificacion-comercial/page.tsx"), "utf8");
    for (const title of ["Planificación comercial", "Proyección 30/60/90", "Capacidad y contratación", "Comisiones e incentivos", "Escenario", "Base observada"]) expect(source).toContain(title);
    for (const state of ["Cargando planificación", "No se pudo cargar", "Sin observaciones", "Evidencia insuficiente", "Selecciona una moneda"]) expect(source).toContain(state);
    for (const detail of ["Simulación condicionada", "No es una predicción", "No crea usuarios", "No ejecuta pagos", "Costes no modelados", "observed", "introduced"]) expect(source).toContain(detail);
    expect(source).toContain("trpc.commercialPlanning.overview");
    expect(source).toContain("seasonalityEnabled");
    expect(source).toContain("Introduce una moneda ISO");
    expect(source).toContain("Capacidad insuficiente");
    expect(source).toContain('${currency || "ISO"}');
  });
});
