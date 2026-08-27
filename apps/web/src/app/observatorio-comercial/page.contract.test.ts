import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("commercial observatory page", () => {
  it("renders all four explainable sections and honest UI states", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/observatorio-comercial/page.tsx"), "utf8");
    for (const label of ["Observatorio comercial", "Estacionalidad", "Radar de anomalías", "Puente explicativo", "Mapa de dependencia y riesgo"]) expect(source).toContain(label);
    for (const state of ["Cargando observatorio", "No se pudo cargar", "Sin observaciones", "Evidencia insuficiente", "Selecciona una moneda", "No comparable"]) expect(source).toContain(state);
    expect(source).toContain("contribución aritmética");
    expect(source).toContain("No implica causalidad");
    expect(source).toContain("trpc.commercialObservatory.overview");
    expect(source).not.toContain("asIso(");
    expect(source).not.toContain("T23:59:59");
    expect(source).toContain("inclusiveEndLabel");
    expect(source).toContain("getTime() - 1");
    expect(source).toContain("No evaluable sin moneda");
  });
});
